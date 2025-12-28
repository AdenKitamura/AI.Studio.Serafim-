
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Task, Thought, JournalEntry, Project, Habit, ChatSession, ChatCategory } from '../types';
import { createMentorChat } from '../services/geminiService';
import { Loader2, ArrowUp, Zap, Plus, History, X, Trash2, Tag, ChevronLeft, Sparkles, ShieldAlert, Mic, MicOff } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';

interface MentorshipProps {
  tasks: Task[];
  thoughts: Thought[];
  journal: JournalEntry[];
  projects: Project[];
  habits?: Habit[];
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onUpdateMessages: (messages: ChatMessage[]) => void;
  onNewSession: (title: string, category: ChatCategory) => void;
  onDeleteSession: (id: string) => void;
  compactMode?: boolean; 
  onAddTask: (task: Task) => void;
  onAddProject: (project: Project) => void;
  onAddThought: (thought: Thought) => void;
  hasAiKey: boolean;
  onConnectAI: () => void;
  voiceTrigger?: number; // Signal to start voice recognition
}

const CATEGORY_MAP: Record<ChatCategory, { label: string, color: string }> = {
  general: { label: 'Общее', color: 'bg-indigo-500' },
  strategy: { label: 'Стратегия', color: 'bg-amber-500' },
  productivity: { label: 'Эффективность', color: 'bg-emerald-500' },
  learning: { label: 'Обучение', color: 'bg-blue-500' },
  mental: { label: 'Ментальное', color: 'bg-purple-500' }
};

