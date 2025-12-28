
import React, { useEffect, useState } from 'react';
import { Task, Thought, JournalEntry, Project, Habit, ChatMessage, ChatSession, ChatCategory } from '../types';
import { Brain, Sparkles, Lightbulb, Quote as QuoteIcon } from 'lucide-react';
import Mentorship from './Mentorship'; 
import { getAllQuotes, Quote } from '../services/quotesService';
import { format } from 'date-fns';
// Fix: Import locale directly from the specific path
import { ru } from 'date-fns/locale/ru';

interface DashboardProps {
  tasks: Task[];
  thoughts: Thought[];
  journal: JournalEntry[];
  projects: Project[];
  habits?: Habit[];
  // Fix: Added missing session related props required by Mentorship
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onUpdateMessages: (messages: ChatMessage[]) => void;
  onNewSession: (title: string, category: ChatCategory) => void;
  onDeleteSession: (id: string) => void;
  onAddTask: (task: Task) => void;
  onAddProject: (project: Project) => void;
  onAddThought: (thought: Thought) => void;
  onNavigate: (view: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    tasks, thoughts, journal, projects, habits = [],
    sessions, activeSessionId, onSelectSession, onUpdateMessages, onNewSession, onDeleteSession,
    onAddTask, onAddProject, onAddThought, onNavigate 
}) => {
  const [feedItems, setFeedItems] = useState<any[]>([]);

  useEffect(() => {
    // Merge thoughts and random quotes into a "Feed"
    const quotes = getAllQuotes().map(q => ({ ...q, type: 'quote', createdAt: new Date().toISOString() })); // Mock date for sorting
    
    // Simple shuffle for variety in demo
    const mixed = [...thoughts, ...quotes.slice(0, 3)].sort(() => Math.random() - 0.5);
    setFeedItems(mixed);
  }, [thoughts]);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      
      {/* Top Half: AI Interaction Area */}
      <div className="h-[45vh] flex flex-col border-b border-[var(--bg-card)]">
         {/* Fix: Pass missing required session props to Mentorship instead of invalid 'messages' */}
         <Mentorship 
            tasks={tasks} 
            thoughts={thoughts} 
            journal={journal} 
            projects={projects}
            habits={habits}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={onSelectSession}
            onUpdateMessages={onUpdateMessages}
            onNewSession={onNewSession}
            onDeleteSession={onDeleteSession}
            onAddTask={onAddTask}
            onAddProject={onAddProject}
            onAddThought={onAddThought}
            compactMode={true} 
         />
      </div>

      {/* Bottom Half: Stream of Consciousness / Wisdom Feed */}
      <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg-main)]">
        <h3 className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <Sparkles size={14} />
            Поток мыслей и мудрости
        </h3>

        <div className="space-y-4 pb-24">
            {feedItems.map((item, idx) => {
                if (item.type === 'quote') {
                    const quote = item as Quote;
                    return (
                        <div key={`q-${idx}`} className="p-5 bg-[var(--bg-item)] rounded-xl border border-[var(--bg-card)] relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-8 opacity-5 text-[var(--accent)] rotate-12">
                                <QuoteIcon size={80} />
                             </div>
                             <p className="text-[var(--text-main)] font-serif italic text-lg mb-3 relative z-10">"{quote.text}"</p>
                             <div className="flex justify-end items-center gap-2">
                                <div className="h-px w-8 bg-[var(--accent)] opacity-50"></div>
                                <span className="text-xs text-[var(--text-muted)] font-bold uppercase">{quote.author}</span>
                             </div>
                        </div>
                    );
                } else {
                    const thought = item as Thought;
                    return (
                         <div key={thought.id} className="p-4 bg-[var(--bg-item)]/50 rounded-xl border-l-2 border-[var(--accent)] hover:bg-[var(--bg-item)] transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                {thought.type === 'idea' ? <Lightbulb size={14} className="text-yellow-500"/> : <Brain size={14} className="text-[var(--accent)]"/>}
                                <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold">{thought.type === 'idea' ? 'Идея' : 'Мысль'}</span>
                                {/* Fix: Replace parseISO with native Date constructor */}
                                <span className="text-[10px] text-[var(--text-muted)] ml-auto">{format(new Date(thought.createdAt), 'd MMM', { locale: ru })}</span>
                            </div>
                            <p className="text-[var(--text-main)] text-sm leading-relaxed opacity-90">{thought.content}</p>
                         </div>
                    );
                }
            })}
             
             {/* Simple stats visualization at bottom of feed */}
             <div className="grid grid-cols-2 gap-4 mt-8 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => onNavigate('tasks')}>
                <div className="bg-[var(--bg-card)] p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-[var(--text-main)]">{tasks.filter(t => !t.isCompleted).length}</div>
                    <div className="text-[10px] uppercase text-[var(--text-muted)]">Активных задач</div>
                </div>
                 <div className="bg-[var(--bg-card)] p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-[var(--text-main)]">{tasks.filter(t => t.isCompleted).length}</div>
                     <div className="text-[10px] uppercase text-[var(--text-muted)]">Выполнено</div>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
