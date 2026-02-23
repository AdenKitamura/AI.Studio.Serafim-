
import React, { useState } from 'react';
import { Task, Habit, JournalEntry, ThemeKey, ViewState } from '../types';
import { themes } from '../themes';
import { PieChart, Activity, Zap, Brain, CheckCircle, Sparkles, RefreshCw, Target, LayoutDashboard } from 'lucide-react';
import { format, eachDayOfInterval, addDays } from 'date-fns';
import { getSystemAnalysis } from '../services/geminiService';
import NavigationPill from './NavigationPill';

interface AnalyticsViewProps {
  tasks: Task[];
  habits: Habit[];
  journal: JournalEntry[];
  currentTheme: ThemeKey;
  onNavigate: (view: ViewState) => void;
  onClose?: () => void; // Kept for compatibility but unused
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ tasks, habits, journal, currentTheme, onNavigate }) => {
  const themeColors = themes[currentTheme].colors;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<{status: string, insight: string, focusArea: string} | null>(null);

  const runAiAnalysis = async () => {
      setIsAnalyzing(true);
      try { const result = await getSystemAnalysis(tasks, habits, journal); setAiInsight(result); } catch (e) { console.error(e); } finally { setIsAnalyzing(false); }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const last30Days = Array.from({ length: 30 }, (_, i) => format(addDays(new Date(), -i), 'yyyy-MM-dd')).reverse();
  const habitStats = habits.map(habit => ({ ...habit, rate: Math.round((last30Days.filter(date => habit.completedDates.includes(date)).length / 30) * 100) }));
  const moodMap: Record<string, number> = { '😔': 1, '😐': 2, '🙂': 3, '😃': 4, '🤩': 5 };
  const last7Days = eachDayOfInterval({ start: addDays(new Date(), -6), end: new Date() });
  const moodData = last7Days.map(day => { const entry = journal.find(j => j.date === format(day, 'yyyy-MM-dd')); return entry && entry.mood ? moodMap[entry.mood] || 0 : 0; });

  const renderMoodChart = () => {
      const width = 100; const height = 40; const maxVal = 5;
      const points = moodData.map((val, idx) => { if (val === 0) return null; const x = (idx / (moodData.length - 1)) * width; const y = height - (val / maxVal) * height; return `${x},${y}`; }).filter(Boolean).join(' ');
      return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" /><line x1="0" y1="20" x2="100" y2="20" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" /><line x1="0" y1="40" x2="100" y2="40" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
              <polyline fill="none" stroke={themeColors['--accent']} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
              {moodData.map((val, idx) => { if(val === 0) return null; const x = (idx / (moodData.length - 1)) * width; const y = height - (val / maxVal) * height; return <circle key={idx} cx={x} cy={y} r="2" fill={themeColors['--bg-main']} stroke={themeColors['--accent']} strokeWidth="1.5" /> })}
          </svg>
      );
  };

  const openMenu = () => {
      const menuBtn = document.getElementById('sidebar-trigger');
      if(menuBtn) menuBtn.click();
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] animate-in fade-in duration-300 overflow-y-auto no-scrollbar pb-32">
      <div className="sticky top-0 z-40 bg-[var(--bg-main)]/95 backdrop-blur-xl border-b border-[var(--border-color)] px-6 py-4 transition-all duration-200 mt-2">
        <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tighter uppercase leading-none">Сводка</h2>
        <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mt-1 pl-1">Анализ продуктивности</p>
      </div>
      <div className="p-6 space-y-6">
          <div className="relative group p-[1px] rounded-3xl overflow-hidden bg-gradient-to-br from-[var(--accent)] to-purple-600 shadow-xl"><div className="glass-panel rounded-[23px] p-5 relative z-10 h-full"><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><div className="p-2 bg-[var(--accent)]/10 rounded-lg text-[var(--accent)]"><Sparkles size={20} className={isAnalyzing ? 'animate-pulse' : ''} /></div><span className="text-xs font-bold uppercase tracking-widest text-[var(--text-main)]">Интеллект Серафима</span></div><button onClick={runAiAnalysis} disabled={isAnalyzing} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors disabled:opacity-50"><RefreshCw size={18} className={isAnalyzing ? 'animate-spin' : ''} /></button></div>{!aiInsight && !isAnalyzing ? (<div className="py-4 text-center"><p className="text-sm text-[var(--text-muted)] mb-4">Нажмите на иконку обновления, чтобы Серафим проанализировал ваши данные.</p><button onClick={runAiAnalysis} className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-xs font-bold shadow-lg shadow-[var(--accent)]/20 active:scale-95 transition-all">Запустить анализ</button></div>) : isAnalyzing ? (<div className="py-8 flex flex-col items-center gap-3"><div className="flex gap-1"><div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce"></div></div><p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Синхронизация нейронов...</p></div>) : (<div className="animate-in fade-in slide-in-from-bottom-2"><div className="inline-block px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-bold uppercase mb-2">{aiInsight?.status}</div><p className="text-sm text-[var(--text-main)] leading-relaxed mb-4 italic">"{aiInsight?.insight}"</p><div className="flex items-center gap-2 p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)]"><Target size={16} className="text-orange-500" /><div className="flex-1"><p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Фокус завтра</p><p className="text-xs text-[var(--text-main)] font-medium">{aiInsight?.focusArea}</p></div></div></div>)}</div></div>
          <div className="glass-panel rounded-2xl p-5 relative overflow-hidden"><div className="flex justify-between items-start mb-4 relative z-10"><div className="flex items-center gap-2 text-[var(--accent)]"><Activity size={20} /><span className="text-xs font-bold uppercase tracking-wider">Продуктивность</span></div><span className="text-3xl font-bold text-[var(--text-main)]">{completionRate}%</span></div><div className="flex items-center gap-6 relative z-10"><div className="w-24 h-24 rounded-full border-8 border-[var(--bg-card)] flex items-center justify-center relative"><svg className="w-full h-full -rotate-90 absolute top-0 left-0" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke={themeColors['--accent']} strokeWidth="8" strokeDasharray={`${completionRate * 2.89} 289`} strokeLinecap="round" /></svg><CheckCircle size={32} className="text-[var(--text-muted)] opacity-50" /></div><div className="space-y-2"><div className="flex flex-col"><span className="text-sm font-bold text-[var(--text-main)]">{completedTasks}</span><span className="text-xs text-[var(--text-muted)]">Задач завершено</span></div><div className="flex flex-col"><span className="text-sm font-bold text-[var(--text-main)]">{totalTasks - completedTasks}</span><span className="text-xs text-[var(--text-muted)]">В процессе</span></div></div></div><div className="absolute -right-5 -bottom-5 text-[var(--bg-card)] opacity-50"><PieChart size={120} /></div></div>
          <div className="glass-panel rounded-2xl p-5"><div className="flex items-center justify-between mb-6"><div className="flex items-center gap-2 text-pink-500"><Brain size={20} /><span className="text-xs font-bold uppercase tracking-wider">Настроение (7 дней)</span></div></div><div className="h-24 w-full px-2">{renderMoodChart()}</div><div className="flex justify-between mt-2 text-[10px] text-[var(--text-muted)] font-mono uppercase">{last7Days.map((d, i) => <span key={i}>{format(d, 'dd')}</span>)}</div></div>
          <div className="glass-panel rounded-2xl p-5"><div className="flex items-center gap-2 text-yellow-500 mb-5"><Zap size={20} /><span className="text-xs font-bold uppercase tracking-wider">Дисциплина (30 дней)</span></div><div className="space-y-4">{habitStats.length === 0 ? <p className="text-center text-sm text-[var(--text-muted)] py-4">Нет активных привычек</p> : habitStats.map(habit => (<div key={habit.id}><div className="flex justify-between text-xs font-bold text-[var(--text-main)] mb-1"><span>{habit.title}</span><span>{habit.rate}%</span></div><div className="w-full h-2 bg-[var(--bg-card)] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${habit.rate}%`, backgroundColor: habit.color }}></div></div></div>))}</div></div>
      </div>

      <NavigationPill 
        currentView="analytics"
        onNavigate={onNavigate}
        onOpenMenu={openMenu}
        toolL={{ icon: <LayoutDashboard size={22} />, onClick: () => onNavigate('dashboard') }}
        toolR={{ icon: <RefreshCw size={22} />, onClick: runAiAnalysis, active: isAnalyzing }}
      />
    </div>
  );
};

export default AnalyticsView;
