
import React, { useState } from 'react';
import { Task, Priority, Project, Habit } from '../types';
import CalendarView from './CalendarView';
import HabitTracker from './HabitTracker';
import { format } from 'date-fns';
// Fix: Import locale directly from the specific path
import { ru } from 'date-fns/locale/ru';
import { Trophy, Plus, Clock, Check, X, ArrowRight, Zap } from 'lucide-react';

interface PlannerViewProps {
  tasks: Task[];
  projects: Project[];
  habits?: Habit[];
  onAddTask: (task: Task) => void;
  onToggleTask: (id: string) => void;
  onAddHabit?: (habit: Habit) => void;
  onToggleHabit?: (id: string, date: string) => void;
  onDeleteHabit?: (id: string) => void;
}

const PlannerView: React.FC<PlannerViewProps> = ({ 
    tasks, projects, habits = [], 
    onAddTask, onToggleTask, 
    onAddHabit, onToggleHabit, onDeleteHabit 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskProject, setNewTaskProject] = useState<string>('');

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsAdding(false);
  };

  const handleAddTask = () => {
      if(!newTaskTitle.trim()) return;
      const due = new Date(selectedDate);
      if (newTaskTime) {
          const [hours, minutes] = newTaskTime.split(':').map(Number);
          due.setHours(hours, minutes, 0, 0);
      } else {
          due.setHours(23, 59, 0, 0);
      }
      onAddTask({
          id: Date.now().toString(),
          title: newTaskTitle,
          isCompleted: false,
          priority: Priority.MEDIUM,
          dueDate: due.toISOString(),
          projectId: newTaskProject || undefined,
          createdAt: new Date().toISOString()
      });
      setNewTaskTitle('');
      setNewTaskTime('');
      setNewTaskProject('');
      setIsAdding(false);
  };

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const tasksForSelected = tasks.filter(t => t.dueDate && format(new Date(t.dueDate), 'yyyy-MM-dd') === dateStr);
  const sortedTasks = [...tasksForSelected].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return Number(a.isCompleted) - Number(b.isCompleted);
      return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
  });

  // Derived: Active habits for the selected day as task items
  const routineItems = habits.map(h => ({
      ...h,
      isDone: h.completedDates.includes(dateStr)
  }));

  return (
    <div className="flex flex-col h-full relative pb-28">
      <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
         
         <CalendarView tasks={tasks} journal={[]} onDateClick={handleDateClick} />
         
         {/* Tasks List Section */}
         <div className="mt-8">
             <div className="mb-4 flex items-baseline justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-[var(--text-main)] capitalize">{format(selectedDate, 'd MMMM', { locale: ru })}</h3>
                    <p className="text-sm text-[var(--text-muted)] capitalize">{format(selectedDate, 'EEEE', { locale: ru })}</p>
                </div>
                <div className="text-xs font-medium bg-[var(--bg-item)] px-2 py-1 rounded-lg text-[var(--text-muted)]">
                    Событий: {tasksForSelected.length + habits.length}
                </div>
             </div>
             
             {/* --- HABIT TRACKER BLOCK --- */}
             {onAddHabit && onToggleHabit && onDeleteHabit && (
                 <HabitTracker 
                    habits={habits} 
                    selectedDate={selectedDate}
                    onAdd={onAddHabit}
                    onToggle={onToggleHabit}
                    onDelete={onDeleteHabit}
                 />
             )}

             <div className="space-y-3 mb-6">
                 {/* Routine items from Habits */}
                 {routineItems.filter(r => !r.isDone).map(habit => (
                     <div 
                        key={`routine-${habit.id}`} 
                        onClick={() => onToggleHabit?.(habit.id, dateStr)}
                        className="group relative p-4 bg-[var(--bg-item)]/40 rounded-2xl flex items-center gap-4 transition-all cursor-pointer border border-dashed border-[var(--border-color)] hover:border-[var(--accent)]/50"
                    >
                        <div className="w-6 h-6 rounded-full border-2 border-dashed flex items-center justify-center transition-all flex-none border-[var(--text-muted)]" style={{ borderColor: habit.color }}>
                            <div className="w-2 h-2 rounded-full opacity-50" style={{ backgroundColor: habit.color }}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-base truncate text-[var(--text-main)]">
                                {habit.title}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                                <Zap size={10} className="text-yellow-500" />
                                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">Ежедневная рутина</span>
                            </div>
                        </div>
                    </div>
                 ))}

                 {/* Real Tasks */}
                 {sortedTasks.length === 0 && routineItems.every(r => r.isDone) ? (
                     <div className="py-12 flex flex-col items-center justify-center opacity-40">
                         <div className="w-16 h-16 bg-[var(--bg-item)] rounded-full flex items-center justify-center mb-3">
                            <Trophy size={24} className="text-[var(--text-muted)]"/>
                         </div>
                         <p className="text-sm font-medium text-[var(--text-muted)]">Все цели на день достигнуты!</p>
                     </div>
                 ) : (
                     sortedTasks.map(task => {
                         const project = projects.find(p => p.id === task.projectId);
                         return (
                            <div 
                                key={task.id} 
                                onClick={() => onToggleTask(task.id)}
                                className={`
                                    group relative p-4 bg-[var(--bg-item)] rounded-2xl flex items-center gap-4 transition-all cursor-pointer border border-[var(--border-color)]
                                    ${task.isCompleted ? 'opacity-50' : 'hover:border-[var(--text-muted)] shadow-sm'}
                                `}
                            >
                                <div className={`
                                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-none
                                    ${task.isCompleted ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-[var(--text-muted)] group-hover:border-[var(--accent)]'}
                                `}>
                                    {task.isCompleted && <Check size={14} strokeWidth={3} />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className={`font-medium text-base truncate ${task.isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>
                                        {task.title}
                                    </div>
                                    {project && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }}></div>
                                            <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">{project.title}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-main)] px-2 py-1 rounded-md font-mono flex-none">
                                    {format(new Date(task.dueDate!), 'HH:mm')}
                                </div>
                            </div>
                         );
                     })
                 )}
             </div>

             {/* Add Button */}
             {!isAdding ? (
                 <button 
                    onClick={() => setIsAdding(true)}
                    className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-[var(--accent)] bg-[var(--accent)]/10 font-bold hover:bg-[var(--accent)]/20 transition-colors"
                 >
                     <Plus size={18} />
                     <span>Новая задача</span>
                 </button>
             ) : (
                 <div className="bg-[var(--bg-item)] border border-[var(--border-color)] rounded-2xl p-4 shadow-xl animate-in fade-in slide-in-from-bottom-2">
                     <div className="flex justify-between items-center mb-3">
                         <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wide">Создание задачи</span>
                         <button onClick={() => setIsAdding(false)} className="text-[var(--text-muted)] hover:text-red-500 bg-[var(--bg-main)] rounded-full p-1">
                             <X size={14} />
                         </button>
                     </div>
                     
                     <input 
                        autoFocus
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Что нужно сделать?"
                        className="w-full bg-transparent text-[var(--text-main)] text-lg font-medium mb-4 focus:outline-none placeholder:text-[var(--text-muted)]/50"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                     />
                    
                    <div className="mb-4 overflow-x-auto no-scrollbar flex gap-2">
                         {projects.map(p => (
                             <button
                                key={p.id}
                                onClick={() => setNewTaskProject(p.id === newTaskProject ? '' : p.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 whitespace-nowrap ${newTaskProject === p.id ? 'bg-[var(--bg-main)] border-transparent ring-1 ring-[var(--text-main)]' : 'bg-[var(--bg-main)] border-[var(--border-color)] text-[var(--text-muted)]'}`}
                             >
                                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                                 {p.title}
                             </button>
                         ))}
                    </div>

                     <div className="flex gap-3 pt-3 border-t border-[var(--border-color)]">
                         <div className="relative flex-1 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] flex items-center px-3">
                            <Clock size={16} className="text-[var(--text-muted)] mr-2"/>
                            <input 
                                type="time"
                                value={newTaskTime}
                                onChange={(e) => setNewTaskTime(e.target.value)}
                                className="w-full bg-transparent text-sm text-[var(--text-main)] outline-none py-2"
                            />
                         </div>
                         <button 
                            onClick={handleAddTask}
                            disabled={!newTaskTitle.trim()}
                            className="bg-[var(--accent)] text-white px-4 py-2 rounded-xl hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors flex items-center justify-center"
                         >
                             <ArrowRight size={20} />
                         </button>
                     </div>
                 </div>
             )}
         </div>
      </div>
    </div>
  );
};

export default PlannerView;