import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, X, Loader2, AudioLines, Minimize2, Maximize2, Square, Activity } from 'lucide-react';
import { logger } from '../services/logger';
import { Task, Thought, JournalEntry, Project, Habit, Memory, Priority, ThemeKey, ChatMessage } from '../types';
import { format } from 'date-fns';
import { generateSystemInstruction } from '../services/serafimPersona';
import { generateSessionSummary } from '../services/geminiService';
import { useLiveAgentTools } from '../hooks/useLiveAgentTools';

interface LiveAudioAgentProps {
  onClose: () => void;
  userName: string;
  tasks: Task[];
  thoughts: Thought[];
  journal: JournalEntry[];
  projects: Project[];
  habits: Habit[];
  memories: Memory[];
  chatHistory?: ChatMessage[];
  onLiveSessionEnd?: (summary: string) => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onAddThought: (thought: Thought) => void;
  onUpdateThought: (id: string, updates: Partial<Thought>) => void;
  onDeleteThought: (id: string) => void;
  onAddJournal: (entry: Partial<JournalEntry>) => void;
  onAddProject: (project: Project) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onAddMemory: (memory: Memory) => void;
  onUpdateMemory: (id: string, updates: Partial<Memory>) => void;
  onDeleteMemory: (id: string) => void;
  onSetTheme: (theme: ThemeKey) => void;
  onStartFocus: (minutes: number) => void;
  onDeleteTask: (id: string) => void;
  onLiveTextStream?: (text: string) => void;
  onToggleHabit?: (id: string, date: string) => void;
}

const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env?.REACT_APP_GOOGLE_API_KEY) {
    return process.env.REACT_APP_GOOGLE_API_KEY;
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_GOOGLE_API_KEY;
  }
  return '';
};

