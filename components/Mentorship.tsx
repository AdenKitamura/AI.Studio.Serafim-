
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Task, Thought, JournalEntry, Project, Habit, ChatSession, ChatCategory, Priority } from '../types';
import { createMentorChat } from '../services/geminiService';
import { Loader2, ArrowUp, Zap, Plus, Search, CheckCircle, Mic, MicOff, FolderPlus, Activity } from 'lucide-react';

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

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ru-RU';
      recognitionRef.current.onresult = (e: any) => {
        let t = ''; for (let i = e.resultIndex; i < e.results.length; ++i) t += e.results[i][0].transcript;
        setInput(t);
      };
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  useEffect(() => { if (voiceTrigger > 0 && !isRecording) toggleVoice(); }, [voiceTrigger]);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isRecording) { recognitionRef.current.stop(); setIsRecording(false); }
    else { setInput(''); recognitionRef.current.start(); setIsRecording(true); }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isThinking) return;
    if (!hasAiKey) { onConnectAI(); return; }
    if (isRecording) recognitionRef.current.stop();

    setInput('');
    setIsThinking(true);
    const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    const currentMessages = [...(activeSession?.messages || []), userMsg];
    onUpdateMessages(currentMessages);

    try {
      if (!chatSessionRef.current) chatSessionRef.current = createMentorChat(tasks, thoughts, journal, projects, habits);
      
      let response = await chatSessionRef.current.sendMessage({ message: text });
      
      // Обработка вызовов инструментов ПЕРЕД выводом сообщения модели
      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const fc of response.functionCalls) {
          const args = fc.args as any;
          
          if (fc.name === 'query_memory') {
            const term = (args.searchTerm || '').toLowerCase();
            const cat = args.category || 'all';
            let results = [];
            if (cat === 'all' || cat === 'journal') results.push(...journal.filter(j => j.content.toLowerCase().includes(term)).map(j => `[Дневник ${j.date}]: ${j.content}`));
            if (cat === 'all' || cat === 'thoughts') results.push(...thoughts.filter(t => t.content.toLowerCase().includes(term)).map(t => `[Мысль]: ${t.content}`));
            
            setActionFeedback({ msg: `Ищу: ${term}`, type: 'search' });
            // Передаем результаты поиска обратно модели для финального ответа
            response = await chatSessionRef.current.sendMessage({ message: `Системный поиск по "${term}" вернул: ${results.length > 0 ? results.join('\n') : 'Результатов нет'}. Ответь пользователю.` });
          } 
          else if (fc.name === 'create_task') {
            const newTask: Task = {
              id: Date.now().toString(),
              title: args.title,
              priority: (args.priority as Priority) || Priority.MEDIUM,
              dueDate: args.dueDate || new Date().toISOString(),
              isCompleted: false,
              createdAt: new Date().toISOString()
            };
            onAddTask(newTask);
            setActionFeedback({ msg: `Создано: ${args.title}`, type: 'task' });
          }
          else if (fc.name === 'create_project') {
            const newProject: Project = {
              id: Date.now().toString(),
              title: args.title,
              color: args.color || '#6366f1',
              createdAt: new Date().toISOString()
            };
            onAddProject(newProject);
            setActionFeedback({ msg: `Проект развернут: ${args.title}`, type: 'project' });
          }
          else if (fc.name === 'add_habit') {
            const newHabit: Habit = {
              id: Date.now().toString(),
              title: args.title,
              color: args.color || '#10b981',
              completedDates: [],
              createdAt: new Date().toISOString()
            };
            onAddHabit(newHabit);
            setActionFeedback({ msg: `Привычка добавлена`, type: 'success' });
          }
          else if (fc.name === 'save_link') {
            onAddThought({
              id: Date.now().toString(),
              content: args.title,
              type: 'link',
              tags: ['saved-by-ai'],
              metadata: { url: args.url },
              createdAt: new Date().toISOString()
            });
            setActionFeedback({ msg: 'Ссылка сохранена', type: 'success' });
          }
        }
        setTimeout(() => setActionFeedback(null), 3500);
      }

      const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: response.text || "Действие выполнено.", timestamp: Date.now() };
      onUpdateMessages([...currentMessages, modelMsg]);
    } catch (e) {
      console.error("AI Core Error:", e);
      onUpdateMessages([...currentMessages, { id: 'err', role: 'model', content: "Сбой когнитивного ядра. Проверьте настройки API.", timestamp: Date.now() }]);
    } finally { setIsThinking(false); }
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
               actionFeedback.type === 'project' ? <FolderPlus size={18} /> : <CheckCircle size={18} />}
              <span className="text-xs font-bold whitespace-nowrap">{actionFeedback.msg}</span>
           </div>
        </div>
      )}

      <div className="flex-none px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Activity size={20} className="text-indigo-500" />
          <div>
            <h2 className="text-sm font-bold">Серафим OS</h2>
            <p className="text-[8px] font-black uppercase tracking-widest text-indigo-400/50">Core Intelligence</p>
          </div>
        </div>
        <button onClick={() => onNewSession('Новый диалог', 'general')} className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Plus size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-32">
        {sessions.find(s => s.id === activeSessionId)?.messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 border border-white/5 backdrop-blur-md'}`}>
              <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
            </div>
          </div>
        ))}
        {isThinking && <div className="flex items-center gap-3 p-4 text-[10px] font-black uppercase tracking-[0.2em] opacity-50 animate-pulse"><Loader2 size={14} className="animate-spin text-indigo-500" /> Serafim is processing...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/95 to-transparent pt-10">
        <div className={`flex items-center gap-2 max-w-2xl mx-auto bg-[var(--bg-item)]/90 backdrop-blur-3xl border ${isRecording ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-white/10'} rounded-[1.75rem] p-1.5 shadow-2xl transition-all`}>
          <button onClick={toggleVoice} className={`p-3 rounded-xl transition-all ${isRecording ? 'bg-indigo-500 text-white' : 'text-indigo-400/50 hover:bg-white/5'}`}>{isRecording ? <MicOff size={20} /> : <Mic size={20} />}</button>
          <textarea rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleSend(); } }} placeholder="Задай вопрос или поставь задачу..." className="flex-1 bg-transparent text-sm text-white px-3 py-3 outline-none resize-none no-scrollbar placeholder:text-white/10" />
          <button onClick={handleSend} disabled={!input.trim() || isThinking} className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${!input.trim() || isThinking ? 'opacity-20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 active:scale-90'}`}><ArrowUp size={20} strokeWidth={3} /></button>
        </div>
        <div className="h-20" />
      </div>
    </div>
  );
};

export default Mentorship;
