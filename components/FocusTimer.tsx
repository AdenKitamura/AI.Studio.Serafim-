
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Maximize2, Minimize2, Plus, Trash2, Clock, Minus } from 'lucide-react';

interface FocusTimerProps {
  onClose: () => void;
}

interface TimerInstance {
  id: string;
  label: string;
  duration: number; // minutes
  remaining: number; // seconds
  isActive: boolean;
}

type ViewMode = 'card' | 'fullscreen' | 'minimized';

const FocusTimer: React.FC<FocusTimerProps> = ({ onClose }) => {
  const [timers, setTimers] = useState<TimerInstance[]>([
    { id: '1', label: 'Фокус', duration: 25, remaining: 25 * 60, isActive: false }
  ]);
  const [activeTimerId, setActiveTimerId] = useState<string>('1');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const intervalRef = useRef<number | null>(null);

  const activeTimer = timers.find(t => t.id === activeTimerId) || timers[0];

  // Audio Engine
  const playSound = (type: 'tick' | 'complete') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'tick') {
          osc.frequency.value = 800;
          gain.gain.value = 0.05;
          osc.start();
          osc.stop(ctx.currentTime + 0.05);
      } else {
          osc.frequency.value = 600;
          gain.gain.setValueAtTime(0.5, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
          osc.start();
          osc.stop(ctx.currentTime + 1);
      }
    } catch (e) {}
  };

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setTimers(prevTimers => prevTimers.map(timer => {
        if (timer.isActive && timer.remaining > 0) {
          return { ...timer, remaining: timer.remaining - 1 };
        } else if (timer.isActive && timer.remaining === 0) {
          playSound('complete');
          return { ...timer, isActive: false };
        }
        return timer;
      }));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const toggleTimer = (id: string) => {
    setTimers(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
  };

  const resetTimer = (id: string) => {
    setTimers(prev => prev.map(t => 
      t.id === id ? { ...t, isActive: false, remaining: t.duration * 60 } : t
    ));
  };

  const deleteTimer = (id: string) => {
      if (timers.length > 1) {
          setTimers(prev => prev.filter(t => t.id !== id));
          if(activeTimerId === id) setActiveTimerId(timers[0].id);
      }
  };

  const addTimer = () => {
      const newId = Date.now().toString();
      setTimers([...timers, { id: newId, label: 'Новый таймер', duration: 25, remaining: 25 * 60, isActive: false }]);
      setActiveTimerId(newId);
  };

  const updateTimerLabel = (id: string, label: string) => {
      setTimers(prev => prev.map(t => t.id === id ? { ...t, label } : t));
  };
  
  const updateTimerDuration = (id: string, minutes: number) => {
      setTimers(prev => prev.map(t => t.id === id ? { ...t, duration: minutes, remaining: minutes * 60, isActive: false } : t));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // --- MINIMIZED BUBBLE ---
  if (viewMode === 'minimized') {
      return (
          <button 
            onClick={() => setViewMode('card')}
            className="fixed bottom-32 right-6 z-[60] w-16 h-16 bg-[var(--bg-item)] border border-[var(--accent)]/50 rounded-[2rem] shadow-2xl flex items-center justify-center animate-in zoom-in active:scale-95 transition-all overflow-hidden"
          >
              <div className="absolute inset-0 bg-[var(--accent)]/10 animate-pulse"></div>
              <div className="flex flex-col items-center gap-0 relative z-10">
                  <span className="text-[10px] font-black text-[var(--text-main)] leading-none">{formatTime(activeTimer.remaining)}</span>
                  {activeTimer.isActive && <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full mt-1 animate-ping"></div>}
              </div>
          </button>
      );
  }

  // --- FULL SCREEN RENDER ---
  if (viewMode === 'fullscreen') {
      const progress = ((activeTimer.duration * 60 - activeTimer.remaining) / (activeTimer.duration * 60)) * 100;
      return (
          <div className="fixed inset-0 z-[200] bg-[#09090b]/95 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-500">
              {/* Header Controls */}
              <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-50">
                  <div className="flex gap-4">
                      {timers.map(t => (
                          <button 
                            key={t.id}
                            onClick={() => setActiveTimerId(t.id)}
                            className={`px-4 py-2 rounded-full border transition-all text-sm font-bold uppercase tracking-wider ${activeTimerId === t.id ? 'bg-white text-black border-transparent' : 'text-white/40 border-white/10 hover:text-white'}`}
                          >
                              {t.label}
                          </button>
                      ))}
                  </div>
                  <button onClick={() => setViewMode('card')} className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all">
                      <Minimize2 size={24} />
                  </button>
              </div>

              {/* Main Timer Display - HORIZONTAL & APP FONT */}
              <div className="relative flex flex-col items-center z-10 w-full px-10">
                  <div className="text-[12px] font-black text-[var(--accent)] uppercase tracking-[0.5em] mb-4 opacity-80 animate-pulse">{activeTimer.label}</div>
                  <div className="text-[15vw] leading-none font-bold text-white tracking-tighter drop-shadow-2xl whitespace-nowrap tabular-nums">
                      {formatTime(activeTimer.remaining)}
                  </div>
              </div>

              {/* Progress Bar (Background) */}
              <div className="absolute bottom-0 left-0 h-2 bg-[var(--accent)] transition-all duration-1000" style={{ width: `${progress}%` }}></div>

              {/* Controls */}
              <div className="absolute bottom-20 flex gap-8 z-50">
                  <button onClick={() => resetTimer(activeTimer.id)} className="p-6 rounded-full border border-white/20 text-white/50 hover:text-white hover:border-white transition-all">
                      <RotateCcw size={32} />
                  </button>
                  <button onClick={() => toggleTimer(activeTimer.id)} className={`p-8 rounded-full text-white shadow-[0_0_60px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all ${activeTimer.isActive ? 'bg-orange-500' : 'bg-[var(--accent)]'}`}>
                      {activeTimer.isActive ? <Pause size={48} fill="currentColor" /> : <Play size={48} fill="currentColor" />}
                  </button>
              </div>
          </div>
      );
  }

  // --- COMPACT RENDER (CARD) ---
  return (
    <div className="fixed bottom-32 right-6 z-[60] animate-in zoom-in slide-in-from-bottom-10 duration-300">
      <div className="glass-card w-72 rounded-[2rem] border border-[var(--border-color)] overflow-hidden shadow-2xl flex flex-col max-h-[500px]">
        
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]/50">
            <div className="flex items-center gap-2">
                <Clock size={16} className="text-[var(--accent)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Мульти-Фокус</span>
            </div>
            <div className="flex gap-1">
                <button onClick={() => setViewMode('minimized')} className="p-1.5 hover:bg-[var(--bg-item)] rounded-lg text-[var(--text-muted)] transition-colors"><Minus size={14} /></button>
                <button onClick={() => setViewMode('fullscreen')} className="p-1.5 hover:bg-[var(--bg-item)] rounded-lg text-[var(--text-muted)] transition-colors"><Maximize2 size={14} /></button>
                <button onClick={onClose} className="p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded-lg text-[var(--text-muted)] transition-colors"><X size={14} /></button>
            </div>
        </div>

        {/* Timer List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
            {timers.map(timer => (
                <div 
                    key={timer.id}
                    className={`p-3 rounded-2xl border transition-all ${timer.id === activeTimerId ? 'bg-[var(--bg-main)] border-[var(--accent)] shadow-md' : 'bg-transparent border-transparent hover:bg-[var(--bg-main)]/50'}`}
                    onClick={() => setActiveTimerId(timer.id)}
                >
                    <div className="flex justify-between items-center mb-2">
                        <input 
                            value={timer.label}
                            onChange={(e) => updateTimerLabel(timer.id, e.target.value)}
                            className="bg-transparent text-xs font-bold text-[var(--text-main)] outline-none w-20"
                        />
                        <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); resetTimer(timer.id); }} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><RotateCcw size={12} /></button>
                            {timers.length > 1 && (
                                <button onClick={(e) => { e.stopPropagation(); deleteTimer(timer.id); }} className="text-[var(--text-muted)] hover:text-red-500"><Trash2 size={12} /></button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="font-bold text-2xl text-[var(--text-main)] tracking-tight">
                            {formatTime(timer.remaining)}
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleTimer(timer.id); }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-90 ${timer.isActive ? 'bg-orange-500' : 'bg-[var(--bg-item)] border border-[var(--border-color)]'}`}
                        >
                            {timer.isActive ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill={timer.isActive ? "currentColor" : "var(--text-main)"} className={!timer.isActive ? "text-[var(--text-main)]" : ""} />}
                        </button>
                    </div>
                    
                    {/* Duration Slider (Only visible when active or hovered could be nice, but keep simple) */}
                    {!timer.isActive && (
                        <input 
                            type="range" 
                            min="1" 
                            max="90" 
                            value={timer.duration} 
                            onChange={(e) => updateTimerDuration(timer.id, parseInt(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full mt-2 h-1 bg-[var(--bg-card)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                        />
                    )}
                </div>
            ))}
        </div>

        {/* Add Button */}
        <button 
            onClick={addTimer}
            className="m-2 p-3 rounded-2xl border border-dashed border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-item)] transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
        >
            <Plus size={14} /> Добавить таймер
        </button>

      </div>
    </div>
  );
};

export default FocusTimer;
