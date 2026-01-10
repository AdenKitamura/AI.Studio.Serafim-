import React, { useState } from 'react';
import { Task } from '../types';
import { format, eachDayOfInterval, isSameDay, isToday, addMonths, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  journal?: any[];
  onDateClick: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getMonthDays = () => {
    const startOfMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const day = startOfMonthDate.getDay(); 
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const start = new Date(startOfMonthDate);
    start.setDate(startOfMonthDate.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);
    const days = eachDayOfInterval({ 
      start, 
      end: endOfWeek(addMonths(start, 1), { weekStartsOn: 1 }) 
    }).slice(0, 42);
    return days;
  };

  const days = getMonthDays();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 bg-[var(--bg-item)] p-6 rounded-[2.5rem] border border-[var(--border-color)] shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h4 className="text-xl font-black text-[var(--text-main)] capitalize tracking-tighter leading-none">
            {format(currentDate, 'LLLL', { locale: ru })}
          </h4>
          <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-40 mt-1.5">
            Системный цикл {format(currentDate, 'yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onDateClick(new Date()); setCurrentDate(new Date()); }} className="p-2.5 bg-[var(--bg-main)] text-[var(--text-muted)] hover:text-[var(--accent)] rounded-xl transition-all border border-[var(--border-color)]"><CalendarIcon size={14} /></button>
          <div className="flex bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] p-1">
            <button onClick={(e) => { e.stopPropagation(); setCurrentDate(addMonths(currentDate, -1)); }} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><ChevronLeft size={18}/></button>
            <div className="w-px h-4 bg-[var(--border-color)] self-center mx-1"></div>
            <button onClick={(e) => { e.stopPropagation(); setCurrentDate(addMonths(currentDate, 1)); }} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><ChevronRight size={18}/></button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <span key={d} className="text-[8px] font-black text-[var(--text-muted)] opacity-40 uppercase text-center pb-4">{d}</span>)}
        {days.map(day => {
          const isSelected = isSameDay(day, currentDate);
          const hasTasks = tasks.some(t => t.dueDate && isSameDay(new Date(t.dueDate), day));
          return (
            <button key={day.toISOString()} onClick={(e) => { e.stopPropagation(); onDateClick(day); setCurrentDate(day); }}
              className={`relative flex flex-col items-center justify-center h-10 rounded-xl transition-all border ${isSelected ? 'bg-[var(--accent)] text-white border-transparent shadow-lg scale-110 z-10' : 'bg-transparent text-[var(--text-main)] border-transparent hover:bg-[var(--bg-main)] hover:border-[var(--border-color)]'} ${format(day, 'MM') !== format(currentDate, 'MM') && !isSelected ? 'opacity-10' : ''}`}
            >
              <span className={`text-[11px] font-black ${isSelected ? 'text-white' : 'text-[var(--text-main)]'}`}>{format(day, 'd')}</span>
              {hasTasks && <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[var(--text-muted)]'}`}></div>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;