import React, { useState } from 'react';
import { Habit } from '../types';
import { Plus, Check, X } from 'lucide-react';
import { format } from 'date-fns';

interface HabitTrackerProps {
  habits: Habit[];
  selectedDate: Date;
  onToggle: (id: string, date: string) => void;
  onAdd: (habit: Habit) => void;
  onDelete: (id: string) => void;
}

const COLORS = ['#ef4444', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

const HabitTracker: React.FC<HabitTrackerProps> = ({ habits, selectedDate, onToggle, onAdd, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState(COLORS[2]);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  return (
    <>
      {/* Scrollable container ONLY for buttons */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
        {habits.map(habit => {
          const isDone = habit.completedDates.includes(dateStr);
          return (
            <button 
              key={habit.id}
              onClick={() => onToggle(habit.id, dateStr)}
              onContextMenu={(e) => { e.preventDefault(); onDelete(habit.id); }}
              className={`
                flex-none flex items-center gap-3 px-4 py-2 rounded-full border transition-all active:scale-95
                ${isDone ? 'bg-white/10 border-white/10' : 'bg-transparent border-white/5'}
              `}
            >
              <div 
                className={`w-3 h-3 rounded-full border transition-all flex items-center justify-center ${isDone ? 'border-transparent' : 'border-white/20'}`}
                style={{ backgroundColor: isDone ? habit.color : 'transparent' }}
              >
                {isDone && <Check size={8} strokeWidth={6} className="text-white" />}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isDone ? 'text-white' : 'text-white/20'}`}>
                {habit.title}
              </span>
            </button>
          );
        })}

        <button 
          onClick={() => setIsAdding(true)}
          className="flex-none w-10 h-10 bg-white/5 border border-dashed border-white/10 rounded-full flex items-center justify-center text-white/20 hover:text-white transition-all"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Modal is OUTSIDE the scroll container */}
      {isAdding && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-xs glass-card rounded-[2.5rem] p-8 shadow-2xl relative border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Новая привычка</span>
              <button onClick={() => setIsAdding(false)}><X size={18} className="text-white/20 hover:text-white" /></button>
            </div>
            <input 
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Название..."
              className="w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-white/10 mb-6 border-b border-white/10 pb-2"
            />
            <div className="flex gap-3 mb-8 justify-center">
              {COLORS.map(c => (
                <button 
                  key={c} 
                  onClick={() => setNewColor(c)} 
                  className={`w-8 h-8 rounded-full transition-all ${newColor === c ? 'scale-125 ring-2 ring-white shadow-lg' : 'opacity-40 hover:opacity-100'}`} 
                  style={{ backgroundColor: c }} 
                />
              ))}
            </div>
            <button 
              onClick={() => {
                if(newTitle.trim()){
                  onAdd({ id: Date.now().toString(), title: newTitle, color: newColor, completedDates: [], createdAt: new Date().toISOString() });
                  setNewTitle(''); setIsAdding(false);
                }
              }}
              className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-gray-200"
            >
              Создать
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default HabitTracker;