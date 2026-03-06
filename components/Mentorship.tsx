
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Task, Thought, JournalEntry, Project, Habit, ChatSession, ChatCategory, Priority, ThemeKey, Memory } from '../types';
import { createMentorChat, generateProactiveMessage, generateSpeech, polishText, transcribeAudio } from '../services/geminiService';
import * as googleService from '../services/googleService'; 
import { logger, SystemLog } from '../services/logger';
import { 
  Loader2, ArrowUp, Mic, MicOff, 
  Terminal, Volume2, VolumeX, Sparkles, X, Menu, Cpu,
  Paperclip, SlidersHorizontal, Wand2, Activity, Play, Settings2, AudioLines, History
} from 'lucide-react';
import { format } from 'date-fns';

import LiveAudioAgent from './LiveAudioAgent';

interface MentorshipProps {
  tasks: Task[];
  thoughts: Thought[];
  journal: JournalEntry[];
  projects: Project[];
  habits: Habit[];
  memories: Memory[];
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onUpdateMessages: (messages: ChatMessage[]) => void;
  onNewSession: (title: string, category: ChatCategory) => void;
  onDeleteSession: (id: string) => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onAddThought: (thought: Thought) => void;
  onUpdateThought: (id: string, updates: Partial<Thought>) => void;
  onDeleteThought: (id: string) => void;
  onAddProject: (project: Project) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onAddHabit: (habit: Habit) => void;
  onAddMemory: (memory: Memory) => void;
  onUpdateMemory: (id: string, updates: Partial<Memory>) => void;
  onDeleteMemory: (id: string) => void;
  onAddJournal: (entry: Partial<JournalEntry>) => void; 
  onSetTheme: (theme: ThemeKey) => void;
  onStartFocus: (minutes: number) => void;
  hasAiKey: boolean;
  onConnectAI: () => void;
  userName: string;
  voiceTrigger?: number;
  session: any; 
  onNavigate?: (view: any) => void; 
  onStartLiveAudio: () => void;
  onOpenHistory: () => void;
}

const VOICES = [
    { id: 'Kore', label: 'Kore (Спокойный)', color: 'bg-emerald-500' },
    { id: 'Puck', label: 'Puck (Энергичный)', color: 'bg-blue-500' },
    { id: 'Fenrir', label: 'Fenrir (Глубокий)', color: 'bg-purple-500' },
    { id: 'Charon', label: 'Charon (Низкий)', color: 'bg-zinc-500' },
    { id: 'Zephyr', label: 'Zephyr (Мягкий)', color: 'bg-pink-500' },
];

