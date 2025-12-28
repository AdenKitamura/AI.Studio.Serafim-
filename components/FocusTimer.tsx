
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Zap } from 'lucide-react';

interface FocusTimerProps {
  onClose: () => void;
}

const FocusTimer: React.FC<FocusTimerProps> = ({ onClose }) => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          // Timer finished
          handleSwitchMode();
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, minutes, seconds]);

  const handleSwitchMode = () => {
    const nextModeIsBreak = !isBreak;
    setIsBreak(nextModeIsBreak);
    setMinutes(nextModeIsBreak ? 5 : 25);
    setSeconds(0);
    setIsActive(false);
    
    // Notification/Sound
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);
      osc.start();
      osc.stop(ctx.currentTime + 1);
    } catch (e) {}
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setMinutes(25);
    setSeconds(0);
  };

  const progress = ((isBreak ? 5 : 25) * 60 - (minutes * 60 + seconds)) / ((isBreak ? 5 : 25) * 60) * 100;

  return (
    <div className="fixed bottom-32 right-6 z-[60] animate-in zoom-in slide-in-from-bottom-10 duration-300">
      <div className="bg-[var(--bg-item)]/90 backdrop-blur-2xl border border-[var(--border-color)] p-4 rounded-3xl shadow-2xl w-48 flex flex-col items-center">
        <div className="flex justify-between w-full mb-2">
            <div className="flex items-center gap-1">
                <Zap size={12} className={isBreak ? "text-emerald-500" : "text-[var(--accent)]"} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {isBreak ? 'Отдых' : 'Фокус'}
                </span>
            </div>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-red-500 transition-colors">
                <X size={14} />
            </button>
        </div>

        <div className="relative w-28 h-28 flex items-center justify-center mb-4">
             <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="var(--border-color)" 
                    strokeWidth="4" 
                    opacity="0.3"
                />
                <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke={isBreak ? "#10b981" : "var(--accent)"} 
                    strokeWidth="5" 
                    strokeDasharray="282.7" 
                    strokeDashoffset={282.7 - (282.7 * progress / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                />
             </svg>
             <div className="text-2xl font-mono font-bold text-[var(--text-main)]">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
             </div>
        </div>

        <div className="flex gap-4">
            <button 
                onClick={resetTimer}
                className="p-2 bg-[var(--bg-main)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)] transition-all"
            >
                <RotateCcw size={18} />
            </button>
            <button 
                onClick={toggleTimer}
                className={`p-3 rounded-full text-white shadow-lg transition-all transform active:scale-90 ${isActive ? 'bg-orange-500' : 'bg-[var(--accent)]'}`}
            >
                {isActive ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default FocusTimer;
