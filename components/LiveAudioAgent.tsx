import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Mic, MicOff, X, Loader2, AudioLines, Minimize2, Maximize2, Square, Activity } from 'lucide-react';
import { logger } from '../services/logger';
import { Task, Thought, JournalEntry, Project, Habit, Memory, Priority, ThemeKey, ChatMessage } from '../types';
import { format } from 'date-fns';
import { generateSystemInstruction } from '../services/serafimPersona';
import { generateSessionSummary } from '../services/geminiService';

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
  onSetTheme: (theme: ThemeKey) => void;
  onStartFocus: (minutes: number) => void;
  onDeleteTask: (id: string) => void;
  onLiveTextStream?: (text: string) => void;
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

const tools: FunctionDeclaration[] = [
  {
    name: "manage_task",
    description: "Управляет задачами (создание, обновление, удаление).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "update", "delete"] },
        id: { type: Type.STRING, description: "ID задачи (обязательно для update/delete)" },
        title: { type: Type.STRING },
        priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
        dueDate: { type: Type.STRING },
        projectId: { type: Type.STRING },
        isCompleted: { type: Type.BOOLEAN }
      },
      required: ["action"]
    }
  },
  {
    name: "manage_thought",
    description: "Управляет идеями и заметками. ОБЯЗАТЕЛЬНО генерируй 1-3 релевантных хештега в массив tags (на русском языке, строчными буквами, без решетки, например ['идеи', 'проект_х']). Семантически анализируй текст пользователя для подбора тегов.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "update", "delete"] },
        id: { type: Type.STRING, description: "ID идеи (обязательно для update/delete)" },
        title: { type: Type.STRING, description: "Заголовок идеи (короткое название)" },
        content: { type: Type.STRING, description: "Основной текст заметки/мысли (содержание)" },
        sectionTitle: { type: Type.STRING, description: "Название раздела для заметки (по умолчанию 'Заметки')" },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Массив хештегов (без #). Пример: ['работа', 'важное']" },
        mode: { type: Type.STRING, enum: ["replace", "append"], description: "append - добавить к тексту, replace - заменить полностью. По умолчанию append." }
      },
      required: ["action"]
    }
  },
  {
    name: "save_journal_entry",
    description: "Сохраняет запись в Дневник.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING },
        mood: { type: Type.STRING, enum: ["😔", "😐", "🙂", "😃", "🤩"] },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["content", "mood"]
    }
  },
  {
    name: "remember_fact",
    description: "Сохраняет важный факт о пользователе.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        fact: { type: Type.STRING }
      },
      required: ["fact"]
    }
  },
  {
    name: "manage_project",
    description: "Управляет проектами (создание, обновление).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "update"] },
        id: { type: Type.STRING, description: "ID проекта (обязательно для update)" },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        color: { type: Type.STRING }
      },
      required: ["action"]
    }
  },
  {
    name: "ui_control",
    description: "Управляет интерфейсом приложения.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, enum: ["set_theme", "start_focus"] },
        themeName: { type: Type.STRING },
        duration: { type: Type.NUMBER }
      },
      required: ["command"]
    }
  }
];

