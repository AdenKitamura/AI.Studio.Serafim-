import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Task, Thought, JournalEntry, Project, Habit, ChatSession, ChatCategory, Priority, ThemeKey, Memory } from '../types';
import { createMentorChat, fixGrammar } from '../services/geminiService';
import * as googleService from '../services/googleService'; 
import { logger } from '../services/logger';
import { 
  Loader2, ArrowUp, Mic, MicOff, 
  XCircle, Terminal, Image as ImageIcon, Volume2, VolumeX, Sparkles
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
}

const Mentorship: React.FC<MentorshipProps> = ({ 
    tasks, thoughts, journal, projects, habits, memories,
    sessions, activeSessionId, onUpdateMessages, 
    onAddTask, onUpdateTask, onAddThought, onAddProject, onAddMemory, onSetTheme, onStartFocus,
    hasAiKey, onConnectAI, userName
}) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isFixingGrammar, setIsFixingGrammar] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<{msg: string, type: 'tool' | 'info' | 'success'}[]>([]);
  
  const recognitionRef = useRef<any>(null);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  
  const getStoredModel = () => (localStorage.getItem('sb_gemini_model') || 'flash') as 'flash' | 'pro';

  // --- TTS LOGIC (Individual Message) ---
  const speakMessage = (text: string, id: string) => {
    if (!window.speechSynthesis) return;
    
    // Stop if currently speaking this message
    if (speakingMessageId === id) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
        return;
    }

    // Stop any other speech
    window.speechSynthesis.cancel();

    // Clean text
    const cleanText = text.replace(/[*#`]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ru-RU';
    utterance.rate = 1.1;
    
    const voices = window.speechSynthesis.getVoices();
    const ruVoice = voices.find(v => v.lang.includes('ru') && !v.name.includes('Google')); 
    if (ruVoice) utterance.voice = ruVoice;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
    }
  };

  // --- AI GRAMMAR FIX ---
  const handleSmartFix = async () => {
      if (!input.trim() || isFixingGrammar) return;
      setIsFixingGrammar(true);
      try {
          const fixed = await fixGrammar(input);
          setInput(fixed);
      } catch (e) {
          console.error('Fix failed', e);
      } finally {
          setIsFixingGrammar(false);
      }
  };

  // Setup Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false; // Reset to false for better stability on mobile
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = 'ru-RU';
      
      rec.onresult = async (event: any) => {
        let finalStr = '';
        let interimStr = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalStr += event.results[i][0].transcript;
          else interimStr = event.results[i][0].transcript;
        }

        if (finalStr) {
            stopSpeaking(); 
            // Auto-Magic Fix: immediately trigger Gemini to clean up the voice input
            setInterimText('✨ Улучшаю...');
            setIsFixingGrammar(true);
            try {
                const fixed = await fixGrammar(finalStr);
                setInput(prev => {
                   const separator = prev.length > 0 ? ' ' : '';
                   return prev + separator + fixed;
                });
            } catch (e) {
                // Fallback to raw input if AI fails
                setInput(prev => (prev + ' ' + finalStr).trim());
            } finally {
                setIsFixingGrammar(false);
                setInterimText('');
            }
        } else {
            setInterimText(interimStr);
        }
      };
      
      rec.onstart = () => { setIsRecording(true); stopSpeaking(); };
      rec.onend = () => { setIsRecording(false); if(!isFixingGrammar) setInterimText(''); };
      rec.onerror = (e: any) => { console.error('Speech error:', e); setIsRecording(false); setInterimText(''); };
      
      recognitionRef.current = rec;
    }

    return () => {
        stopSpeaking(); // Cleanup speech on unmount
    };
  }, []);

  // Scroll to bottom
  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages, isThinking]);

  useEffect(() => {
      chatSessionRef.current = null; // Reset chat instance on session switch
      stopSpeaking();
  }, [activeSessionId]);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.lang = 'ru-RU';
      recognitionRef.current.start();
    }
  };

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachedImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addLog = (msg: string, type: 'tool' | 'info' | 'success') => {
    setAgentLogs(prev => [...prev.slice(-2), { msg, type }]);
    setTimeout(() => setAgentLogs(prev => prev.filter(l => l.msg !== msg)), 4000);
  };

  const handleSend = async () => {
    if (isThinking) return;
    const cleanInput = input.trim();
    if (!cleanInput && !attachedImage) return;

    if (!hasAiKey) { 
        addLog('Нет API ключа. См. настройки.', 'tool');
        return; 
    }
    
    stopSpeaking(); 

    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: cleanInput, 
      image: attachedImage || undefined,
      timestamp: Date.now() 
    };

    const currentHistory = activeSession ? activeSession.messages : [];
    const newHistory = [...currentHistory, userMsg];
    
    onUpdateMessages(newHistory);
    setInput('');
    setAttachedImage(null);
    setIsThinking(true);

    try {
      if (!chatSessionRef.current) {
        chatSessionRef.current = createMentorChat({ 
            tasks, thoughts, journal, projects, habits, memories, 
            isGoogleAuth: false, 
            userName 
        }, getStoredModel());
      }

      const now = new Date();
      const deviceTimeISO = format(now, "yyyy-MM-dd'T'HH:mm:ssXXX"); 
      const timeContext = `\n[SYSTEM_CONTEXT: Device Time ${deviceTimeISO}]`;
      
      let contents: any = cleanInput + timeContext;
      
      if (userMsg.image) {
        contents = {
          parts: [
            { text: cleanInput + timeContext || "Проанализируй это изображение." },
            { inlineData: { data: userMsg.image.split(',')[1], mimeType: 'image/jpeg' } }
          ]
        };
      }

      const response = await chatSessionRef.current.sendMessage({ message: contents });

      // Handle Tools
      if (response.functionCalls) {
        for (const fc of response.functionCalls) {
          const args = fc.args as any;
          addLog(`Инструмент: ${fc.name}`, 'tool');

          switch (fc.name) {
            case 'manage_task':
              if (args.action === 'create') {
                const taskDueDate = args.dueDate ? args.dueDate : null;
                onAddTask({ 
                    id: Date.now().toString(), 
                    title: args.title, 
                    priority: args.priority || Priority.MEDIUM, 
                    dueDate: taskDueDate, 
                    isCompleted: false, 
                    projectId: args.projectId, 
                    createdAt: new Date().toISOString() 
                });
                addLog('Задача создана', 'success');
              }
              break;
            case 'create_idea':
              onAddThought({
                  id: Date.now().toString(),
                  content: args.title,
                  notes: args.content,
                  type: 'idea',
                  tags: args.tags || [],
                  createdAt: new Date().toISOString()
              });
              addLog('Идея сохранена', 'success');
              break;
            case 'remember_fact':
              if (args.fact) {
                  onAddMemory({
                      id: Date.now().toString(),
                      content: args.fact,
                      createdAt: new Date().toISOString()
                  });
                  addLog('Запомнил', 'success');
              }
              break;
            case 'manage_project':
              onAddProject({ id: Date.now().toString(), title: args.title, description: args.description, color: args.color || '#6366f1', createdAt: new Date().toISOString() });
              addLog('Проект создан', 'success');
              break;
            case 'ui_control':
              if (args.command === 'set_theme' && args.themeName) onSetTheme(args.themeName as ThemeKey);
              if (args.command === 'start_focus') onStartFocus(args.duration || 25);
              break;
          }
        }
      }

      const responseText = response.text || "Готово.";
      const modelMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        content: responseText, 
        timestamp: Date.now() 
      };
      
      onUpdateMessages([...newHistory, modelMsg]);

    } catch (e: any) {
      console.error(e);
      addLog('Ошибка API. Перезагружаю сессию...', 'tool');
      chatSessionRef.current = null;
      const errorMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        content: "Произошла ошибка соединения. Я сбросил сессию. Попробуйте спросить еще раз.", 
        timestamp: Date.now() 
      };
      onUpdateMessages([...newHistory, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const canSend = !isThinking && (input.trim().length > 0 || !!attachedImage);

  return (
    <div className="flex flex-col h-full bg-transparent relative overflow-hidden">
      
      <div className="absolute top-20 right-6 z-[60] flex flex-col gap-2 items-end pointer-events-none">
        {agentLogs.map((log, i) => (
          <div key={i} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border animate-in slide-in-from-right fade-in backdrop-blur-md ${
            log.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
            log.type === 'tool' ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-white/10 border-white/20 text-white/60'
          }`}>
            <span className="flex items-center gap-2">
              <Terminal size={12} /> {log.msg}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-none px-6 py-2 flex items-center justify-center pointer-events-none z-20">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--bg-item)]/50 backdrop-blur-md border border-[var(--border-color)]">
           <div className={`w-1.5 h-1.5 rounded-full ${isThinking ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></div>
           <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">
             {isThinking ? 'Серафим думает...' : 'Онлайн'}
           </span>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden z-10">
        <div className="absolute bottom-0 left-0 w-full h-40 pointer-events-none z-20" 
             style={{ background: `linear-gradient(to top, var(--bg-main) 0%, transparent 100%)` }} />
        
        <div className="h-full overflow-y-auto p-6 space-y-6 no-scrollbar pb-64">
          {activeSession?.messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] relative group ${msg.role === 'user' ? 'bg-[var(--accent)] text-white shadow-xl rounded-t-3xl rounded-bl-3xl p-4' : 'glass-panel text-[var(--text-main)] rounded-t-3xl rounded-br-3xl p-4 border border-[var(--border-color)]'}`}>
                {msg.image && <img src={msg.image} className="w-full rounded-2xl mb-3 opacity-95" alt="input" />}
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-semibold font-sans">
                  {msg.content}
                </div>
                
                {/* Individual TTS Button for AI messages */}
                {msg.role === 'model' && (
                    <button 
                        onClick={() => speakMessage(msg.content, msg.id)}
                        className={`absolute -bottom-8 left-2 p-2 rounded-full transition-all ${speakingMessageId === msg.id ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] opacity-0 group-hover:opacity-100'}`}
                    >
                        {speakingMessageId === msg.id ? <VolumeX size={16} className="animate-pulse" /> : <Volume2 size={16} />}
                    </button>
                )}
              </div>
            </div>
          ))}
          
          {isThinking && (
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
               <div className="glass-panel px-4 py-3 rounded-t-3xl rounded-br-3xl border border-[var(--border-color)] flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce"></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      <div className="flex-none p-6 pb-24 relative z-50">
        <div className="max-w-2xl mx-auto space-y-4">
          
          {attachedImage && (
            <div className="relative inline-block animate-in zoom-in">
              <img src={attachedImage} className="w-16 h-16 rounded-xl object-cover border-2 border-[var(--accent)] shadow-lg" />
              <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg"><XCircle size={12}/></button>
            </div>
          )}

          <div className={`flex items-center gap-2 glass-panel rounded-[2rem] p-2 transition-all group focus-within:border-[var(--accent)]/50 focus-within:shadow-[var(--accent-glow)] ${isThinking ? 'opacity-70 pointer-events-none' : ''}`}>
            
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageAttach} />
            
            {/* Image Attach Button */}
            <button onClick={() => fileInputRef.current?.click()} className="p-3 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
              <ImageIcon size={20} />
            </button>

            {/* Smart Fix Button (Manual trigger for typed text) */}
            {input.length > 2 && (
                <button 
                    onClick={handleSmartFix}
                    className={`p-2 transition-colors ${isFixingGrammar ? 'text-[var(--accent)] animate-spin' : 'text-[var(--text-muted)] hover:text-[var(--accent)]'}`}
                    title="Исправить грамматику"
                >
                    <Sparkles size={18} />
                </button>
            )}

            {/* Input Field */}
            <textarea 
              rows={1} 
              value={input} 
              onChange={e => { setInput(e.target.value); stopSpeaking(); }}
              onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              placeholder={isThinking ? "Ожидание ответа..." : "Сообщение..."}
              disabled={isThinking}
              className="flex-1 bg-transparent text-sm text-[var(--text-main)] px-2 py-4 outline-none resize-none no-scrollbar placeholder:text-[var(--text-muted)]/40 font-bold" 
            />

            {/* Mic Button */}
            <button 
              onClick={toggleVoice} 
              className={`p-3 transition-colors ${isRecording ? 'text-rose-500 animate-pulse' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Send Button */}
            <button 
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${!canSend ? 'opacity-20 bg-[var(--bg-main)] cursor-not-allowed' : 'bg-[var(--accent)] text-white shadow-lg active:scale-90 cursor-pointer'}`}
            >
              {isThinking ? <Loader2 size={20} className="animate-spin" /> : <ArrowUp size={20} strokeWidth={3} />}
            </button>
          </div>
          
          {/* Status Text (Interim or Improving) */}
          {interimText && <div className="text-center text-[9px] font-black text-[var(--accent)] animate-pulse uppercase tracking-widest">{interimText}</div>}
        </div>
      </div>
    </div>
  );
};

export default Mentorship;