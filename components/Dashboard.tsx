
import React, { useMemo, useState } from 'react';
import { Task, Thought, JournalEntry, Project, Habit, Priority } from '../types';
import { Sparkles, Clock, Target, CheckCircle2, Folder, Zap, ArrowRight, Plus, Lightbulb } from 'lucide-react';
import { format, isToday, isFuture, differenceInMinutes } from 'date-fns';
import HabitTracker from './HabitTracker';
import Ticker from './Ticker';
import NavigationPill from './NavigationPill';

interface DashboardProps {
  tasks: Task[];
  thoughts: Thought[];
  journal: JournalEntry[];
  projects: Project[];
  habits?: Habit[];
  onAddTask: (task: Task) => void;
  onAddProject: (project: Project) => void;
  onAddThought: (thought: Thought) => void;
  onNavigate: (view: any) => void;
  onToggleTask: (id: string, updates?: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onAddHabit: (habit: Habit) => void;
  onToggleHabit: (id: string, date: string) => void;
  onDeleteHabit: (id: string) => void;
  onOpenQuotes: () => void;
  onStartLiveAudio: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    tasks, thoughts, journal, projects, habits = [],
    onAddTask, onAddThought, onNavigate, onToggleTask, onDeleteTask,
    onAddHabit, onToggleHabit, onDeleteHabit, onOpenQuotes, onStartLiveAudio
}) => {
  const upcomingReminders = useMemo(() => tasks.filter(t => !t.isCompleted && t.dueDate && isFuture(new Date(t.dueDate))).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()).slice(0, 2), [tasks]);
  const todayTasks = useMemo(() => tasks.filter(t => !t.isCompleted && t.dueDate && isToday(new Date(t.dueDate))).sort((a, b) => (a.priority === Priority.HIGH ? 0 : 1) - (b.priority === Priority.HIGH ? 0 : 1)).slice(0, 3), [tasks]);
  const activeProjects = useMemo(() => projects.slice(0, 6), [projects]);
  
  // Logic for Journal Insight
  const latestJournalEntry = useMemo(() => {
      return [...journal].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [journal]);

  const insightText = useMemo(() => {
      if (!latestJournalEntry) return null;
      // Priority: Main Focus -> Tomorrow Goal -> Content Snippet
      if (latestJournalEntry.reflection?.mainFocus) return latestJournalEntry.reflection.mainFocus;
      if (latestJournalEntry.reflection?.tomorrowGoal) return `Цель: ${latestJournalEntry.reflection.tomorrowGoal}`;
      if (latestJournalEntry.content) return latestJournalEntry.content;
      return null;
  }, [latestJournalEntry]);

  // Edit Task State
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const openMenu = () => {
      const menuBtn = document.getElementById('sidebar-trigger');
      if(menuBtn) menuBtn.click();
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto no-scrollbar pb-32">
      
      {/* Ticker Section - Clean top */}
      <div className="pt-2 px-0 mb-4 opacity-50 hover:opacity-100 transition-opacity">
          <Ticker onClick={onOpenQuotes} />
      </div>

      <div className="px-6 space-y-6">
        
        {/* Urgent Section (Themed) */}
        {upcomingReminders.length > 0 && (
          <section className="grid grid-cols-1 gap-4">
            {upcomingReminders.map(task => (
              <div 
                key={task.id} 
                className="glass-panel rounded-[2rem] p-6 relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01] border border-[var(--border-color)]" 
                onClick={() => setEditingTask(task)}
              >
                {/* Glow derived from Theme Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)] blur-[80px] opacity-20 rounded-full translate-x-10 -translate-y-10 group-hover:opacity-30 transition-opacity"></div>
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent)] shrink-0 shadow-lg">
                        <Clock size={22} />
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-[var(--text-main)] leading-tight">{task.title}</h4>
                        <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-1.5 flex items-center gap-1">
                           🔥 Дедлайн: {differenceInMinutes(new Date(task.dueDate!), new Date())} мин
                        </p>
                    </div>
                  </div>
                  <button 
                      onClick={(e) => { e.stopPropagation(); onToggleTask(task.id, { isCompleted: !task.isCompleted }); }} 
                      className="w-12 h-12 rounded-full bg-[var(--accent)] text-white shadow-[0_0_20px_var(--accent-glow)] flex items-center justify-center transition-all active:scale-90 hover:scale-105"
                  >
                      <CheckCircle2 size={24} />
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Habit Tracker (Themed) */}
        <section className="glass-panel rounded-[2.5rem] p-7 border border-[var(--border-color)] relative bg-[var(--bg-item)]/30">
            <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent)] shadow-inner">
                        <Zap size={18} />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-70">Ритм Дня</h4>
                </div>
            </div>
            <div className="relative z-10">
                <HabitTracker 
                    habits={habits} 
                    selectedDate={new Date()} 
                    onAdd={onAddHabit} 
                    onToggle={onToggleHabit} 
                    onDelete={onDeleteHabit} 
                />
            </div>
        </section>

        {/* Focus & Insights (Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Priority Card */}
          <section>
            <div className="glass-panel rounded-[2.5rem] p-6 h-full flex flex-col relative overflow-hidden group border border-[var(--border-color)]">
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--accent)] text-white rounded-2xl flex items-center justify-center shadow-[0_0_15px_var(--accent-glow)]">
                          <Target size={20} />
                      </div>
                      <h3 className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Фокус</h3>
                  </div>
                  <button onClick={() => onNavigate('planner')} className="w-8 h-8 rounded-full border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-item)] transition-all">
                      <ArrowRight size={14} />
                  </button>
              </div>
              
              <div className="space-y-3 relative z-10">
                {todayTasks.length > 0 ? todayTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-4 group/item cursor-pointer p-2 rounded-xl hover:bg-[var(--bg-item)] transition-colors" onClick={() => setEditingTask(task)}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleTask(task.id, { isCompleted: !task.isCompleted }); }}
                        className="w-5 h-5 rounded-full border-2 border-[var(--border-color)] flex items-center justify-center shrink-0 group-hover/item:border-[var(--accent)] transition-colors"
                    >
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] opacity-0 group-hover/item:opacity-100 transition-all scale-50 group-hover/item:scale-100 shadow-[0_0_10px_var(--accent-glow)]" />
                    </button>
                    <span className="text-sm font-bold text-[var(--text-main)] truncate opacity-80 group-hover/item:opacity-100 transition-opacity">{task.title}</span>
                  </div>
                )) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-6 text-[var(--text-muted)] opacity-30">
                        <Target size={32} className="mb-2" />
                        <span className="text-[9px] font-black uppercase">Нет задач</span>
                    </div>
                )}
              </div>
            </div>
          </section>

          {/* Journal Insight Card (Replaces "Flow") */}
          <section>
            <div className="glass-panel rounded-[2.5rem] p-6 h-full flex flex-col relative overflow-hidden group bg-gradient-to-br from-[var(--bg-item)] to-transparent border border-[var(--border-color)]">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--accent)] blur-[80px] opacity-[0.1] rounded-full pointer-events-none"></div>
              
              <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-10 h-10 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-2xl flex items-center justify-center text-amber-400">
                      <Lightbulb size={18} />
                  </div>
                  <h3 className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Инсайт</h3>
              </div>
              
              {insightText ? (
                <div className="flex flex-col flex-1 relative z-10">
                    <div className="relative">
                        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-amber-400 opacity-50 rounded-full"></div>
                        <p className="text-sm text-[var(--text-main)] font-medium line-clamp-4 leading-relaxed pl-4">
                            "{insightText}"
                        </p>
                    </div>
                    <div className="mt-auto pt-4 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-[var(--text-muted)] opacity-60">
                            {format(new Date(latestJournalEntry.date), 'd MMM')}
                        </span>
                        <button onClick={() => onNavigate('journal')} className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] hover:text-[var(--text-main)] transition-colors flex items-center gap-2">
                            В дневник <ArrowRight size={12} />
                        </button>
                    </div>
                </div>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-6 text-[var(--text-muted)] opacity-50">
                      <p className="text-[10px] font-black uppercase mb-4 text-center">Дневник пуст</p>
                      <button onClick={() => onNavigate('journal')} className="px-4 py-2 bg-[var(--bg-item)] border border-[var(--border-color)] rounded-xl text-xs font-bold hover:bg-[var(--accent)] hover:text-white transition-all">
                          Записать мысли
                      </button>
                  </div>
              )}
            </div>
          </section>
        </div>

        {/* Projects (Horizontal Scroll) */}
        <section>
          <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Проекты</h3>
              <button onClick={() => onNavigate('projects')} className="w-8 h-8 rounded-full bg-[var(--bg-item)] flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-all">
                  <Folder size={14} />
              </button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-8 flex-nowrap w-full">
            {activeProjects.length > 0 ? activeProjects.map(project => {
              const pTasks = tasks.filter(t => t.projectId === project.id);
              const progress = pTasks.length > 0 ? Math.round((pTasks.filter(t => t.isCompleted).length / pTasks.length) * 100) : 0;
              return (
                <div 
                    key={project.id} 
                    onClick={() => onNavigate('projects')} 
                    className="flex-none w-48 glass-panel rounded-[2rem] p-5 cursor-pointer relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 border border-[var(--border-color)]"
                >
                  <div className="absolute inset-0 opacity-[0.05] transition-opacity group-hover:opacity-[0.1]" style={{ backgroundColor: project.color }}></div>
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] flex items-center justify-center mb-12 border border-[var(--border-color)] shadow-inner" style={{ color: project.color }}>
                      <Folder size={18} fill="currentColor" fillOpacity={0.2} />
                  </div>
                  <div className="relative z-10">
                      <h4 className="text-sm font-black text-[var(--text-main)] truncate mb-2">{project.title}</h4>
                      <div className="h-1 bg-[var(--bg-main)] rounded-full overflow-hidden">
                          <div className="h-full transition-all duration-1000 shadow-[0_0_10px_currentColor]" style={{ width: `${progress}%`, backgroundColor: project.color }}></div>
                      </div>
                      <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-2 block opacity-50">{progress}% Done</span>
                  </div>
                </div>
              );
            }) : (
                <div className="w-full py-8 border border-dashed border-[var(--border-color)] rounded-[2rem] flex flex-col items-center justify-center opacity-30">
                    <p className="text-[10px] font-black uppercase text-[var(--text-muted)]">Нет проектов</p>
                </div>
            )}
          </div>
        </section>
      </div>

      <NavigationPill 
        currentView="dashboard"
        onNavigate={onNavigate}
        onOpenMenu={openMenu}
        toolL={{ icon: <Plus size={22} />, onClick: () => onNavigate('planner') }}
        toolR={{ icon: <Sparkles size={22} />, onClick: () => onNavigate('thoughts') }}
        centerAction={onStartLiveAudio}
      />

    </div>
  );
};

export default Dashboard;
