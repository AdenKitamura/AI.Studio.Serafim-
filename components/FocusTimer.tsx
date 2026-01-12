import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Maximize2, Minimize2, Plus, Trash2, Smartphone } from 'lucide-react';

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

const FocusTimer: React.FC<FocusTimerProps> = ({ onClose }) => {
  const [timers, setTimers] = useState<TimerInstance[]>([
    { id: '1', label: 'Фокус', duration: 25, remaining: 25 * 60, isActive: false }
  ]);
  const [activeTimerId, setActiveTimerId] = useState<string>('1');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const activeTimer = timers.find(t => t.id === activeTimerId) || timers[0];

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
      setTimers([...timers, { id: newId, label: 'Новый', duration: 25, remaining: 25 * 60, isActive: false }]);
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

  // --- FULL SCREEN RENDER (ZEN MODE) ---
  if (isFullscreen) {
      const progress = ((activeTimer.duration * 60 - activeTimer.remaining) / (activeTimer.duration * 60)) * 100;
      return (
          <div className={`fixed inset-0 z-[200] bg-[#09090b]/95 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-500 transition-transform ${isLandscape ? 'rotate-90' : ''}`}>
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
                  <div className="flex gap-4">
                      <button onClick={() => setIsLandscape(!isLandscape)} className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all">
                          <Smartphone size={24} className={isLandscape ? 'rotate-90' : ''} />
                      </button>
                      <button onClick={() => setIsFullscreen(false)} className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all">
                          <Minimize2 size={24} />
                      </button>
                  </div>
              </div>

              {/* Main Timer Display */}
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

  // --- DEFAULT LIST RENDER (FULL SCREEN MODAL STYLE) ---
  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg-main)]/80 backdrop-blur-xl flex flex-col animate-in slide-in-from-bottom-10 duration-300">
      
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-main)]/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                 <Smartphone size={20} />
              </div>
              <div>
                 <h2 className="text-lg font-bold text-[var(--text-main)]">Фокус-Таймеры</h2>
                 <p className="text-xs text-[var(--text-muted)]">Управление временем</p>
              </div>
          </div>
          <button onClick={onClose} className="p-2 bg-[var(--bg-item)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] glass-btn">
              <X size={24} />
          </button>
      </div>

      {/* Timer List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3 pb-24">
          {timers.map(timer => (
              <div 
                  key={timer.id}
                  className={`glass-panel p-5 rounded-2xl border transition-all ${timer.id === activeTimerId ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-md' : 'border-[var(--border-color)] hover:border-[var(--text-muted)]'}`}
                  onClick={() => setActiveTimerId(timer.id)}
              >
                  <div className="flex justify-between items-center mb-4">
                      <input 
                          value={timer.label}
                          onChange={(e) => updateTimerLabel(timer.id, e.target.value)}
                          className="bg-transparent text-sm font-bold text-[var(--text-main)] outline-none w-32 focus:border-b border-[var(--accent)]"
                      />
                      <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"><Maximize2 size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); resetTimer(timer.id); }} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"><RotateCcw size={16} /></button>
                          {timers.length > 1 && (
                              <button onClick={(e) => { e.stopPropagation(); deleteTimer(timer.id); }} className="p-2 text-[var(--text-muted)] hover:text-red-500"><Trash2 size={16} /></button>
                          )}
                      </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                      <div className="font-bold text-4xl text-[var(--text-main)] tracking-tight tabular-nums">
                          {formatTime(timer.remaining)}
                      </div>
                      <button 
                          onClick={(e) => { e.stopPropagation(); toggleTimer(timer.id); }}
                          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-90 ${timer.isActive ? 'bg-orange-500' : 'bg-[var(--accent)]'}`}
                      >
                          {timer.isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                      </button>
                  </div>
                  
                  {!timer.isActive && (
                      <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                          <div className="flex justify-between text-xs text-[var(--text-muted)] mb-2">
                              <span>Длительность</span>
                              <span>{timer.duration} мин</span>
                          </div>
                          <input 
                              type="range" 
                              min="1" 
                              max="90" 
                              value={timer.duration} 
                              onChange={(e) => updateTimerDuration(timer.id, parseInt(e.target.value))}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full h-1 bg-[var(--bg-card)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                          />
                      </div>
                  )}
              </div>
          ))}
      </div>

      {/* Add Button */}
      <div className="fixed bottom-6 left-0 w-full px-6 flex justify-center pointer-events-none">
           <button 
              onClick={addTimer}
              className="pointer-events-auto px-6 py-4 rounded-full bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest glass-btn"
          >
              <Plus size={16} /> Новый таймер
          </button>
      </div>

    </div>
  );
};

export default FocusTimer;