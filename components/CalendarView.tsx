
import React, { useState } from 'react';
import { Task, CalendarMode } from '../types';
import { format, eachDayOfInterval, isSameDay, isToday, addWeeks, addDays, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  journal: any[];
  onDateClick: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDays = () => {
    const day = currentDate.getDay();
    const diffToMonday = (day + 6) % 7;
    const start = addDays(currentDate, -diffToMonday);
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
          {format(currentDate, 'LLLL yyyy', { locale: ru })}
        </h4>
        <div className="flex gap-4">
          <button onClick={() => setCurrentDate(addWeeks(currentDate, -1))} className="text-white/20 hover:text-white transition-colors"><ChevronLeft size={14}/></button>
          <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="text-white/20 hover:text-white transition-colors"><ChevronRight size={14}/></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {getDays().map(day => {
          const isSelected = isSameDay(day, currentDate);
          const isCurr = isToday(day);
          const hasTasks = tasks.some(t => t.dueDate && isSameDay(new Date(t.dueDate), day));

          return (
            <button 
              key={day.toISOString()} 
              onClick={() => { onDateClick(day); setCurrentDate(day); }}
              className={`
                relative flex flex-col items-center justify-center h-10 rounded-xl transition-all
                ${isSelected ? 'bg-white text-black shadow-xl scale-105' : 'text-white/40 hover:bg-white/5'}
              `}
            >
              <span className={`text-[7px] font-black uppercase mb-0.5 ${isSelected ? 'opacity-40' : 'opacity-20'}`}>
                {format(day, 'EE', { locale: ru })}
              </span>
              <span className="text-[11px] font-black">
                {format(day, 'd')}
              </span>
              
              {hasTasks && !isSelected && (
                <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isCurr ? 'bg-indigo-400' : 'bg-white/20'}`}></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
