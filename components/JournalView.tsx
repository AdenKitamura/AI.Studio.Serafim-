import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, DailyReflection, Task } from '../types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Mic, MicOff, Sparkles, ChevronDown, Target, Heart, ShieldAlert, Rocket } from 'lucide-react';
import CalendarView from './CalendarView';
import { fixGrammar } from '../services/geminiService'; // Import fixGrammar manually if needed

interface JournalViewProps {
  journal: JournalEntry[];
  tasks?: Task[]; 
  onSave: (dateStr: string, content: string, notes: string, mood: string, reflection?: DailyReflection, tags?: string[]) => void;
}

const JournalView: React.FC<JournalViewProps> = ({ journal, tasks = [], onSave }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isRecording, setIsRecording] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [isFixing, setIsFixing] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const autoSaveTimeoutRef = useRef<any>(null);
  const reflectionRef = useRef<HTMLDivElement>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const entry = journal.find(j => j.date === dateStr);

  // Sync state with selected date entry
  useEffect(() => {
    const e = journal.find(j => j.date === format(selectedDate, 'yyyy-MM-dd'));
    setContent(e?.content || '');
    setMood(e?.mood || '');
    setReflection(e?.reflection || { mainFocus: '', gratitude: '', blockers: '', tomorrowGoal: '' });
  }, [selectedDate, journal]);

  const [content, setContent] = useState(entry?.content || '');
  const [mood, setMood] = useState(entry?.mood || '');
  const [reflection, setReflection] = useState<DailyReflection>(entry?.reflection || { mainFocus: '', gratitude: '', blockers: '', tomorrowGoal: '' });

  // Auto-save logic
  useEffect(() => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => { onSave(dateStr, content, '', mood, reflection, []); }, 1000); 
    return () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); };
  }, [content, mood, reflection, dateStr, onSave]);

  // Voice Recognition (Optimized)
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true; // Use continuous
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = 'ru-RU';
      
      rec.onresult = (event: any) => {
        let interim = ''; 
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) final += result[0].transcript; else interim = result[0].transcript;
        }
        
        if (final) { 
            // Append immediately, do not wait for AI
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
      };
      rec.onerror = () => setIsRecording(false);
      recognitionRef.current = rec;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
        recognitionRef.current.stop(); 
    } else { 
        setInterimText(''); 
        recognitionRef.current.lang = 'ru-RU'; 
        recognitionRef.current.start(); 
    }
  };

  const handleMagicFix = async () => {
      if (isFixing || !content.trim()) return;
      setIsFixing(true);
      const fixed = await fixGrammar(content);
      setContent(fixed);
      setIsFixing(false);
  };

  const toggleReflection = () => { 
      setShowReflection(!showReflection); 
      if (!showReflection) setTimeout(() => reflectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); 
  };

  const moods = [{ emoji: '😔', label: 'Тяжело' }, { emoji: '😐', label: 'Норма' }, { emoji: '🙂', label: 'Хорошо' }, { emoji: '😃', label: 'Отлично' }, { emoji: '🤩', label: 'Поток' }];

  return (
    <div className="flex flex-col h-full w-full relative">
      
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        
        {/* Sticky Header inside the scroll container must be top-0 */}
        <div className="sticky top-0 z-40 bg-[var(--bg-main)]/95 backdrop-blur-xl border-b border-[var(--border-color)] px-6 py-4 flex justify-between items-center transition-all duration-200">
            <div className="cursor-pointer group active:opacity-70 transition-opacity" onClick={() => setShowCalendar(!showCalendar)}>
            <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tighter uppercase leading-none">ДНЕВНИК</h2>
                <ChevronDown size={18} className={`text-[var(--accent)] transition-transform duration-300 ${showCalendar ? 'rotate-180' : ''}`} />
            </div>
            <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mt-1">
                {format(selectedDate, 'eeee, d MMMM', { locale: ru })}
            </p>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
               {interimText ? <span className="text-[var(--accent)] animate-pulse">Слушаю...</span> : <span>Сохранено</span>}
            </div>
        </div>

        {/* Calendar Dropdown */}
        {showCalendar && (
            <div className="sticky top-[75px] z-30 px-6 pb-6 bg-[var(--bg-main)]/95 backdrop-blur-xl border-b border-[var(--border-color)] animate-in slide-in-from-top-5 fade-in duration-200">
            <CalendarView tasks={tasks} onDateClick={(d) => { setSelectedDate(d); setShowCalendar(false); }} />
            </div>
        )}

        {/* Content Area */}
        <div className="px-6 pb-48 pt-6 max-w-2xl mx-auto min-h-screen">
            
            {/* Mood Selector */}
            <div className="flex justify-between items-center bg-[var(--bg-item)] p-2 rounded-3xl border border-[var(--border-color)] mb-8 shadow-sm">
                {moods.map((m) => (
                    <button key={m.emoji} onClick={() => setMood(m.emoji)} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl transition-all active:scale-95 ${mood === m.emoji ? 'bg-[var(--bg-main)] shadow-md border border-[var(--border-color)]' : 'opacity-40 hover:opacity-100'}`}>
                        <span className="text-2xl filter drop-shadow-sm">{m.emoji}</span>
                        <span className="text-[8px] font-bold uppercase text-[var(--text-muted)]">{m.label}</span>
                    </button>
                ))}
            </div>

            {/* Main Text Area - Native, no overlays */}
            <div className="relative mb-12">
                <textarea 
                    className="w-full h-full min-h-[50vh] bg-transparent text-[var(--text-main)] text-xl font-medium leading-relaxed outline-none resize-none placeholder:text-[var(--text-muted)]/20 placeholder:italic placeholder:font-serif" 
                    value={content} 
                    onChange={e => setContent(e.target.value)} 
                    placeholder="О чем ты думаешь сегодня?.."
                    spellCheck={false}
                />
                {interimText && <div className="mt-2 text-[var(--text-muted)] opacity-50 animate-pulse font-medium">{interimText}</div>}
            </div>

            {/* Reflection Section */}
            {showReflection && (
                <div ref={reflectionRef} className="animate-in slide-in-from-bottom-5 fade-in space-y-6 pt-8 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-2 mb-2"><Sparkles size={18} className="text-[var(--accent)]" /><h3 className="text-xs font-black uppercase text-[var(--accent)] tracking-[0.2em]">Рефлексия дня</h3></div>
                    <div className="glass-panel p-6 rounded-[2rem] space-y-6 border border-[var(--border-color)] bg-[var(--bg-item)]/30">
                        <div><div className="flex items-center gap-2 mb-3"><Target size={14} className="text-emerald-500" /><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Главный фокус</label></div><textarea value={reflection.mainFocus} onChange={e => setReflection({...reflection, mainFocus: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-3 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none resize-none min-h-[60px]" placeholder="На чем была концентрация?" /></div>
                        <div><div className="flex items-center gap-2 mb-3"><Heart size={14} className="text-rose-500" /><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Благодарность</label></div><textarea value={reflection.gratitude} onChange={e => setReflection({...reflection, gratitude: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-3 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none resize-none min-h-[60px]" placeholder="Что хорошего произошло?" /></div>
                        <div><div className="flex items-center gap-2 mb-3"><ShieldAlert size={14} className="text-amber-500" /><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Блокеры</label></div><textarea value={reflection.blockers} onChange={e => setReflection({...reflection, blockers: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-3 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none resize-none min-h-[60px]" placeholder="Что мешало?" /></div>
                        <div><div className="flex items-center gap-2 mb-3"><Rocket size={14} className="text-indigo-500" /><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Цель на завтра</label></div><textarea value={reflection.tomorrowGoal} onChange={e => setReflection({...reflection, tomorrowGoal: e.target.value})} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl p-3 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none resize-none min-h-[60px]" placeholder="Один главный приоритет..." /></div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Floating Toolbar */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)]/90 to-transparent z-50 pointer-events-none">
         <div className="max-w-md mx-auto flex items-center justify-between pointer-events-auto">
             <button onClick={toggleReflection} className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-95 ${showReflection ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-lg shadow-[var(--accent-glow)]' : 'bg-[var(--bg-item)] text-[var(--text-muted)] border-[var(--border-color)] hover:text-[var(--text-main)]'}`}><Target size={20} /></button>
             
             <button onClick={toggleRecording} className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all cursor-pointer active:scale-90 ${isRecording ? 'bg-rose-500 text-white animate-pulse scale-110 shadow-rose-500/40' : 'bg-[var(--bg-item)] text-[var(--text-main)] border border-[var(--border-color)] hover:bg-[var(--bg-card)]'}`}>{isRecording ? <MicOff size={28} /> : <Mic size={28} />}</button>
             
             <button onClick={handleMagicFix} disabled={isFixing} className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-95 bg-[var(--bg-item)] text-[var(--text-muted)] border-[var(--border-color)] hover:text-[var(--text-main)] ${isFixing ? 'animate-spin text-[var(--accent)]' : ''}`}><Sparkles size={20} /></button>
         </div>
      </div>
    </div>
  );
};

export default JournalView;