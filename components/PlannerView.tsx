
import React, { useState, useMemo } from 'react';
import { Task, Priority, Project, Habit } from '../types';
import CalendarView from './CalendarView';
import HabitTracker from './HabitTracker';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { Plus, Check, Zap, Target, ArrowRight, Clock, X, Calendar as CalendarIcon } from 'lucide-react';

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
    <div className="h-full overflow-y-auto no-scrollbar bg-transparent px-6 pt-2 pb-48">
      
      {/* 1. CALENDAR STRIP */}
      <section className="mb-8">
        <CalendarView tasks={tasks} onDateClick={setSelectedDate} />
      </section>

      {/* 2. TASK LIST */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-6">
          <div className="flex flex-col">
            <h3 className="text-3xl font-black text-[var(--text-main)] tracking-tighter capitalize leading-none">
              {isSameDay(selectedDate, new Date()) ? 'Сегодня' : format(selectedDate, 'd MMMM', { locale: ru })}
            </h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-2 opacity-50">
              {tasksForSelected.length} целей запланировано
            </span>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="w-12 h-12 bg-[var(--accent)] text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="space-y-1">
          {tasksForSelected.length === 0 ? (
            <div className="py-12 border border-dashed border-[var(--border-color)] rounded-[2.5rem] flex flex-col items-center justify-center bg-[var(--bg-item)]/30">
              <Target size={32} className="text-[var(--text-muted)] mb-3 opacity-20" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-40 text-center px-8">
                Список пуст. Добавьте цель или выберите другой день.
              </span>
            </div>
          ) : (
            tasksForSelected.map((task) => (
              <div 
                key={task.id} 
                onClick={() => onToggleTask(task.id)}
                className={`flex items-center gap-4 p-5 bg-[var(--bg-item)] border border-[var(--border-color)] rounded-3xl mb-3 active:scale-[0.98] transition-all hover:border-[var(--accent)]/30 ${task.isCompleted ? 'opacity-40 grayscale' : 'shadow-sm'}`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.isCompleted ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-color)]'}`}>
                  {task.isCompleted && <Check size={14} strokeWidth={4} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold text-[var(--text-main)] truncate ${task.isCompleted ? 'line-through' : ''}`}>
                    {task.title}
                  </p>
                  {task.dueDate && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mt-1">
                      {format(new Date(task.dueDate), 'HH:mm')}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 4. HABIT TRACKER */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-5 px-1">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Zap size={16} />
          </div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Система привычек</h4>
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
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
          <div className="w-full max-w-sm bg-[var(--bg-item)] border border-[var(--border-color)] rounded-[3rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.2em]">Новая задача</span>
              <button onClick={() => setIsAdding(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={24} /></button>
            </div>
            <input 
              autoFocus
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Что запланируем?"
              className="w-full bg-transparent text-2xl font-black text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]/20 mb-8"
            />
            <div className="flex gap-4 mb-10">
              <div className="flex-1 flex items-center gap-3 bg-[var(--bg-main)] rounded-2xl px-5 border border-[var(--border-color)]">
                <Clock size={18} className="text-[var(--accent)]" />
                <input 
                  type="time" 
                  value={newTaskTime} 
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  className="bg-transparent text-sm font-bold text-[var(--text-main)] outline-none w-full py-4"
                />
              </div>
            </div>
            <button 
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim()}
              className="w-full py-5 bg-[var(--accent)] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[var(--accent-glow)] active:scale-95 transition-all disabled:opacity-20"
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
