
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ViewState, Task, Thought, Priority, ThemeKey, JournalEntry, Project, Habit, ChatMessage, ChatSession, ChatCategory } from './types';
import Mentorship from './components/Mentorship';
import PlannerView from './components/PlannerView';
import JournalView from './components/JournalView';
import ProjectsView from './components/ProjectsView';
import ThoughtsView from './components/ThoughtsView';
import Ticker from './components/Ticker';
import ProfileModal from './components/ProfileModal';
import FocusTimer from './components/FocusTimer';
import Dashboard from './components/Dashboard';
import InteractiveTour from './components/InteractiveTour';
import Onboarding from './components/Onboarding';
import AnalyticsView from './components/AnalyticsView';
import NotificationModal from './components/NotificationModal';
import { themes } from './themes';
import { dbService } from './services/dbService';
import { playAlarmSound } from './services/audioService';
import { 
  Zap, BookOpen, Loader2, LayoutDashboard, Mic, Folder, 
  Settings as SettingsIcon, Archive, Activity, CheckCircle
} from 'lucide-react';
import { addMinutes } from 'date-fns';

const App = () => {
  const [isDataReady, setIsDataReady] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('sb_user_name') || '');
  const [view, setView] = useState<ViewState>('dashboard');
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(() => (localStorage.getItem('sb_theme') || 'slate') as ThemeKey);
  const [activeNotification, setActiveNotification] = useState<Task | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState(25);
  const [showTutorial, setShowTutorial] = useState(false);
  const [voiceTrigger, setVoiceTrigger] = useState(0);

  const isViewActive = view !== 'dashboard';
  const isChatActive = view === 'chat';

  // --- DATA LOADING ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const [t, th, j, p, h, s] = await Promise.all([
          dbService.getAll<Task>('tasks'),
          dbService.getAll<Thought>('thoughts'),
          dbService.getAll<JournalEntry>('journal'),
          dbService.getAll<Project>('projects'),
          dbService.getAll<Habit>('habits'),
          dbService.getAll<ChatSession>('chat_sessions')
        ]);
        setTasks(t); setThoughts(th); setJournal(j); setHabits(h);
        setProjects(p.length > 0 ? p : [{ id: 'p1', title: 'Личное', color: '#6366f1', createdAt: new Date().toISOString() }]); 
        
        if (s.length > 0) {
          const sorted = s.sort((a, b) => b.lastInteraction - a.lastInteraction);
          setSessions(sorted); setActiveSessionId(sorted[0].id);
        } else {
          const initS: ChatSession = { id: 'init', title: 'Серафим', category: 'general', messages: [], lastInteraction: Date.now(), createdAt: new Date().toISOString() };
          setSessions([initS]); setActiveSessionId(initS.id);
        }
        setIsDataReady(true);
      } catch (e) { setIsDataReady(true); }
    };
    loadData();
  }, []);

  useEffect(() => { 
    if (isDataReady) { 
      dbService.saveAll('tasks', tasks); 
      dbService.saveAll('thoughts', thoughts); 
      dbService.saveAll('journal', journal); 
      dbService.saveAll('projects', projects); 
      dbService.saveAll('habits', habits); 
      dbService.saveAll('chat_sessions', sessions); 
    } 
  }, [tasks, thoughts, journal, projects, habits, sessions, isDataReady]);

  // --- ACTIONS ---
  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleStartFocus = (mins: number) => {
    setTimerDuration(mins);
    setShowTimer(true);
  };

  const navigateTo = (newView: ViewState) => setView(newView);
  const setTheme = (theme: ThemeKey) => { setCurrentTheme(theme); localStorage.setItem('sb_theme', theme); };

  const themeColors = useMemo(() => themes[currentTheme]?.colors || themes.slate.colors, [currentTheme]);
  const hasAiKey = useMemo(() => !!process.env.API_KEY, []);

  if (!userName && isDataReady) return <Onboarding onComplete={(name) => { setUserName(name); localStorage.setItem('sb_user_name', name); }} />;
  if (!isDataReady) return <div className="h-full w-full flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className={`h-[100dvh] w-full overflow-hidden flex flex-col relative transition-all duration-700`} style={themeColors as any}>
      
      <header className="flex-none flex items-center justify-between px-6 py-6 z-40 bg-black/40 backdrop-blur-3xl border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigateTo('dashboard')}>
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center shadow-[0_4px_20px_var(--accent-glow)] group-active:scale-90 transition-all"><span className="font-black text-2xl text-white">S</span></div>
          <h1 className="font-extrabold text-2xl tracking-tighter opacity-90 hidden sm:block text-[var(--text-main)]">Serafim OS</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowTimer(!showTimer)} className="w-11 h-11 rounded-2xl flex items-center justify-center bg-[var(--bg-item)] text-[var(--accent)] hover:text-white transition-all border border-[var(--border-color)] shadow-lg shadow-[var(--accent-glow)]/10"><Zap size={20} /></button>
          <button onClick={() => setShowSettings(true)} className="w-11 h-11 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-all shadow-xl"><SettingsIcon size={20} /></button>
        </div>
      </header>

      <Ticker thoughts={thoughts} />

      <main className="flex-1 relative overflow-hidden z-10 page-enter">
        {view === 'dashboard' && <Dashboard tasks={tasks} thoughts={thoughts} journal={journal} projects={projects} habits={habits} onAddTask={t => setTasks([t, ...tasks])} onAddProject={p => setProjects([p, ...projects])} onAddThought={t => setThoughts([t, ...thoughts])} onNavigate={navigateTo} onToggleTask={id => handleUpdateTask(id, { isCompleted: !tasks.find(t=>t.id===id)?.isCompleted })} />}
        {view === 'chat' && (
          <Mentorship 
            tasks={tasks} thoughts={thoughts} journal={journal} projects={projects} habits={habits}
            sessions={sessions} activeSessionId={activeSessionId} onSelectSession={setActiveSessionId}
            onUpdateMessages={(msgs) => setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: msgs, lastInteraction: Date.now() } : s))}
            onNewSession={(title, cat) => { const ns = { id: Date.now().toString(), title, category: cat, messages: [], lastInteraction: Date.now(), createdAt: new Date().toISOString() }; setSessions(prev => [ns, ...prev]); setActiveSessionId(ns.id); }}
            onDeleteSession={id => { setSessions(prev => prev.filter(s => s.id !== id)); if(activeSessionId === id) setActiveSessionId(null); }}
            onAddTask={t => setTasks(prev => [t, ...prev])}
            onUpdateTask={handleUpdateTask}
            onAddThought={t => setThoughts(prev => [t, ...prev])}
            onAddProject={p => setProjects(prev => [p, ...prev])}
            onAddHabit={h => setHabits(prev => [h, ...prev])}
            onSetTheme={setTheme}
            onStartFocus={handleStartFocus}
            hasAiKey={hasAiKey}
            onConnectAI={() => window.aistudio?.openSelectKey()}
            voiceTrigger={voiceTrigger}
          />
        )}
        {view === 'journal' && <JournalView journal={journal} onSave={(d, c, n, m, r, t) => { const i = journal.findIndex(j => j.date === d); if (i >= 0) { const next = [...journal]; next[i] = {...next[i], content: c, notes: n, mood: m, reflection: r, tags: t}; setJournal(next); } else { setJournal([...journal, {id: Date.now().toString(), date: d, content: c, notes: n, mood: m, reflection: r, tags: t}]); } }} />}
        {view === 'thoughts' && <ThoughtsView thoughts={thoughts} onAdd={(c, t, tags, metadata) => setThoughts([{id: Date.now().toString(), content: c, type: t, tags, createdAt: new Date().toISOString(), metadata}, ...thoughts])} onDelete={id => setThoughts(thoughts.filter(t => t.id !== id))} />}
        {view === 'planner' && <PlannerView tasks={tasks} projects={projects} habits={habits} onAddTask={t => setTasks([t, ...tasks])} onToggleTask={id => handleUpdateTask(id, { isCompleted: !tasks.find(t=>t.id===id)?.isCompleted })} />}
        {view === 'projects' && <ProjectsView projects={projects} tasks={tasks} thoughts={thoughts} onAddProject={p => setProjects([p, ...projects])} onDeleteProject={id => setProjects(projects.filter(p => p.id !== id))} onAddTask={t => setTasks([t, ...tasks])} onToggleTask={id => handleUpdateTask(id, { isCompleted: !tasks.find(t=>t.id===id)?.isCompleted })} onDeleteTask={id => setTasks(tasks.filter(t => t.id !== id))} />}
        {view === 'analytics' && <AnalyticsView tasks={tasks} habits={habits} journal={journal} currentTheme={currentTheme} onClose={() => navigateTo('dashboard')} />}
      </main>

      {/* Dynamic Floating Navbar */}
      <div 
        className={`fixed left-0 w-full flex flex-col items-center z-[100] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none`}
        style={{ 
          bottom: isChatActive ? '135px' : '40px',
        }}
      >
        <div className={`pointer-events-auto flex items-center gap-1.5 p-2 glass rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] transition-all duration-500 border border-[var(--border-color)] group/nav ${isViewActive ? 'opacity-40 hover:opacity-100 scale-95' : 'opacity-100 scale-100 shadow-[0_0_30px_var(--accent-glow)]'}`}>
          <button onClick={() => navigateTo('dashboard')} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${view === 'dashboard' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><LayoutDashboard size={20}/></button>
          <button onClick={() => navigateTo('thoughts')} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${view === 'thoughts' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Archive size={20}/></button>
          <button onClick={() => navigateTo('projects')} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${view === 'projects' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Folder size={20}/></button>
          <div className="w-px h-6 bg-[var(--border-color)] mx-1"></div>
          <button onClick={() => navigateTo('planner')} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${view === 'planner' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><CheckCircle size={20}/></button>
          <button onClick={() => navigateTo('journal')} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${view === 'journal' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><BookOpen size={20}/></button>
          <button onClick={() => navigateTo('analytics')} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${view === 'analytics' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Activity size={20}/></button>
          <div className="w-px h-6 bg-[var(--border-color)] mx-1"></div>
          <button 
            onClick={() => { setView('chat'); setVoiceTrigger(v => v + 1); }}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${view === 'chat' ? 'bg-[var(--accent)] text-white shadow-lg' : 'text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white'}`}
          >
            <Mic size={20} />
          </button>
        </div>
      </div>

      {showTimer && <FocusTimer onClose={() => setShowTimer(false)} />}
      {showSettings && <ProfileModal appState={{tasks, thoughts, journal, projects, habits, view}} userName={userName} currentTheme={currentTheme} setTheme={setTheme} onClose={() => setShowSettings(false)} onImport={d => {setTasks(d.tasks || []); setThoughts(d.thoughts || []);}} hasAiKey={hasAiKey} />}
      
      <style>{`
        :root { background-color: var(--bg-main); color: var(--text-main); }
        .glass { background: var(--bg-item); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
