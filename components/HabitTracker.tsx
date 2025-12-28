
import React, { useState } from 'react';
import { Habit } from '../types';
import { Flame, Plus, X, Check, Zap, Trash2 } from 'lucide-react';
import { format, isSameDay, addDays } from 'date-fns';

interface HabitTrackerProps {
  habits: Habit[];
  selectedDate: Date;
  onToggle: (id: string, date: string) => void;
  onAdd: (habit: Habit) => void;
  onDelete: (id: string) => void;
}

const COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

const HabitTracker: React.FC<HabitTrackerProps> = ({ habits, selectedDate, onToggle, onAdd, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState(COLORS[3]);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const calculateStreak = (habit: Habit) => {
    let streak = 0;
    const today = new Date();
    // Start checking from yesterday backwards, or today if completed
    // Fix: Use addDays(today, -1) instead of subDays(today, 1) as subDays is reported missing
    let currentCheck = isSameDay(selectedDate, today) && habit.completedDates.includes(format(today, 'yyyy-MM-dd')) 
        ? today 
        : addDays(today, -1);
    
    // Safety check for empty completions
    if (habit.completedDates.length === 0) return 0;

    // Iterate backwards max 365 days to prevent infinite loops in edge cases
    for (let i = 0; i < 365; i++) {
        const checkStr = format(currentCheck, 'yyyy-MM-dd');
        if (habit.completedDates.includes(checkStr)) {
            streak++;
            // Fix: Use addDays with negative amount instead of subDays
            currentCheck = addDays(currentCheck, -1);
        } else {
            break;
        }
    }
    return streak;
  };

  const handleCreate = () => {
      if (!newTitle.trim()) return;
      onAdd({
          id: Date.now().toString(),
          title: newTitle,
          color: newColor,
          completedDates: [],
          createdAt: new Date().toISOString()
      });
      setNewTitle('');
      setIsAdding(false);
  };

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
              <Zap size={14} className="text-yellow-500"/> Привычки
          </h3>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
          {habits.map(habit => {
              const isDone = habit.completedDates.includes(dateStr);
              const streak = calculateStreak(habit);
              
              return (
                  <div 
                    key={habit.id} 
                    className="snap-start flex-none w-[110px] bg-[var(--bg-item)] rounded-2xl border border-[var(--bg-card)] p-3 flex flex-col items-center justify-between relative group transition-all hover:border-[var(--text-muted)]"
                  >
                      <button 
                        onClick={() => onDelete(habit.id)}
                        className="absolute top-1 right-1 p-1 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                      >
                          <Trash2 size={12} />
                      </button>

                      <div className="text-center mb-2">
                          <span className="text-xs font-medium text-[var(--text-main)] line-clamp-2 leading-tight h-8 flex items-center justify-center">
                              {habit.title}
                          </span>
                      </div>

                      <button 
                        onClick={() => onToggle(habit.id, dateStr)}
                        className={`
                            w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm
                            ${isDone ? 'scale-110 shadow-[0_0_15px_rgba(0,0,0,0.2)]' : 'bg-[var(--bg-main)] hover:bg-[var(--bg-card)]'}
                        `}
                        style={{ backgroundColor: isDone ? habit.color : undefined, border: `2px solid ${habit.color}` }}
                      >
                          {isDone && <Check size={24} className="text-white animate-in zoom-in" strokeWidth={3} />}
                      </button>

                      <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)]">
                          <Flame size={12} className={streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-[var(--text-muted)]'} />
                          <span>{streak} дн</span>
                      </div>
                  </div>
              );
          })}

          {/* Add Button */}
          <button 
            onClick={() => setIsAdding(true)}
            className="snap-start flex-none w-[60px] bg-[var(--bg-item)]/50 rounded-2xl border border-dashed border-[var(--border-color)] flex items-center justify-center hover:bg-[var(--bg-item)] hover:border-[var(--text-muted)] transition-all"
          >
              <Plus size={24} className="text-[var(--text-muted)]" />
          </button>
      </div>

      {/* Add Modal/Inline */}
      {isAdding && (
          <div className="mt-3 p-4 bg-[var(--bg-item)] rounded-2xl border border-[var(--border-color)] animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-[var(--text-main)]">Новая привычка</span>
                  <button onClick={() => setIsAdding(false)}><X size={16} className="text-[var(--text-muted)]"/></button>
              </div>
              <input 
                 autoFocus
                 value={newTitle}
                 onChange={(e) => setNewTitle(e.target.value)}
                 placeholder="Например: Медитация"
                 className="w-full bg-[var(--bg-main)] rounded-lg p-2 text-sm text-[var(--text-main)] outline-none border border-[var(--bg-card)] focus:border-[var(--accent)] mb-3"
              />
              <div className="flex gap-2 mb-3">
                  {COLORS.map(c => (
                      <button 
                        key={c}
                        onClick={() => setNewColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'scale-110 ring-2 ring-[var(--text-main)] ring-offset-1 ring-offset-[var(--bg-item)]' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                  ))}
              </div>
              <button 
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                className="w-full py-2 bg-[var(--text-main)] text-[var(--bg-main)] rounded-lg text-sm font-bold disabled:opacity-50"
              >
                  Создать
              </button>
          </div>
      )}
    </div>
  );
};

export default HabitTracker;