
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Task, Thought, JournalEntry, Project, Habit, ChatSession, ChatCategory, Priority, ThemeKey, Memory } from '../types';
import { createMentorChat, fixGrammar, generateProactiveMessage } from '../services/geminiService';
import * as googleService from '../services/googleService'; 
import { logger, SystemLog } from '../services/logger';
import { 
  Loader2, ArrowUp, Mic, MicOff, 
  XCircle, Terminal, Image as ImageIcon, Volume2, VolumeX, Sparkles, AlertTriangle, X, ChevronDown, ChevronUp, Radio, LayoutDashboard, Menu, Cpu,
  Paperclip, Link as LinkIcon
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
  onSetTheme: (theme: ThemeKey) => void;
  onStartFocus: (minutes: number) => void;
  hasAiKey: boolean;
  onConnectAI: () => void;
  userName: string;
  voiceTrigger?: number;
  session: any; // Supabase Session
  onNavigate?: (view: any) => void; // Added for Pill
}

const Mentorship: React.FC<MentorshipProps> = ({ 
    tasks, thoughts, journal, projects, habits, memories,
    sessions, activeSessionId, onUpdateMessages, 
    onAddTask, onUpdateTask, onAddThought, onAddProject, onAddMemory, onSetTheme, onStartFocus,
    hasAiKey, onConnectAI, userName, voiceTrigger, session, onNavigate
}) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isProcessingTool, setIsProcessingTool] = useState(false);
  
  // Terminal State
  const [showTerminal, setShowTerminal] = useState(false);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const didGreetRef = useRef<boolean>(false);
  
  // Ref to track processed results to avoid duplicates
  const lastResultIndexRef = useRef(0);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const getStoredModel = () => (localStorage.getItem('sb_gemini_model') || 'flash') as 'flash' | 'pro';

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

  // --- TTS SETUP ---
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) setAvailableVoices(voices);
      } catch (e) { console.warn("TTS voices load error", e); }
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const speakMessage = (text: string, id: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (speakingMessageId === id) { window.speechSynthesis.cancel(); setSpeakingMessageId(null); return; }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#`_]/g, '').replace(/\n\n/g, '. ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05; utterance.pitch = 1;
    const ruVoice = availableVoices.find(v => v.lang.includes('ru') && v.name.includes('Google')) || availableVoices.find(v => v.lang.includes('ru'));
    if (ruVoice) { utterance.voice = ruVoice; utterance.lang = ruVoice.lang; } else { utterance.lang = 'ru-RU'; }
    utterance.onstart = () => setSpeakingMessageId(id);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    try { window.speechSynthesis.speak(utterance); } catch (e) { console.error(e); }
  };

  const stopSpeaking = () => { if (typeof window !== 'undefined' && window.speechSynthesis) { window.speechSynthesis.cancel(); setSpeakingMessageId(null); } };

  // --- SPEECH RECOGNITION (FIXED FOR STUTTER) ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) { setIsSpeechSupported(false); return; }

    try {
        const rec = new SpeechRecognition();
        rec.continuous = true; 
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        rec.lang = 'ru-RU';
        
        rec.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
             setInput(prev => {
                 const cleanPrev = prev.trim();
                 return cleanPrev ? `${cleanPrev} ${finalTranscript.trim()}` : finalTranscript.trim();
             });
          }
          
          setInterimText(interimTranscript);
        };

        rec.onend = () => { 
            setIsRecording(false); 
            setInterimText('');
        };
        
        rec.onerror = (e: any) => { 
            console.error(e);
            setIsRecording(false); 
        };
        
        recognitionRef.current = rec;
    } catch (e) { setIsSpeechSupported(false); }
    
    return () => { 
        stopSpeaking(); 
    };
  }, []);

  // Listen for Voice Trigger from App.tsx
  useEffect(() => {
     if (voiceTrigger && voiceTrigger > 0) {
         if (!isRecording) toggleVoice();
     }
  }, [voiceTrigger]);

  // --- SCROLL HANDLING FIXED ---
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
      setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior });
      }, 100);
  };

  // 1. Scroll instantly when session changes (navigation)
  useEffect(() => {
      scrollToBottom('auto');
      chatSessionRef.current = null; 
      stopSpeaking();
      
      // Proactive Greeting Logic
      if (activeSessionId && sessions.length > 0) {
          const sess = sessions.find(s => s.id === activeSessionId);
          // If session is empty or user hasn't been greeted in this session view yet
          if (sess && sess.messages.length === 0 && !isThinking && !didGreetRef.current) {
              initProactiveGreeting();
          }
      }
      // Reset ref on ID change
      didGreetRef.current = false;

  }, [activeSessionId]);

  // 2. Scroll smoothly when new messages appear or thinking
  useEffect(() => { 
      scrollToBottom('smooth'); 
  }, [activeSession?.messages, isThinking]);

  const initProactiveGreeting = async () => {
      if (!hasAiKey) return;
      didGreetRef.current = true; // prevent double firing
      setIsThinking(true);
      const greeting = await generateProactiveMessage({ userName, tasks });
      setIsThinking(false);
      
      if (greeting) {
          const modelMsg: ChatMessage = { id: Date.now().toString(), role: 'model', content: greeting, timestamp: Date.now() };
          const currentHistory = activeSession ? activeSession.messages : [];
          onUpdateMessages([...currentHistory, modelMsg]);
      }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
        recognitionRef.current.stop(); 
    } else { 
        try { 
            setInterimText('');
            recognitionRef.current.start(); 
            setIsRecording(true);
        } catch(e){
            setIsRecording(false);
        } 
    }
  };

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onload = (ev) => setAttachedImage(ev.target?.result as string); reader.readAsDataURL(file); }
  };

  const handleInputFocus = () => {
      // Small delay to allow keyboard to finish opening animation
      setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 400);
  };

  const handleSend = async () => {
    if (isThinking) return;
    const cleanInput = input.trim();
    if (!cleanInput && !attachedImage) return;

    if (!hasAiKey) { logger.log('System', 'No API Key', 'error'); return; }
    stopSpeaking(); 
    if (recognitionRef.current) recognitionRef.current.stop();

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
      const timeContext = `\n[SYSTEM_CONTEXT: Device Time ${format(now, "yyyy-MM-dd'T'HH:mm:ssXXX")}]`;
      let contents: any = cleanInput + timeContext;
      if (userMsg.image) {
        contents = { parts: [{ text: cleanInput + timeContext || "Проанализируй это изображение." }, { inlineData: { data: userMsg.image.split(',')[1], mimeType: 'image/jpeg' } }] };
      }

      logger.log('Gemini', 'Thinking...', 'info');

      // ----------------------------------------------------
      // FIX: TIMEOUT PROTECTION AGAINST FREEZING
      // ----------------------------------------------------
      const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout: Server took too long to respond")), 30000)
      );

      const response: any = await Promise.race([
          chatSessionRef.current.sendMessage({ message: contents }),
          timeoutPromise
      ]);
      // ----------------------------------------------------

      // --- HANDLE TOOLS & GOOGLE SYNC ---
      if (response.functionCalls) {
        setIsProcessingTool(true); // Terminal Animation Trigger
        for (const fc of response.functionCalls) {
          const args = fc.args as any;
          logger.log('Kernel', `Executing [${fc.name}]`, 'warning', args);

          switch (fc.name) {
            case 'manage_task':
              if (args.action === 'create') {
                const taskDueDate = args.dueDate ? args.dueDate : null;
                const newTask: Task = { 
                    id: Date.now().toString(), 
                    title: args.title, 
                    priority: args.priority || Priority.MEDIUM, 
                    dueDate: taskDueDate, 
                    isCompleted: false, 
                    projectId: args.projectId, 
                    createdAt: new Date().toISOString() 
                };
                
                // 1. Local Add
                onAddTask(newTask);
                logger.log('System', `Task created: ${newTask.title}`, 'success');

                // 2. Google Sync Debug
                const googleToken = session?.provider_token || localStorage.getItem('google_access_token');
                if (googleToken) {
                    try {
                        await googleService.createGoogleTask(googleToken, newTask.title, 'Created by Serafim AI', newTask.dueDate || undefined);
                    } catch (syncError: any) {
                        logger.log('Google', 'Sync Exception', 'error', syncError.message);
                    }
                }
              }
              break;
            case 'create_idea':
              onAddThought({ id: Date.now().toString(), content: args.title, notes: args.content, type: 'idea', tags: args.tags || [], createdAt: new Date().toISOString() });
              logger.log('System', `Idea saved: ${args.title}`, 'success');
              break;
            case 'remember_fact':
              if (args.fact) { onAddMemory({ id: Date.now().toString(), content: args.fact, createdAt: new Date().toISOString() }); logger.log('Memory', 'Core memory updated', 'success'); }
              break;
            case 'manage_project':
              onAddProject({ id: Date.now().toString(), title: args.title, description: args.description, color: args.color || '#6366f1', createdAt: new Date().toISOString() });
              logger.log('System', `Project initialized: ${args.title}`, 'success');
              break;
            case 'ui_control':
              if (args.command === 'set_theme' && args.themeName) onSetTheme(args.themeName as ThemeKey);
              if (args.command === 'start_focus') onStartFocus(args.duration || 25);
              logger.log('Interface', `UI Command executed`, 'success');
              break;
          }
        }
        setIsProcessingTool(false);
      }

      const responseText = response.text || "Готово.";
      const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: responseText, timestamp: Date.now() };
      onUpdateMessages([...newHistory, modelMsg]);

    } catch (e: any) {
      console.error(e);
      // Explicitly check for timeout
      const isTimeout = e.message && (e.message.includes("Timeout") || e.message.includes("Timed out"));
      const userMessage = isTimeout 
          ? "Сервер не отвечает слишком долго. Я сбросил соединение. Попробуй еще раз." 
          : "Сбой нейросвязи. Я перезагрузил контекст.";
      
      logger.log('Gemini', isTimeout ? 'API Timeout' : 'API Error', 'error', e.message);
      
      // Force reset session on error to avoid "pending promise" issues in SDK
      chatSessionRef.current = null;
      
      const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: userMessage, timestamp: Date.now() };
      onUpdateMessages([...newHistory, errorMsg]);
    } finally {
      // FORCE UI UNLOCK
      setIsThinking(false);
      setIsProcessingTool(false);
      // Ensure we scroll to bottom to see the error message
      scrollToBottom('smooth');
    }
  };

  const openMenu = () => {
      const menuBtn = document.getElementById('sidebar-trigger');
      if(menuBtn) menuBtn.click();
  };

  return (
    <div className="flex flex-col h-full bg-transparent relative overflow-hidden">
      
      {/* --- REAL-TIME TERMINAL OVERLAY --- */}
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
                  {systemLogs.length === 0 && <span className="text-white/20 italic">System ready...</span>}
                  {systemLogs.map(log => (
                      <div key={log.id} className="flex gap-2 animate-in fade-in">
                          <span className="text-white/30 shrink-0">[{log.timestamp}]</span>
                          <span className={`break-all ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : 'text-blue-300'}`}>
                              {log.message}
                          </span>
                      </div>
                  ))}
                  
                  {/* Processing Animation inside Terminal */}
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

      {/* --- FLOATING TERMINAL TOGGLE --- */}
      <button 
        onClick={() => setShowTerminal(!showTerminal)}
        className={`absolute top-20 right-4 z-50 p-2 rounded-xl backdrop-blur-md border transition-all ${showTerminal ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-black/20 text-white/50 border-white/10 hover:text-white'}`}
      >
        <div className="relative">
            <Terminal size={16} />
            {isThinking && <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>}
        </div>
      </button>

      <div className="flex-1 relative overflow-hidden z-10">
        {/* Adjusted padding: pb-40 allows scroll to clear input bar */}
        <div className="h-full overflow-y-auto p-6 space-y-6 no-scrollbar pb-40">
          {activeSession?.messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] relative group ${msg.role === 'user' ? 'bg-[var(--accent)] text-white shadow-xl rounded-t-3xl rounded-bl-3xl p-4' : 'glass-panel text-[var(--text-main)] rounded-t-3xl rounded-br-3xl p-4 border border-[var(--border-color)]'}`}>
                {msg.image && <img src={msg.image} className="w-full rounded-2xl mb-3 opacity-95" alt="input" />}
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-semibold font-sans">{msg.content}</div>
                {msg.role === 'model' && (
                    <button onClick={() => speakMessage(msg.content, msg.id)} className={`absolute -bottom-8 left-2 p-2 rounded-full transition-all cursor-pointer ${speakingMessageId === msg.id ? 'bg-[var(--accent)] text-white shadow-lg scale-110' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-item)]'}`}>
                        {speakingMessageId === msg.id ? <VolumeX size={16} className="animate-pulse" /> : <Volume2 size={16} />}
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

      {/* AI PROMPT BOX - REPLACEMENT FOR PILL */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 flex justify-center">
         <div className="w-full bg-[#121212]/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 shadow-[0_8px_40px_0_rgba(0,0,0,0.45)] animate-in slide-in-from-bottom-5 transition-all duration-300 relative group hover:border-[var(--accent)]/30 ring-1 ring-white/5">
             
             {/* Attached Image Preview */}
             {attachedImage && (
                 <div className="mb-4 relative inline-block animate-in zoom-in slide-in-from-bottom-2">
                     <img src={attachedImage} className="h-16 w-16 rounded-xl object-cover border border-white/10 shadow-lg" alt="attachment" />
                     <button 
                         onClick={() => setAttachedImage(null)} 
                         className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-md hover:bg-rose-600 transition-colors"
                     >
                         <X size={10} strokeWidth={3} />
                     </button>
                 </div>
             )}
     
             {/* Text Area */}
             <textarea 
                 rows={1}
                 value={input} 
                 onFocus={handleInputFocus}
                 onChange={e => { 
                    setInput(e.target.value); 
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                 }} 
                 onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} 
                 placeholder={isThinking ? "Серафим думает..." : isRecording ? interimText || "Говорите..." : "Задай вопрос..."} 
                 disabled={isThinking} 
                 className="w-full bg-transparent text-[15px] text-white placeholder:text-zinc-500 font-medium outline-none resize-none no-scrollbar min-h-[24px] max-h-[160px] leading-relaxed"
                 style={{ height: input ? 'auto' : '24px' }}
             />
     
             {/* Toolbar */}
             <div className="flex items-center justify-between mt-4 pt-2">
                 <div className="flex items-center gap-1">
                      {/* Menu */}
                      <button 
                         onClick={openMenu}
                         className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-95"
                         title="Меню"
                      >
                         <Menu size={20} strokeWidth={2} />
                      </button>
     
                      {/* File (Image for now) */}
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageAttach} />
                      <button 
                         onClick={() => fileInputRef.current?.click()} 
                         className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-95"
                         title="Файл"
                      >
                         <Paperclip size={20} strokeWidth={2} />
                      </button>
                 </div>
     
                 <div className="flex items-center gap-2">
                      {/* Audio */}
                      <button 
                         onClick={toggleVoice} 
                         className={`p-2.5 rounded-xl transition-all active:scale-95 ${isRecording ? 'bg-rose-500/20 text-rose-500 animate-pulse' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                         title="Голосовой ввод"
                      >
                         {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>
     
                      {/* Send */}
                      <button 
                         onClick={handleSend} 
                         disabled={!input.trim() && !attachedImage} 
                         className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center ${(!input.trim() && !attachedImage) ? 'bg-white/5 text-zinc-600 cursor-not-allowed' : 'bg-[var(--accent)] text-black shadow-[0_0_20px_var(--accent-glow)] hover:bg-[var(--accent-hover)] hover:scale-105'}`}
                      >
                         {isThinking ? <Loader2 size={20} className="animate-spin" /> : <ArrowUp size={20} strokeWidth={3} />}
                      </button>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Mentorship;
