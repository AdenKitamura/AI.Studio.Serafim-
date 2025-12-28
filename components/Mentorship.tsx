
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Task, Thought, JournalEntry, Project, Habit, ChatSession, ChatCategory, Priority } from '../types';
import { createMentorChat } from '../services/geminiService';
import { Loader2, ArrowUp, Zap, Plus, Search, CheckCircle, Mic, MicOff, FolderPlus, Activity, Sparkles } from 'lucide-react';

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
  onAddTask: (task: Task) => void;
  onAddThought: (thought: Thought) => void;
  onAddProject: (project: Project) => void;
  onAddHabit: (habit: Habit) => void;
  hasAiKey: boolean;
  onConnectAI: () => void;
  voiceTrigger?: number;
}

const Mentorship: React.FC<MentorshipProps> = ({ 
    tasks, thoughts, journal, projects, habits = [], 
    sessions, activeSessionId, onSelectSession, onUpdateMessages, onNewSession, onDeleteSession,
    onAddTask, onAddThought, onAddProject, onAddHabit, hasAiKey, onConnectAI, voiceTrigger = 0
}) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{msg: string, type: 'search' | 'success' | 'task' | 'project'} | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'ru-RU';
      
      rec.onresult = (e: any) => {
        let finalTranscript = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalTranscript += e.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setInput(prev => {
            const trimmedPrev = prev.trim();
            const trimmedNew = finalTranscript.trim();
            if (trimmedPrev.toLowerCase().endsWith(trimmedNew.toLowerCase())) return prev;
            return trimmedPrev ? `${trimmedPrev} ${trimmedNew}` : trimmedNew;
          });
        }
      };

      rec.onend = () => setIsRecording(false);
      rec.onerror = () => setIsRecording(false);
      recognitionRef.current = rec;
    }
  }, []);

  useEffect(() => { 
    if (voiceTrigger > 0 && !isRecording) toggleVoice(); 
  }, [voiceTrigger]);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    try {
      if (isRecording) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
        setIsRecording(true);
      }
    } catch (e) {
      console.warn("Speech session management error", e);
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    const textToSend = input.trim();
    if (!textToSend || isThinking) return;
    
    // Check key before anything else
    if (!hasAiKey) {
      onConnectAI();
      return;
    }
    
    // Stop recording and reset state
    if (isRecording) {
      try { recognitionRef.current?.stop(); } catch(e){}
      setIsRecording(false);
    }

    setIsThinking(true);
    setInput('');
    
    try {
      const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: textToSend, timestamp: Date.now() };
      const currentMessages = [...(activeSession?.messages || []), userMsg];
      
      // Update local state first for responsiveness
      onUpdateMessages(currentMessages);

      // Ensure session is initialized
      if (!chatSessionRef.current) {
        chatSessionRef.current = createMentorChat(tasks, thoughts, journal, projects, habits);
      }
      
      const response = await chatSessionRef.current.sendMessage({ message: textToSend });
      
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const fc of response.functionCalls) {
          const args = fc.args as any;
          if (fc.name === 'create_task') {
            onAddTask({ id: Date.now().toString(), title: args.title, priority: args.priority || Priority.MEDIUM, dueDate: args.dueDate || new Date().toISOString(), isCompleted: false, createdAt: new Date().toISOString() });
            setActionFeedback({ msg: `Задача зафиксирована`, type: 'task' });
          } else if (fc.name === 'create_project') {
            onAddProject({ id: Date.now().toString(), title: args.title, color: args.color || '#6366f1', createdAt: new Date().toISOString() });
            setActionFeedback({ msg: `Проект развернут`, type: 'project' });
          } else if (fc.name === 'add_habit') {
            onAddHabit({ id: Date.now().toString(), title: args.title, color: args.color || '#10b981', completedDates: [], createdAt: new Date().toISOString() });
            setActionFeedback({ msg: `Привычка создана`, type: 'success' });
          } else if (fc.name === 'query_memory') {
            setActionFeedback({ msg: `Синхронизация с памятью...`, type: 'search' });
          }
        }
        setTimeout(() => setActionFeedback(null), 3000);
      }

      const modelMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        content: response.text || "Запрос обработан.", 
        timestamp: Date.now() 
      };
      onUpdateMessages([...currentMessages, modelMsg]);

    } catch (e) {
      console.error("Critical Send Error:", e);
      // Reset AI session on error to prevent broken state
      chatSessionRef.current = null;
      onUpdateMessages([...(sessions.find(s => s.id === activeSessionId)?.messages || []), { 
        id: 'err-' + Date.now(), 
        role: 'model', 
        content: "Критическая ошибка нейромодуля. Мы сбросили сессию, попробуйте еще раз.", 
        timestamp: Date.now() 
      }]);
    } finally { 
      setIsThinking(false); 
      // Refocus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId, isThinking]);

  return (
    <div className="flex flex-col h-full bg-transparent relative z-10 overflow-hidden">
      {actionFeedback && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-500">
           <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 ${
             actionFeedback.type === 'search' ? 'bg-amber-600' : 
             actionFeedback.type === 'task' ? 'bg-indigo-600' :
             actionFeedback.type === 'project' ? 'bg-purple-600' : 'bg-emerald-600'
           } text-white`}>
              {actionFeedback.type === 'search' ? <Search size={18} /> : 
               actionFeedback.type === 'task' ? <CheckCircle size={18} /> :
               actionFeedback.type === 'project' ? <FolderPlus size={18} /> : <Sparkles size={18} />}
              <span className="text-xs font-bold whitespace-nowrap">{actionFeedback.msg}</span>
           </div>
        </div>
      )}

      <div className="flex-none px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Activity size={20} className="text-indigo-500" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-tighter">Serafim AI</h2>
            <p className="text-[8px] font-black uppercase tracking-widest text-indigo-400/50">Core Online</p>
          </div>
        </div>
        <button onClick={() => onNewSession('Новый диалог', 'general')} className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition-all"><Plus size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-32">
        {sessions.find(s => s.id === activeSessionId)?.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border border-white/5 backdrop-blur-md text-white/90'}`}>
              <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex items-center gap-3 p-4 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/60 animate-pulse">
            <Loader2 size={14} className="animate-spin" /> Cognitive Analysis...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent pt-12 z-20">
        <div className={`flex items-center gap-2 max-w-2xl mx-auto bg-zinc-900/90 backdrop-blur-3xl border ${isRecording ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-[0_0_25px_rgba(79,70,229,0.3)]' : 'border-white/10'} rounded-[1.75rem] p-1.5 shadow-2xl transition-all`}>
          <button 
            onClick={toggleVoice} 
            className={`p-3 rounded-xl transition-all cursor-pointer ${isRecording ? 'bg-rose-500 text-white' : 'text-indigo-400/70 hover:bg-white/5'}`}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <textarea 
            ref={inputRef}
            rows={1} 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleSend(); } }} 
            placeholder="Спроси Серафима..." 
            className="flex-1 bg-transparent text-sm text-white px-3 py-3 outline-none resize-none no-scrollbar placeholder:text-white/10" 
          />
          <button 
            onClick={handleSend} 
            disabled={!input.trim() || isThinking} 
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${!input.trim() || isThinking ? 'opacity-20 cursor-default' : 'bg-indigo-600 text-white shadow-lg active:scale-90 hover:bg-indigo-500 cursor-pointer'}`}
          >
            {isThinking ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={20} strokeWidth={3} />}
          </button>
        </div>
        <div className="h-16" />
      </div>
    </div>
  );
};

export default Mentorship;
