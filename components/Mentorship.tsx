
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Task, Thought, JournalEntry, Project, Habit, ChatSession, ChatCategory, Priority } from '../types';
import { createMentorChat } from '../services/geminiService';
import { Loader2, ArrowUp, Zap, Plus, History, X, Trash2, Tag, ChevronLeft, Sparkles, ShieldAlert, Mic, MicOff, CheckCircle, FolderPlus } from 'lucide-react';
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
  const [showHistory, setShowHistory] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{msg: string, type: 'success' | 'project'} | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ru-RU';
      recognitionRef.current.onresult = (e: any) => {
        let t = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) t += e.results[i][0].transcript;
        setInput(t);
      };
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  useEffect(() => {
    if (voiceTrigger > 0 && !isRecording) toggleVoice();
  }, [voiceTrigger]);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isRecording) { recognitionRef.current.stop(); setIsRecording(false); }
    else { setInput(''); recognitionRef.current.start(); setIsRecording(true); }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, isThinking]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isThinking) return;
    if (!hasAiKey) { onConnectAI(); return; }

    if (isRecording) { recognitionRef.current.stop(); }

    setInput('');
    setIsThinking(true);
    const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    const currentMessages = [...(activeSession?.messages || []), userMsg];
    onUpdateMessages(currentMessages);

    try {
      if (!chatSessionRef.current) {
        chatSessionRef.current = createMentorChat(tasks, thoughts, journal, projects, habits);
      }
      
      const response = await chatSessionRef.current.sendMessage({ message: text });
      
      let acted = false;
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const fc of response.functionCalls) {
          if (fc.name === 'create_task') {
            const t: Task = {
              id: Date.now().toString(),
              title: fc.args.title,
              dueDate: fc.args.dueDate,
              priority: (fc.args.priority as Priority) || Priority.MEDIUM,
              isCompleted: false,
              createdAt: new Date().toISOString()
            };
            onAddTask(t);
            setActionFeedback({ msg: `Задача "${t.title}" создана`, type: 'success' });
            acted = true;
          } else if (fc.name === 'add_thought') {
            const th: Thought = {
              id: Date.now().toString(),
              content: fc.args.content,
              type: fc.args.type as any,
              tags: ['ai-captured'],
              createdAt: new Date().toISOString()
            };
            onAddThought(th);
            setActionFeedback({ msg: `Мысль зафиксирована в архиве`, type: 'success' });
            acted = true;
          } else if (fc.name === 'create_project') {
            const p: Project = {
              id: Date.now().toString(),
              title: fc.args.title,
              description: fc.args.description,
              color: fc.args.color || '#6366f1',
              createdAt: new Date().toISOString()
            };
            onAddProject(p);
            setActionFeedback({ msg: `Проект "${p.title}" развернут`, type: 'project' });
            acted = true;
          } else if (fc.name === 'add_habit') {
            const h: Habit = {
              id: Date.now().toString(),
              title: fc.args.title,
              color: fc.args.color || '#10b981',
              completedDates: [],
              createdAt: new Date().toISOString()
            };
            onAddHabit(h);
            setActionFeedback({ msg: `Привычка "${h.title}" добавлена в трекер`, type: 'success' });
            acted = true;
          }
        }
        if (acted) setTimeout(() => setActionFeedback(null), 4000);
      }

      const modelContent = response.text || (acted ? "Системное подтверждение: действие выполнено." : "Хм, возникла заминка. Повторите еще раз?");
      const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: modelContent, timestamp: Date.now() };
      onUpdateMessages([...currentMessages, modelMsg]);

    } catch (e: any) {
      console.error("Gemini Error:", e);
      onUpdateMessages([...currentMessages, { id: 'e', role: 'model', content: "Ошибка соединения. Проверьте API ключ.", timestamp: Date.now() }]);
    } finally {
      setIsThinking(false);
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  return (
    <div className="flex flex-col h-full bg-transparent relative z-10 overflow-hidden">
      <style>{`
        .voice-wave { display: flex; align-items: center; gap: 3px; height: 16px; }
        .voice-bar { width: 3px; background: #6366f1; border-radius: 4px; animation: wave-anim 0.8s ease-in-out infinite; }
        @keyframes wave-anim { 0%, 100% { height: 4px; } 50% { height: 16px; } }
      `}</style>

      {showHistory && (
        <div className="absolute inset-0 z-[60] bg-black/40 backdrop-blur-md animate-in fade-in">
          <div className="absolute left-0 top-0 h-full w-full max-w-[300px] bg-[var(--bg-main)] border-r border-white/5 flex flex-col animate-in slide-in-from-left">
            <div className="p-6 border-b border-white/5 flex justify-between items-center"><h2 className="font-bold">История</h2><button onClick={() => setShowHistory(false)}><X size={18}/></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {sessions.map(s => (
                <div key={s.id} onClick={() => { onSelectSession(s.id); setShowHistory(false); }} className={`p-4 rounded-xl cursor-pointer ${s.id === activeSessionId ? 'bg-indigo-600/10 border border-indigo-500/30' : 'bg-white/5 hover:bg-white/10'}`}>
                  <h3 className="text-sm font-bold truncate">{s.title}</h3>
                  <p className="text-[10px] opacity-30 uppercase">{s.category}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1" onClick={() => setShowHistory(false)} />
        </div>
      )}

      {/* Action Toast Feedback */}
      {actionFeedback && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[50] animate-in slide-in-from-top-4 fade-in duration-500">
           <div className={`${actionFeedback.type === 'project' ? 'bg-indigo-600' : 'bg-emerald-600'} text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10`}>
              {actionFeedback.type === 'project' ? <FolderPlus size={18} /> : <CheckCircle size={18} />}
              <span className="text-xs font-bold whitespace-nowrap">{actionFeedback.msg}</span>
           </div>
        </div>
      )}

      <div className="flex-none px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHistory(true)} className="p-2 hover:bg-white/5 rounded-full opacity-50 hover:opacity-100"><History size={20} /></button>
          <div><h2 className="text-sm font-bold truncate max-w-[150px]">{activeSession?.title || 'Новый чат'}</h2><p className="text-[9px] opacity-30 uppercase tracking-widest">{activeSession?.category || 'General'}</p></div>
        </div>
        <button onClick={() => onNewSession('Новый диалог', 'general')} className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Plus size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-32">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 border border-white/5 backdrop-blur-md'}`}>
              <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
            </div>
          </div>
        ))}
        {isThinking && <div className="flex items-center gap-3 p-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-50 animate-pulse"><Loader2 size={14} className="animate-spin text-indigo-500" /> Serafim Thinking...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/95 to-transparent pt-10">
        {isRecording && (
          <div className="flex items-center justify-center gap-4 mb-4 animate-in slide-in-from-bottom-2">
             <div className="voice-wave">{[1,2,3,4,5].map(i => <div key={i} className="voice-bar" style={{ animationDelay: `${i*0.1}s` }} />)}</div>
             <span className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.3em]">Listening OS...</span>
             <div className="voice-wave">{[1,2,3,4,5].map(i => <div key={i} className="voice-bar" style={{ animationDelay: `${i*0.1}s` }} />)}</div>
          </div>
        )}
        <div className={`flex items-center gap-2 max-w-2xl mx-auto bg-[var(--bg-item)]/90 backdrop-blur-3xl border ${isRecording ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-white/10'} rounded-[1.75rem] p-1.5 shadow-2xl transition-all`}>
          <button onClick={toggleVoice} className={`p-3 rounded-xl transition-all ${isRecording ? 'bg-indigo-500 text-white' : 'text-indigo-400/50 hover:bg-white/5'}`}>{isRecording ? <MicOff size={20} /> : <Mic size={20} />}</button>
          <textarea rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleSend(); } }} placeholder={isRecording ? "Listening..." : "Message Serafim..."} className="flex-1 bg-transparent text-sm text-white px-3 py-3 outline-none resize-none no-scrollbar placeholder:text-white/10" />
          <button onClick={handleSend} disabled={!input.trim() || isThinking} className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${!input.trim() || isThinking ? 'opacity-20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 active:scale-90'}`}><ArrowUp size={20} strokeWidth={3} /></button>
        </div>
        <div className="h-24" />
      </div>
    </div>
  );
};

export default Mentorship;