const LiveAudioAgent: React.FC<LiveAudioAgentProps> = ({ 
  onClose, userName, 
  tasks, thoughts, journal, projects, habits, memories,
  chatHistory, onLiveSessionEnd,
  onAddTask, onUpdateTask, onDeleteTask, onAddThought, onUpdateThought, onDeleteThought, onAddJournal, onAddProject, onUpdateProject, onAddMemory, onUpdateMemory, onDeleteMemory, onSetTheme, onStartFocus, onLiveTextStream, onToggleHabit
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const sessionTranscriptRef = useRef<ChatMessage[]>([]);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const isManualCloseRef = useRef(false);
  const lastVolumeUpdateRef = useRef<number>(0);

  // --- REFS FOR STALE CLOSURE FIX ---
  const tasksRef = useRef(tasks);
  const thoughtsRef = useRef(thoughts);
  const projectsRef = useRef(projects);
  const habitsRef = useRef(habits);
  const memoriesRef = useRef(memories);
  const journalRef = useRef(journal);

  const { tools, executeTool } = useLiveAgentTools({
    onAddTask, onUpdateTask, onDeleteTask,
    onAddThought, onUpdateThought, onDeleteThought,
    onAddJournal,
    onAddProject, onUpdateProject,
    onAddMemory, onUpdateMemory, onDeleteMemory,
    onSetTheme, onStartFocus, onToggleHabit,
    getCurrentThoughts: () => thoughtsRef.current,
    getCurrentMemories: () => memoriesRef.current
  });

  const stopAudioPlayback = () => {
      activeSourcesRef.current.forEach(source => {
          try {
              source.stop();
          } catch (e) {
              // Ignore
          }
      });
      activeSourcesRef.current = [];
      
      // Reset scheduling
      if (audioContextRef.current) {
          nextPlayTimeRef.current = audioContextRef.current.currentTime;
      }
      
      playbackQueueRef.current = [];
      isPlayingRef.current = false;
      setIsSpeaking(false);
      
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
  };

  const handleClose = async () => {
      if (sessionTranscriptRef.current.length > 0 && onLiveSessionEnd) {
          setStatusMessage("Сохраняю итоги сессии...");
          setIsConnecting(true); // Show loading UI
          try {
              const summary = await generateSessionSummary(sessionTranscriptRef.current);
              onLiveSessionEnd(summary);
          } catch (e) {
              console.error("Failed to summarize session", e);
          }
      }
      onClose();
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Если открыт голосовой агент или идет генерация - блокируем закрытие
      if (isConnected) {
        e.preventDefault();
        e.returnValue = ''; // Эта строка нужна для Chrome, чтобы показать окно "Покинуть сайт?"
      }
    };
  
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isConnected]);

  useEffect(() => {
    tasksRef.current = tasks;
    thoughtsRef.current = thoughts;
    projectsRef.current = projects;
    habitsRef.current = habits;
    memoriesRef.current = memories;
    journalRef.current = journal;
  }, [tasks, thoughts, projects, habits, memories, journal]);

  useEffect(() => {
    connectToGemini();
    return () => {
      isManualCloseRef.current = true;
      stopLiveSession();
    };
  }, []);

  const getLastBriefingTime = () => {
    const time = localStorage.getItem('serafim_last_briefing');
    return time ? parseInt(time, 10) : 0;
  };

  const connectToGemini = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey });

      // Use default sample rate for better compatibility and less crackling
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        gainNodeRef.current = audioContextRef.current.createGain();
        
        // Route audio through an HTMLAudioElement to force media volume and main speaker
        audioDestRef.current = audioContextRef.current.createMediaStreamDestination();
        gainNodeRef.current.connect(audioDestRef.current);
        
        audioElementRef.current = new Audio();
        audioElementRef.current.srcObject = audioDestRef.current.stream;
        audioElementRef.current.play().catch(e => console.error("Audio play error:", e));
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      } 

      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        } 
      });
      streamRef.current = stream;

      if (sourceRef.current) sourceRef.current.disconnect();
      if (processorRef.current) processorRef.current.disconnect();

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Сборка контекста для ИИ
      const activeTasksList = tasksRef.current.filter(t => !t.isCompleted).slice(0, 15).map(t => `- [ID: ${t.id}] [${t.priority}] ${t.title}`).join('\n');
      const activeTasksCtx = activeTasksList || 'Задач нет';

      const projectsList = projectsRef.current.slice(0, 5).map(p => `-[ID: ${p.id}] ${p.title}`).join('\n');
      const projectsCtx = projectsList || 'Проектов нет';

      const habitsList = habitsRef.current.map(h => `- [ID: ${h.id}] ${h.title}`).join('\n');
      const habitsCtx = habitsList || 'Привычек нет';

      const thoughtsList = thoughtsRef.current.slice(0, 15).map(t => `- [ID: ${t.id}] ${t.content.substring(0, 150)}...`).join('\n');
      const thoughtsCtx = thoughtsList || 'Заметок нет';

      const shortTermList = memoriesRef.current.filter(m => m.type === 'short_term' || !m.type).map(m => `- [ID: ${m.id}] ${m.content}`).join('\n');
      const shortTermCtx = shortTermList || 'Нет записей';

      const longTermList = memoriesRef.current.filter(m => m.type === 'long_term').map(m => `- [ID: ${m.id}] ${m.content}`).join('\n');
      const longTermCtx = longTermList || 'Нет записей';

      const journalList = journalRef.current.slice(0, 3).map(j => `- [${j.date}] ${j.mood} ${j.content.substring(0, 150)}...`).join('\n');
      const journalCtx = journalList || 'Дневник пуст';

      const existingTags = Array.from(new Set(thoughtsRef.current.flatMap(t => t.tags || [])))
        .map(t => t.toLowerCase())
        .join(', ');

      const SYSTEM_INSTRUCTION = generateSystemInstruction({
          userName,
          tasks: tasksRef.current,
          notes: thoughtsRef.current,
          journal: journalRef.current,
          projects: projectsRef.current,
          habits: habitsRef.current,
          memories: memoriesRef.current,
          existingTags,
          isLiveMode: true
      });

      const savedVoice = localStorage.getItem('sb_voice') || 'Charon';

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: savedVoice } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: tools }],
          // inputAudioTranscription: { model: "google_speech" }, 
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            startTimeRef.current = Date.now();
            
            // Only reset attempts if connection has been stable for 5 seconds
            setTimeout(() => {
                if (Date.now() - startTimeRef.current > 4000) {
                    reconnectAttemptsRef.current = 0;
                }
            }, 5000);
            
            logger.log('LiveAPI', 'Connected to Gemini Live', 'success');

            // Proactive Greeting & Briefing
            const hoursSinceLast = (Date.now() - getLastBriefingTime()) / (1000 * 60 * 60);
            let initialPrompt = "";
            
            if (hoursSinceLast > 4 || getLastBriefingTime() === 0) {
                initialPrompt = `Системная команда: Пользователь только что открыл голосовой режим. Поздоровайся с ним по имени (${userName || 'Аден'}), скажи какой сейчас день/время и сделай очень краткий брифинг по его открытым задачам и последним мыслям. Будь краток и прагматичен.`;
            } else {
                initialPrompt = `Системная команда: Пользователь вернулся. Коротко поприветствуй его (1-2 слова, например 'Я на связи' или 'Слушаю') и жди команды.`;
            }

            sessionPromise.then((session) => {
                session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: initialPrompt }] }], turnComplete: true });
            });
            
            localStorage.setItem('serafim_last_briefing', Date.now().toString());

            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }

            let liveSession: any = null;
            sessionPromise.then(s => liveSession = s);
            
            processorRef.current!.onaudioprocess = (e) => {
              if (!liveSession) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              const inputSampleRate = audioContextRef.current?.sampleRate || 48000;
              const targetSampleRate = 16000;
              
              // Downsample if needed
              let processedData = inputData;
              if (inputSampleRate > targetSampleRate) {
                  const ratio = inputSampleRate / targetSampleRate;
                  const newLength = Math.floor(inputData.length / ratio);
                  processedData = new Float32Array(newLength);
                  for (let i = 0; i < newLength; i++) {
                      processedData[i] = inputData[Math.floor(i * ratio)];
                  }
              }

              // Calculate volume for UI (throttle state update)
              const now = Date.now();
              if (now - lastVolumeUpdateRef.current > 100) {
                 let sum = 0;
                 let validSamples = 0;
                 for (let i = 0; i < inputData.length; i++) {
                   if (!isNaN(inputData[i])) {
                       sum += inputData[i] * inputData[i];
                       validSamples++;
                   }
                 }
                 const newVolume = validSamples > 0 ? Math.sqrt(sum / validSamples) : 0;
                 setVolume(Number.isFinite(newVolume) ? newVolume : 0);
                 lastVolumeUpdateRef.current = now;
              }

              // Convert Float32 to Int16 PCM
              const pcm16 = new Int16Array(processedData.length);
              for (let i = 0; i < processedData.length; i++) {
                let s = Math.max(-1, Math.min(1, processedData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }

              // Base64 encode efficiently
              const buffer = new Uint8Array(pcm16.buffer);
              const chunks: string[] = [];
              for (let i = 0; i < buffer.length; i += 0x8000) {
                  // @ts-ignore
                  chunks.push(String.fromCharCode.apply(null, buffer.subarray(i, i + 0x8000)));
              }
              const base64Data = btoa(chunks.join(''));

              liveSession.sendRealtimeInput({
                media: {
                  mimeType: `audio/pcm;rate=${targetSampleRate}`,
                  data: base64Data
                }
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              stopAudioPlayback();
            }

            const textPart = message.serverContent?.modelTurn?.parts?.find(p => p.text);
            if (textPart && textPart.text) {
                if (onLiveTextStream) {
                    onLiveTextStream(textPart.text);
                }
                // Capture Model Turn
                sessionTranscriptRef.current.push({
                    id: Date.now().toString(),
                    role: 'model',
                    content: textPart.text,
                    timestamp: Date.now()
                });
            }

            // Capture User Turn (if available via inputAudioTranscription)
            // Note: The exact field for user transcript in Live API might vary, 
            // but often it's in turnComplete or a specific serverContent type.
            // For now, we rely on the fact that we are sending audio.
            // If the API returns a transcript, we should capture it.
            // Checking for 'turnComplete' which might contain input transcription.
            // @ts-ignore - The type definition might not be fully up to date with the preview features
            const userTranscript = message.serverContent?.turnComplete?.inputAudioTranscription?.transcript;
             // @ts-ignore
            const userTranscript2 = message.serverContent?.inputAudioTranscription?.transcript;

            if (userTranscript) {
                 sessionTranscriptRef.current.push({
                    id: Date.now().toString(),
                    role: 'user',
                    content: userTranscript,
                    timestamp: Date.now()
                });
            } else if (userTranscript2) {
                 sessionTranscriptRef.current.push({
                    id: Date.now().toString(),
                    role: 'user',
                    content: userTranscript2,
                    timestamp: Date.now()
                });
            }


            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && !message.serverContent?.interrupted) {
              playAudioChunk(base64Audio);
            }

            // Handle Tool Calls
            const toolCalls = message.toolCall?.functionCalls;
            if (toolCalls && toolCalls.length > 0) {
               const session = await sessionPromise;
               const responses = [];
               
               for (const call of toolCalls) {
                 logger.log('LiveTool', `Calling ${call.name}`, 'info');
                 let result: Record<string, any> = { result: "Success" };
                 const args = call.args as any;

                 try {
                   result = await executeTool(call.name || '', args);
                 } catch (e: any) {
                   logger.log('LiveTool', `Error: ${e.message}`, 'error');
                   result = { result: `Error: ${e.message}` };
                 }
                 
                 responses.push({
                   id: call.id,
                   name: call.name,
                   response: result
                 });
               }
               
               session.sendToolResponse({ functionResponses: responses });
            }
          },
          onclose: () => {
            setIsConnected(false);
            logger.log('LiveAPI', 'Disconnected', 'warning');
            
            // Auto-reconnect if not manually closed
            const connectionDuration = Date.now() - startTimeRef.current;
            
            if (!isManualCloseRef.current && reconnectAttemptsRef.current < 5) {
                // If connection was very short (< 2s), treat as immediate failure
                reconnectAttemptsRef.current += 1;
                
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
                logger.log('LiveAPI', `Reconnecting in ${delay}ms... (Attempt ${reconnectAttemptsRef.current})`, 'info');
                setTimeout(connectToGemini, delay);
            } else if (reconnectAttemptsRef.current >= 5) {
                 logger.log('LiveAPI', 'Max reconnect attempts reached', 'error');
                 handleClose(); 
            } else {
                 handleClose();
            }
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            setError("Ошибка соединения");
          }
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      logger.log('LiveAPI', `Connection failed: ${err.message}`, 'error');
      setError(err.message);
      setIsConnecting(false);
      
      // Retry on initial connection fail too
      if (!isManualCloseRef.current && reconnectAttemptsRef.current < 5) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          setTimeout(connectToGemini, delay);
      }
    }
  };

  const silenceTimeoutRef = useRef<any>(null);

  const playAudioChunk = (base64Audio: string) => {
    if (!audioContextRef.current) return;

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create Int16Array from the bytes (PCM data)
    const int16Data = new Int16Array(bytes.buffer);
    
    // Convert to Float32 for Web Audio API
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      // Normalize 16-bit integer to float range [-1.0, 1.0]
      float32Data[i] = int16Data[i] / 32768.0;
    }

    playbackQueueRef.current.push(float32Data);
    processQueue();
  };

  const processQueue = async () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

    if (ctx.state === 'suspended') {
        await ctx.resume();
    }

    if (playbackQueueRef.current.length === 0) return;

    const chunks = [...playbackQueueRef.current];
    playbackQueueRef.current = [];

    // Calculate total length
    let totalLen = 0;
    for (const chunk of chunks) {
        totalLen += chunk.length;
    }

    if (totalLen === 0) return;

    const combinedData = new Float32Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
        combinedData.set(chunk, offset);
        offset += chunk.length;
    }

    try {
        const buffer = ctx.createBuffer(1, combinedData.length, 24000);
        buffer.copyToChannel(combinedData, 0);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        activeSourcesRef.current.push(source);
        
        source.onended = () => {
            activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
        };

        if (gainNodeRef.current) {
            source.connect(gainNodeRef.current);
        } else {
            source.connect(ctx.destination);
        }

        if (nextPlayTimeRef.current < ctx.currentTime) {
            nextPlayTimeRef.current = ctx.currentTime + 0.05;
        }

        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += buffer.duration;

        // Update UI state
        setIsSpeaking(true);
        
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        
        const timeUntilEnd = (nextPlayTimeRef.current - ctx.currentTime) * 1000;
        silenceTimeoutRef.current = setTimeout(() => {
            setIsSpeaking(false);
        }, Math.max(0, timeUntilEnd + 200)); 
    } catch (err) {
        console.error("Audio playback error:", err);
    }
  };

  const stopLiveSession = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.srcObject = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    audioDestRef.current = null;
    gainNodeRef.current = null;
  };

  // --- RENDER ---

  if (isMinimized) {
      return (
          <div className="fixed bottom-24 right-6 z-[100] animate-in zoom-in slide-in-from-bottom-10">
              <div className="relative group">
                  {/* Status Ring */}
                  <div className={`absolute inset-0 rounded-full blur-md transition-all duration-500 ${isSpeaking ? 'bg-emerald-500 opacity-60 scale-125' : isConnected ? 'bg-[var(--accent)] opacity-40 scale-110' : 'bg-red-500 opacity-20'}`}></div>
                  
                  {/* Main Bubble */}
                  <div className="relative w-16 h-16 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center shadow-2xl overflow-hidden cursor-pointer hover:scale-105 transition-transform" onClick={() => setIsMinimized(false)}>
                      {isSpeaking ? (
                          <div className="flex gap-1 items-end h-6">
                              {[...Array(3)].map((_, i) => (
                                  <div key={i} className="w-1.5 bg-emerald-400 rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: `${i * 0.1}s`, height: '100%' }}></div>
                              ))}
                          </div>
                      ) : (
                          <div className="relative">
                              <Activity size={24} className={`text-white transition-all ${isConnected ? 'opacity-100' : 'opacity-50'}`} />
                              {/* Volume indicator */}
                              <div className="absolute inset-0 bg-[var(--accent)] rounded-full opacity-20" style={{ transform: `scale(${1 + volume * 3})` }}></div>
                          </div>
                      )}
                  </div>

                  {/* Controls */}
                  <button onClick={(e) => { e.stopPropagation(); handleClose(); }} className="absolute -top-1 -right-1 w-6 h-6 bg-white/10 hover:bg-red-500 rounded-full flex items-center justify-center text-[var(--text-on-accent)]/50 hover:text-[var(--text-on-accent)] transition-colors backdrop-blur-md">
                      <X size={12} />
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="absolute top-6 right-6 flex gap-4">
          <button 
            onClick={() => setIsMinimized(true)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-[var(--text-on-accent)]/70 hover:text-[var(--text-on-accent)] transition-all"
          >
            <Minimize2 size={24} />
          </button>
          <button 
            onClick={handleClose}
            className="p-3 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full text-[var(--text-on-accent)]/70 transition-all"
          >
            <X size={24} />
          </button>
      </div>

      <div className="text-center space-y-12 relative w-full max-w-md px-6">
        
        {/* Main Visualizer */}
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
          {/* Ambient Glow */}
          <div 
            className={`absolute inset-0 rounded-full blur-[80px] transition-all duration-700 ${isSpeaking ? 'bg-emerald-500/30' : 'bg-[var(--accent)]/20'}`}
            style={{ transform: `scale(${1 + volume * 2})` }}
          />
          
          {/* Central Orb */}
          <div className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${isConnected ? 'bg-black border border-white/10 shadow-[0_0_60px_rgba(255,255,255,0.05)]' : 'bg-white/5'}`}>
            {isConnecting ? (
              <Loader2 size={48} className="animate-spin text-[var(--accent)]" />
            ) : error ? (
              <MicOff size={48} className="text-red-400" />
            ) : isSpeaking ? (
               <div className="flex gap-2 items-center h-16">
                  {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-2 bg-emerald-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" style={{ height: `${40 + Math.random() * 60}%`, animationDelay: `${i * 0.1}s` }}></div>
                  ))}
               </div>
            ) : (
              <Activity size={56} className="text-[var(--accent)] opacity-80" />
            )}
          </div>

          {/* Ripple Rings */}
          {isConnected && !isSpeaking && (
              <>
                <div className="absolute inset-0 border border-white/5 rounded-full animate-[ping_3s_infinite]" />
                <div className="absolute inset-4 border border-white/5 rounded-full animate-[ping_3s_infinite_0.5s]" />
              </>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-black text-[var(--text-on-accent)] tracking-widest uppercase font-mono">
            {isSpeaking ? 'Серафим говорит' : 'Слушаю...'}
          </h2>
          <p className="text-[var(--text-on-accent)]/40 font-mono text-sm max-w-xs mx-auto leading-relaxed">
            {statusMessage ? statusMessage :
             isConnecting ? 'Установка нейронного моста...' : 
             error ? error : 
             'Говорите свободно. Я управляю системой.'}
          </p>
        </div>

        {/* Volume Bar */}
        {isConnected && (
          <div className="flex justify-center gap-1.5 h-12 items-end opacity-50">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i}
                className={`w-1.5 rounded-full transition-all duration-75 ${isSpeaking ? 'bg-emerald-500' : 'bg-[var(--accent)]'}`}
                style={{ height: `${Math.max(10, volume * 300 * (Math.sin(i) + 1.5))}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveAudioAgent;
