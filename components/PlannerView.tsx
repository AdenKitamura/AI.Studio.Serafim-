import React, { useState, useMemo } from 'react';
import { Task, Priority, Project, Habit, Thought } from '../types';
import CalendarView from './CalendarView';
import HabitTracker from './HabitTracker';
import WhiteboardView from './WhiteboardView';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, Check, Zap, Target, Clock, X, ChevronDown, Network, List } from 'lucide-react';

interface PlannerViewProps {
  tasks: Task[];
  projects: Project[];
  habits?: Habit[];
  thoughts: Thought[];
  onAddTask: (task: Task) => void;
  onToggleTask: (id: string) => void;
  onAddHabit?: (habit: Habit) => void;
  onToggleHabit?: (id: string, date: string) => void;
  onDeleteHabit?: (id: string) => void;
  onAddThought: (thought: Thought) => void;
  onUpdateThought: (thought: Thought) => void;
  onDeleteThought: (id: string) => void;
}

const PlannerView: React.FC<PlannerViewProps> = ({ 
    tasks, projects, habits = [], thoughts,
    onAddTask, onToggleTask, 
    onAddHabit, onToggleHabit, onDeleteHabit,
    onAddThought, onUpdateThought, onDeleteThought
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const tasksForSelected = useMemo(() => tasks.filter(t => t.dueDate && format(new Date(t.dueDate), 'yyyy-MM-dd') === dateStr).sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted)), [tasks, dateStr]);

  const handleAddTask = () => {
    if(!newTaskTitle.trim()) return;
    const due = new Date(selectedDate);
    if (newTaskTime) { const [h, m] = newTaskTime.split(':').map(Number); due.setHours(h, m, 0, 0); } else { due.setHours(23, 59, 0, 0); }
    onAddTask({ id: Date.now().toString(), title: newTaskTitle, isCompleted: false, priority: Priority.MEDIUM, dueDate: due.toISOString(), createdAt: new Date().toISOString() });
    setNewTaskTitle(''); setNewTaskTime(''); setIsAdding(false);
  };

  if (viewMode === 'map') {
      return (
          <div className="h-full relative flex flex-col">
              <div className="absolute top-6 right-6 z-50"><div className="glass-panel p-1 rounded-xl flex gap-1"><button onClick={() => setViewMode('list')} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-item)] transition-all"><List size={20} /></button><button onClick={() => setViewMode('map')} className="p-2 bg-[var(--accent)] text-white rounded-lg shadow-sm"><Network size={20} /></button></div></div>
              <WhiteboardView thoughts={thoughts} onAdd={onAddThought} onUpdate={onUpdateThought} onDelete={onDeleteThought} onConvertToTask={(title) => { onAddTask({ id: Date.now().toString(), title, isCompleted: false, priority: Priority.MEDIUM, dueDate: new Date().toISOString(), createdAt: new Date().toISOString() }); }} />
          </div>
      );
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-transparent flex flex-col">
      <div className="px-6 py-6 sticky top-0 z-20 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--border-color)] flex justify-between items-start">
        <div className="cursor-pointer group flex items-center gap-3" onClick={() => setShowCalendar(!showCalendar)}>
          <div><div className="flex items-center gap-2"><h2 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase">{format(selectedDate, 'LLLL', { locale: ru })}</h2><ChevronDown size={20} className={`text-[var(--accent)] transition-transform duration-300 ${showCalendar ? 'rotate-180' : ''}`} /></div><p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mt-1">{format(selectedDate, 'eeee, d MMMM yyyy', { locale: ru })}</p></div>
        </div>
        <div className="glass-panel p-1 rounded-xl flex gap-1"><button onClick={() => setViewMode('list')} className="p-2 bg-[var(--accent)] text-white rounded-lg shadow-sm"><List size={18} /></button><button onClick={() => setViewMode('map')} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-item)] transition-all"><Network size={18} /></button></div>
      </div>
      {showCalendar && <div className="px-6 pb-6 animate-in slide-in-from-top-4 duration-300 bg-[var(--bg-main)] border-b border-[var(--border-color)]"><CalendarView tasks={tasks} onDateClick={(d) => { setSelectedDate(d); setShowCalendar(false); }} /></div>}
      <div className="px-6 py-6 pb-48 flex-1">
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-6"><span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">{tasksForSelected.length} целей</span><button onClick={() => setIsAdding(true)} className="w-10 h-10 bg-[var(--accent)] text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all"><Plus size={20} /></button></div>
          <div className="space-y-2">
            {tasksForSelected.length === 0 ? (<div className="glass-panel py-12 rounded-[2rem] flex flex-col items-center justify-center opacity-70"><Target size={32} className="text-[var(--text-muted)] mb-3 opacity-30" /><span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 text-center px-8">План чист</span></div>) : (tasksForSelected.map((task) => (<div key={task.id} onClick={() => onToggleTask(task.id)} className={`glass-panel flex items-center gap-4 p-5 rounded-3xl active:scale-[0.99] transition-all cursor-pointer hover:border-[var(--accent)]/30 ${task.isCompleted ? 'opacity-40 grayscale' : ''}`}><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.isCompleted ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-color)]'}`}>{task.isCompleted && <Check size={14} strokeWidth={4} className="text-white" />}</div><div className="flex-1 min-w-0"><p className={`text-sm font-bold text-[var(--text-main)] truncate ${task.isCompleted ? 'line-through' : ''}`}>{task.title}</p>{task.dueDate && (<p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mt-1">{format(new Date(task.dueDate), 'HH:mm')}</p>)}</div></div>)))}
          </div>
        </section>
        <section className="mb-12"><div className="flex items-center gap-3 mb-5 px-1"><div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Zap size={16} /></div><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Привычки</h4></div><HabitTracker habits={habits} selectedDate={selectedDate} onAdd={onAddHabit!} onToggle={onToggleHabit!} onDelete={onDeleteHabit!} /></section>
      </div>
      {isAdding && (<div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95 duration-200"><div className="w-full max-w-sm glass-card rounded-[3rem] p-8 shadow-2xl border border-white/10"><div className="flex justify-between items-center mb-8"><span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.2em]">Новая задача</span><button onClick={() => setIsAdding(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={24} /></button></div><input autoFocus value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Что запланируем?" className="w-full bg-transparent text-2xl font-black text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]/20 mb-8" /><div className="flex gap-4 mb-10"><div className="flex-1 flex items-center gap-3 bg-[var(--bg-main)] rounded-2xl px-5 border border-[var(--border-color)]"><Clock size={18} className="text-[var(--accent)]" /><input type="time" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} className="bg-transparent text-sm font-bold text-[var(--text-main)] outline-none w-full py-4" /></div></div><button onClick={handleAddTask} disabled={!newTaskTitle.trim()} className="w-full py-5 bg-[var(--accent)] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[var(--accent-glow)] active:scale-95 transition-all disabled:opacity-20">Зафиксировать</button></div></div>)}
    </div>
  );
};

export default PlannerView;