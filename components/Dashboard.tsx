import React, { useMemo, useState } from 'react';
import { Task, Thought, JournalEntry, Project, Habit, Priority } from '../types';
import { Sparkles, Clock, Target, CheckCircle2, Folder, Zap, X, Trash2, ArrowRight } from 'lucide-react';
import { format, isToday, isFuture, differenceInMinutes } from 'date-fns';
import HabitTracker from './HabitTracker';

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
}

const Dashboard: React.FC<DashboardProps> = ({ 
    tasks, thoughts, journal, projects, habits = [],
    onAddTask, onAddProject, onAddThought, onNavigate, onToggleTask, onDeleteTask,
    onAddHabit, onToggleHabit, onDeleteHabit
}) => {
  const upcomingReminders = useMemo(() => tasks.filter(t => !t.isCompleted && t.dueDate && isFuture(new Date(t.dueDate))).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()).slice(0, 2), [tasks]);
  const todayTasks = useMemo(() => tasks.filter(t => !t.isCompleted && t.dueDate && isToday(new Date(t.dueDate))).sort((a, b) => (a.priority === Priority.HIGH ? 0 : 1) - (b.priority === Priority.HIGH ? 0 : 1)).slice(0, 3), [tasks]);
  const activeProjects = useMemo(() => projects.slice(0, 6), [projects]);
  const recentThoughts = useMemo(() => thoughts.filter(t => !t.isArchived).slice(0, 5), [thoughts]);

  // Edit Task State
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTime, setEditTime] = useState('');

  const openEditModal = (task: Task) => {
      setEditingTask(task);
      setEditTitle(task.title);
      const d = task.dueDate ? new Date(task.dueDate) : null;
      setEditTime(d ? format(d, 'HH:mm') : '');
  };

  const handleSaveEdit = () => {
      if (!editingTask) return;
      let newDate = editingTask.dueDate;
      
      if (editingTask.dueDate && editTime) {
          const d = new Date(editingTask.dueDate);
          const [h, m] = editTime.split(':').map(Number);
          d.setHours(h, m);
          newDate = d.toISOString();
      }

      onToggleTask(editingTask.id, { title: editTitle, dueDate: newDate });
      setEditingTask(null);
  };

  const handleDeleteTask = () => {
      if(!editingTask) return;
      onDeleteTask(editingTask.id);
      setEditingTask(null);
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto no-scrollbar pb-40">
      
      {/* Spacer */}
      <div className="pt-8"></div>

      <div className="px-6 space-y-6">
        
        {/* Urgent Section (Glowing Card Style) */}
        {upcomingReminders.length > 0 && (
          <section className="grid grid-cols-1 gap-4">
            {upcomingReminders.map(task => (
              <div 
                key={task.id} 
                className="glass-panel rounded-[2rem] p-6 relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01]" 
                onClick={() => openEditModal(task)}
              >
                {/* Internal Glow Blob */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500 blur-[60px] opacity-20 rounded-full translate-x-10 -translate-y-10 group-hover:opacity-30 transition-opacity"></div>
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#000] border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0 shadow-lg">
                        <Clock size={22} />
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-[var(--text-main)] leading-tight">{task.title}</h4>
                        <p className="text-[10px] text-rose-400/80 font-black uppercase tracking-widest mt-1.5 flex items-center gap-1">
                           🔥 Дедлайн: {differenceInMinutes(new Date(task.dueDate!), new Date())} мин
                        </p>
                    </div>
                  </div>
                  <button 
                      onClick={(e) => { e.stopPropagation(); onToggleTask(task.id, { isCompleted: !task.isCompleted }); }} 
                      className="w-12 h-12 rounded-full bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] flex items-center justify-center transition-all active:scale-90 hover:scale-105"
                  >
                      <CheckCircle2 size={24} />
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Habit Tracker (Wide Matte Panel) */}
        <section className="glass-panel rounded-[2.5rem] p-7 border border-white/5 relative">
            <div className="absolute top-1/2 left-10 w-40 h-40 bg-amber-500 blur-[80px] opacity-[0.08] rounded-full pointer-events-none"></div>
            <div className="flex items-center justify-between mb-5 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-amber-500 shadow-inner">
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

        {/* Focus & Thoughts (Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Priority Card */}
          <section>
            <div className="glass-panel rounded-[2.5rem] p-6 h-full flex flex-col relative overflow-hidden group">
              {/* Subtle background gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--accent)] text-white rounded-2xl flex items-center justify-center shadow-[0_0_15px_var(--accent-glow)]">
                          <Target size={20} />
                      </div>
                      <h3 className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Фокус</h3>
                  </div>
                  <button onClick={() => onNavigate('planner')} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                      <ArrowRight size={14} />
                  </button>
              </div>
              
              <div className="space-y-3 relative z-10">
                {todayTasks.length > 0 ? todayTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-4 group/item cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors" onClick={() => openEditModal(task)}>
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

          {/* Thoughts Card (Dark & Moody) */}
          <section>
            <div className="glass-panel rounded-[2.5rem] p-6 h-full flex flex-col relative overflow-hidden group bg-gradient-to-br from-indigo-900/10 to-transparent">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 blur-[80px] opacity-[0.1] rounded-full pointer-events-none"></div>
              
              <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-indigo-300">
                      <Sparkles size={18} />
                  </div>
                  <h3 className="text-[9px] font-black text-indigo-200/60 uppercase tracking-[0.2em]">Поток</h3>
              </div>
              
              {recentThoughts.length > 0 ? (
                <div className="flex flex-col flex-1 relative z-10">
                    <div className="relative">
                        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-transparent opacity-30 rounded-full"></div>
                        <p className="text-sm text-[var(--text-main)] font-serif italic line-clamp-3 opacity-90 leading-relaxed pl-4">
                            "{recentThoughts[0].content}"
                        </p>
                    </div>
                    <button onClick={() => onNavigate('chat')} className="mt-auto pt-6 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors flex items-center gap-2">
                        Обсудить <ArrowRight size={12} />
                    </button>
                </div>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-6 text-[var(--text-muted)] opacity-30">
                      <span className="text-[9px] font-black uppercase">Пусто</span>
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
                    className="flex-none w-48 glass-panel rounded-[2rem] p-5 cursor-pointer relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
                >
                  {/* Subtle Color Glow based on project color */}
                  <div className="absolute inset-0 opacity-[0.05] transition-opacity group-hover:opacity-[0.1]" style={{ backgroundColor: project.color }}></div>
                  
                  <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center mb-12 border border-white/5 shadow-inner" style={{ color: project.color }}>
                      <Folder size={18} fill="currentColor" fillOpacity={0.2} />
                  </div>
                  
                  <div className="relative z-10">
                      <h4 className="text-sm font-black text-[var(--text-main)] truncate mb-2">{project.title}</h4>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full transition-all duration-1000 shadow-[0_0_10px_currentColor]" style={{ width: `${progress}%`, backgroundColor: project.color }}></div>
                      </div>
                      <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-2 block opacity-50">{progress}% Done</span>
                  </div>
                </div>
              );
            }) : (
                <div className="w-full py-8 border border-dashed border-[var(--border-color)] rounded-[2rem] flex flex-col items-center justify-center opacity-30">
                    <p className="text-[10px] font-black uppercase">Нет проектов</p>
                </div>
            )}
          </div>
        </section>
      </div>

      {/* EDIT TASK MODAL (Refined Glass) */}
      {editingTask && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in-95">
              <div className="w-full max-w-sm glass-card rounded-[3rem] p-8 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                  <div className="flex justify-between items-center mb-8">
                      <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.2em]">Редактирование</span>
                      <button onClick={() => setEditingTask(null)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><X size={24} className="text-[var(--text-muted)] hover:text-white" /></button>
                  </div>
                  
                  <div className="space-y-8">
                      <div className="relative">
                          <input 
                              autoFocus 
                              value={editTitle} 
                              onChange={(e) => setEditTitle(e.target.value)} 
                              className="w-full bg-transparent text-2xl font-black text-[var(--text-main)] outline-none border-b border-white/10 pb-4 placeholder:text-white/20 focus:border-[var(--accent)] transition-colors" 
                          />
                      </div>
                      
                      <div className="flex items-center gap-4 bg-black/20 rounded-2xl px-5 py-4 border border-white/5 shadow-inner">
                          <Clock size={20} className="text-[var(--accent)]" />
                          <input 
                              type="time" 
                              value={editTime} 
                              onChange={(e) => setEditTime(e.target.value)} 
                              className="bg-transparent text-lg font-bold text-[var(--text-main)] outline-none w-full" 
                          />
                      </div>
                  </div>

                  <div className="flex gap-4 mt-10">
                      <button 
                          onClick={handleDeleteTask}
                          className="w-16 h-16 rounded-[1.5rem] bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                      >
                          <Trash2 size={24} />
                      </button>
                      <button 
                          onClick={handleSaveEdit}
                          className="flex-1 h-16 bg-[var(--text-main)] text-[var(--bg-main)] rounded-[1.5rem] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      >
                          Сохранить
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Dashboard;