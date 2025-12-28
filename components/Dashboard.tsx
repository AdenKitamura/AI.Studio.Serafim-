
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
  Plus
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

  // Logic: Get upcoming reminders
  const upcomingReminders = useMemo(() => {
    return tasks
      .filter(t => !t.isCompleted && t.dueDate && isFuture(new Date(t.dueDate)))
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 2);
  }, [tasks]);

  // Logic: Get priority tasks for today
  const todayTasks = useMemo(() => {
    return tasks
      .filter(t => !t.isCompleted && t.dueDate && isToday(new Date(t.dueDate)))
      .sort((a, b) => {
        const priorityMap = { [Priority.HIGH]: 0, [Priority.MEDIUM]: 1, [Priority.LOW]: 2 };
        return priorityMap[a.priority] - priorityMap[b.priority];
      })
      .slice(0, 3);
  }, [tasks]);

  // Logic: Active projects stats
  const activeProjects = useMemo(() => projects.slice(0, 4), [projects]);

  // Logic: Latest thoughts
  const recentThoughts = useMemo(() => 
    thoughts.filter(t => !t.isArchived).slice(0, 5), 
  [thoughts]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] overflow-y-auto no-scrollbar pb-32 animate-in fade-in duration-700">
      
      {/* Welcome Header */}
      <div className="p-6 pt-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} className="text-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Системный Дашборд</span>
        </div>
        <h2 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Добро пожаловать.</h2>
      </div>

      <div className="px-6 space-y-6">
        
        {/* Row 1: Urgent Reminders */}
        {upcomingReminders.length > 0 && (
          <section className="animate-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={14} className="text-rose-500" /> Срочно
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {upcomingReminders.map(task => (
                <div key={task.id} className="bg-gradient-to-br from-rose-500/20 to-transparent border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-main)] leading-tight">{task.title}</h4>
                      <p className="text-[10px] text-rose-500/70 font-mono uppercase mt-1">
                        Через {differenceInMinutes(new Date(task.dueDate!), new Date())} мин
                      </p>
                    </div>
                  </div>
                  <button onClick={() => onToggleTask(task.id)} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-rose-500 transition-all active:scale-95">
                    <CheckCircle2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Row 2: Today's Focus & Thoughts (Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Today's Focus */}
          <section className="animate-in slide-in-from-bottom-4 duration-500 delay-200">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                <Target size={14} className="text-indigo-500" /> Фокус Дня
              </h3>
              <button onClick={() => onNavigate('planner')} className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 hover:underline">
                ПЛАН <ArrowRight size={10} />
              </button>
            </div>
            <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-3xl p-5 space-y-4">
              {todayTasks.length > 0 ? todayTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 group">
                  <button onClick={() => onToggleTask(task.id)} className="w-5 h-5 rounded-full border-2 border-[var(--border-color)] group-hover:border-indigo-500 transition-colors shrink-0" />
                  <span className="text-sm text-[var(--text-main)] truncate font-medium">{task.title}</span>
                </div>
              )) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-[var(--text-muted)]">Задач на сегодня нет</p>
                </div>
              )}
              <button 
                onClick={() => onNavigate('planner')}
                className="w-full py-2.5 mt-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-[10px] font-black uppercase text-[var(--text-muted)] hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Plus size={12} /> Добавить
              </button>
            </div>
          </section>

          {/* Cognitive Flow (Latest Thoughts) */}
          <section className="animate-in slide-in-from-bottom-4 duration-500 delay-300">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
                <Brain size={14} className="text-amber-500" /> Инсайты
              </h3>
            </div>
            <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-3xl p-5 min-h-[160px] flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-amber-500">
                <Brain size={100} />
              </div>
              {recentThoughts.length > 0 ? (
                <div className="relative z-10">
                  <p className="text-sm text-[var(--text-main)] leading-relaxed italic font-serif">
                    "{recentThoughts[0].content}"
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">
                      {format(new Date(recentThoughts[0].createdAt), 'd MMM', { locale: ru })}
                    </span>
                    <button onClick={() => onNavigate('chat')} className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                      <Zap size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)] text-center">Мысли пока не зафиксированы</p>
              )}
            </div>
          </section>
        </div>

        {/* Row 3: Projects (Horizontal Scroll) */}
        <section className="animate-in slide-in-from-bottom-4 duration-500 delay-400">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
              <Plus size={14} className="text-emerald-500" /> Активные Проекты
            </h3>
            <button onClick={() => onNavigate('projects')} className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 hover:underline">
              ВСЕ <ChevronRight size={10} />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x">
            {activeProjects.length > 0 ? activeProjects.map(project => {
              const pTasks = tasks.filter(t => t.projectId === project.id);
              const progress = pTasks.length > 0 ? Math.round((pTasks.filter(t => t.isCompleted).length / pTasks.length) * 100) : 0;
              return (
                <div 
                  key={project.id} 
                  onClick={() => onNavigate('projects')}
                  className="snap-start flex-none w-[200px] bg-[var(--bg-item)] border border-[var(--border-color)] rounded-3xl p-5 hover:border-[var(--text-muted)] transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-main)] flex items-center justify-center mb-4" style={{ color: project.color }}>
                    <Plus size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-main)] truncate mb-1">{project.title}</h4>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-black mb-4">{pTasks.length} ЗАДАЧ</p>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[8px] font-black text-[var(--text-muted)] uppercase">
                      <span>Прогресс</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1 w-full bg-[var(--bg-main)] rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-1000" style={{ width: `${progress}%`, backgroundColor: project.color }} />
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="w-full py-10 bg-[var(--bg-item)] border border-dashed border-[var(--border-color)] rounded-3xl flex items-center justify-center">
                <button onClick={() => onNavigate('projects')} className="text-xs font-bold text-emerald-500">Создать первый проект</button>
              </div>
            )}
          </div>
        </section>

        {/* Row 4: Habit Tracker Summary */}
        {habits.length > 0 && (
          <section className="animate-in slide-in-from-bottom-4 duration-500 delay-500">
             <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-3xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-main)]">Привычки и Дисциплина</h4>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase font-black mt-0.5">Всего активно: {habits.length}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate('planner')}
                  className="p-3 bg-[var(--bg-main)] hover:bg-[var(--bg-card)] rounded-2xl text-indigo-400 transition-all border border-[var(--border-color)]"
                >
                  <ChevronRight size={20} />
                </button>
             </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
