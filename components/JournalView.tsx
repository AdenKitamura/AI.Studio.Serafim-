
import React, { useState, useRef } from 'react';
import { JournalEntry } from '../types';
import { format, addDays, isSameDay, isValid } from 'date-fns';
// Fix: Import locale directly from the specific path
import { ru } from 'date-fns/locale/ru';
import { Calendar as CalendarIcon } from 'lucide-react';

interface JournalViewProps {
  journal: JournalEntry[];
  onSave: (dateStr: string, content: string, notes: string, mood: string) => void;
}

const JournalView: React.FC<JournalViewProps> = ({ journal, onSave }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const datePickerRef = useRef<HTMLInputElement>(null);
  
  // Fix: Calculate start of week manually as startOfWeek is reported missing
  const dayOfWeek = selectedDate.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;
  const startOfCurrentWeek = addDays(selectedDate, -diffToMonday);
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const entry = journal.find(j => j.date === dateStr);

  const [content, setContent] = useState(entry?.content || '');
  const [notes, setNotes] = useState(entry?.notes || '');
  const [mood, setMood] = useState(entry?.mood || '');

  React.useEffect(() => {
      const e = journal.find(j => j.date === format(selectedDate, 'yyyy-MM-dd'));
      setContent(e?.content || '');
      setNotes(e?.notes || '');
      setMood(e?.mood || '');
  }, [selectedDate, journal]);

  const handleSave = () => {
      if (content.trim() !== (entry?.content || '') || notes.trim() !== (entry?.notes || '') || mood !== (entry?.mood || '')) {
          onSave(dateStr, content, notes, mood);
      }
  };

  const moods = ['😔', '😐', '🙂', '😃', '🤩']; 

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Header */}
      <div className="p-5 flex justify-between items-center bg-[var(--bg-main)]">
         <div>
             <h2 className="text-2xl font-bold text-[var(--text-main)]">Дневник</h2>
             <p className="text-sm text-[var(--text-muted)] capitalize">{format(selectedDate, 'd MMMM yyyy', { locale: ru })}</p>
         </div>
         
         <div className="relative">
             <button 
                onClick={() => datePickerRef.current?.showPicker()} 
                className="p-2 bg-[var(--bg-item)] rounded-full text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors border border-[var(--border-color)]"
             >
                 <CalendarIcon size={20} />
             </button>
             <input 
                ref={datePickerRef}
                type="date"
                className="absolute inset-0 opacity-0 pointer-events-none"
                onChange={(e) => {
                    // Fix: Use native Date constructor instead of parseISO
                    const d = new Date(e.target.value);
                    if (isValid(d)) setSelectedDate(d);
                }}
             />
         </div>
      </div>

      {/* Weekly Strip */}
      <div className="px-4 pb-4">
         <div className="flex justify-between gap-2 p-1 bg-[var(--bg-item)] rounded-2xl border border-[var(--border-color)]">
             {weekDays.map(day => {
                 const isSelected = isSameDay(day, selectedDate);
                 // Fix: Use native Date constructor instead of parseISO
                 const hasEntry = journal.some(j => isSameDay(new Date(j.date), day));
                 return (
                     <button 
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`
                            flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all
                            ${isSelected ? 'bg-[var(--bg-main)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}
                        `}
                     >
                         <span className="text-[10px] uppercase font-bold mb-1 opacity-70">{format(day, 'EEE', { locale: ru })}</span>
                         <span className={`text-sm font-bold ${isSelected ? 'scale-110' : ''}`}>{format(day, 'dd')}</span>
                         <div className={`w-1 h-1 rounded-full mt-1 ${hasEntry ? 'bg-[var(--accent)]' : 'bg-transparent'}`}></div>
                     </button>
                 )
             })}
         </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-28">
         <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Mood / Status Selector */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
                {moods.map((m, idx) => (
                    <button 
                        key={m}
                        onClick={() => { setMood(m); handleSave(); }}
                        className={`
                            w-10 h-10 rounded-full flex items-center justify-center text-lg border transition-all
                            ${mood === m ? 'bg-[var(--bg-item)] border-[var(--accent)] scale-110 shadow-lg' : 'border-transparent opacity-50 grayscale hover:grayscale-0 hover:opacity-100'}
                        `}
                    >
                        {m}
                    </button>
                ))}
            </div>

            {/* Main Log */}
            <div className="relative">
                 <textarea
                    className="w-full bg-transparent text-[var(--text-main)] text-base font-normal leading-relaxed focus:outline-none placeholder:text-[var(--text-muted)]/30 min-h-[300px] resize-none"
                    placeholder="Как прошел день? Запиши свои мысли..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onBlur={handleSave}
                />
            </div>

            {/* Additional Notes */}
            <div className="relative pt-6 border-t border-[var(--border-color)]">
                 <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase mb-3 tracking-wide">Заметки / Инсайты</h4>
                 <textarea
                    className="w-full bg-[var(--bg-item)] rounded-2xl border border-[var(--border-color)] p-4 text-[var(--text-main)] text-sm leading-relaxed focus:outline-none focus:border-[var(--text-muted)] transition-colors min-h-[100px] resize-none"
                    placeholder="Важные детали дня..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={handleSave}
                />
            </div>

         </div>
      </div>
    </div>
  );
};

export default JournalView;