import React, { useMemo } from 'react';
import { Task, Thought, JournalEntry, Project, Habit, Priority } from '../types';
import { Sparkles, Clock, Target, CheckCircle2, Folder } from 'lucide-react';
import { format, isToday, isFuture, differenceInMinutes } from 'date-fns';
import { ru } from 'date-fns/locale';

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
  onToggleTask: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    tasks, thoughts, journal, projects, habits = [],
    onAddTask, onAddProject, onAddThought, onNavigate, onToggleTask
}) => {
  const upcomingReminders = useMemo(() => tasks.filter(t => !t.isCompleted && t.dueDate && isFuture(new Date(t.dueDate))).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()).slice(0, 2), [tasks]);
  const todayTasks = useMemo(() => tasks.filter(t => !t.isCompleted && t.dueDate && isToday(new Date(t.dueDate))).sort((a, b) => (a.priority === Priority.HIGH ? 0 : 1) - (b.priority === Priority.HIGH ? 0 : 1)).slice(0, 3), [tasks]);
  const activeProjects = useMemo(() => projects.slice(0, 6), [projects]);
  const recentThoughts = useMemo(() => thoughts.filter(t => !t.isArchived).slice(0, 5), [thoughts]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto no-scrollbar pb-40">
      <div className="px-8 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-2"><div className="px-2.5 py-0.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-md text-[9px] font-black uppercase tracking-[0.2em] border border-[var(--accent)]/10">Система Активна</div></div>
        <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tighter leading-none mb-3">Пользователь.</h2>
        <p className="text-[var(--text-muted)] text-sm font-bold opacity-60">Твой интеллект в порядке.</p>
      </div>
      <div className="px-6 space-y-6">
        {upcomingReminders.length > 0 && (
          <section className="grid grid-cols-1 gap-3">
            {upcomingReminders.map(task => (
              <div key={task.id} className="glass-panel rounded-3xl p-5 flex items-center justify-between shadow-sm hover:scale-[1.01] transition-transform cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0 border border-rose-500/10"><Clock size={20} /></div>
                  <div><h4 className="text-sm font-black text-[var(--text-main)] leading-tight">{task.title}</h4><p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mt-1">Дедлайн: {differenceInMinutes(new Date(task.dueDate!), new Date())} мин</p></div>
                </div>
                <button onClick={() => onToggleTask(task.id)} className="w-10 h-10 bg-rose-500/20 hover:bg-rose-500/30 rounded-xl text-rose-500 transition-all active:scale-90 flex items-center justify-center"><CheckCircle2 size={20} /></button>
              </div>
            ))}
          </section>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section>
            <div className="glass-panel rounded-[2.5rem] p-6 shadow-sm flex flex-col hover:shadow-lg transition-all h-full">
              <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center text-[var(--accent)]"><Target size={18} /></div><h3 className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Приоритеты</h3></div><button onClick={() => onNavigate('planner')} className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest">План</button></div>
              <div className="space-y-4">
                {todayTasks.length > 0 ? todayTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-4 group cursor-pointer" onClick={() => onToggleTask(task.id)}>
                    <div className="w-6 h-6 rounded-lg border border-[var(--border-color)] flex items-center justify-center shrink-0 group-hover:border-[var(--accent)] transition-colors"><div className="w-2 h-2 rounded-sm bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" /></div>
                    <span className="text-sm font-bold text-[var(--text-main)] truncate opacity-80">{task.title}</span>
                  </div>
                )) : <p className="text-[10px] font-black uppercase text-[var(--text-muted)] text-center py-6 opacity-30">Целей нет</p>}
              </div>
            </div>
          </section>
          <section>
            <div className="glass-panel rounded-[2.5rem] p-6 shadow-sm flex flex-col h-full relative overflow-hidden group hover:shadow-lg transition-all bg-gradient-to-br from-[var(--accent)]/5 to-transparent">
              <div className="flex items-center gap-3 mb-6"><div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-[var(--text-main)]"><Sparkles size={18} /></div><h3 className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Поток Мыслей</h3></div>
              {recentThoughts.length > 0 ? (
                <div className="flex flex-col flex-1"><p className="text-sm text-[var(--text-main)] font-serif italic line-clamp-3 opacity-90 leading-relaxed mb-4">"{recentThoughts[0].content}"</p><button onClick={() => onNavigate('chat')} className="mt-auto py-3 bg-[var(--accent)] text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md">Обсудить с Серафимом</button></div>
              ) : <p className="text-[10px] font-black uppercase text-[var(--text-muted)] text-center py-6 opacity-30">Пусто</p>}
            </div>
          </section>
        </div>
        <section>
          <div className="flex items-center justify-between mb-4 px-1"><h3 className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Проекты</h3><button onClick={() => onNavigate('projects')} className="text-[9px] font-black text-[var(--accent)] uppercase tracking-widest">Все</button></div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x">
            {activeProjects.length > 0 ? activeProjects.map(project => {
              const pTasks = tasks.filter(t => t.projectId === project.id);
              const progress = pTasks.length > 0 ? Math.round((pTasks.filter(t => t.isCompleted).length / pTasks.length) * 100) : 0;
              return (
                <div key={project.id} onClick={() => onNavigate('projects')} className="snap-start flex-none w-52 glass-panel rounded-3xl p-5 hover:scale-[1.05] active:scale-[0.98] transition-all cursor-pointer shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] flex items-center justify-center mb-4 border border-[var(--border-color)] shadow-sm" style={{ color: project.color }}><Folder size={20} fill="currentColor" fillOpacity={0.1} /></div>
                  <h4 className="text-sm font-black text-[var(--text-main)] truncate mb-1">{project.title}</h4>
                  <div className="flex justify-between items-center mt-4"><span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">{progress}%</span><div className="flex-1 h-1 bg-[var(--bg-main)] rounded-full mx-2 overflow-hidden border border-[var(--border-color)]"><div className="h-full transition-all duration-1000" style={{ width: `${progress}%`, backgroundColor: project.color }} /></div></div>
                </div>
              );
            }) : <div className="w-full py-12 border border-dashed border-[var(--border-color)] rounded-3xl flex flex-col items-center justify-center opacity-30"><p className="text-[10px] font-black uppercase">Нет проектов</p></div>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;