
import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, DailyReflection, Task } from '../types';
import { format, isValid } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { Calendar as CalendarIcon, Mic, MicOff, Sparkles, Save, Loader2, ChevronDown, BookOpen } from 'lucide-react';
import { polishTranscript } from '../services/geminiService';
import CalendarView from './CalendarView';

interface JournalViewProps {
  journal: JournalEntry[];
  tasks?: Task[]; // Adding tasks for calendar markers
  onSave: (dateStr: string, content: string, notes: string, mood: string, reflection?: DailyReflection, tags?: string[]) => void;
}

const JournalView: React.FC<JournalViewProps> = ({ journal, tasks = [], onSave }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isRecording, setIsRecording] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [interimText, setInterimText] = useState('');
  
  const recognitionRef = useRef<any>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const entry = journal.find(j => j.date === dateStr);

  const [content, setContent] = useState(entry?.content || '');
  const [mood, setMood] = useState(entry?.mood || '');
  const [tags, setTags] = useState<string[]>(entry?.tags || []);
  const [reflection, setReflection] = useState<DailyReflection>(entry?.reflection || {
    mainFocus: '', gratitude: '', blockers: '', tomorrowGoal: ''
  });

  useEffect(() => {
    const e = journal.find(j => j.date === format(selectedDate, 'yyyy-MM-dd'));
    setContent(e?.content || '');
    setMood(e?.mood || '');
    setTags(e?.tags || []);
    setReflection(e?.reflection || { mainFocus: '', gratitude: '', blockers: '', tomorrowGoal: '' });
  }, [selectedDate, journal]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'ru-RU';

      rec.onresult = (event: any) => {
        let finalSpeech = '';
        let interimSpeech = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalSpeech += event.results[i][0].transcript;
          else interimSpeech = event.results[i][0].transcript;
        }
        if (finalSpeech) setContent(prev => (prev + ' ' + finalSpeech).replace(/\s+/g, ' ').trim());
        setInterimText(interimSpeech);
      };

      rec.onstart = () => setIsRecording(true);
      rec.onend = () => { setIsRecording(false); setInterimText(''); };
      rec.onerror = () => setIsRecording(false);
      recognitionRef.current = rec;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current || isPolishing) return;
    if (isRecording) recognitionRef.current.stop();
    else { setInterimText(''); recognitionRef.current.start(); }
  };

  const handleManualSave = async () => {
    if (isPolishing) return;
    let textToSave = content;
    if (textToSave.length > 20) {
      setIsPolishing(true);
      try {
        const cleaned = await polishTranscript(textToSave);
        textToSave = cleaned;
        setContent(cleaned);
      } catch (e) { console.warn("Polishing error"); } 
      finally { setIsPolishing(false); }
    }
    onSave(dateStr, textToSave, '', mood, reflection, tags);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] overflow-hidden">
      <div className="p-6 flex justify-between items-center border-b border-[var(--border-color)] bg-[var(--bg-main)]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="cursor-pointer group" onClick={() => setShowCalendar(!showCalendar)}>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase">ДНЕВНИК</h2>
            <ChevronDown size={18} className={`text-[var(--accent)] transition-transform ${showCalendar ? 'rotate-180' : ''}`} />
          </div>
          <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mt-1">
            {format(selectedDate, 'eeee, d MMMM yyyy', { locale: ru })}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowReflection(!showReflection)} 
            className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all ${showReflection ? 'bg-[var(--accent)] text-white shadow-lg' : 'bg-[var(--bg-item)] text-[var(--accent)] border border-[var(--border-color)]'}`}
          >
            <Sparkles size={16} /> <span className="hidden sm:inline">Итоги</span>
          </button>
        </div>
      </div>

      {showCalendar && (
        <div className="p-6 bg-[var(--bg-main)] border-b border-[var(--border-color)] animate-in slide-in-from-top duration-300">
           <CalendarView tasks={tasks} onDateClick={(d) => { setSelectedDate(d); setShowCalendar(false); }} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pb-40 no-scrollbar">
        <div className="max-w-2xl mx-auto py-10 space-y-12">
          <div className="flex flex-wrap items-center gap-4">
            {['😔', '😐', '🙂', '😃', '🤩'].map((m) => (
              <button 
                key={m} 
                onClick={() => setMood(m)} 
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${mood === m ? 'bg-[var(--accent)] shadow-lg scale-110' : 'bg-[var(--bg-item)] hover:bg-[var(--bg-card)] opacity-40 border border-[var(--border-color)]'}`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="relative min-h-[400px]">
            <div className="w-full bg-transparent text-[var(--text-main)] text-xl font-medium leading-relaxed whitespace-pre-wrap outline-none mb-20">
                {content}
                {interimText && <span className="text-[var(--text-muted)] opacity-30 animate-pulse"> {interimText}</span>}
                {!content && !interimText && <span className="text-[var(--text-muted)] opacity-10 font-serif italic text-2xl">О чем ты думаешь сегодня?..</span>}
            </div>
            <textarea 
               className="absolute inset-0 w-full h-full opacity-0 cursor-text resize-none"
               value={content}
               onChange={e => setContent(e.target.value)}
               disabled={isPolishing || isRecording}
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-32 right-6 z-[60] flex flex-col gap-4 pointer-events-auto">
         <button 
          onClick={handleManualSave}
          disabled={isPolishing || !content.trim()}
          className="w-16 h-16 rounded-full bg-[var(--accent)] text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
         >
           {isPolishing ? <Loader2 className="animate-spin" size={28} /> : <Save size={28} />}
         </button>
         <button 
          onClick={toggleRecording} 
          disabled={isPolishing}
          className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 ${isRecording ? 'bg-rose-500 text-white animate-pulse scale-110 shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'bg-[var(--bg-item)] text-[var(--text-main)] border border-[var(--border-color)] hover:bg-[var(--bg-card)]'}`}
         >
          {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
        </button>
      </div>
    </div>
  );
};

export default JournalView;