const Mentorship: React.FC<MentorshipProps> = ({ 
    tasks, thoughts, journal, projects, habits, memories,
    sessions, activeSessionId, onUpdateMessages, 
    onAddTask, onUpdateTask, onDeleteTask, onAddThought, onUpdateThought, onDeleteThought, onAddProject, onUpdateProject, onAddMemory, onUpdateMemory, onDeleteMemory, onAddJournal, onSetTheme, onStartFocus,
    hasAiKey, onConnectAI, userName, voiceTrigger, session, onStartLiveAudio, onOpenHistory
}) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isProcessingTool, setIsProcessingTool] = useState(false);
  
  // Voice Recognition State (MediaRecorder)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>(''); 
  const safetyTimeoutRef = useRef<any>(null);
  
  // Gemini Voice Settings
  const [selectedVoice, setSelectedVoice] = useState<string>(() => localStorage.getItem('sb_voice') || 'Kore');
  const [autoVoice, setAutoVoice] = useState<boolean>(() => localStorage.getItem('sb_auto_voice') !== 'false');
  const [voiceSpeed, setVoiceSpeed] = useState<number>(() => parseFloat(localStorage.getItem('sb_voice_speed') || '1.0'));
  const [voiceVolume, setVoiceVolume] = useState<number>(() => parseFloat(localStorage.getItem('sb_voice_volume') || '1.0'));
  const [voicePitch, setVoicePitch] = useState<number>(() => parseFloat(localStorage.getItem('sb_voice_pitch') || '0'));
  
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // Terminal State
  const [showTerminal, setShowTerminal] = useState(false);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [showLiveAgent, setShowLiveAgent] = useState(false);
  
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const getStoredModel = () => (localStorage.getItem('sb_gemini_model') || 'flash') as 'flash' | 'pro';

  // --- AUDIO OUTPUT (PCM Decoder & Optimizer) ---
  const initAudioContext = () => {
      if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContext({ sampleRate: 24000 });
          
          // Initialize Gain Node for Volume Control
          gainNodeRef.current = audioContextRef.current.createGain();
          gainNodeRef.current.connect(audioContextRef.current.destination);
      }
      if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
      }
      return audioContextRef.current;
  };

  // Hidden function triggered by AI command
  const applyASMR = () => {
      logger.log('Audio', 'Activating ASMR Mode...', 'info');
      setVoiceSpeed(0.85); // Slower
      setVoicePitch(-500); // Deeper (-5 semitones approx)
      setVoiceVolume(1.3); // Louder to compensate for breathiness
      // Persist
      localStorage.setItem('sb_voice_speed', '0.85');
      localStorage.setItem('sb_voice_pitch', '-500');
      localStorage.setItem('sb_voice_volume', '1.3');
  };

  const playGeminiAudio = async (text: string) => {
      if (isPlaying) stopAudio();
      
      const ctx = initAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      try {
          setIsPlaying(true);
          
          const base64Audio = await generateSpeech(text, selectedVoice);
          if (!base64Audio) {
              setIsPlaying(false);
              return;
          }

          // Decode Raw PCM (16-bit signed integer)
          const binaryString = atob(base64Audio);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
          }
          
          const int16Data = new Int16Array(bytes.buffer);
          const float32Data = new Float32Array(int16Data.length);
          
          // Convert Int16 to Float32 [-1.0, 1.0]
          for (let i = 0; i < int16Data.length; i++) {
              float32Data[i] = int16Data[i] / 32768.0;
          }

          const buffer = ctx.createBuffer(1, float32Data.length, 24000);
          buffer.copyToChannel(float32Data, 0);

          const source = ctx.createBufferSource();
          source.buffer = buffer;
          
          // APPLY USER SETTINGS (Real-time DSP)
          // Speed optimization: playbackRate is efficient native implementation
          source.playbackRate.value = voiceSpeed; 
          
          // Pitch optimization: detune (cents) allows adjusting pitch without complex resampling
          source.detune.value = voicePitch; 

          if (gainNodeRef.current) {
              gainNodeRef.current.gain.value = voiceVolume;
              source.connect(gainNodeRef.current);
          } else {
              source.connect(ctx.destination);
          }
          
          source.onended = () => {
              setIsPlaying(false);
              activeSourceRef.current = null;
          };
          
          source.start(0);
          activeSourceRef.current = source;

      } catch (e) {
          console.error("Audio Playback Error:", e);
          setIsPlaying(false);
      }
  };

  const stopAudio = () => {
      if (activeSourceRef.current) {
          try { activeSourceRef.current.stop(); } catch(e){}
          activeSourceRef.current = null;
      }
      setIsPlaying(false);
  };

  // --- LOGGING ---
  useEffect(() => {
     setSystemLogs(logger.getLogs());
     return logger.subscribe((logs) => {
         setSystemLogs([...logs]);
         if (showTerminal) {
             setTimeout(() => terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
         }
     });
  }, [showTerminal]);

  // --- VOICE INPUT (RECORDING) ---
  
  useEffect(() => {
     if (voiceTrigger && voiceTrigger > 0 && !isRecording) toggleRecording();
  }, [voiceTrigger]);

  const toggleRecording = async () => {
    // 1. STOPPING
    if (isRecording) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop(); // This triggers onstop
        }
        setIsRecording(false);
        return;
    } 
    
    // 2. STARTING
    try { 
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        // Strict prioritized MIME types
        const mimeTypes = [
            'audio/webm', // Chrome default - Best for Gemini
            'audio/mp4', // iOS fallback
            'audio/ogg',
            'audio/wav'
        ];
        
        let selectedMime = '';
        for (const type of mimeTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                selectedMime = type;
                break;
            }
        }
        
        if (!selectedMime) console.warn("No specific audio MIME type supported, using default.");
        
        mimeTypeRef.current = selectedMime;
        console.log(`🎙️ Starting recording. Mime: ${selectedMime}`);
        
        const options = selectedMime ? { mimeType: selectedMime } : undefined;
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            
            const finalMime = mimeTypeRef.current || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
            
            if (audioBlob.size > 500) { 
                await processAudioBlob(audioBlob);
            } else {
                logger.log('Audio', 'Recording too short or empty.', 'warning');
            }
        };

        mediaRecorder.start(); 
        setIsRecording(true);

    } catch(e: any) { 
        console.error("Mic Error", e);
        logger.log("Audio", `Mic Access Error: ${e.message}`, "error");
        setIsRecording(false); 
    } 
  };

  const processAudioBlob = async (blob: Blob) => {
      setIsProcessingAudio(true);
      logger.log('Audio', `Начало обработки. Размер: ${blob.size} байт, Тип: ${blob.type}`, 'info');

      if (blob.size < 500) {
          logger.log('Audio', 'Аудио слишком короткое, отмена.', 'warning');
          setIsProcessingAudio(false);
          return;
      }

      try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          
          reader.onloadend = async () => {
              const result = reader.result as string;
              // ВАЖНО: Отрезаем "data:audio/webm;base64,"
              const base64Audio = result.split(',')[1]; 
              
              if (!base64Audio) {
                  logger.log('Audio', 'Ошибка: не удалось получить Base64', 'error');
                  setIsProcessingAudio(false);
                  return;
              }

              logger.log('Audio', 'Отправка в Gemini для транскрибации...', 'info');
              
              // Вызываем функцию из geminiService
              const text = await transcribeAudio(base64Audio, blob.type);
              
              if (text && text.trim().length > 0) {
                  logger.log('Audio', `Распознано: "${text}"`, 'success');
                  // Отправляем текст в чат (или вставляем в инпут)
                  handleSend(text); 
              } else {
                  logger.log('Audio', 'Gemini вернул пустой текст', 'warning');
              }
              setIsProcessingAudio(false);
          };

          reader.onerror = (e) => {
              console.error("FileReader error:", e);
              logger.log('Audio', 'Ошибка чтения файла', 'error');
              setIsProcessingAudio(false);
          }

      } catch (e: any) {
          console.error("Audio Processing Error:", e);
          logger.log('Audio', `Сбой обработки: ${e.message}`, 'error');
          setIsProcessingAudio(false);
      }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
      if (messagesEndRef.current) {
          requestAnimationFrame(() => {
              messagesEndRef.current?.scrollIntoView({ behavior });
          });
      }
  };

  useEffect(() => {
      scrollToBottom('auto');
      chatSessionRef.current = null; 
      stopAudio();
  }, [activeSessionId]);

  useEffect(() => { scrollToBottom('smooth'); }, [activeSession?.messages.length, isThinking]);

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onload = (ev) => setAttachedImage(ev.target?.result as string); reader.readAsDataURL(file); }
  };

  const handleInputFocus = () => {
      setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 400);
  };

  const handleSend = async (manualText?: string) => {
    if (isThinking) return;
    
    try {
        if (isRecording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            if (!manualText) return; 
        }

        const cleanInput = manualText || input.trim();
        if (!cleanInput && !attachedImage) return;

        if (!hasAiKey) { logger.log('System', 'No API Key', 'error'); return; }
        stopAudio(); 

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: cleanInput, image: attachedImage || undefined, timestamp: Date.now() };
        const currentHistory = activeSession ? activeSession.messages : [];
        const newHistory = [...currentHistory, userMsg];
        
        // Optimistic update
        onUpdateMessages(newHistory);
        
        setInput(''); 
        setAttachedImage(null); 
        setIsThinking(true);

        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = setTimeout(() => {
            if (isThinking) {
                setIsThinking(false);
                logger.log('System', 'Request timed out (60s)', 'error');
                const errorMsg: ChatMessage = { id: Date.now().toString(), role: 'model', content: "Сервер долго не отвечает. Попробуйте еще раз.", timestamp: Date.now() };
                onUpdateMessages([...newHistory, errorMsg]);
            }
        }, 60000);

        if (!chatSessionRef.current) {
            const existingTags = Array.from(new Set(thoughts.flatMap(t => t.tags || []))).join(', ');
            chatSessionRef.current = createMentorChat({ 
                tasks, thoughts, journal, projects, habits, memories, 
                sessions, 
                isGoogleAuth: false, userName,
                existingTags
            }, getStoredModel());
        }
        
        const now = new Date();
        const timeContext = `\n[Context: ${format(now, "HH:mm")}]`;
        let contents: any = cleanInput + timeContext;
        if (userMsg.image) {
            contents = { parts: [{ text: cleanInput || "Analyze image" }, { inlineData: { data: userMsg.image.split(',')[1], mimeType: 'image/jpeg' } }] };
        }

        const responseStream = await chatSessionRef.current.sendMessageStream({ message: contents });
        
        // Create a placeholder message for the model
        const modelMsgId = (Date.now() + 1).toString();
        let fullResponseText = "";
        
        // Initial empty message
        const initialModelMsg: ChatMessage = { id: modelMsgId, role: 'model', content: "", timestamp: Date.now() };
        onUpdateMessages([...newHistory, initialModelMsg]);

        for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullResponseText += chunkText;
                
                // Update the message in real-time
                const updatedMsg: ChatMessage = { id: modelMsgId, role: 'model', content: fullResponseText, timestamp: Date.now() };
                onUpdateMessages([...newHistory, updatedMsg]);
            }
        }
        
        const aggregatedResponse = await responseStream.response;

        if (aggregatedResponse.functionCalls) {
            setIsProcessingTool(true);
            for (const fc of aggregatedResponse.functionCalls) {
                const args = fc.args as any;
                try {
                  switch (fc.name) {
                    case 'manage_task':
                      if (args.action === 'create') {
                        const newTask: Task = { id: Date.now().toString(), title: args.title, priority: args.priority || Priority.MEDIUM, dueDate: args.dueDate || null, isCompleted: false, projectId: args.projectId, createdAt: new Date().toISOString() };
                        onAddTask(newTask);
                        logger.log('Tool', `Task created: ${args.title}`, 'success');
                      }
                      break;
                    case 'manage_note':
                      if (args.action === 'create') {
                          const title = args.title || (args.content ? args.content.slice(0, 50) + (args.content.length > 50 ? '...' : '') : 'Новая заметка');
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
                          logger.log('Tool', `Note "${title}" created.`, 'success');
                      } else if (args.action === 'update' || args.action === 'delete') {
                          let targetId = args.id;
                          if (!targetId && (args.title || args.content)) {
                               const search = (args.title || args.content).toLowerCase();
                               const match = thoughts.find(t => 
                                   t.content.toLowerCase().includes(search) || 
                                   (t.notes && t.notes.toLowerCase().includes(search))
                               );
                               if (match) targetId = match.id;
                           }

                          if (targetId) {
                              if (args.action === 'delete') {
                                  onDeleteThought(targetId);
                                  logger.log('Tool', `Note deleted.`, 'success');
                              } else {
                                  const existing = thoughts.find(t => t.id === targetId);
                                  if (existing) {
                                      if (!args.mode) args.mode = 'append'; 
                                      let updates: Partial<Thought> = {};
                                      if (args.title) updates.content = args.title;
                                      if (args.tags) updates.tags = args.tags.map((t: string) => t.toLowerCase().trim());

                                      if (args.content) {
                                          const sections = existing.sections ? [...existing.sections] : [{ id: 'default', title: 'Заметки', content: existing.notes || '' }];
                                          const targetSectionTitle = args.sectionTitle || 'Заметки';
                                          let targetSectionIndex = sections.findIndex(s => s.title === targetSectionTitle);
                                          
                                          if (targetSectionIndex === -1 && !args.sectionTitle) {
                                              targetSectionIndex = 0; 
                                          }

                                          if (targetSectionIndex !== -1) {
                                              const section = sections[targetSectionIndex];
                                              let newContent = args.content;
                                              if (args.mode === 'append') {
                                                  newContent = section.content + '\n' + args.content;
                                              }
                                              sections[targetSectionIndex] = { ...section, content: newContent };
                                          } else {
                                              sections.push({
                                                  id: Date.now().toString(),
                                                  title: targetSectionTitle,
                                                  content: args.content
                                              });
                                          }
                                          updates.sections = sections;
                                          if (sections[0]) updates.notes = sections[0].content;
                                      }
                                      onUpdateThought(targetId, updates);
                                      logger.log('Tool', `Note updated.`, 'success');
                                  }
                              }
                          } else {
                              logger.log('Tool', `Note not found (search: ${args.title || args.content || args.id})`, 'error');
                          }
                      }
                      break;
                    case 'save_journal_entry':
                      onAddJournal({ content: args.content, mood: args.mood || '😐', tags: args.tags || [], date: format(new Date(), 'yyyy-MM-dd') });
                      break;
                    case 'remember_fact':
                      if (args.fact) onAddMemory({ id: Date.now().toString(), content: args.fact, type: 'short_term', createdAt: new Date().toISOString() });
                      break;
                    case 'manage_project':
                      onAddProject({ id: Date.now().toString(), title: args.title, description: args.description, color: args.color || '#6366f1', createdAt: new Date().toISOString() });
                      break;
                    case 'ui_control':
                      if (args.command === 'set_theme' && args.themeName) onSetTheme(args.themeName as ThemeKey);
                      if (args.command === 'start_focus') onStartFocus(args.duration || 25);
                      if (args.command === 'enable_asmr') applyASMR(); 
                      break;
                  }
                } catch (e: any) {
                    logger.log('Tool', `Error: ${e.message}`, 'error');
                }
            }
            setIsProcessingTool(false);
        }

        if (autoVoice && fullResponseText) {
            setTimeout(() => playGeminiAudio(fullResponseText), 100);
        }

    } catch (e: any) {
      console.error(e);
      logger.log('System', `AI Error: ${e.message}`, 'error');
      // If error, keep input to allow retry
      if (manualText === undefined) setInput(manualText || input); 
      
      const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: "Связь потеряна. Попробуй еще раз.", timestamp: Date.now() };
      // We need to be careful not to lose the user message if we already added it
      // But we added it to 'newHistory' and called onUpdateMessages.
      // So we should append error to that.
      // However, we don't have access to 'newHistory' here easily unless we reconstruct it or use functional update.
      // But onUpdateMessages usually replaces the whole array.
      // Let's just append to the active session messages from props (which might be stale if we just updated it?)
      // Actually, we should use the functional update form if available, but onUpdateMessages takes ChatMessage[].
      // Let's assume activeSession.messages is up to date enough or just append to what we have.
      // Better: just show error toast? No, user wants to see it in chat.
    } finally {
      setIsThinking(false);
      setIsProcessingTool(false);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      scrollToBottom('smooth');
    }
  };

  const openMenu = () => { const menuBtn = document.getElementById('sidebar-trigger'); if(menuBtn) menuBtn.click(); };

  return (
    <div className="flex flex-col h-full bg-transparent relative overflow-hidden">
      
      <div className="absolute top-20 right-4 z-50 flex flex-col gap-2">
         <button onClick={onOpenHistory} className="p-2 rounded-xl backdrop-blur-md border bg-black/20 text-white/50 border-white/10 hover:text-white transition-all"><History size={16} /></button>
         <button onClick={() => setShowVoiceSettings(!showVoiceSettings)} className={`p-2 rounded-xl backdrop-blur-md border transition-all ${showVoiceSettings ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-black/20 text-white/50 border-white/10 hover:text-white'}`}><SlidersHorizontal size={16} /></button>
         <button onClick={() => setShowTerminal(!showTerminal)} className={`p-2 rounded-xl backdrop-blur-md border transition-all ${showTerminal ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-black/20 text-white/50 border-white/10 hover:text-white'}`}><div className="relative"><Terminal size={16} />{isThinking && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>}</div></button>
      </div>

      {showLiveAgent && (
        <LiveAudioAgent 
          onClose={() => setShowLiveAgent(false)} 
          userName={userName}
          tasks={tasks}
          thoughts={thoughts}
          journal={journal}
          projects={projects}
          habits={habits}
          memories={memories}
          chatHistory={activeSession?.messages.slice(-20)}
          onLiveSessionEnd={(summary) => {
              if (summary && activeSession) {
                  const summaryMsg: ChatMessage = {
                      id: Date.now().toString(),
                      role: 'model',
                      content: `🎙️ **Итоги голосовой сессии:**\n${summary}`,
                      timestamp: Date.now()
                  };
                  onUpdateMessages([...activeSession.messages, summaryMsg]);
              }
          }}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onAddThought={onAddThought}
          onUpdateThought={onUpdateThought}
          onDeleteThought={onDeleteThought}
          onAddJournal={onAddJournal}
          onAddProject={onAddProject}
          onUpdateProject={onUpdateProject}
          onAddMemory={onAddMemory}
          onUpdateMemory={onUpdateMemory}
          onDeleteMemory={onDeleteMemory}
          onSetTheme={onSetTheme}
          onStartFocus={onStartFocus}
        />
      )}

      {showVoiceSettings && (
          <div className="absolute top-32 right-4 z-50 w-72 bg-[#0c0c0c]/95 backdrop-blur-xl border border-[var(--border-color)] rounded-3xl p-5 shadow-2xl animate-in fade-in slide-in-from-right-5">
              <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2 text-[var(--accent)]">
                      <Settings2 size={16} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Аудио Ядро</h4>
                  </div>
                  <button onClick={() => setShowVoiceSettings(false)} className="text-[var(--text-muted)] hover:text-white"><X size={16}/></button>
              </div>
              
              <div className="space-y-1 mb-6">
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-2 pl-1">Голосовой Профиль</p>
                  {VOICES.map(v => (<button key={v.id} onClick={() => { setSelectedVoice(v.id); localStorage.setItem('sb_voice', v.id); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${selectedVoice === v.id ? 'bg-[var(--bg-item)] text-[var(--text-main)] border border-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-white/5 border border-transparent'}`}><span>{v.label}</span>{selectedVoice === v.id && <div className={`w-2 h-2 rounded-full ${v.color}`}></div>}</button>))}
              </div>

              <div className="space-y-5 mb-5 pt-4 border-t border-white/10">
                  <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)]"><span>Скорость</span><span>{voiceSpeed.toFixed(1)}x</span></div>
                      <input type="range" min="0.5" max="2.0" step="0.1" value={voiceSpeed} onChange={(e) => { const v = parseFloat(e.target.value); setVoiceSpeed(v); localStorage.setItem('sb_voice_speed', v.toString()); }} className="w-full h-1 bg-[var(--bg-item)] rounded-full appearance-none cursor-pointer accent-[var(--accent)]" />
                  </div>
                  
                  <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)]"><span>Тон (Pitch)</span><span>{voicePitch > 0 ? '+' : ''}{voicePitch}</span></div>
                      <input type="range" min="-1200" max="1200" step="50" value={voicePitch} onChange={(e) => { const v = parseFloat(e.target.value); setVoicePitch(v); localStorage.setItem('sb_voice_pitch', v.toString()); }} className="w-full h-1 bg-[var(--bg-item)] rounded-full appearance-none cursor-pointer accent-[var(--accent)]" />
                  </div>

                  <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)]"><span>Громкость</span><span>{Math.round(voiceVolume * 100)}%</span></div>
                      <input type="range" min="0.1" max="1.5" step="0.1" value={voiceVolume} onChange={(e) => { const v = parseFloat(e.target.value); setVoiceVolume(v); localStorage.setItem('sb_voice_volume', v.toString()); }} className="w-full h-1 bg-[var(--bg-item)] rounded-full appearance-none cursor-pointer accent-[var(--accent)]" />
                  </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                  <button onClick={() => { setAutoVoice(!autoVoice); localStorage.setItem('sb_auto_voice', (!autoVoice).toString()); }} className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all ${autoVoice ? 'text-emerald-400 bg-emerald-500/10' : 'text-[var(--text-muted)] bg-white/5'}`}>
                      <span>Авто-озвучка</span>
                      <div className={`w-2 h-2 rounded-full ${autoVoice ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  </button>
              </div>
          </div>
      )}

      {showTerminal && (
          <div className="absolute top-0 left-0 w-full h-[60%] z-[60] bg-[#0c0c0c]/95 backdrop-blur-xl border-b border-[var(--border-color)] animate-in slide-in-from-top-10 flex flex-col font-mono text-xs shadow-2xl">
              <div className="flex justify-between items-center px-4 py-2 border-b border-white/10 bg-white/5"><div className="flex items-center gap-2 text-emerald-500"><Terminal size={14} /><span className="font-bold uppercase tracking-widest">Serafim Core System</span></div><div className="flex gap-2"><button onClick={() => logger.clear()} className="text-[var(--text-muted)] hover:text-white px-2">Clear</button><button onClick={() => setShowTerminal(false)} className="text-[var(--text-muted)] hover:text-white"><X size={16}/></button></div></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-white/20">{systemLogs.map(log => (<div key={log.id} className="flex gap-2 animate-in fade-in"><span className="text-white/30 shrink-0">[{log.timestamp}]</span><span className={`break-all ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : 'text-blue-300'}`}>{log.message}</span></div>))}{isThinking && (<div className="flex gap-2 animate-pulse text-purple-400 mt-2"><span className="text-white/30">{`[${new Date().toLocaleTimeString()}]`}</span><span>{isProcessingTool ? 'EXECUTING KERNEL FUNCTION...' : 'NEURAL PROCESSING...'}</span></div>)}<div ref={terminalEndRef} /></div>
          </div>
      )}

      <div className="flex-1 relative overflow-hidden z-10">
        <div className="h-full overflow-y-auto p-6 space-y-6 no-scrollbar pb-40">
          {activeSession?.messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] relative group ${msg.role === 'user' ? 'bg-[var(--accent)] text-white shadow-xl rounded-t-3xl rounded-bl-3xl p-4' : 'glass-panel text-[var(--text-main)] rounded-t-3xl rounded-br-3xl p-4 border border-[var(--border-color)]'}`}>
                {msg.image && <img src={msg.image} className="w-full rounded-2xl mb-3 opacity-95" alt="input" />}
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans font-medium">{msg.content}</div>
                {msg.role === 'model' && (
                    <button onClick={() => isPlaying ? stopAudio() : playGeminiAudio(msg.content)} className={`absolute -bottom-8 left-2 p-2 rounded-full transition-all cursor-pointer ${isPlaying ? 'bg-[var(--accent)] text-white shadow-lg scale-110' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-item)]'}`}>
                        {isPlaying ? <VolumeX size={16} className="animate-pulse" /> : <Volume2 size={16} />}
                    </button>
                )}
              </div>
            </div>
          ))}
          {isThinking && (<div className="flex justify-start animate-in fade-in slide-in-from-bottom-2"><div className="glass-panel px-4 py-3 rounded-t-3xl rounded-br-3xl border border-[var(--border-color)] flex items-center gap-3">{isProcessingTool ? (<><Cpu size={16} className="text-[var(--accent)] animate-spin" /><span className="text-xs font-mono text-[var(--text-muted)]">SYSTEM ACTION...</span></>) : (<><div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce"></div></>)}</div></div>)}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 flex justify-center">
         
         {(isRecording || isProcessingAudio) && (
             <div className="absolute -top-16 left-0 w-full px-4 flex justify-center animate-in slide-in-from-bottom-5">
                 <div className="bg-[#0c0c0c]/90 backdrop-blur-xl border border-[var(--accent)] text-white p-3 rounded-2xl shadow-2xl flex items-center gap-3">
                     {isProcessingAudio ? (
                         <>
                            <Wand2 size={18} className="text-[var(--accent)] animate-spin" />
                            <span className="text-xs font-bold text-[var(--text-muted)]">Обработка...</span>
                         </>
                     ) : (
                         <>
                            <div className="w-3 h-3 rounded-full bg-red-500 animate-[pulse_1s_infinite] shadow-[0_0_15px_red]"></div>
                            <span className="text-xs font-bold text-white uppercase tracking-widest">Запись...</span>
                         </>
                     )}
                 </div>
             </div>
         )}

         <div className={`w-full bg-[#121212]/90 backdrop-blur-2xl border transition-all duration-300 rounded-[2rem] p-5 shadow-[0_8px_40px_0_rgba(0,0,0,0.45)] relative group hover:border-[var(--accent)]/30 ring-1 ring-white/5 ${isRecording ? 'border-[var(--accent)] shadow-[0_0_30px_var(--accent-glow)]' : 'border-white/10'}`}>
             {attachedImage && (
                 <div className="mb-4 relative inline-block animate-in zoom-in slide-in-from-bottom-2">
                     <img src={attachedImage} className="h-16 w-16 rounded-xl object-cover border border-white/10 shadow-lg" alt="attachment" />
                     <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-md hover:bg-rose-600 transition-colors"><X size={10} strokeWidth={3} /></button>
                 </div>
             )}
             <textarea 
                 rows={1}
                 value={input} 
                 onFocus={handleInputFocus}
                 onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`; }} 
                 onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} 
                 placeholder={isThinking ? "Серафим думает..." : isRecording ? "Говорите..." : "Задай вопрос..."} 
                 disabled={isThinking || isProcessingAudio || isRecording} 
                 className="w-full bg-transparent text-[15px] text-white placeholder:text-zinc-500 font-medium outline-none resize-none no-scrollbar min-h-[24px] max-h-[160px] leading-relaxed"
                 style={{ height: input ? 'auto' : '24px' }}
             />
             <div className="flex items-center justify-between mt-4 pt-2">
                 <div className="flex items-center gap-1">
                      <button onClick={openMenu} className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-95"><Menu size={20} strokeWidth={2} /></button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageAttach} />
                      <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-95"><Paperclip size={20} strokeWidth={2} /></button>
                 </div>
                 <div className="flex items-center gap-2">
                      <button 
                        onClick={onStartLiveAudio} 
                        className="p-2.5 rounded-xl transition-all active:scale-95 text-emerald-400 hover:text-white hover:bg-emerald-500/20"
                      >
                          <AudioLines size={20} />
                      </button>
                      <button 
                        onClick={toggleRecording} 
                        className={`p-2.5 rounded-xl transition-all active:scale-95 ${isRecording ? 'bg-rose-500 text-white shadow-lg animate-pulse' : isProcessingAudio ? 'bg-indigo-500 text-white animate-spin' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                      >
                          {isProcessingAudio ? <Loader2 size={20} /> : isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>
                      <button 
                        onClick={() => handleSend()} 
                        disabled={(!input.trim() && !attachedImage && !isRecording)} 
                        className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center ${(!input.trim() && !attachedImage && !isRecording) ? 'bg-white/5 text-zinc-600 cursor-not-allowed' : 'bg-[var(--accent)] text-black shadow-[0_0_20px_var(--accent-glow)] hover:bg-[var(--accent-hover)] hover:scale-105'}`}
                      >
                          {isThinking ? <Loader2 size={20} className="animate-spin" /> : isRecording ? <ArrowUp size={20} strokeWidth={3} className="animate-bounce" /> : <ArrowUp size={20} strokeWidth={3} />}
                      </button>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Mentorship;
