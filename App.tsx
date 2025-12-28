
import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, Task, Thought, Priority, ThemeKey, JournalEntry, Project, Habit, ChatMessage, ChatSession } from './types';
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
import Settings from './components/Settings';
import { themes } from './themes';
import { dbService } from './services/dbService';
import { 
  CheckCircle, 
  Zap, 
  BookOpen, 
  Loader2, 
  LayoutDashboard, 
  Mic, 
  Brain, 
  Folder, 
  Settings as SettingsIcon,
  Archive
} from 'lucide-react';

const App = () => {
  const [isDataReady, setIsDataReady] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('sb_user_name') || '');
  const [view, setView] = useState<ViewState>('dashboard');
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(() => (localStorage.getItem('sb_theme') || 'slate') as ThemeKey);
  
  const setTheme = (theme: ThemeKey) => {
    setCurrentTheme(theme);
    localStorage.setItem('sb_theme', theme);
  };
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [showProfile, setShowProfile] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [voiceTrigger, setVoiceTrigger] = useState(0);

  const hasAiKey = useMemo(() => {
    try {
      const key = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
      return !!(key && key !== 'undefined');
    } catch { return false; }
  }, []);

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
        setTasks(t); setThoughts(th); setJournal(j); setProjects(p.length > 0 ? p : [{ id: 'p1', title: 'Личное', color: '#6366f1', createdAt: new Date().toISOString() }]); setHabits(h);
        if (s.length > 0) {
          const sorted = s.sort((a, b) => b.lastInteraction - a.lastInteraction);
          setSessions(sorted); setActiveSessionId(sorted[0].id);
        } else {
          const initialSession: ChatSession = { id: 'init', title: 'Серафим', category: 'general', messages: [], lastInteraction: Date.now(), createdAt: new Date().toISOString() };
          setSessions([initialSession]); setActiveSessionId(initialSession.id);
        }
        setIsDataReady(true);
        if (userName && !localStorage.getItem('serafim_onboarded')) setShowTutorial(true);
      } catch (e) { setIsDataReady(true); }
    };
    loadData();
  }, [userName]);

  useEffect(() => { if (isDataReady) { dbService.saveAll('tasks', tasks); dbService.saveAll('thoughts', thoughts); dbService.saveAll('journal', journal); dbService.saveAll('projects', projects); dbService.saveAll('habits', habits); dbService.saveAll('chat_sessions', sessions); } }, [tasks, thoughts, journal, projects, habits, sessions, isDataReady]);

  const themeColors = useMemo(() => themes[currentTheme]?.colors || themes.slate.colors, [currentTheme]);

  if (!userName && isDataReady) return <Onboarding onComplete={(name) => { setUserName(name); localStorage.setItem('sb_user_name', name); }} />;
  if (!isDataReady) return <div className="h-full w-full flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className={`h-[100dvh] w-full overflow-hidden flex flex-col relative transition-colors duration-500`} style={themeColors as any}>
      <header className="flex-none flex items-center justify-between px-6 py-5 z-40 bg-[var(--bg-main)]/60 backdrop-blur-3xl border-b border-white/5">
        <div className="flex items-center gap-3" onClick={() => setView('dashboard')}>
          <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg"><span className="font-black text-xl text-white">S</span></div>
          <h1 className="font-extrabold text-2xl tracking-tighter opacity-90 hidden sm:block">Serafim OS</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowTimer(!showTimer)} className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/5 text-indigo-400 hover:text-white transition-all"><Zap size={20} /></button>
          <button onClick={() => setShowProfile(true)} className="w-11 h-11 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 font-bold">{userName.charAt(0).toUpperCase()}</button>
        </div>
      </header>

      <Ticker thoughts={thoughts} />

      <main className="flex-1 relative overflow-hidden z-10 page-enter">
        {view === 'dashboard' && <Dashboard tasks={tasks} thoughts={thoughts} journal={journal} projects={projects} habits={habits} onAddTask={t => setTasks([t, ...tasks])} onAddProject={p => setProjects([p, ...projects])} onAddThought={t => setThoughts([t, ...thoughts])} onNavigate={setView} onToggleTask={id => setTasks(tasks.map(t => t.id === id ? {...t, isCompleted: !t.isCompleted} : t))} />}
        {view === 'chat' && <Mentorship tasks={tasks} thoughts={thoughts} journal={journal} projects={projects} habits={habits} sessions={sessions} activeSessionId={activeSessionId} onSelectSession={setActiveSessionId} onUpdateMessages={(msgs) => setSessions(sessions.map(s => s.id === activeSessionId ? {...s, messages: msgs, lastInteraction: Date.now()} : s))} onNewSession={(title, cat) => { const ns = { id: Date.now().toString(), title, category: cat, messages: [], lastInteraction: Date.now(), createdAt: new Date().toISOString() }; setSessions([ns as any, ...sessions]); setActiveSessionId(ns.id); }} onDeleteSession={id => { setSessions(sessions.filter(s => s.id !== id)); if(activeSessionId === id) setActiveSessionId(null); }} hasAiKey={hasAiKey} onConnectAI={() => window.aistudio?.openSelectKey()} onAddTask={t => setTasks([t, ...tasks])} onAddThought={t => setThoughts([t, ...thoughts])} onAddProject={p => setProjects([p, ...projects])} onAddHabit={h => setHabits([h, ...habits])} voiceTrigger={voiceTrigger} />}
        {view === 'journal' && <JournalView journal={journal} onSave={(d, c, n, m, r, t) => { const i = journal.findIndex(j => j.date === d); if (i >= 0) { const next = [...journal]; next[i] = {...next[i], content: c, notes: n, mood: m, reflection: r, tags: t}; setJournal(next); } else { setJournal([...journal, {id: Date.now().toString(), date: d, content: c, notes: n, mood: m, reflection: r, tags: t}]); } }} />}
        {view === 'thoughts' && <ThoughtsView thoughts={thoughts} onAdd={(c, t, tags, metadata) => setThoughts([{id: Date.now().toString(), content: c, type: t, tags, createdAt: new Date().toISOString(), metadata}, ...thoughts])} onDelete={id => setThoughts(thoughts.filter(t => t.id !== id))} />}
        {view === 'planner' && <PlannerView tasks={tasks} projects={projects} habits={habits} onAddTask={t => setTasks([t, ...tasks])} onToggleTask={id => setTasks(tasks.map(t => t.id === id ? {...t, isCompleted: !t.isCompleted} : t))} onAddHabit={h => setHabits([h, ...habits])} onToggleHabit={(id, d) => setHabits(habits.map(h => h.id === id ? {...h, completedDates: h.completedDates.includes(d) ? h.completedDates.filter(cd => cd !== d) : [...h.completedDates, d]} : h))} onDeleteHabit={id => setHabits(habits.filter(h => h.id !== id))} />}
        {view === 'projects' && <ProjectsView projects={projects} tasks={tasks} thoughts={thoughts} onAddProject={p => setProjects([p, ...projects])} onDeleteProject={id => setProjects(projects.filter(p => p.id !== id))} onAddTask={t => setTasks([t, ...tasks])} onToggleTask={id => setTasks(tasks.map(t => t.id === id ? {...t, isCompleted: !t.isCompleted} : t))} onDeleteTask={id => setTasks(tasks.filter(t => t.id !== id))} />}
        {view === 'settings' && <Settings currentTheme={currentTheme} setTheme={setTheme} onClose={() => setView('dashboard')} exportData={{tasks, thoughts, journal, projects, habits}} onImport={data => {setTasks(data.tasks || tasks); setThoughts(data.thoughts || thoughts);}} />}
      </main>

      {/* FIXED 7-ICON NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center z-[100] pointer-events-none p-6">
        <nav className="pointer-events-auto flex items-center gap-1 p-1.5 glass bg-[var(--bg-item)]/80 border border-white/10 rounded-[2.5rem] shadow-2xl transition-all">
          <button onClick={() => setView('dashboard')} className={`w-10 h-10 rounded-[1.25rem] flex items-center justify-center transition-all ${view === 'dashboard' ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/40 hover:text-white'}`} title="Дашборд"><LayoutDashboard size={18} /></button>
          <button onClick={() => setView('thoughts')} className={`w-10 h-10 rounded-[1.25rem] flex items-center justify-center transition-all ${view === 'thoughts' ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/40 hover:text-white'}`} title="Мысли"><Archive size={18} /></button>
          <button onClick={() => setView('projects')} className={`w-10 h-10 rounded-[1.25rem] flex items-center justify-center transition-all ${view === 'projects' ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/40 hover:text-white'}`} title="Проекты"><Folder size={18} /></button>
          
          <button onClick={() => { setView('chat'); setVoiceTrigger(v => v + 1); }} className="mx-2 w-14 h-14 rounded-[1.75rem] bg-indigo-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform" title="Серафим"><Mic size={24} /></button>
          
          <button onClick={() => setView('planner')} className={`w-10 h-10 rounded-[1.25rem] flex items-center justify-center transition-all ${view === 'planner' ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/40 hover:text-white'}`} title="Планер"><CheckCircle size={18} /></button>
          <button onClick={() => setView('journal')} className={`w-10 h-10 rounded-[1.25rem] flex items-center justify-center transition-all ${view === 'journal' ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/40 hover:text-white'}`} title="Дневник"><BookOpen size={18} /></button>
          <button onClick={() => setView('settings')} className={`w-10 h-10 rounded-[1.25rem] flex items-center justify-center transition-all ${view === 'settings' ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/40 hover:text-white'}`} title="Настройки"><SettingsIcon size={18} /></button>
        </nav>
      </div>

      {showTimer && <FocusTimer onClose={() => setShowTimer(false)} />}
      {showProfile && <ProfileModal appState={{tasks, thoughts, journal, projects, habits, view}} userName={userName} currentTheme={currentTheme} setTheme={setTheme} onClose={() => setShowProfile(false)} onImport={d => setTasks(d.tasks || [])} hasAiKey={hasAiKey} />}
      {showTutorial && <InteractiveTour onComplete={() => { localStorage.setItem('serafim_onboarded', 'true'); setShowTutorial(false); }} />}
    </div>
  );
};

export default App;
