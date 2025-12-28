
import React, { useState } from 'react';
import { Task, JournalEntry, CalendarMode } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, eachDayOfInterval, isSameDay, addMonths, isToday, 
  endOfWeek, addWeeks, addDays, endOfMonth
} from 'date-fns';
// Fix: Import locale directly from the specific path
import { ru } from 'date-fns/locale/ru';

interface CalendarViewProps {
  tasks: Task[];
  journal: JournalEntry[];
  onDateClick: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, journal, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState<CalendarMode>('week');

  const next = () => {
    if (mode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    if (mode === 'month') setCurrentDate(addMonths(currentDate, 1));
  };
  
  const prev = () => {
    // Fix: Use add* functions with negative values instead of sub* functions
    if (mode === 'week') setCurrentDate(addWeeks(currentDate, -1));
    if (mode === 'month') setCurrentDate(addMonths(currentDate, -1));
  };

  const getDaysToRender = () => {
    if (mode === 'week') {
      // Fix: Calculate start of week (Monday) manually since startOfWeek is reported missing
      const day = currentDate.getDay();
      const diffToMonday = (day + 6) % 7;
      const startOfWk = addDays(currentDate, -diffToMonday);
      return eachDayOfInterval({ start: startOfWk, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });
    }
    // Month
    // Fix: Calculate start of month manually
    const startOfMo = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return eachDayOfInterval({ start: startOfMo, end: endOfMonth(currentDate) });
  };

  const renderCell = (day: Date) => {
    // Fix: Use native Date constructor instead of parseISO
    const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));
    const dayEntry = journal.find(j => isSameDay(new Date(j.date), day));
    const isCurrent = isToday(day);
    const hasPending = dayTasks.some(t => !t.isCompleted);
    const hasCompleted = dayTasks.length > 0 && !hasPending;

    return (
      <button 
        key={day.toISOString()} 
        onClick={() => onDateClick(day)}
        className={`
          relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all group
          ${mode === 'month' ? 'aspect-square' : 'h-24 flex-1'}
          ${isCurrent 
              ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--bg-main)] shadow-[0_0_15px_rgba(var(--accent),0.4)]' 
              : 'bg-[var(--bg-item)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text-main)]'
          }
        `}
      >
        <span className={`text-[10px] uppercase font-bold mb-1 ${isCurrent ? 'opacity-80' : 'opacity-50'}`}>
            {format(day, 'EEE', { locale: ru })}
        </span>
        <span className={`font-mono text-lg font-bold ${isCurrent ? '' : ''}`}>{format(day, 'd')}</span>
        
        {/* Status Indicators (LED Style) */}
        <div className="flex gap-1 mt-2">
           {dayEntry && <div className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-[var(--bg-main)]' : 'bg-pink-500'}`}></div>}
           {hasPending && <div className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-[var(--bg-main)]' : 'bg-[var(--accent)]'}`}></div>}
           {hasCompleted && !hasPending && <div className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-[var(--bg-main)]' : 'bg-emerald-500'}`}></div>}
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center justify-between bg-[var(--bg-item)] p-2 rounded-xl border border-[var(--border-color)]">
        <button onClick={prev} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] rounded-lg transition-colors"><ChevronLeft size={18}/></button>
        
        <div className="flex flex-col items-center">
             <span className="font-mono text-sm font-bold uppercase tracking-wider text-[var(--text-main)]">
                {format(currentDate, 'LLLL yyyy', { locale: ru })}
             </span>
        </div>

        <div className="flex items-center gap-2">
            <div className="flex bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] p-0.5">
                <button onClick={() => setMode('week')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${mode === 'week' ? 'bg-[var(--text-muted)] text-[var(--bg-main)]' : 'text-[var(--text-muted)]'}`}>Wk</button>
                <button onClick={() => setMode('month')} className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${mode === 'month' ? 'bg-[var(--text-muted)] text-[var(--bg-main)]' : 'text-[var(--text-muted)]'}`}>Mo</button>
            </div>
            <button onClick={next} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] rounded-lg transition-colors"><ChevronRight size={18}/></button>
        </div>
      </div>

      {/* Grid */}
      <div className={`grid gap-2 ${mode === 'month' ? 'grid-cols-7' : 'grid-cols-7'}`}>
          {getDaysToRender().map(day => renderCell(day))}
      </div>
    </div>
  );
};

export default CalendarView;