const Mentorship: React.FC<MentorshipProps> = ({ 
    tasks, thoughts, journal, projects, habits = [], 
    sessions, activeSessionId, onSelectSession, onUpdateMessages, onNewSession, onDeleteSession,
    hasAiKey, onConnectAI, voiceTrigger = 0
}) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
  // Voice Recognition States
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ChatCategory>('general');

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkTimeoutRef = useRef<number | null>(null);

  // Initialize Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ru-RU';

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInput(currentTranscript);
      };

      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  // Handle external voice trigger
  useEffect(() => {
    if (voiceTrigger > 0 && recognitionRef.current && !isRecording) {
      toggleVoice();
    }
  }, [voiceTrigger]);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setInput('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  useEffect(() => {
    chatSessionRef.current = null;
    return () => { if (thinkTimeoutRef.current) clearTimeout(thinkTimeoutRef.current); };
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isThinking) return;
    
    if (!hasAiKey) {
      onConnectAI();
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    }

    setInput('');
    setIsThinking(true);
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    onUpdateMessages([...messages, userMsg]);

    thinkTimeoutRef.current = window.setTimeout(() => {
      if (isThinking) {
        setIsThinking(false);
        onUpdateMessages([...messages, userMsg, { id: 'err-timeout', role: 'model', content: "Слишком долгий ответ. Возможно, стоит проверить подключение.", timestamp: Date.now() }]);
      }
    }, 30000);

    try {
      if (!chatSessionRef.current) {
        chatSessionRef.current = createMentorChat(tasks, thoughts, journal, projects, habits);
      }
      const result = await chatSessionRef.current.sendMessage({ message: text });
      if (thinkTimeoutRef.current) clearTimeout(thinkTimeoutRef.current);
      
      const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: result.text, timestamp: Date.now() };
      onUpdateMessages([...messages, userMsg, modelMsg]);
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes("Requested entity was not found") || e.status === 404) {
        onConnectAI();
      } else {
        onUpdateMessages([...messages, userMsg, { id: 'err-' + Date.now(), role: 'model', content: "Ошибка связи. Попробуйте еще раз.", timestamp: Date.now() }]);
      }
    } finally {
      setIsThinking(false);
    }
  };

  const handleCreateSession = () => {
    onNewSession(newTitle, newCategory);
    setNewTitle('');
    setNewCategory('general');
    setIsCreatingSession(false);
    setShowHistory(false);
  };

  return (
    <div className="flex flex-col h-full bg-transparent relative z-10 overflow-hidden">
      <style>{`
        .voice-wave {
          display: flex;
          align-items: center;
          gap: 2px;
          height: 12px;
        }
        .voice-bar {
          width: 2px;
          background: #6366f1;
          border-radius: 4px;
          animation: wave-anim 1s ease-in-out infinite;
        }
        @keyframes wave-anim {
          0%, 100% { height: 4px; }
          50% { height: 12px; }
        }
      `}</style>
      
      {/* Sessions Browser Sidebar / Overlay */}
      {showHistory && (
        <div className="absolute inset-0 z-[60] bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute left-0 top-0 h-full w-full max-w-[320px] bg-[var(--bg-main)] border-r border-white/5 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="font-bold text-lg">История чатов</h2>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={18}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              <button 
                onClick={() => setIsCreatingSession(true)}
                className="w-full py-4 border border-dashed border-indigo-500/30 rounded-2xl text-indigo-400 font-bold flex items-center justify-center gap-2 hover:bg-indigo-500/5 transition-all mb-4"
              >
                <Plus size={18} /> Новый чат
              </button>

              {sessions.map(s => (
                <div 
                  key={s.id} 
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${s.id === activeSessionId ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                  onClick={() => { onSelectSession(s.id); setShowHistory(false); }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded text-white font-bold uppercase ${CATEGORY_MAP[s.category].color}`}>
                      {CATEGORY_MAP[s.category].label}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); if(confirm('Удалить чат?')) onDeleteSession(s.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h3 className="text-sm font-bold truncate pr-4">{s.title}</h3>
                  <p className="text-[10px] text-white/30 mt-1">{format(s.lastInteraction, 'd MMM, HH:mm', { locale: ru })}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1" onClick={() => setShowHistory(false)} />
        </div>
      )}

      {/* New Session Dialog */}
      {isCreatingSession && (
        <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-[var(--bg-main)] w-full max-w-sm p-6 rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-lg mb-4">Создать новую сессию</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-white/30 uppercase mb-2 block">Тема обсуждения</label>
                <input 
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="О чем будем говорить?"
                  className="w-full bg-white/5 border border-white/5 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/30 uppercase mb-2 block">Категория</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CATEGORY_MAP) as ChatCategory[]).map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setNewCategory(cat)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${newCategory === cat ? 'bg-indigo-600 border-transparent text-white' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}`}
                    >
                      {CATEGORY_MAP[cat].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsCreatingSession(false)} className="flex-1 py-3 text-sm font-bold opacity-50">Отмена</button>
                <button onClick={handleCreateSession} className="flex-1 py-3 bg-indigo-600 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20">Создать</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header for Active Session */}
      <div className="flex-none px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHistory(true)} className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
            <History size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${CATEGORY_MAP[activeSession.category].color}`} />
              <h2 className="text-sm font-bold truncate max-w-[150px]">{activeSession.title}</h2>
            </div>
            <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">{CATEGORY_MAP[activeSession.category].label}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsCreatingSession(true)}
          className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition-all"
          title="Новый чат"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-32">
        {!hasAiKey && (
          <div className="animate-in zoom-in-95 duration-500">
            <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-3xl p-8 text-center shadow-xl backdrop-blur-md">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles size={32} className="text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ИИ не подключен</h3>
              <p className="text-sm text-white/60 mb-8 max-w-xs mx-auto leading-relaxed">
                Для работы цифрового ментора необходимо выбрать ваш персональный API ключ.
              </p>
              <button 
                onClick={onConnectAI}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <Zap size={18} /> Выбрать ключ
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-[var(--text-main)] border border-white/5 backdrop-blur-md'}`}>
              <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex items-center gap-3 p-4 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest animate-pulse">
            <Loader2 size={14} className="animate-spin text-indigo-500" /> 
            Серафим размышляет...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Improved Input Area with Voice Visualizer */}
      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/90 to-transparent pt-10">
        
        {isRecording && (
          <div className="flex items-center justify-center gap-3 mb-3 animate-in slide-in-from-bottom-2 duration-300">
             <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Serafim Слушает</span>
             <div className="voice-wave">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="voice-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
             </div>
          </div>
        )}

        <div className={`flex items-center gap-2 max-w-2xl mx-auto bg-[var(--bg-item)]/80 backdrop-blur-2xl border ${isRecording ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-white/10'} rounded-[1.5rem] p-1.5 shadow-2xl transition-all`}>
          <button 
            onClick={toggleVoice}
            className={`p-3 transition-colors rounded-xl ${isRecording ? 'bg-indigo-500 text-white' : 'text-[var(--text-muted)] hover:text-indigo-400 hover:bg-white/5'}`}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={isRecording ? "Говорите..." : "Ваша мысль или вопрос..."}
            className="flex-1 bg-transparent text-sm text-white px-3 py-3 outline-none resize-none no-scrollbar placeholder:text-white/20"
            disabled={!hasAiKey}
          />
          <button 
            onClick={handleSend} 
            disabled={!input.trim() || isThinking || !hasAiKey} 
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all shadow-lg ${!input.trim() || isThinking || !hasAiKey ? 'bg-white/5 text-white/20' : 'bg-indigo-600 text-white active:scale-95'}`}
          >
            <ArrowUp size={20} strokeWidth={3} />
          </button>
        </div>
        <div className="h-24" />
      </div>
    </div>
  );
};

export default Mentorship;
