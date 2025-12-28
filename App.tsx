
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import AnalyticsView from './components/AnalyticsView';
import NotificationModal from './components/NotificationModal';
import { themes } from './themes';
import { dbService } from './services/dbService';
import { playAlarmSound } from './services/audioService';
import { 
  Zap, 
  BookOpen, 
  Loader2, 
  LayoutDashboard, 
  Mic, 
  Folder, 
  Settings as SettingsIcon,
  Archive,
  Activity,
  CheckCircle,
  Plus
} from 'lucide-react';
import { addMinutes } from 'date-fns';

const App = () => {
  const [isDataReady, setIsDataReady] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('sb_user_name') || '');
  const [view, setView] = useState<ViewState>('dashboard');
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(() => (localStorage.getItem('sb_theme') || 'slate') as ThemeKey);
  const [isCoreMenuOpen, setIsCoreMenuOpen] = useState(false);
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
  const [showTutorial, setShowTutorial] = useState(false);
  const [voiceTrigger, setVoiceTrigger] = useState(0);

  // --- NOTIFICATION ENGINE ---
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const checkDeadlines = useCallback(() => {
    const now = new Date().getTime();
    const notifiedTasks = JSON.parse(localStorage.getItem('serafim_notified_tasks') || '[]');
    
    const taskToNotify = tasks.find(t => {
      if (t.isCompleted || !t.dueDate || notifiedTasks.includes(t.id)) return false;
      const dueTime = new Date(t.dueDate).getTime();
      return now >= dueTime && now <= dueTime + 600000; // Окно 10 минут
    });

    if (taskToNotify) {
      setActiveNotification(taskToNotify);
      playAlarmSound();
      
      // Системное уведомление для фонового режима
      if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        new Notification("Serafim OS: Пора действовать", {
          body: taskToNotify.title,
          icon: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/512x512/1f9e0.png"
        });
      }

      localStorage.setItem('serafim_notified_tasks', JSON.stringify([...notifiedTasks, taskToNotify.id]));
    }
  }, [tasks]);

  useEffect(() => {
    const interval = setInterval(checkDeadlines, 30000);
    return () => clearInterval(interval);
  }, [checkDeadlines]);

  const handleCompleteTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? {...t, isCompleted: true} : t));
    setActiveNotification(null);
  };

  const handleSnoozeTask = (id: string, minutes: number) => {
    const newDate = addMinutes(new Date(), minutes).toISOString();
    setTasks(prev => prev.map(t => t.id === id ? {...t, dueDate: newDate} : t));
    
    // Удаляем из списка оповещенных, чтобы сработало снова
    const notified = JSON.parse(localStorage.getItem('serafim_notified_tasks') || '[]');
    localStorage.setItem('serafim_notified_tasks', JSON.stringify(notified.filter((tid: string) => tid !== id)));
    
    setActiveNotification(null);
  };

  // --- DATA LIFECYCLE ---
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
        setTasks(t); setThoughts(th); setJournal(j); 
        setProjects(p.length > 0 ? p : [{ id: 'p1', title: 'Личное', color: '#6366f1', createdAt: new Date().toISOString() }]); 
        setHabits(h);
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

  const setTheme = (theme: ThemeKey) => {
    setCurrentTheme(theme);
    localStorage.setItem('sb_theme', theme);
  };

  const themeColors = useMemo(() => themes[currentTheme]?.colors || themes.slate.colors, [currentTheme]);

  if (!userName && isDataReady) return <Onboarding onComplete={(name) => { setUserName(name); localStorage.setItem('sb_user_name', name); }} />;
  if (!isDataReady) return <div className="h-full w-full flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  const navigateTo = (newView: ViewState) => {
    setView(newView);
    setIsCoreMenuOpen(false);
  };

  return (
    <div className={`h-[100dvh] w-full overflow-hidden flex flex-col relative transition-colors duration-500`} style={themeColors as any}>
      
      <header className="flex-none flex items-center justify-between px-6 py-5 z-40 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('dashboard')}>
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg active:scale-90 transition-transform"><span className="font-black text-xl text-white">S</span></div>
          <h1 className="font-extrabold text-2xl tracking-tighter opacity-90 hidden sm:block">Serafim OS</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowTimer(!showTimer)} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-indigo-400 hover:text-white transition-all"><Zap size={18} /></button>
          <button onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 hover:bg-indigo-600/20" title="Система"><SettingsIcon size={18} /></button>
        </div>
      </header>

      <Ticker thoughts={thoughts} />

      <main className="flex-1 relative overflow-hidden z-10 page-enter">
        {view === 'dashboard' && <Dashboard tasks={tasks} thoughts={thoughts} journal={journal} projects={projects} habits={habits} onAddTask={t => setTasks([t, ...tasks])} onAddProject={p => setProjects([p, ...projects])} onAddThought={t => setThoughts([t, ...thoughts])} onNavigate={navigateTo} onToggleTask={id => setTasks(tasks.map(t => t.id === id ? {...t, isCompleted: !t.isCompleted} : t))} />}
        {view === 'chat' && <Mentorship tasks={tasks} thoughts={thoughts} journal={journal} projects={projects} habits={habits} sessions={sessions} activeSessionId={activeSessionId} onSelectSession={setActiveSessionId} onUpdateMessages={(msgs) => setSessions(sessions.map(s => s.id === activeSessionId ? {...s, messages: msgs, lastInteraction: Date.now()} : s))} onNewSession={(title, cat) => { const ns = { id: Date.now().toString(), title, category: cat, messages: [], lastInteraction: Date.now(), createdAt: new Date().toISOString() }; setSessions([ns as any, ...sessions]); setActiveSessionId(ns.id); }} onDeleteSession={id => { setSessions(sessions.filter(s => s.id !== id)); if(activeSessionId === id) setActiveSessionId(null); }} hasAiKey={hasAiKey} onConnectAI={() => window.aistudio?.openSelectKey()} onAddTask={t => setTasks([t, ...tasks])} onAddThought={t => setThoughts([t, ...thoughts])} onAddProject={p => setProjects([p, ...projects])} onAddHabit={h => setHabits([h, ...habits])} voiceTrigger={voiceTrigger} />}
        {view === 'journal' && <JournalView journal={journal} onSave={(d, c, n, m, r, t) => { const i = journal.findIndex(j => j.date === d); if (i >= 0) { const next = [...journal]; next[i] = {...next[i], content: c, notes: n, mood: m, reflection: r, tags: t}; setJournal(next); } else { setJournal([...journal, {id: Date.now().toString(), date: d, content: c, notes: n, mood: m, reflection: r, tags: t}]); } }} />}
        {view === 'thoughts' && <ThoughtsView thoughts={thoughts} onAdd={(c, t, tags, metadata) => setThoughts([{id: Date.now().toString(), content: c, type: t, tags, createdAt: new Date().toISOString(), metadata}, ...thoughts])} onDelete={id => setThoughts(thoughts.filter(t => t.id !== id))} />}
        {view === 'planner' && <PlannerView tasks={tasks} projects={projects} habits={habits} onAddTask={t => setTasks([t, ...tasks])} onToggleTask={id => setTasks(tasks.map(t => t.id === id ? {...t, isCompleted: !t.isCompleted} : t))} onAddHabit={h => setHabits([h, ...habits])} onToggleHabit={(id, d) => setHabits(habits.map(h => h.id === id ? {...h, completedDates: h.completedDates.includes(d) ? h.completedDates.filter(cd => cd !== d) : [...h.completedDates, d]} : h))} onDeleteHabit={id => setHabits(habits.filter(h => h.id !== id))} />}
        {view === 'projects' && <ProjectsView projects={projects} tasks={tasks} thoughts={thoughts} onAddProject={p => setProjects([p, ...projects])} onDeleteProject={id => setProjects(projects.filter(p => p.id !== id))} onAddTask={t => setTasks([t, ...tasks])} onToggleTask={id => setTasks(tasks.map(t => t.id === id ? {...t, isCompleted: !t.isCompleted} : t))} onDeleteTask={id => setTasks(tasks.filter(t => t.id !== id))} />}
        {view === 'analytics' && <AnalyticsView tasks={tasks} habits={habits} journal={journal} currentTheme={currentTheme} onClose={() => navigateTo('dashboard')} />}
      </main>

      <div className="fixed bottom-0 left-0 w-full flex flex-col items-center z-[100] p-6 pointer-events-none">
        {isCoreMenuOpen && (
          <div className="pointer-events-auto flex items-center gap-3 p-2 glass rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 mb-6">
            <button onClick={() => navigateTo('dashboard')} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white'}`}><LayoutDashboard size={20}/></button>
            <button onClick={() => navigateTo('thoughts')} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${view === 'thoughts' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white'}`}><Archive size={20}/></button>
            <button onClick={() => navigateTo('projects')} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${view === 'projects' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white'}`}><Folder size={20}/></button>
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <button onClick={() => navigateTo('planner')} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${view === 'planner' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white'}`}><CheckCircle size={20}/></button>
            <button onClick={() => navigateTo('journal')} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${view === 'journal' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white'}`}><BookOpen size={20}/></button>
            <button onClick={() => navigateTo('analytics')} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${view === 'analytics' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white'}`}><Activity size={20}/></button>
          </div>
        )}

        <div className="pointer-events-auto flex items-center gap-4">
          <button 
            onClick={() => { setView('chat'); setVoiceTrigger(v => v + 1); setIsCoreMenuOpen(false); }}
            className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-indigo-400 flex items-center justify-center shadow-xl active:scale-90 transition-all"
          >
            <Mic size={24} />
          </button>
          
          <button 
            onClick={() => setIsCoreMenuOpen(!isCoreMenuOpen)}
            className={`w-20 h-20 rounded-[2rem] glass shadow-2xl flex items-center justify-center transition-all active:scale-95 animate-pulse-soft border-2 ${isCoreMenuOpen ? 'border-indigo-500 shadow-indigo-500/20' : 'border-white/10'}`}
          >
            <div className={`w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg transition-transform ${isCoreMenuOpen ? 'rotate-45' : ''}`}>
              <Plus size={28} strokeWidth={3} className="text-white" />
            </div>
          </button>

          <button 
            onClick={() => navigateTo('dashboard')}
            className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-white/40 flex items-center justify-center shadow-xl active:scale-90 transition-all"
          >
            <LayoutDashboard size={24} />
          </button>
        </div>
      </div>

      {activeNotification && (
        <NotificationModal 
          task={activeNotification} 
          onClose={() => setActiveNotification(null)}
          onComplete={() => handleCompleteTask(activeNotification.id)}
          onSnooze={(mins) => handleSnoozeTask(activeNotification.id, mins)}
          onReschedule={() => {
            setActiveNotification(null);
            setView('planner');
          }}
        />
      )}

      {showTimer && <FocusTimer onClose={() => setShowTimer(false)} />}
      
      {showSettings && (
        <ProfileModal 
          appState={{tasks, thoughts, journal, projects, habits, view}} 
          userName={userName} 
          currentTheme={currentTheme} 
          setTheme={setTheme} 
          onClose={() => setShowSettings(false)} 
          onImport={d => {setTasks(d.tasks || []); setThoughts(d.thoughts || []);}} 
          hasAiKey={hasAiKey} 
        />
      )}

      {showTutorial && <InteractiveTour onComplete={() => { localStorage.setItem('serafim_onboarded', 'true'); setShowTutorial(false); }} />}
    </div>
  );
};

export default App;