const LiveAudioAgent: React.FC<LiveAudioAgentProps> = ({ 
  onClose, userName, 
  tasks, thoughts, journal, projects, habits, memories,
  chatHistory, onLiveSessionEnd,
  onAddTask, onUpdateTask, onDeleteTask, onAddThought, onUpdateThought, onDeleteThought, onAddJournal, onAddProject, onUpdateProject, onAddMemory, onSetTheme, onStartFocus, onLiveTextStream
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
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const sessionTranscriptRef = useRef<ChatMessage[]>([]);

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
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  const reconnectAttemptsRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const isManualCloseRef = useRef(false);

  useEffect(() => {
    connectToGemini();
    return () => {
      isManualCloseRef.current = true;
      stopLiveSession();
    };
  }, []);

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
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      } 

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Prepare Context
      const existingTags = Array.from(new Set(thoughts.flatMap(t => t.tags || []))).join(', ');

      const SYSTEM_INSTRUCTION = generateSystemInstruction({
          userName,
          tasks,
          thoughts,
          journal,
          projects,
          habits,
          memories,
          existingTags,
          chatHistory,
          isLiveMode: true
      });

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
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

            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }

            processorRef.current!.onaudioprocess = (e) => {
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

              // Calculate volume for UI (using original data for better resolution)
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              setVolume(Math.sqrt(sum / inputData.length));

              // Convert Float32 to Int16 PCM
              const pcm16 = new Int16Array(processedData.length);
              for (let i = 0; i < processedData.length; i++) {
                let s = Math.max(-1, Math.min(1, processedData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }

              // Base64 encode
              const buffer = new Uint8Array(pcm16.buffer);
              let binary = '';
              const len = buffer.byteLength;
              for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(buffer[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: {
                    mimeType: `audio/pcm;rate=${targetSampleRate}`,
                    data: base64Data
                  }
                });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              playbackQueueRef.current = [];
              isPlayingRef.current = false;
              setIsSpeaking(false);
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
            if (base64Audio) {
              playAudioChunk(base64Audio);
            }

            // Handle Tool Calls
            const toolCalls = message.toolCall?.functionCalls;
            if (toolCalls && toolCalls.length > 0) {
               const session = await sessionPromise;
               const responses = [];
               
               for (const call of toolCalls) {
                 logger.log('LiveTool', `Calling ${call.name}`, 'info');
                 let result = { result: "Success" };
                 const args = call.args as any;

                 try {
                   const cleanUpdates = (obj: any) => {
                     const newObj: any = {};
                     Object.keys(obj).forEach(key => {
                       if (obj[key] !== undefined) {
                         newObj[key] = obj[key];
                       }
                     });
                     return newObj;
                   };

                   switch (call.name) {
                     case 'manage_task':
                       if (args.action === 'create') {
                         onAddTask({ id: Date.now().toString(), title: args.title, priority: args.priority || Priority.MEDIUM, dueDate: args.dueDate || null, isCompleted: false, projectId: args.projectId, createdAt: new Date().toISOString() });
                         result = { result: `Task "${args.title}" created.` };
                       } else if (args.action === 'update' && args.id) {
                         const updates = cleanUpdates({ title: args.title, priority: args.priority, dueDate: args.dueDate, isCompleted: args.isCompleted, projectId: args.projectId });
                         onUpdateTask(args.id, updates);
                         result = { result: `Task updated.` };
                       } else if (args.action === 'delete' && args.id) {
                         onDeleteTask(args.id);
                         result = { result: `Task deleted.` };
                       }
                       break;
                     case 'manage_thought': // Renamed from create_idea
                       if (args.action === 'create') {
                           const title = args.title || (args.content ? args.content.slice(0, 50) + (args.content.length > 50 ? '...' : '') : 'Новая идея');
                           const sectionTitle = args.sectionTitle || 'Заметки';
                           const sectionContent = args.content || '';
                           
                           onAddThought({ 
                               id: Date.now().toString(), 
                               content: title, 
                               notes: sectionContent, 
                               sections: [{ id: 'default', title: sectionTitle, content: sectionContent }],
                               type: 'idea', 
                               tags: (args.tags || []).map((t: string) => t.toLowerCase().trim()), 
                               createdAt: new Date().toISOString() 
                           });
                           result = { result: `Idea "${title}" created.` };
                       } else if (args.action === 'update' && args.id) {
                           const existing = thoughts.find(t => t.id === args.id);
                           if (!existing) {
                               result = { result: `Idea not found.` };
                               break;
                           }

                           if (!args.mode) args.mode = 'append';
                           
                           let updates: Partial<Thought> = {};
                           if (args.title) updates.content = args.title;
                           if (args.tags) updates.tags = args.tags.map((t: string) => t.toLowerCase().trim());

                           if (args.content) {
                               const sections = existing.sections ? [...existing.sections] : [{ id: 'default', title: 'Заметки', content: existing.notes || '' }];
                               const targetSectionTitle = args.sectionTitle || 'Заметки';
                               let targetSectionIndex = sections.findIndex(s => s.title === targetSectionTitle);
                               
                               if (targetSectionIndex === -1 && !args.sectionTitle) {
                                   targetSectionIndex = 0; // Default to first section
                               }

                               if (targetSectionIndex !== -1) {
                                   const section = sections[targetSectionIndex];
                                   let newContent = args.content;
                                   if (args.mode === 'append') {
                                       newContent = section.content + '\n' + args.content;
                                   }
                                   sections[targetSectionIndex] = { ...section, content: newContent };
                               } else {
                                   // Create new section
                                   sections.push({
                                       id: Date.now().toString(),
                                       title: targetSectionTitle,
                                       content: args.content
                                   });
                               }
                               updates.sections = sections;
                               // Sync notes for backward compatibility
                               if (sections[0]) updates.notes = sections[0].content;
                           }

                           onUpdateThought(args.id, updates);
                           result = { result: `Idea updated.` };
                       } else if (args.action === 'delete') {
                           let targetId = args.id;
                           // Fallback: Find by title/content if ID not found
                           if (!targetId || !thoughts.find(t => t.id === targetId)) {
                               const match = thoughts.find(t => 
                                   t.content.toLowerCase().includes(args.title?.toLowerCase() || '') ||
                                   t.content.toLowerCase().includes(args.content?.toLowerCase() || '')
                               );
                               if (match) targetId = match.id;
                           }

                           if (targetId) {
                               onDeleteThought(targetId);
                               result = { result: `Idea deleted.` };
                           } else {
                               result = { result: `Error: Idea not found. Please provide exact ID or title.` };
                           }
                       }
                       break;
                     case 'save_journal_entry':
                       onAddJournal({ content: args.content, mood: args.mood || '😐', tags: args.tags || [], date: format(new Date(), 'yyyy-MM-dd') });
                       result = { result: "Journal entry saved." };
                       break;
                     case 'remember_fact':
                       onAddMemory({ id: Date.now().toString(), content: args.fact, createdAt: new Date().toISOString() });
                       result = { result: "Fact remembered." };
                       break;
                     case 'manage_project':
                       if (args.action === 'create') {
                           onAddProject({ id: Date.now().toString(), title: args.title, description: args.description, color: args.color || '#6366f1', createdAt: new Date().toISOString() });
                           result = { result: `Project "${args.title}" created.` };
                       } else if (args.action === 'update' && args.id) {
                           const updates = cleanUpdates({ title: args.title, description: args.description, color: args.color });
                           onUpdateProject(args.id, updates);
                           result = { result: `Project updated.` };
                       }
                       break;
                     case 'ui_control':
                       if (args.command === 'set_theme' && args.themeName) onSetTheme(args.themeName as ThemeKey);
                       if (args.command === 'start_focus') onStartFocus(args.duration || 25);
                       result = { result: "UI updated." };
                       break;
                   }
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

    const combinedData = new Float32Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
        combinedData.set(chunk, offset);
        offset += chunk.length;
    }

    const buffer = ctx.createBuffer(1, combinedData.length, 24000);
    buffer.copyToChannel(combinedData, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
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
    }, timeUntilEnd + 200); // Increased buffer slightly
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
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
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
                  <button onClick={(e) => { e.stopPropagation(); handleClose(); }} className="absolute -top-1 -right-1 w-6 h-6 bg-white/10 hover:bg-red-500 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors backdrop-blur-md">
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
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all"
          >
            <Minimize2 size={24} />
          </button>
          <button 
            onClick={handleClose}
            className="p-3 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full text-white/70 transition-all"
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
          <h2 className="text-3xl font-black text-white tracking-widest uppercase font-mono">
            {isSpeaking ? 'Серафим говорит' : 'Слушаю...'}
          </h2>
          <p className="text-white/40 font-mono text-sm max-w-xs mx-auto leading-relaxed">
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
