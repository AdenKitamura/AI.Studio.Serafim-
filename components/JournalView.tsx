
import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, DailyReflection } from '../types';
import { format, isValid } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { Calendar as CalendarIcon, Mic, MicOff, Sparkles, Tag, Save, Loader2 } from 'lucide-react';
import { polishTranscript } from '../services/geminiService';

interface JournalViewProps {
  journal: JournalEntry[];
  onSave: (dateStr: string, content: string, notes: string, mood: string, reflection?: DailyReflection, tags?: string[]) => void;
}

const JournalView: React.FC<JournalViewProps> = ({ journal, onSave }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isRecording, setIsRecording] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [interimText, setInterimText] = useState('');
  
  const datePickerRef = useRef<HTMLInputElement>(null);
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
    const newContent = e?.content || '';
    setContent(newContent);
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
          if (event.results[i].isFinal) {
            finalSpeech += event.results[i][0].transcript;
          } else {
            interimSpeech = event.results[i][0].transcript;
          }
        }

        if (finalSpeech) {
          setContent(prev => (prev + ' ' + finalSpeech).replace(/\s+/g, ' ').trim());
        }
        setInterimText(interimSpeech);
      };

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onend = async () => {
        setIsRecording(false);
        setInterimText('');
      };

      rec.onerror = () => setIsRecording(false);
      recognitionRef.current = rec;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current || isPolishing) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setInterimText('');
      recognitionRef.current.start();
    }
  };

  const handleManualSave = async () => {
    if (isPolishing) return;
    
    let textToSave = content;
    
    // Если текст длинный и свежий, пробуем почистить его
    if (textToSave.length > 20) {
      setIsPolishing(true);
      try {
        const cleaned = await polishTranscript(textToSave);
        textToSave = cleaned;
        setContent(cleaned);
      } catch (e) {
        console.warn("Polishing error");
      } finally {
        setIsPolishing(false);
      }
    }
    
    onSave(dateStr, textToSave, '', mood, reflection, tags);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] overflow-hidden">
      <div className="p-6 flex justify-between items-center border-b border-white/5 bg-[var(--bg-main)]/80 backdrop-blur-md sticky top-0 z-30">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter">ДНЕВНИК</h2>
          <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">
            {format(selectedDate, 'eeee, d MMMM', { locale: ru })}
          </p>
        </div>
        <div className="flex gap-2">
          {isPolishing && (
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-full animate-pulse">
                <Loader2 size={12} className="text-indigo-400 animate-spin" />
                <span className="text-[10px] font-black text-indigo-400 uppercase">Полировка...</span>
            </div>
          )}
          <button 
            onClick={() => setShowReflection(!showReflection)} 
            className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all ${showReflection ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-indigo-400 border border-white/5'}`}
          >
            <Sparkles size={16} /> <span className="hidden sm:inline">Итоги</span>
          </button>
          <button 
            onClick={() => datePickerRef.current?.showPicker()} 
            className="p-3 bg-white/5 rounded-2xl text-white border border-white/5 active:scale-95 transition-transform"
          >
            <CalendarIcon size={20} />
          </button>
          <input ref={datePickerRef} type="date" className="absolute opacity-0 pointer-events-none" onChange={e => { const d = new Date(e.target.value); if (isValid(d)) setSelectedDate(d); }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-40 no-scrollbar">
        <div className="max-w-2xl mx-auto py-8 space-y-10">
          
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex gap-2">
              {['😔', '😐', '🙂', '😃', '🤩'].map((m) => (
                <button 
                  key={m} 
                  onClick={() => { setMood(m); }} 
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${mood === m ? 'bg-indigo-600 shadow-lg scale-110' : 'bg-white/5 hover:bg-white/10 opacity-40'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="relative min-h-[500px]">
            <div className="w-full bg-transparent text-white text-xl font-medium leading-relaxed whitespace-pre-wrap outline-none min-h-[400px]">
                {content}
                {interimText && <span className="text-white/20 animate-pulse"> {interimText}</span>}
                {!content && !interimText && <span className="text-white/5">О чем ты думаешь? Начни диктовать...</span>}
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
          className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-[0_10px_40px_rgba(79,70,229,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
         >
           {isPolishing ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
         </button>
         <button 
          onClick={toggleRecording} 
          disabled={isPolishing}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 ${isRecording ? 'bg-rose-500 text-white animate-pulse scale-110 shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'}`}
         >
          {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
      </div>
    </div>
  );
};

export default JournalView;
