
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

// Helper to replace date-fns/subDays to avoid import issues
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

  // --- LOGIC: Calculate Streak ---
  const getStreak = (completedDates: string[]) => {
    let streak = 0;
    const today = new Date();
    // Sort dates descending
    const sorted = [...completedDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    // Check if done today to start counting, otherwise start from yesterday
    const isDoneToday = sorted.includes(format(today, 'yyyy-MM-dd'));
    let checkDate = isDoneToday ? today : subDays(today, 1);

    // Loop backwards
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

  // --- LOGIC: Get Last 5 Days History ---
  const getLast5Days = () => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = subDays(new Date(), 4 - i); // 4 days ago to today
      return format(d, 'yyyy-MM-dd');
    });
  };

  const last5Days = getLast5Days();

  return (
    <>
      <div className="grid grid-cols-2 gap-3 pb-2 px-1">
        {habits.map(habit => {
          const isDone = habit.completedDates.includes(dateStr);
          const streak = getStreak(habit.completedDates);
          
          return (
            <div 
              key={habit.id}
              onClick={() => onToggle(habit.id, dateStr)}
              onContextMenu={(e) => { e.preventDefault(); onDelete(habit.id); }}
              className={`
                group relative p-4 rounded-[1.5rem] transition-all duration-300 cursor-pointer overflow-hidden
                backdrop-blur-xl border
                ${isDone 
                  ? 'bg-[var(--accent)]/20 border-[var(--accent)]/50 shadow-[0_0_20px_rgba(0,0,0,0.2)]' 
                  : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'}
              `}
            >
              {/* Background Progress Effect */}
              <div 
                className={`absolute inset-0 opacity-20 transition-all duration-500 ${isDone ? 'translate-y-0' : 'translate-y-full'}`} 
                style={{ backgroundColor: habit.color }}
              ></div>

              {/* Header: Title & Check */}
              <div className="flex justify-between items-start mb-3 relative z-10">
                 <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isDone ? 'border-transparent bg-[var(--accent)]' : 'border-white/20 bg-black/20'}`}
                      style={isDone ? { backgroundColor: habit.color } : {}}>
                    {isDone && <Check size={14} strokeWidth={4} className="text-white scale-110" />}
                 </div>
                 {streak > 2 && (
                   <div className="flex items-center gap-1 text-[9px] font-black text-orange-500 animate-pulse">
                      <Flame size={12} fill="currentColor" /> {streak}
                   </div>
                 )}
              </div>

              {/* Content */}
              <div className="relative z-10">
                <h4 className={`text-xs font-black uppercase tracking-wider mb-3 truncate transition-colors ${isDone ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                  {habit.title}
                </h4>
                
                {/* Mini History Heatmap */}
                <div className="flex justify-between items-end">
                   <div className="flex gap-1">
                      {last5Days.map((dayStr, idx) => {
                        const dayDone = habit.completedDates.includes(dayStr);
                        const isToday = dayStr === dateStr;
                        return (
                          <div 
                            key={dayStr}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${dayDone ? '' : 'opacity-20'}`}
                            style={{ 
                              backgroundColor: dayDone ? habit.color : 'var(--text-muted)',
                              transform: isToday && dayDone ? 'scale(1.2)' : 'scale(1)'
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
          className="group h-[116px] rounded-[1.5rem] bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:text-white hover:border-[var(--accent)] transition-all hover:bg-white/10 backdrop-blur-md"
        >
          <div className="p-2 bg-black/20 rounded-full group-hover:scale-110 transition-transform">
             <Plus size={18} />
          </div>
          <span className="text-[8px] font-black uppercase">New</span>
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-xs glass-card rounded-[2.5rem] p-8 shadow-2xl relative border border-white/10 bg-[#121212]/90">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Новый ритуал</span>
              <button onClick={() => setIsAdding(false)}><X size={18} className="text-white/20 hover:text-white" /></button>
            </div>
            
            <div className="mb-6 text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg transition-colors" style={{ backgroundColor: newColor }}>
                    <Activity size={32} className="text-white" />
                </div>
                <input 
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Название..."
                  className="w-full bg-transparent text-xl font-bold text-center text-white outline-none placeholder:text-white/10 border-b border-white/10 pb-2"
                />
            </div>

            <div className="flex gap-3 mb-8 justify-center flex-wrap">
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
              className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-gray-200 shadow-xl flex items-center justify-center gap-2"
            >
              <TrendingUp size={16} />
              Начать трек
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default HabitTracker;
