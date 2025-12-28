
import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, DailyReflection } from '../types';
import { format, isValid } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { Calendar as CalendarIcon, Mic, MicOff, Sparkles, Tag } from 'lucide-react';

interface JournalViewProps {
  journal: JournalEntry[];
  onSave: (dateStr: string, content: string, notes: string, mood: string, reflection?: DailyReflection, tags?: string[]) => void;
}

const JournalView: React.FC<JournalViewProps> = ({ journal, onSave }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isRecording, setIsRecording] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const datePickerRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const entry = journal.find(j => j.date === dateStr);

  const [content, setContent] = useState(entry?.content || '');
  const [notes, setNotes] = useState(entry?.notes || '');
  const [mood, setMood] = useState(entry?.mood || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(entry?.tags || []);
  const [reflection, setReflection] = useState<DailyReflection>(entry?.reflection || {
    mainFocus: '', gratitude: '', blockers: '', tomorrowGoal: ''
  });

  useEffect(() => {
    const e = journal.find(j => j.date === format(selectedDate, 'yyyy-MM-dd'));
    setContent(e?.content || '');
    setNotes(e?.notes || '');
    setMood(e?.mood || '');
    setTags(e?.tags || []);
    setReflection(e?.reflection || { mainFocus: '', gratitude: '', blockers: '', tomorrowGoal: '' });
  }, [selectedDate, journal]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false; // Отключаем промежуточные результаты для стабильности
      recognitionRef.current.lang = 'ru-RU';

      recognitionRef.current.onresult = (event: any) => {
        let finalForThisEvent = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalForThisEvent += event.results[i][0].transcript;
          }
        }
        
        if (finalForThisEvent) {
          const newText = finalForThisEvent.trim();
          setContent(prev => {
            const current = prev.trim();
            if (!current) return newText;
            // Проверка на дублирование (если браузер повторно прислал тот же фрагмент)
            if (current.toLowerCase().endsWith(newText.toLowerCase())) return current;
            return current + ' ' + newText;
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleSave = () => {
    onSave(dateStr, content, notes, mood, reflection, tags);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        const nextTags = [...tags, newTag];
        setTags(nextTags);
        onSave(dateStr, content, notes, mood, reflection, nextTags);
      }
      setTagInput('');
    }
  };

  const moods = ['😔', '😐', '🙂', '😃', '🤩'];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Header */}
      <div className="p-6 flex justify-between items-center border-b border-white/5 bg-[var(--bg-main)]/80 backdrop-blur-md sticky top-0 z-30">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tighter">ДНЕВНИК</h2>
          <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest opacity-60">
            {format(selectedDate, 'eeee, d MMMM', { locale: ru })}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowReflection(!showReflection)} 
            className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all ${showReflection ? 'bg-indigo-600 text-white' : 'bg-white/5 text-indigo-400 border border-indigo-500/20'}`}
          >
            <Sparkles size={16} /> <span className="hidden sm:inline">Рефлексия</span>
          </button>
          <button 
            onClick={() => datePickerRef.current?.showPicker()} 
            className="p-3 bg-white/5 rounded-2xl text-[var(--text-main)] border border-white/5"
          >
            <CalendarIcon size={20} />
          </button>
          <input ref={datePickerRef} type="date" className="absolute opacity-0 pointer-events-none" onChange={e => { const d = new Date(e.target.value); if (isValid(d)) setSelectedDate(d); }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 no-scrollbar">
        <div className="max-w-2xl mx-auto py-8 space-y-10">
          
          {/* Reflection Section */}
          {showReflection && (
            <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-[2.5rem] p-8 space-y-6 animate-in slide-in-from-top-4 duration-500">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 mb-4">Итоги дня</h3>
              {[
                { label: 'Главный фокус', key: 'mainFocus', placeholder: 'Что было самым важным?' },
                { label: 'Благодарность', key: 'gratitude', placeholder: 'Кому или за что ты благодарен?' },
                { label: 'Трудности', key: 'blockers', placeholder: 'Что мешало прогрессу?' },
                { label: 'Цель на завтра', key: 'tomorrowGoal', placeholder: 'Один главный шаг завтра...' }
              ].map((q) => (
                <div key={q.key}>
                  <label className="block text-[10px] font-black uppercase text-white/30 mb-2 tracking-widest">{q.label}</label>
                  <input 
                    className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-sm text-white focus:border-indigo-500/50 outline-none transition-all"
                    placeholder={q.placeholder}
                    value={(reflection as any)[q.key]}
                    onChange={(e) => {
                      const next = { ...reflection, [q.key]: e.target.value };
                      setReflection(next);
                      onSave(dateStr, content, notes, mood, next, tags);
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Mood & Tags */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex gap-2">
              {moods.map((m) => (
                <button 
                  key={m} 
                  onClick={() => { setMood(m); handleSave(); }} 
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${mood === m ? 'bg-indigo-600 shadow-lg scale-110' : 'bg-white/5 hover:bg-white/10 opacity-40'}`}
                >
                  {m}
                </button>
              ))}
            </div>
            
            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-white/5 border border-white/5 rounded-2xl px-4 py-2">
              <Tag size={14} className="text-indigo-400 shrink-0" />
              <div className="flex flex-wrap gap-1">
                {tags.map(t => (
                  <span key={t} className="text-[10px] font-bold bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-md">#{t}</span>
                ))}
                <input 
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Добавить тег..."
                  className="bg-transparent border-none outline-none text-[10px] text-white placeholder:text-white/20 py-1"
                />
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="relative group">
            <div className="absolute -left-12 top-0 hidden md:block">
              <button 
                onClick={toggleRecording} 
                className={`p-3 rounded-full transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/5 text-[var(--text-muted)] hover:text-white'}`}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            </div>
            
            <textarea
              className="w-full bg-transparent text-[var(--text-main)] text-xl font-medium leading-relaxed focus:outline-none placeholder:text-white/5 min-h-[400px] resize-none no-scrollbar"
              placeholder="Начни писать или надиктовывать свои мысли..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleSave}
            />
            
            {/* Mobile Recording Button */}
            <div className="md:hidden fixed bottom-32 right-6 z-40">
               <button 
                onClick={toggleRecording} 
                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 text-white scale-110' : 'bg-indigo-600 text-white'}`}
              >
                {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalView;
