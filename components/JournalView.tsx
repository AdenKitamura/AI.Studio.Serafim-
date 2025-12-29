
import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, DailyReflection, Task } from '../types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import { Calendar as CalendarIcon, Mic, MicOff, Sparkles, Loader2, ChevronDown, Tag, Hash, Wand2, Target, Heart, ShieldAlert, Rocket } from 'lucide-react';
import { polishTranscript } from '../services/geminiService';
import CalendarView from './CalendarView';

interface JournalViewProps {
  journal: JournalEntry[];
  tasks?: Task[]; 
  onSave: (dateStr: string, content: string, notes: string, mood: string, reflection?: DailyReflection, tags?: string[]) => void;
}

const JournalView: React.FC<JournalViewProps> = ({ journal, tasks = [], onSave }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isRecording, setIsRecording] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [interimText, setInterimText] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const autoSaveTimeoutRef = useRef<any>(null);
  const reflectionRef = useRef<HTMLDivElement>(null);

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

  // --- AUTO-SAVE LOGIC ---
  useEffect(() => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    
    autoSaveTimeoutRef.current = setTimeout(() => {
        onSave(dateStr, content, '', mood, reflection, tags);
    }, 1500); 

    return () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); };
  }, [content, mood, tags, reflection, dateStr, onSave]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const rec = new SpeechRecognition();
      // FIX: continuous = false helps prevent the "infinite repeating text" bug on some Androids
      rec.continuous = false; 
      rec.interimResults = true;
      rec.lang = 'ru-RU';

      rec.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim = result[0].transcript;
          }
        }
        if (final) {
          setContent(prev => (prev + ' ' + final).replace(/\s+/g, ' ').trim());
          setInterimText('');
        } else {
          setInterimText(interim);
        }
      };
      
      rec.onstart = () => { setIsRecording(true); };
      rec.onend = async () => { 
          setIsRecording(false); 
          setInterimText(''); 
          // Only polish if there is substantial content
          if (content.length > 20) await handleAutoPolish();
      };
      rec.onerror = () => setIsRecording(false);
      recognitionRef.current = rec;
    }
  }, [content]);

  const toggleRecording = () => {
    if (!recognitionRef.current || isPolishing) return;
    if (isRecording) recognitionRef.current.stop();
    else { setInterimText(''); recognitionRef.current.start(); }
  };

  const handleAutoPolish = async () => {
      if (content.length < 5) return;
      setIsPolishing(true);
      try {
          const cleaned = await polishTranscript(content);
          if (cleaned && cleaned !== content) setContent(cleaned);
      } catch (e) { console.warn("Polish failed", e); }
      finally { setIsPolishing(false); }
  };

  const toggleReflection = () => {
      const newState = !showReflection;
      setShowReflection(newState);
      if (newState) {
          setTimeout(() => {
              reflectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
      }
  };

  const moods = [
      { emoji: '😔', label: 'Тяжело' },
      { emoji: '😐', label: 'Норма' },
      { emoji: '🙂', label: 'Хорошо' },
      { emoji: '😃', label: 'Отлично' },
      { emoji: '🤩', label: 'Поток' }
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] overflow-hidden">
      {/* HEADER */}
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
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            {isPolishing ? <span className="text-[var(--accent)] animate-pulse">Очистка...</span> : <span>Авто-сохранение</span>}
        </div>
      </div>

      {showCalendar && (
        <div className="p-6 bg-[var(--bg-main)] border-b border-[var(--border-color)] animate-in slide-in-from-top duration-300">
           <CalendarView tasks={tasks} onDateClick={(d) => { setSelectedDate(d); setShowCalendar(false); }} />
        </div>
      )}

      {/* MAIN EDITOR AREA */}
      <div className="flex-1 overflow-y-auto px-6 pb-48 no-scrollbar">
        <div className="max-w-2xl mx-auto py-8 space-y-8">
          
          {/* Enhanced Mood Tracker */}
          <div className="flex justify-between items-center bg-[var(--bg-item)] p-2 rounded-3xl border border-[var(--border-color)]">
             {moods.map((m) => (
                 <button
                    key={m.emoji}
                    onClick={() => setMood(m.emoji)}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl transition-all ${mood === m.emoji ? 'bg-[var(--bg-main)] shadow-md scale-105 border border-[var(--border-color)]' : 'opacity-40 hover:opacity-100'}`}
                 >
                     <span className="text-2xl">{m.emoji}</span>
                     <span className="text-[8px] font-bold uppercase text-[var(--text-muted)]">{m.label}</span>
                 </button>
             ))}
          </div>

          <div className="relative min-h-[40vh]">
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
          
          {/* Enhanced Reflection Section */}
          {showReflection && (
              <div ref={reflectionRef} className="animate-in slide-in-from-bottom-5 fade-in space-y-6 pt-8 border-t border-[var(--border-color)] transition-all">
                  <div className="flex items-center gap-2 mb-4">
                      <Sparkles size={18} className="text-[var(--accent)]" />
                      <h3 className="text-xs font-black uppercase text-[var(--accent)] tracking-[0.2em]">Рефлексия дня</h3>
                  </div>
                  
                  <div className="glass-panel p-6 rounded-3xl space-y-6 border border-[var(--border-color)] bg-[var(--bg-item)]/30">
                      <div>
                          <div className="flex items-center gap-2 mb-3">
                              <Target size={14} className="text-emerald-500" />
                              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Главный фокус</label>
                          </div>
                          <textarea 
                            value={reflection.mainFocus} 
                            onChange={e => setReflection({...reflection, mainFocus: e.target.value})}
                            className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-3 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none resize-none min-h-[60px]"
                            placeholder="На чем была концентрация?"
                          />
                      </div>
                      <div>
                          <div className="flex items-center gap-2 mb-3">
                              <Heart size={14} className="text-rose-500" />
                              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Благодарность</label>
                          </div>
                          <textarea 
                            value={reflection.gratitude} 
                            onChange={e => setReflection({...reflection, gratitude: e.target.value})}
                            className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-3 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none resize-none min-h-[60px]"
                            placeholder="Что хорошего произошло?"
                          />
                      </div>
                      <div>
                          <div className="flex items-center gap-2 mb-3">
                              <ShieldAlert size={14} className="text-amber-500" />
                              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Блокеры</label>
                          </div>
                          <textarea 
                            value={reflection.blockers} 
                            onChange={e => setReflection({...reflection, blockers: e.target.value})}
                            className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-3 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none resize-none min-h-[60px]"
                            placeholder="Что мешало?"
                          />
                      </div>
                      <div>
                          <div className="flex items-center gap-2 mb-3">
                              <Rocket size={14} className="text-indigo-500" />
                              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Цель на завтра</label>
                          </div>
                          <textarea 
                            value={reflection.tomorrowGoal} 
                            onChange={e => setReflection({...reflection, tomorrowGoal: e.target.value})}
                            className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-3 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none resize-none min-h-[60px]"
                            placeholder="Один главный приоритет..."
                          />
                      </div>
                  </div>
              </div>
          )}

          {/* Tags Section */}
          {showTags && (
             <div className="animate-in slide-in-from-bottom-5 fade-in pt-4">
                 <div className="flex items-center gap-2 flex-wrap">
                     <Hash size={16} className="text-[var(--text-muted)]" />
                     {tags.map(t => (
                         <span key={t} className="px-3 py-1 bg-[var(--bg-item)] rounded-lg text-xs font-bold text-[var(--text-main)] border border-[var(--border-color)]">#{t}</span>
                     ))}
                     <input 
                        placeholder="Добавить тег..."
                        className="bg-transparent text-xs text-[var(--text-main)] outline-none min-w-[100px]"
                        onKeyDown={(e) => {
                            if(e.key === 'Enter') {
                                const val = e.currentTarget.value.trim();
                                if(val) { setTags([...tags, val]); e.currentTarget.value = ''; }
                            }
                        }}
                     />
                 </div>
             </div>
          )}

        </div>
      </div>

      {/* BOTTOM TOOLBAR */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)] to-transparent z-40 pointer-events-none">
         <div className="max-w-md mx-auto flex items-center justify-between pointer-events-auto">
             
             {/* Left Actions */}
             <div className="flex gap-2">
                 <button 
                   onClick={toggleReflection}
                   className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${showReflection ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-lg' : 'bg-[var(--bg-item)] text-[var(--text-muted)] border-[var(--border-color)]'}`}
                 >
                     <Sparkles size={18} />
                 </button>
                 <button 
                   onClick={() => setShowTags(!showTags)}
                   className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${showTags ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)]' : 'bg-[var(--bg-item)] text-[var(--text-muted)] border-[var(--border-color)]'}`}
                 >
                     <Tag size={18} />
                 </button>
             </div>

             {/* Center Action (Mic) */}
             <button 
              onClick={toggleRecording} 
              disabled={isPolishing}
              className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 ${isRecording ? 'bg-rose-500 text-white animate-pulse scale-110 shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'bg-[var(--bg-item)] text-[var(--text-main)] border border-[var(--border-color)] hover:bg-[var(--bg-card)]'}`}
             >
              {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
            </button>
            
            {/* Right Action (Spacer or Magic Polish if needed manually) */}
             <div className="flex gap-2">
                <button 
                   onClick={handleAutoPolish}
                   disabled={isPolishing || !content}
                   className="w-12 h-12 rounded-full bg-[var(--bg-item)] flex items-center justify-center text-[var(--text-muted)] border border-[var(--border-color)] hover:text-[var(--accent)] active:scale-95"
                 >
                     {isPolishing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                 </button>
             </div>
         </div>
      </div>
    </div>
  );
};

export default JournalView;
