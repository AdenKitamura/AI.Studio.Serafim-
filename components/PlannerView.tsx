
import React, { useState, useMemo } from 'react';
import { Task, Priority, Project, Habit, Thought } from '../types';
import CalendarView from './CalendarView';
import HabitTracker from './HabitTracker';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, Check, Zap, Target, Clock, X, ChevronDown, Trash2, Calendar as CalendarIcon, Save } from 'lucide-react';
import NavigationPill from './NavigationPill';

interface PlannerViewProps {
  tasks: Task[];
  projects: Project[];
  habits?: Habit[];
  thoughts: Thought[];
  onAddTask: (task: Task) => void;
  onToggleTask: (id: string, updates?: Partial<Task>) => void; 
  onDeleteTask: (id: string) => void;
  onAddHabit?: (habit: Habit) => void;
  onToggleHabit?: (id: string, date: string) => void;
  onDeleteHabit?: (id: string) => void;
  onAddThought: (thought: Thought) => void;
  onUpdateThought: (id: string, updates: Partial<Thought>) => void;
  onDeleteThought: (id: string) => void;
  onNavigate?: (view: any) => void; 
}

const PlannerView: React.FC<PlannerViewProps> = ({ 
    tasks, projects, habits = [], thoughts,
    onAddTask, onToggleTask, onDeleteTask,
    onAddHabit, onToggleHabit, onDeleteHabit, onNavigate
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDate, setEditDate] = useState('');

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const tasksForSelected = useMemo(() => tasks.filter(t => t.dueDate && format(new Date(t.dueDate), 'yyyy-MM-dd') === dateStr).sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted)), [tasks, dateStr]);

  const handleAddTask = () => {
    if(!newTaskTitle.trim()) return;
    const due = new Date(selectedDate);
    if (newTaskTime) { const [h, m] = newTaskTime.split(':').map(Number); due.setHours(h, m, 0, 0); } else { due.setHours(23, 59, 0, 0); }
    onAddTask({ id: Date.now().toString(), title: newTaskTitle, isCompleted: false, priority: Priority.MEDIUM, dueDate: due.toISOString(), createdAt: new Date().toISOString() });
    setNewTaskTitle(''); setNewTaskTime(''); setIsAdding(false);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    const d = task.dueDate ? new Date(task.dueDate) : new Date();
    setEditDate(format(d, 'yyyy-MM-dd'));
    setEditTime(task.dueDate ? format(d, 'HH:mm') : '');
  };

  const handleSaveEdit = () => {
    if (!editingTask) return;
    let newIsoDate = editingTask.dueDate;
    if (editDate) {
        const d = new Date(editDate);
        if (editTime) { const [h, m] = editTime.split(':').map(Number); d.setHours(h, m); } else { d.setHours(23, 59); }
        newIsoDate = d.toISOString();
    }
    onToggleTask(editingTask.id, { title: editTitle, dueDate: newIsoDate });
    setEditingTask(null);
  };

  const handleDeleteTask = () => {
      if (!editingTask) return;
      onDeleteTask(editingTask.id);
      setEditingTask(null);
  };

  const openMenu = () => {
      const menuBtn = document.getElementById('sidebar-trigger');
      if(menuBtn) menuBtn.click();
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar bg-transparent flex flex-col will-change-transform transform-gpu pt-12">
      <div className="px-6 py-4 sticky top-0 z-30 bg-[var(--bg-main)]/95 backdrop-blur-xl border-b border-[var(--border-color)] transition-all duration-300 mt-2">
        <div className="cursor-pointer group" onClick={() => setShowCalendar(!showCalendar)}>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tighter uppercase leading-none">
                {format(selectedDate, 'LLLL', { locale: ru })}
              </h2>
              <div className={`p-1.5 rounded-full bg-[var(--bg-item)] border border-[var(--border-color)] transition-transform duration-300 ${showCalendar ? 'rotate-180 bg-[var(--accent)] border-[var(--accent)] text-white' : 'text-[var(--text-muted)]'}`}>
                  <ChevronDown size={16} />
              </div>
            </div>
            <p className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest mt-2 pl-1">
              {format(selectedDate, 'eeee, d MMMM', { locale: ru })}
            </p>
        </div>
      </div>

      {showCalendar && (
        <div className="px-6 pb-6 animate-in slide-in-from-top-4 duration-300 bg-[var(--bg-main)]/95 backdrop-blur-md border-b border-[var(--border-color)] sticky top-[95px] z-20 shadow-xl">
          <CalendarView tasks={tasks} onDateClick={(d) => { setSelectedDate(d); setShowCalendar(false); }} />
        </div>
      )}

      <div className="px-6 py-6 pb-48 flex-1">
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-6"><span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">{tasksForSelected.length} целей</span></div>
          <div className="space-y-3">
            {tasksForSelected.length === 0 ? (
              <div className="glass-panel py-12 rounded-[2rem] flex flex-col items-center justify-center opacity-70">
                <Target size={32} className="text-[var(--text-muted)] mb-3 opacity-30" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50 text-center px-8">План чист</span>
              </div>
            ) : (
              tasksForSelected.map((task) => (
                <div key={task.id} onClick={() => openEditModal(task)} className={`glass-panel flex items-center gap-4 p-5 rounded-[2rem] active:scale-[0.99] transition-all cursor-pointer hover:border-[var(--accent)]/30 ${task.isCompleted ? 'opacity-40 grayscale' : ''}`}>
                  <button onClick={(e) => { e.stopPropagation(); onToggleTask(task.id, { isCompleted: !task.isCompleted }); }} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${task.isCompleted ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-color)] hover:border-[var(--accent)]'}`}>{task.isCompleted && <Check size={14} strokeWidth={4} className="text-white" />}</button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-bold text-[var(--text-main)] truncate ${task.isCompleted ? 'line-through' : ''}`}>{task.title}</p>
                    {task.dueDate && (<p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mt-1.5 flex items-center gap-1"><Clock size={10} /> {format(new Date(task.dueDate), 'HH:mm')}</p>)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5 px-1"><div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Zap size={16} /></div><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Привычки</h4></div>
          <HabitTracker habits={habits} selectedDate={selectedDate} onAdd={onAddHabit!} onToggle={onToggleHabit!} onDelete={onDeleteHabit!} />
        </section>
      </div>

      <NavigationPill 
        currentView="planner"
        onNavigate={onNavigate!}
        onOpenMenu={openMenu}
        toolL={{ icon: <Plus size={22} />, onClick: () => setIsAdding(true) }}
        toolR={{ icon: <CalendarIcon size={22} />, onClick: () => setShowCalendar(!showCalendar), active: showCalendar }}
      />

      {isAdding && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
          <div className="w-full max-w-sm glass-card rounded-[3rem] p-8 shadow-2xl border border-white/10">
            <div className="flex justify-between items-center mb-8"><span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.2em]">Новая задача</span><button onClick={() => setIsAdding(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={24} /></button></div>
            <input autoFocus value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Что запланируем?" className="w-full bg-transparent text-2xl font-black text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]/20 mb-8" />
            <div className="flex gap-4 mb-10"><div className="flex-1 flex items-center gap-3 bg-[var(--bg-main)] rounded-2xl px-5 border border-[var(--border-color)]"><Clock size={18} className="text-[var(--accent)]" /><input type="time" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} className="bg-transparent text-sm font-bold text-[var(--text-main)] outline-none w-full py-4" /></div></div>
            <button onClick={handleAddTask} disabled={!newTaskTitle.trim()} className="w-full py-5 bg-[var(--accent)] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[var(--accent-glow)] active:scale-95 transition-all disabled:opacity-20">Зафиксировать</button>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95 duration-200">
          <div className="w-full max-w-sm glass-card rounded-[3rem] p-8 shadow-2xl border border-white/10">
            <div className="flex justify-between items-center mb-6"><span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.2em]">Редактирование</span><button onClick={() => setEditingTask(null)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={24} /></button></div>
            <div className="space-y-6"><input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-transparent text-xl font-black text-[var(--text-main)] outline-none border-b border-[var(--border-color)] pb-4 placeholder:text-[var(--text-muted)]/20" /><div className="flex flex-col gap-3"><label className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Дата и Время</label><div className="flex gap-3"><div className="flex-1 flex items-center gap-2 bg-[var(--bg-main)] rounded-2xl px-4 py-3 border border-[var(--border-color)]"><CalendarIcon size={16} className="text-[var(--accent)]" /><input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="bg-transparent text-xs font-bold text-[var(--text-main)] outline-none w-full" /></div><div className="flex-1 flex items-center gap-2 bg-[var(--bg-main)] rounded-2xl px-4 py-3 border border-[var(--border-color)]"><Clock size={16} className="text-[var(--accent)]" /><input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="bg-transparent text-xs font-bold text-[var(--text-main)] outline-none w-full" /></div></div></div></div>
            <div className="flex gap-3 mt-10"><button onClick={handleDeleteTask} className="px-5 py-4 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20} /></button><button onClick={handleSaveEdit} className="flex-1 py-4 bg-[var(--accent)] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[var(--accent-glow)] active:scale-95 transition-all flex items-center justify-center gap-2"><Save size={18} /> Сохранить</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlannerView;
