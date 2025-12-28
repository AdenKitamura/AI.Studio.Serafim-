
import React, { useState, useMemo } from 'react';
import { Task, Priority, Project, Habit } from '../types';
import CalendarView from './CalendarView';
import HabitTracker from './HabitTracker';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { Plus, Check, Zap, Target, ArrowRight, Clock, X } from 'lucide-react';

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

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  const tasksForSelected = useMemo(() => 
    tasks.filter(t => t.dueDate && format(new Date(t.dueDate), 'yyyy-MM-dd') === dateStr)
    .sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted))
  , [tasks, dateStr]);

  const handleAddTask = () => {
    if(!newTaskTitle.trim()) return;
    const due = new Date(selectedDate);
    if (newTaskTime) {
      const [h, m] = newTaskTime.split(':').map(Number);
      due.setHours(h, m, 0, 0);
    } else {
      due.setHours(23, 59, 0, 0);
    }
    onAddTask({
      id: Date.now().toString(),
      title: newTaskTitle,
      isCompleted: false,
      priority: Priority.MEDIUM,
      dueDate: due.toISOString(),
      createdAt: new Date().toISOString()
    });
    setNewTaskTitle('');
    setNewTaskTime('');
    setIsAdding(false);
  };

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden px-6 pt-2 pb-32">
      
      {/* 1. CALENDAR STRIP */}
      <section className="flex-none mb-6">
        <CalendarView tasks={tasks} journal={[]} onDateClick={setSelectedDate} />
      </section>

      {/* 2. TASK LIST (ZERO SCROLL FOCUS) */}
      <section className="flex-1 flex flex-col min-h-0">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-2xl font-black text-white tracking-tighter capitalize">
            {isSameDay(selectedDate, new Date()) ? 'Сегодня' : format(selectedDate, 'd MMMM', { locale: ru })}
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
            {tasksForSelected.length} целей
          </span>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col">
            {tasksForSelected.length === 0 ? (
              <div className="py-12 border border-white/5 rounded-[2rem] flex flex-col items-center justify-center bg-white/[0.02]">
                <Target size={24} className="text-white/10 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Фокус не задан</span>
              </div>
            ) : (
              tasksForSelected.slice(0, 7).map((task, idx) => (
                <div 
                  key={task.id} 
                  onClick={() => onToggleTask(task.id)}
                  className={`flex items-center gap-4 py-4 border-b border-white/[0.04] active:opacity-60 transition-all ${task.isCompleted ? 'opacity-30' : ''}`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${task.isCompleted ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                    {task.isCompleted && <Check size={12} strokeWidth={4} className="text-white" />}
                  </div>
                  <span className={`text-sm font-semibold flex-1 truncate ${task.isCompleted ? 'line-through' : ''}`}>
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span className="text-[10px] font-mono font-bold text-white/20">
                      {format(new Date(task.dueDate), 'HH:mm')}
                    </span>
                  )}
                </div>
              ))
            )}
            {tasksForSelected.length > 7 && (
              <div className="py-2 text-center text-[9px] font-black uppercase tracking-widest text-white/10">
                + {tasksForSelected.length - 7} еще
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. ADD BUTTON (GLASS PILL) */}
      <section className="flex-none my-6">
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full h-12 glass rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 active:scale-[0.98] transition-all"
        >
          <Plus size={14} strokeWidth={3} /> Новая цель
        </button>
      </section>

      {/* 4. HABIT TRACKER (FOOTER) */}
      <section className="flex-none pb-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={12} className="text-amber-500" />
          <h4 className="text-[9px] font-black uppercase tracking-widest text-white/20">Система привычек</h4>
        </div>
        <HabitTracker 
          habits={habits} 
          selectedDate={selectedDate}
          onAdd={onAddHabit!}
          onToggle={onToggleHabit!}
          onDelete={onDeleteHabit!}
        />
      </section>

      {/* MODAL OVERLAY FOR ADDING TASK */}
      {isAdding && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
          <div className="w-full max-w-sm glass-card rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Проектирование цели</span>
              <button onClick={() => setIsAdding(false)} className="text-white/20 hover:text-white"><X size={18} /></button>
            </div>
            <input 
              autoFocus
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Что нужно сделать?"
              className="w-full bg-transparent text-xl font-bold text-white outline-none placeholder:text-white/10 mb-6"
            />
            <div className="flex gap-4 mb-8">
              <div className="flex-1 flex items-center gap-3 bg-white/5 rounded-2xl px-4 border border-white/5">
                <Clock size={16} className="text-white/20" />
                <input 
                  type="time" 
                  value={newTaskTime} 
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  className="bg-transparent text-sm font-bold text-white outline-none w-full py-3"
                />
              </div>
            </div>
            <button 
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim()}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-20"
            >
              Зафиксировать
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlannerView;
