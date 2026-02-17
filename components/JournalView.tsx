
import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, DailyReflection, Task } from '../types';
import { format } from 'date-fns';
import ru from 'date-fns/locale/ru';
import { Mic, MicOff, Sparkles, ChevronDown, Target, Heart, ShieldAlert, Rocket, Loader2 } from 'lucide-react';
import CalendarView from './CalendarView';
import { fixGrammar, transcribeAudio } from '../services/geminiService';
import NavigationPill from './NavigationPill';

interface JournalViewProps {
  journal: JournalEntry[];
  tasks?: Task[]; 
  onSave: (dateStr: string, content: string, notes: string, mood: string, reflection?: DailyReflection, tags?: string[]) => void;
  onNavigate: (view: any) => void;
}

const JournalView: React.FC<JournalViewProps> = ({ journal, tasks = [], onSave, onNavigate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  
  // Media Recorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const autoSaveTimeoutRef = useRef<any>(null);
  const reflectionRef = useRef<HTMLDivElement>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const entry = journal.find(j => j.date === dateStr);

  useEffect(() => {
    const e = journal.find(j => j.date === format(selectedDate, 'yyyy-MM-dd'));
    setContent(e?.content || '');
    setMood(e?.mood || '');
    setReflection(e?.reflection || { mainFocus: '', gratitude: '', blockers: '', tomorrowGoal: '' });
  }, [selectedDate, journal]);

  const [content, setContent] = useState(entry?.content || '');
  const [mood, setMood] = useState(entry?.mood || '');
  const [reflection, setReflection] = useState<DailyReflection>(entry?.reflection || { mainFocus: '', gratitude: '', blockers: '', tomorrowGoal: '' });

  useEffect(() => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => { onSave(dateStr, content, '', mood, reflection, []); }, 1000); 
    return () => { if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current); };
  }, [content, mood, reflection, dateStr, onSave]);

  const toggleRecording = async () => {
    if (isRecording) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            }

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                await processAudioBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (e) {
            console.error("Mic Error", e);
            alert("Нет доступа к микрофону");
        }
    }
  };

  const processAudioBlob = async (blob: Blob) => {
      setIsProcessingAudio(true);
      try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
              const base64Audio = (reader.result as string).split(',')[1];
              const text = await transcribeAudio(base64Audio, blob.type);
              if (text) {
                  setContent(prev => (prev + ' ' + text).trim());
              }
              setIsProcessingAudio(false);
          };
      } catch (e) {
          console.error(e);
          setIsProcessingAudio(false);
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

  const openMenu = () => {
      const menuBtn = document.getElementById('sidebar-trigger');
      if(menuBtn) menuBtn.click();
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth pt-16">
        <div className="sticky top-0 z-40 bg-[var(--bg-main)]/95 backdrop-blur-xl border-b border-[var(--border-color)] px-6 py-4 flex justify-between items-center transition-all duration-200 mt-2">
            <div className="cursor-pointer group active:opacity-70 transition-opacity" onClick={() => setShowCalendar(!showCalendar)}>
            <div className="flex items-center gap-3"><h2 className="text-3xl font-black text-[var(--text-main)] tracking-tighter uppercase leading-none">ДНЕВНИК</h2><div className={`p-1.5 rounded-full bg-[var(--bg-item)] border border-[var(--border-color)] transition-transform duration-300 ${showCalendar ? 'rotate-180 bg-[var(--accent)] border-[var(--accent)] text-white' : 'text-[var(--text-muted)]'}`}><ChevronDown size={16} /></div></div>
            <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mt-1 pl-1">{format(selectedDate, 'eeee, d MMMM', { locale: ru })}</p></div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                {isRecording ? <span className="text-red-500 animate-pulse">Запись...</span> : isProcessingAudio ? <span className="text-[var(--accent)] animate-pulse">Обработка...</span> : <span>Сохранено</span>}
            </div>
        </div>

        {showCalendar && (
            <div className="sticky top-[75px] z-30 px-6 pb-6 bg-[var(--bg-main)]/95 backdrop-blur-xl border-b border-[var(--border-color)] animate-in slide-in-from-top-5 fade-in duration-200 shadow-xl">
            <CalendarView tasks={tasks} onDateClick={(d) => { setSelectedDate(d); setShowCalendar(false); }} />
            </div>
        )}

        <div className="px-6 pb-48 pt-6 max-w-2xl mx-auto min-h-screen">
            <div className="flex justify-between items-center bg-[var(--bg-item)] p-2 rounded-3xl border border-[var(--border-color)] mb-8 shadow-sm">
                {moods.map((m) => (<button key={m.emoji} onClick={() => setMood(m.emoji)} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl transition-all active:scale-95 ${mood === m.emoji ? 'bg-[var(--bg-main)] shadow-md border border-[var(--border-color)]' : 'opacity-40 hover:opacity-100'}`}><span className="text-2xl filter drop-shadow-sm">{m.emoji}</span><span className="text-[8px] font-bold uppercase text-[var(--text-muted)]">{m.label}</span></button>))}
            </div>
            <div className="relative mb-12">
                <textarea className="w-full h-full min-h-[50vh] bg-transparent text-[var(--text-main)] text-xl font-medium leading-relaxed outline-none resize-none placeholder:text-[var(--text-muted)]/20 placeholder:italic placeholder:font-serif" value={content} onChange={e => setContent(e.target.value)} placeholder="О чем ты думаешь сегодня?.." spellCheck={false} />
            </div>
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

      <NavigationPill 
        currentView="journal"
        onNavigate={onNavigate}
        onOpenMenu={openMenu}
        toolL={{ icon: <Target size={22} />, onClick: toggleReflection, active: showReflection }}
        toolR={{ 
            icon: isProcessingAudio ? <Loader2 size={22} className="animate-spin"/> : isRecording ? <MicOff size={22}/> : <Mic size={22}/>, 
            onClick: toggleRecording, 
            active: isRecording 
        }}
      />
    </div>
  );
};

export default JournalView;
