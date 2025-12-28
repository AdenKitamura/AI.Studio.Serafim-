
import React, { useMemo } from 'react';
import { Task, Thought, JournalEntry, Project, Habit, Priority } from '../types';
import { 
  Sparkles, 
  Clock, 
  Target, 
  Brain, 
  CheckCircle2, 
  ChevronRight, 
  AlertCircle,
  Zap,
  ArrowRight,
  Plus,
  Folder
} from 'lucide-react';
import { format, isToday, isFuture, differenceInMinutes } from 'date-fns';
import { ru } from 'date-fns/locale/ru';

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

  const upcomingReminders = useMemo(() => {
    return tasks
      .filter(t => !t.isCompleted && t.dueDate && isFuture(new Date(t.dueDate)))
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 2);
  }, [tasks]);

  const todayTasks = useMemo(() => {
    return tasks
      .filter(t => !t.isCompleted && t.dueDate && isToday(new Date(t.dueDate)))
      .sort((a, b) => {
        const priorityMap = { [Priority.HIGH]: 0, [Priority.MEDIUM]: 1, [Priority.LOW]: 2 };
        return priorityMap[a.priority] - priorityMap[b.priority];
      })
      .slice(0, 3);
  }, [tasks]);

  const activeProjects = useMemo(() => projects.slice(0, 4), [projects]);

  const recentThoughts = useMemo(() => 
    thoughts.filter(t => !t.isArchived).slice(0, 5), 
  [thoughts]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto no-scrollbar pb-32">
      
      {/* Welcome Header */}
      <div className="p-8 pt-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/10">
            System Live
          </div>
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-60">Сессия активна</span>
        </div>
        <h2 className="text-5xl font-extrabold text-[var(--text-main)] tracking-tighter leading-tight">
          Привет, {localStorage.getItem('sb_user_name') || 'Исследователь'}.
        </h2>
        <p className="text-[var(--text-muted)] mt-4 text-base font-medium opacity-80">Твой фокус сегодня определяет твое завтра. Что создадим?</p>
      </div>

      <div className="px-6 space-y-10">
        
        {/* Urgent Widgets */}
        {upcomingReminders.length > 0 && (
          <section className="animate-in slide-in-from-bottom-6 duration-700">
            <div className="grid grid-cols-1 gap-4">
              {upcomingReminders.map(task => (
                <div key={task.id} className="bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 rounded-[2.5rem] p-7 flex items-center justify-between glass">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-[1.5rem] bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0 border border-rose-500/10">
                      <Clock size={28} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-[var(--text-main)] leading-tight">{task.title}</h4>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black uppercase">Срочно</span>
                        <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest opacity-60">
                          {differenceInMinutes(new Date(task.dueDate!), new Date())} мин до дедлайна
                        </p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => onToggleTask(task.id)} className="w-14 h-14 bg-rose-500/20 hover:bg-rose-500/30 rounded-[1.5rem] text-rose-500 transition-all active:scale-90 flex items-center justify-center border border-rose-500/20 shadow-lg">
                    <CheckCircle2 size={28} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Today's Focus Widget */}
          <section className="animate-in slide-in-from-bottom-8 duration-700 delay-100">
            <div className="bg-[var(--bg-item)]/40 border border-[var(--border-color)] rounded-[3rem] p-8 glass h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-indigo-500/10 rounded-[1.25rem] flex items-center justify-center text-indigo-500 border border-indigo-500/10">
                    <Target size={22} />
                  </div>
                  <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Фокус Дня</h3>
                </div>
                <button onClick={() => onNavigate('planner')} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-all hover:bg-white/10">
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="space-y-6 flex-1">
                {todayTasks.length > 0 ? todayTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-5 group cursor-pointer" onClick={() => onToggleTask(task.id)}>
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--border-color)] group-hover:border-indigo-500 transition-all flex items-center justify-center shrink-0">
                      <div className="w-3 h-3 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />
                    </div>
                    <span className="text-lg text-[var(--text-main)] truncate font-semibold opacity-90">{task.title}</span>
                  </div>
                )) : (
                  <div className="py-10 flex flex-col items-center opacity-30">
                    <Sparkles size={40} className="mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Пустота и покой</p>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => onNavigate('planner')}
                className="w-full mt-10 py-5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <Plus size={16} /> Новая цель
              </button>
            </div>
          </section>

          {/* AI Insight Widget */}
          <section className="animate-in slide-in-from-bottom-8 duration-700 delay-200">
            <div className="bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent border border-indigo-500/20 rounded-[3rem] p-8 glass h-full relative overflow-hidden group">
              <div className="absolute -right-16 -bottom-16 opacity-[0.03] text-indigo-500 group-hover:scale-110 transition-transform duration-1000">
                <Brain size={280} />
              </div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-11 h-11 bg-white/10 rounded-[1.25rem] flex items-center justify-center text-white border border-white/10">
                    <Sparkles size={22} />
                  </div>
                  <h3 className="text-xs font-black text-white/50 uppercase tracking-[0.3em]">Системный Поток</h3>
                </div>

                {recentThoughts.length > 0 ? (
                  <div className="flex flex-col flex-1">
                    <p className="text-2xl text-white font-serif italic leading-relaxed tracking-tight opacity-90 line-clamp-4">
                      "{recentThoughts[0].content}"
                    </p>
                    <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-8">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-white/40 uppercase font-black tracking-widest">Зафиксировано</span>
                        <span className="text-xs font-bold text-white/70 mt-1">
                          {format(new Date(recentThoughts[0].createdAt), 'd MMMM, HH:mm', { locale: ru })}
                        </span>
                      </div>
                      <button onClick={() => onNavigate('chat')} className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all shadow-xl active:scale-90 border border-white/5">
                        <Zap size={24} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-14 text-center text-white/20 flex-1 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] leading-loose">
                      Мысли еще не <br/> обрели форму
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Projects Section */}
        <section className="animate-in slide-in-from-bottom-8 duration-700 delay-300">
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Folder size={18} />
               </div>
               <h3 className="text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Проекты</h3>
            </div>
            <button onClick={() => onNavigate('projects')} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors">
              Смотреть все
            </button>
          </div>
          <div className="flex gap-8 overflow-x-auto no-scrollbar pb-10 snap-x">
            {activeProjects.length > 0 ? activeProjects.map(project => {
              const pTasks = tasks.filter(t => t.projectId === project.id);
              const progress = pTasks.length > 0 ? Math.round((pTasks.filter(t => t.isCompleted).length / pTasks.length) * 100) : 0;
              return (
                <div 
                  key={project.id} 
                  onClick={() => onNavigate('projects')}
                  className="snap-start flex-none w-[280px] bg-[var(--bg-item)]/40 border border-[var(--border-color)] rounded-[2.5rem] p-7 hover:border-indigo-500/30 transition-all cursor-pointer glass group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-main)] flex items-center justify-center mb-8 shadow-sm border border-white/5 group-hover:scale-110 transition-transform" style={{ color: project.color }}>
                    <Folder size={24} fill="currentColor" fillOpacity={0.15} />
                  </div>
                  <h4 className="text-xl font-bold text-[var(--text-main)] truncate mb-1">{project.title}</h4>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-8 opacity-60">{pTasks.length} Задач активно</p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                      <span>Завершено</span>
                      <span style={{ color: project.color }}>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-[var(--bg-main)] rounded-full overflow-hidden border border-white/5">
                      <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${progress}%`, backgroundColor: project.color }} />
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="w-full py-24 bg-[var(--bg-item)]/30 border border-dashed border-[var(--border-color)] rounded-[3rem] flex flex-col items-center justify-center opacity-40">
                <Folder size={50} className="mb-6 text-[var(--text-muted)]" />
                <button onClick={() => onNavigate('projects')} className="text-sm font-bold text-indigo-500 uppercase tracking-widest">Создать первый проект</button>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Dashboard;
