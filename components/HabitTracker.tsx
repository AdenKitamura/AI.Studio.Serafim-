
import React, { useState } from 'react';
import { Habit } from '../types';
import { Plus, Check, X, Flame, Activity, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface HabitTrackerProps {
  habits: Habit[];
  selectedDate: Date;
  onToggle: (id: string, date: string) => void;
  onAdd: (habit: Habit) => void;
  onDelete: (id: string) => void;
}

const COLORS = ['#ef4444', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

const subDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
};

const HabitTracker: React.FC<HabitTrackerProps> = ({ habits, selectedDate, onToggle, onAdd, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState(COLORS[2]);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const getStreak = (completedDates: string[]) => {
    let streak = 0;
    const today = new Date();
    const sorted = [...completedDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const isDoneToday = sorted.includes(format(today, 'yyyy-MM-dd'));
    let checkDate = isDoneToday ? today : subDays(today, 1);

    while (true) {
      const checkStr = format(checkDate, 'yyyy-MM-dd');
      if (completedDates.includes(checkStr)) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const getLast5Days = () => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = subDays(new Date(), 4 - i);
      return format(d, 'yyyy-MM-dd');
    });
  };

  const last5Days = getLast5Days();

  return (
    <div className="flex flex-col gap-4">
      {/* Grid Layout: 2 columns, tightly packed */}
      <div className="grid grid-cols-2 gap-3">
        {habits.map(habit => {
          const isDone = habit.completedDates.includes(dateStr);
          const streak = getStreak(habit.completedDates);
          
          return (
            <div 
              key={habit.id}
              onClick={() => onToggle(habit.id, dateStr)}
              onContextMenu={(e) => { e.preventDefault(); onDelete(habit.id); }}
              className={`
                group relative p-4 rounded-3xl transition-all duration-300 cursor-pointer overflow-hidden
                border backdrop-blur-2xl
                ${isDone 
                  ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 shadow-[0_0_30px_rgba(0,0,0,0.3)]' 
                  : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'}
              `}
            >
              {/* Matte Glass Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none"></div>

              {/* Header: Title & Check */}
              <div className="flex justify-between items-start mb-4 relative z-10">
                 <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all shadow-lg ${isDone ? 'border-transparent text-white scale-110' : 'border-white/10 bg-black/20 text-transparent'}`}
                      style={isDone ? { backgroundColor: habit.color, boxShadow: `0 0 15px ${habit.color}60` } : {}}>
                    <Check size={16} strokeWidth={4} />
                 </div>
                 {streak > 2 && (
                   <div className="flex items-center gap-1 text-[10px] font-black text-orange-400 animate-pulse bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">
                      <Flame size={10} fill="currentColor" /> {streak}
                   </div>
                 )}
              </div>

              {/* Content */}
              <div className="relative z-10">
                <h4 className={`text-sm font-bold mb-3 truncate transition-colors ${isDone ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}`}>
                  {habit.title}
                </h4>
                
                {/* Micro-Interaction Dots */}
                <div className="flex justify-between items-end">
                   <div className="flex gap-1.5">
                      {last5Days.map((dayStr) => {
                        const dayDone = habit.completedDates.includes(dayStr);
                        const isToday = dayStr === dateStr;
                        return (
                          <div 
                            key={dayStr}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${dayDone ? '' : 'bg-white/10'}`}
                            style={{ 
                              backgroundColor: dayDone ? habit.color : undefined,
                              boxShadow: dayDone ? `0 0 8px ${habit.color}` : 'none',
                              transform: isToday && dayDone ? 'scale(1.5)' : 'scale(1)'
                            }}
                          />
                        );
                      })}
                   </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Button */}
        <button 
          onClick={() => setIsAdding(true)}
          className="group min-h-[120px] rounded-3xl bg-white/[0.02] border border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)] hover:text-white hover:border-[var(--accent)] transition-all hover:bg-white/[0.05] backdrop-blur-sm"
        >
          <div className="w-10 h-10 bg-black/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform border border-white/5">
             <Plus size={20} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">Новый трек</span>
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-xs bg-[#0c0c0c] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative">
            <div className="flex justify-between items-center mb-8">
              <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest">Создание привычки</span>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><X size={16} className="text-white/50 hover:text-white" /></button>
            </div>
            
            <div className="mb-8 text-center">
                <div className="w-20 h-20 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-colors border border-white/5" style={{ backgroundColor: newColor }}>
                    <Activity size={32} className="text-white drop-shadow-md" />
                </div>
                <input 
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Название..."
                  className="w-full bg-transparent text-2xl font-bold text-center text-white outline-none placeholder:text-white/10 border-b border-white/10 pb-4 focus:border-[var(--accent)] transition-colors"
                />
            </div>

            <div className="flex gap-3 mb-10 justify-center flex-wrap">
              {COLORS.map(c => (
                <button 
                  key={c} 
                  onClick={() => setNewColor(c)} 
                  className={`w-8 h-8 rounded-full transition-all duration-300 ${newColor === c ? 'scale-125 ring-2 ring-white shadow-[0_0_15px_currentColor]' : 'opacity-30 hover:opacity-100 scale-90'}`} 
                  style={{ backgroundColor: c, color: c }} 
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
              className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-gray-200 shadow-xl flex items-center justify-center gap-2"
            >
              <TrendingUp size={16} />
              Запустить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HabitTracker;
