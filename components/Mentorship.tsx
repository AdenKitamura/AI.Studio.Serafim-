
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Task, Thought, JournalEntry, Project, Habit, ChatSession, ChatCategory, Priority, ThemeKey, Memory } from '../types';
import { createMentorChat, generateProactiveMessage, generateSpeech, polishText } from '../services/geminiService';
import * as googleService from '../services/googleService'; 
import { logger, SystemLog } from '../services/logger';
import { 
  Loader2, ArrowUp, Mic, MicOff, 
  Terminal, Volume2, VolumeX, Sparkles, X, Menu, Cpu,
  Paperclip, SlidersHorizontal, Wand2
} from 'lucide-react';
import { format } from 'date-fns';

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
  onAddThought: (thought: Thought) => void;
  onAddProject: (project: Project) => void;
  onAddHabit: (habit: Habit) => void;
  onAddMemory: (memory: Memory) => void;
  onAddJournal: (entry: Partial<JournalEntry>) => void; // New prop
  onSetTheme: (theme: ThemeKey) => void;
  onStartFocus: (minutes: number) => void;
  hasAiKey: boolean;
  onConnectAI: () => void;
  userName: string;
  voiceTrigger?: number;
  session: any; 
  onNavigate?: (view: any) => void; 
}

const VOICES = [
    { id: 'Kore', label: 'Kore (Calm)' },
    { id: 'Puck', label: 'Puck (Energetic)' },
    { id: 'Fenrir', label: 'Fenrir (Deep)' },
    { id: 'Charon', label: 'Charon (Low)' },
    { id: 'Zephyr', label: 'Zephyr (Soft)' },
];

