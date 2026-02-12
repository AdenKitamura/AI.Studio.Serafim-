import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Task, Thought, JournalEntry, Project, Habit, ChatSession, ChatCategory, Priority, ThemeKey, Memory } from '../types';
import { createMentorChat, fixGrammar } from '../services/geminiService';
import * as googleService from '../services/googleService'; 
import { logger, SystemLog } from '../services/logger';
import { 
  Loader2, ArrowUp, Mic, MicOff, 
  XCircle, Terminal, Image as ImageIcon, Volume2, VolumeX, Sparkles, AlertTriangle, X, ChevronDown, ChevronUp, Radio, LayoutDashboard, Menu
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

          // Iterate through results starting from where we left off (or just process the current buffer)
          // Actually, resultIndex tells us where the *new* results start.
          // BUT, we need to iterate from resultIndex to length.
          
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
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior });
      }, 100);
  };

  // 1. Scroll instantly when session changes (navigation)
  useEffect(() => {
      scrollToBottom('auto');
      chatSessionRef.current = null; 
      stopSpeaking();
  }, [activeSessionId]);

  // 2. Scroll smoothly when new messages appear or thinking
  useEffect(() => { 
      scrollToBottom('smooth'); 
  }, [activeSession?.messages, isThinking]);


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

      logger.log('Gemini', 'Sending request...', 'info');
      const response = await chatSessionRef.current.sendMessage({ message: contents });

      // --- HANDLE TOOLS & GOOGLE SYNC ---
      if (response.functionCalls) {
        for (const fc of response.functionCalls) {
          const args = fc.args as any;
          logger.log('Tool', `Executing ${fc.name}`, 'info', args);

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
                logger.log('System', 'Task created locally', 'success');

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
              logger.log('System', 'Idea saved', 'success');
              break;
            case 'remember_fact':
              if (args.fact) { onAddMemory({ id: Date.now().toString(), content: args.fact, createdAt: new Date().toISOString() }); logger.log('Memory', 'Fact saved', 'success'); }
              break;
            case 'manage_project':
              onAddProject({ id: Date.now().toString(), title: args.title, description: args.description, color: args.color || '#6366f1', createdAt: new Date().toISOString() });
              logger.log('System', 'Project created', 'success');
              break;
            case 'ui_control':
              if (args.command === 'set_theme' && args.themeName) onSetTheme(args.themeName as ThemeKey);
              if (args.command === 'start_focus') onStartFocus(args.duration || 25);
              break;
          }
        }
      }

      const responseText = response.text || "Готово.";
      const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: responseText, timestamp: Date.now() };
      onUpdateMessages([...newHistory, modelMsg]);

    } catch (e: any) {
      console.error(e);
      logger.log('Gemini', 'API Error', 'error', e.message);
      chatSessionRef.current = null;
      const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: "Произошла ошибка соединения. Я сбросил сессию.", timestamp: Date.now() };
      onUpdateMessages([...newHistory, errorMsg]);
    } finally {
      setIsThinking(false);
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
          <div className="absolute top-0 left-0 w-full h-[60%] z-[60] bg-black/90 backdrop-blur-xl border-b border-[var(--border-color)] animate-in slide-in-from-top-10 flex flex-col font-mono text-xs">
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
                  <div ref={terminalEndRef} />
              </div>
          </div>
      )}

      {/* --- FLOATING TERMINAL TOGGLE --- */}
      <button 
        onClick={() => setShowTerminal(!showTerminal)}
        className={`absolute top-20 right-4 z-50 p-2 rounded-xl backdrop-blur-md border transition-all ${showTerminal ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'bg-black/20 text-white/50 border-white/10 hover:text-white'}`}
      >
        <Terminal size={16} />
      </button>

      <div className="flex-1 relative overflow-hidden z-10">
        {/* Adjusted padding: pb-36 allows scroll to clear input bar */}
        <div className="h-full overflow-y-auto p-6 space-y-6 no-scrollbar pb-36">
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
          {isThinking && <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2"><div className="glass-panel px-4 py-3 rounded-t-3xl rounded-br-3xl border border-[var(--border-color)] flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce"></div></div></div>}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* FLOATING ACTION PILL (Chat Input Variant) - UPDATED STYLE: Ice Frosted */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-6 flex justify-center">
         <div className="pointer-events-auto bg-[#121212]/85 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-2 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex items-center gap-2 animate-in slide-in-from-bottom-5 w-full transition-all duration-300">
             
             {/* 1. Menu (Fixed) */}
             <button 
                onClick={openMenu}
                className="w-12 h-12 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors active:scale-95 shrink-0 hover:bg-white/5"
             >
                <Menu size={22} strokeWidth={2.5} />
             </button>

             {/* Image Attach */}
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageAttach} />
             <button 
                onClick={() => fileInputRef.current?.click()} 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors active:scale-95 shrink-0 hover:bg-white/5"
             >
                <ImageIcon size={20} strokeWidth={2.5} />
             </button>

             {/* Input Field */}
             <textarea 
                rows={1} 
                value={input} 
                onChange={e => { setInput(e.target.value); }} 
                onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} 
                placeholder={isThinking ? "Думаю..." : isRecording ? interimText || "Слушаю..." : "Сообщение..."} 
                disabled={isThinking} 
                className="flex-1 bg-transparent text-sm text-white px-2 py-3 outline-none resize-none no-scrollbar placeholder:text-white/30 font-bold min-h-[44px] max-h-[120px]" 
             />

             {/* Mic Toggle */}
             <button 
                onClick={toggleVoice} 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
             >
                {isRecording ? <MicOff size={20} strokeWidth={2.5} /> : <Mic size={20} strokeWidth={2.5} />}
             </button>

             {/* Send Button - Styled like the Main Mic in Nav */}
             <button 
                onClick={handleSend} 
                disabled={!input.trim() && !attachedImage} 
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 ${(!input.trim() && !attachedImage) ? 'opacity-30 bg-white/10 cursor-not-allowed' : 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-90 cursor-pointer hover:scale-105'}`}
             >
                {isThinking ? <Loader2 size={20} className="animate-spin" /> : <ArrowUp size={24} strokeWidth={3} />}
             </button>

         </div>
         {attachedImage && <div className="absolute -top-20 right-8 animate-in zoom-in"><img src={attachedImage} className="w-16 h-16 rounded-xl object-cover border-2 border-[var(--accent)] shadow-lg" /><button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg"><X size={12}/></button></div>}
      </div>
    </div>
  );
};

export default Mentorship;