const Mentorship: React.FC<MentorshipProps> = ({ 
    tasks, thoughts, journal, projects, habits, memories,
    sessions, activeSessionId, onUpdateMessages, 
    onAddTask, onUpdateTask, onAddThought, onAddProject, onAddMemory, onAddJournal, onSetTheme, onStartFocus,
    hasAiKey, onConnectAI, userName, voiceTrigger, session
}) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isProcessingTool, setIsProcessingTool] = useState(false);
  
  // Voice Recognition State
  const [liveTranscript, setLiveTranscript] = useState(''); 
  const rawTranscriptRef = useRef(''); 
  
  // Gemini Voice Settings
  const [selectedVoice, setSelectedVoice] = useState<string>(() => localStorage.getItem('sb_voice') || 'Kore');
  const [autoVoice, setAutoVoice] = useState<boolean>(() => localStorage.getItem('sb_auto_voice') !== 'false');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // Terminal State
  const [showTerminal, setShowTerminal] = useState(false);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  
  const recognitionRef = useRef<any>(null);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const getStoredModel = () => (localStorage.getItem('sb_gemini_model') || 'flash') as 'flash' | 'pro';

  // --- AUDIO CONTEXT SETUP (Raw PCM Support) ---
  const initAudio = () => {
      if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContext(); 
      }
      if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(e => console.error("Audio resume failed", e));
      }
  };

  const decodeAudioData = (base64String: string, ctx: AudioContext): AudioBuffer | null => {
      try {
          const binaryString = atob(base64String);
          const len = binaryString.length;
          const safeLen = len - (len % 2); 
          const bytes = new Uint8Array(safeLen);
          for (let i = 0; i < safeLen; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const dataInt16 = new Int16Array(bytes.buffer);
          const numChannels = 1;
          const frameCount = dataInt16.length;
          const buffer = ctx.createBuffer(numChannels, frameCount, 24000); 
          const channelData = buffer.getChannelData(0);
          for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
          }
          return buffer;
      } catch (e) {
          console.error("PCM Decode Error", e);
          return null;
      }
  };

  const playGeminiAudio = async (text: string) => {
      if (isPlaying) stopAudio();
      try {
          setIsPlaying(true);
          initAudio();
          const base64Audio = await generateSpeech(text, selectedVoice);
          if (!base64Audio) {
              setIsPlaying(false);
              return;
          }
          if (!audioContextRef.current) return;
          const buffer = decodeAudioData(base64Audio, audioContextRef.current);
          if (!buffer) {
              setIsPlaying(false);
              return;
          }
          const source = audioContextRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContextRef.current.destination);
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

  // --- SUBSCRIBE TO LOGGER ---
  useEffect(() => {
     setSystemLogs(logger.getLogs());
     return logger.subscribe((logs) => {
         setSystemLogs([...logs]);
         if (showTerminal) {
             setTimeout(() => terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
         }
     });
  }, [showTerminal]);

  // --- SPEECH RECOGNITION SETUP ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    try {
        const rec = new SpeechRecognition();
        rec.continuous = true; 
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        rec.lang = 'ru-RU';
        
        rec.onresult = (event: any) => {
          let currentInterim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                rawTranscriptRef.current += transcript + ' ';
            } else {
                currentInterim += transcript;
            }
          }
          setLiveTranscript(rawTranscriptRef.current + currentInterim);
        };

        rec.onend = () => { 
            setIsRecording(false); 
            if (rawTranscriptRef.current.trim().length > 0) {
                processVoiceInput();
            } else {
                setLiveTranscript('');
            }
        };
        
        rec.onerror = (e: any) => {
            console.error("Speech Error", e);
            setIsRecording(false);
        };

        recognitionRef.current = rec;
    } catch (e) { console.error(e); }
  }, []);

  // Listen for Voice Trigger
  useEffect(() => {
     if (voiceTrigger && voiceTrigger > 0 && !isRecording) toggleVoice();
  }, [voiceTrigger]);

  const toggleVoice = () => {
    initAudio(); 
    if (!recognitionRef.current) return;
    
    if (isRecording) {
        recognitionRef.current.stop(); 
    } else { 
        try { 
            rawTranscriptRef.current = ''; 
            setLiveTranscript('');
            recognitionRef.current.start(); 
            setIsRecording(true);
        } catch(e){ setIsRecording(false); } 
    }
  };

  const processVoiceInput = async () => {
      const rawText = rawTranscriptRef.current;
      if (!rawText.trim()) return;

      setIsProcessingAudio(true);
      setLiveTranscript(rawText); 
      logger.log('Audio', 'Processing voice input via Gemini...', 'info');

      try {
          const polishedText = await polishText(rawText);
          setInput(prev => {
              const cleanPrev = prev.trim();
              return cleanPrev ? `${cleanPrev} ${polishedText}` : polishedText;
          });
      } catch (e) {
          setInput(prev => prev + rawText);
      } finally {
          setIsProcessingAudio(false);
          setLiveTranscript('');
          rawTranscriptRef.current = '';
      }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
      setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior }); }, 100);
  };

  useEffect(() => {
      scrollToBottom('auto');
      chatSessionRef.current = null; 
      stopAudio();
  }, [activeSessionId]);

  useEffect(() => { scrollToBottom('smooth'); }, [activeSession?.messages, isThinking]);

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onload = (ev) => setAttachedImage(ev.target?.result as string); reader.readAsDataURL(file); }
  };

  const handleInputFocus = () => {
      initAudio(); 
      setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 400);
  };

  const handleSend = async () => {
    if (isThinking) return;
    const cleanInput = input.trim();
    if (!cleanInput && !attachedImage) return;

    if (!hasAiKey) { logger.log('System', 'No API Key', 'error'); return; }
    stopAudio(); 
    if (recognitionRef.current) recognitionRef.current.stop();

    logger.log('User', `Sending: "${cleanInput.substring(0, 30)}..."`, 'info');

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: cleanInput, image: attachedImage || undefined, timestamp: Date.now() };
    const currentHistory = activeSession ? activeSession.messages : [];
    const newHistory = [...currentHistory, userMsg];
    onUpdateMessages(newHistory);
    setInput(''); setAttachedImage(null); setIsThinking(true);

    try {
      if (!chatSessionRef.current) {
        chatSessionRef.current = createMentorChat({ tasks, thoughts, journal, projects, habits, memories, isGoogleAuth: false, userName }, getStoredModel());
      }
      const now = new Date();
      const timeContext = `\n[Context: ${format(now, "HH:mm")}]`;
      let contents: any = cleanInput + timeContext;
      if (userMsg.image) {
        contents = { parts: [{ text: cleanInput || "Analyze image" }, { inlineData: { data: userMsg.image.split(',')[1], mimeType: 'image/jpeg' } }] };
      }

      // ----------------------------------------------------
      const response: any = await chatSessionRef.current.sendMessage({ message: contents });
      // ----------------------------------------------------

      if (response.functionCalls) {
        setIsProcessingTool(true);
        for (const fc of response.functionCalls) {
          const args = fc.args as any;
          logger.log('AI', `Calling Tool: ${fc.name}`, 'warning', args);
          
          switch (fc.name) {
            case 'manage_task':
              if (args.action === 'create') {
                const newTask: Task = { id: Date.now().toString(), title: args.title, priority: args.priority || Priority.MEDIUM, dueDate: args.dueDate || null, isCompleted: false, projectId: args.projectId, createdAt: new Date().toISOString() };
                onAddTask(newTask);
                logger.log('Tool', `Task created: ${args.title}`, 'success');
              }
              break;
            case 'create_idea':
              onAddThought({ id: Date.now().toString(), content: args.title, notes: args.content, type: 'idea', tags: args.tags || [], createdAt: new Date().toISOString() });
              logger.log('Tool', `Idea created: ${args.title}`, 'success');
              break;
            case 'save_journal_entry':
              onAddJournal({ content: args.content, mood: args.mood || '😐', tags: args.tags || [], date: format(new Date(), 'yyyy-MM-dd') });
              logger.log('Tool', `Journal Entry saved`, 'success');
              break;
            case 'remember_fact':
              if (args.fact) onAddMemory({ id: Date.now().toString(), content: args.fact, createdAt: new Date().toISOString() });
              break;
            case 'manage_project':
              onAddProject({ id: Date.now().toString(), title: args.title, description: args.description, color: args.color || '#6366f1', createdAt: new Date().toISOString() });
              break;
            case 'ui_control':
              if (args.command === 'set_theme' && args.themeName) onSetTheme(args.themeName as ThemeKey);
              if (args.command === 'start_focus') onStartFocus(args.duration || 25);
              break;
          }
        }
        setIsProcessingTool(false);
      }

      const responseText = response.text || "Готово.";
      logger.log('AI', `Response received`, 'success');
      
      const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: responseText, timestamp: Date.now() };
      onUpdateMessages([...newHistory, modelMsg]);

      // AUTO VOICE PLAYBACK
      if (autoVoice) {
          setTimeout(() => playGeminiAudio(responseText), 50);
      }

    } catch (e: any) {
      console.error(e);
      logger.log('System', `AI Error: ${e.message}`, 'error');
      // RESTORE INPUT ON ERROR
      setInput(cleanInput);
      const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: "Связь потеряна. Я вернул твой текст в поле ввода, попробуй отправить снова.", timestamp: Date.now() };
      onUpdateMessages([...newHistory, errorMsg]);
    } finally {
      setIsThinking(false);
      setIsProcessingTool(false);
      scrollToBottom('smooth');
    }
  };

  const openMenu = () => { const menuBtn = document.getElementById('sidebar-trigger'); if(menuBtn) menuBtn.click(); };

  return (
    <div className="flex flex-col h-full bg-transparent relative overflow-hidden">
      
      {/* --- FLOATING CONTROLS --- */}
      <div className="absolute top-20 right-4 z-50 flex flex-col gap-2">
         {/* Voice Settings Toggle */}
         <button 
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className={`p-2 rounded-xl backdrop-blur-md border transition-all ${showVoiceSettings ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-black/20 text-white/50 border-white/10 hover:text-white'}`}
         >
             <SlidersHorizontal size={16} />
         </button>

         {/* Terminal Toggle */}
         <button 
            onClick={() => setShowTerminal(!showTerminal)}
            className={`p-2 rounded-xl backdrop-blur-md border transition-all ${showTerminal ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-black/20 text-white/50 border-white/10 hover:text-white'}`}
         >
            <div className="relative">
                <Terminal size={16} />
                {isThinking && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>}
            </div>
         </button>
      </div>

      {/* --- VOICE SETTINGS PANEL --- */}
      {showVoiceSettings && (
          <div className="absolute top-32 right-4 z-50 w-48 bg-[#0c0c0c]/95 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-3 shadow-2xl animate-in fade-in slide-in-from-right-5">
              <h4 className="text-[10px] font-black uppercase text-[var(--text-muted)] mb-2 tracking-widest">Голос Серафима</h4>
              <div className="space-y-1 mb-3">
                  {VOICES.map(v => (
                      <button 
                        key={v.id} 
                        onClick={() => { setSelectedVoice(v.id); localStorage.setItem('sb_voice', v.id); }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedVoice === v.id ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'}`}
                      >
                          {v.label}
                      </button>
                  ))}
              </div>
              <div className="border-t border-white/10 pt-2">
                  <button 
                    onClick={() => { setAutoVoice(!autoVoice); localStorage.setItem('sb_auto_voice', (!autoVoice).toString()); }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${autoVoice ? 'text-emerald-400 bg-emerald-500/10' : 'text-[var(--text-muted)]'}`}
                  >
                      <span>Авто-озвучка</span>
                      <div className={`w-2 h-2 rounded-full ${autoVoice ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  </button>
              </div>
          </div>
      )}

      {/* --- TERMINAL OVERLAY --- */}
      {showTerminal && (
          <div className="absolute top-0 left-0 w-full h-[60%] z-[60] bg-[#0c0c0c]/95 backdrop-blur-xl border-b border-[var(--border-color)] animate-in slide-in-from-top-10 flex flex-col font-mono text-xs shadow-2xl">
              <div className="flex justify-between items-center px-4 py-2 border-b border-white/10 bg-white/5">
                  <div className="flex items-center gap-2 text-emerald-500">
                      <Terminal size={14} />
                      <span className="font-bold uppercase tracking-widest">Serafim Core System</span>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => logger.clear()} className="text-[var(--text-muted)] hover:text-white px-2">Clear</button>
                      <button onClick={() => setShowTerminal(false)} className="text-[var(--text-muted)] hover:text-white"><X size={16}/></button>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-white/20">
                  {systemLogs.map(log => (
                      <div key={log.id} className="flex gap-2 animate-in fade-in">
                          <span className="text-white/30 shrink-0">[{log.timestamp}]</span>
                          <span className={`break-all ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : 'text-blue-300'}`}>{log.message}</span>
                      </div>
                  ))}
                  {isThinking && (
                      <div className="flex gap-2 animate-pulse text-purple-400 mt-2">
                          <span className="text-white/30">{`[${new Date().toLocaleTimeString()}]`}</span>
                          <span>{isProcessingTool ? 'EXECUTING KERNEL FUNCTION...' : 'NEURAL PROCESSING...'}</span>
                      </div>
                  )}
                  <div ref={terminalEndRef} />
              </div>
          </div>
      )}

      {/* --- MESSAGES AREA --- */}
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
          {isThinking && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                  <div className="glass-panel px-4 py-3 rounded-t-3xl rounded-br-3xl border border-[var(--border-color)] flex items-center gap-3">
                      {isProcessingTool ? (
                          <>
                             <Cpu size={16} className="text-[var(--accent)] animate-spin" />
                             <span className="text-xs font-mono text-[var(--text-muted)]">SYSTEM ACTION...</span>
                          </>
                      ) : (
                          <>
                             <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                             <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                             <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce"></div>
                          </>
                      )}
                  </div>
              </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* AI PROMPT BOX */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 flex justify-center">
         
         {/* Live Voice Transcript Bubble */}
         {(isRecording || isProcessingAudio) && (
             <div className="absolute -top-16 left-0 w-full px-4 flex justify-center animate-in slide-in-from-bottom-5">
                 <div className="bg-[#0c0c0c]/90 backdrop-blur-xl border border-[var(--accent)] text-white p-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-[90%]">
                     {isProcessingAudio ? (
                         <>
                            <Wand2 size={18} className="text-[var(--accent)] animate-pulse" />
                            <span className="text-xs font-bold text-[var(--text-muted)]">Улучшение текста...</span>
                         </>
                     ) : (
                         <>
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"></div>
                            <p className="text-xs font-medium truncate">{liveTranscript || "Слушаю..."}</p>
                         </>
                     )}
                 </div>
             </div>
         )}

         <div className="w-full bg-[#121212]/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 shadow-[0_8px_40px_0_rgba(0,0,0,0.45)] animate-in slide-in-from-bottom-5 transition-all duration-300 relative group hover:border-[var(--accent)]/30 ring-1 ring-white/5">
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
                 placeholder={isThinking ? "Серафим думает..." : isRecording ? "Говорите, я записываю..." : "Задай вопрос..."} 
                 disabled={isThinking || isProcessingAudio} 
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
                        onClick={toggleVoice} 
                        className={`p-2.5 rounded-xl transition-all active:scale-95 ${isRecording ? 'bg-rose-500/20 text-rose-500 animate-pulse ring-1 ring-rose-500' : isProcessingAudio ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                      >
                          {isProcessingAudio ? <Wand2 size={20} /> : isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>
                      <button onClick={handleSend} disabled={!input.trim() && !attachedImage} className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center ${(!input.trim() && !attachedImage) ? 'bg-white/5 text-zinc-600 cursor-not-allowed' : 'bg-[var(--accent)] text-black shadow-[0_0_20px_var(--accent-glow)] hover:bg-[var(--accent-hover)] hover:scale-105'}`}>{isThinking ? <Loader2 size={20} className="animate-spin" /> : <ArrowUp size={20} strokeWidth={3} />}</button>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Mentorship;
