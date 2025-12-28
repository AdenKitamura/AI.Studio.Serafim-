
import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, Task, Thought, Priority, ThemeKey, JournalEntry, Project, Habit, ChatMessage, ChatSession } from './types';
import Mentorship from './components/Mentorship';
import PlannerView from './components/PlannerView';
import JournalView from './components/JournalView';
import ProjectsView from './components/ProjectsView';
import Ticker from './components/Ticker';
import ProfileModal from './components/ProfileModal';
import FocusTimer from './components/FocusTimer';
import ThoughtsView from './components/ThoughtsView';
import Dashboard from './components/Dashboard';
import { themes } from './themes';
import { dbService } from './services/dbService';
import { 
  MessageSquare,
  Brain,
  CheckCircle,
  Folder,
  Zap,
  BookOpen,
  Loader2,
  LayoutDashboard
} from './components/Icons';

const App = () => {
  const [isDataReady, setIsDataReady] = useState(false);
  const [userName] = useState(() => localStorage.getItem('sb_user_name') || 'Пользователь');
  const [view, setView] = useState<ViewState>('dashboard');
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(() => (localStorage.getItem('sb_theme') || 'slate') as ThemeKey);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [showProfile, setShowProfile] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [hasAiKey, setHasAiKey] = useState(false);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [swStatus, setSwStatus] = useState<'loading' | 'active' | 'error'>('loading');

  // INITIAL LOAD
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

        setTasks(t);
        setThoughts(th);
        setJournal(j);
        setProjects(p.length > 0 ? p : [{ id: 'p1', title: 'Личное', color: '#3b82f6', createdAt: new Date().toISOString() }]);
        setHabits(h);
        
        if (s.length > 0) {
          const sorted = s.sort((a, b) => b.lastInteraction - a.lastInteraction);
          setSessions(sorted);
          setActiveSessionId(sorted[0].id);
        } else {
          const initialSession: ChatSession = {
            id: 'init-session',
            title: 'Первый контакт',
            category: 'general',
            messages: [{ id: 'init', role: 'model', content: "Привет. Я Serafim. Мысли вслух — первый шаг к порядку. Что обсудим?", timestamp: Date.now() }],
            lastInteraction: Date.now(),
            createdAt: new Date().toISOString()
          };
          setSessions([initialSession]);
          setActiveSessionId(initialSession.id);
        }
        setIsDataReady(true);
      } catch (e) {
        console.error("Failed to load data from IndexedDB", e);
        setIsDataReady(true);
      }
    };

    loadData();

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setSwStatus('active');
      }).catch(() => setSwStatus('error'));
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // AUTO-SAVES
  useEffect(() => { if (isDataReady) dbService.saveAll('tasks', tasks); }, [tasks, isDataReady]);
  useEffect(() => { if (isDataReady) dbService.saveAll('thoughts', thoughts); }, [thoughts, isDataReady]);
  useEffect(() => { if (isDataReady) dbService.saveAll('journal', journal); }, [journal, isDataReady]);
  useEffect(() => { if (isDataReady) dbService.saveAll('projects', projects); }, [projects, isDataReady]);
  useEffect(() => { if (isDataReady) dbService.saveAll('habits', habits); }, [habits, isDataReady]);
  useEffect(() => { if (isDataReady) dbService.saveAll('chat_sessions', sessions); }, [sessions, isDataReady]);
  
  useEffect(() => { localStorage.setItem('sb_theme', currentTheme); }, [currentTheme]);

  useEffect(() => {
    if (window.aistudio) {
      window.aistudio.hasSelectedApiKey().then(setHasAiKey).catch(() => setHasAiKey(false));
    }
  }, []);

  const handleUpdateSessionMessages = (sessionId: string, newMessages: ChatMessage[]) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, messages: newMessages, lastInteraction: Date.now() } 
        : s
    ));
  };

  const handleCreateNewSession = (title: string, category: ChatSession['category']) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: title || 'Новый диалог',
      category: category,
      messages: [{ id: 'init-' + Date.now(), role: 'model', content: "Новая сессия начата. Готов к работе.", timestamp: Date.now() }],
      lastInteraction: Date.now(),
      createdAt: new Date().toISOString()
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (sessions.length <= 1) return;
    const nextSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(nextSessions);
    if (activeSessionId === sessionId) {
      setActiveSessionId(nextSessions[0].id);
    }
  };

  const themeColors = useMemo(() => themes[currentTheme]?.colors || themes.slate.colors, [currentTheme]);

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'chat', icon: <MessageSquare size={20} /> },
    { id: 'projects', icon: <Folder size={20} /> },
    { id: 'planner', icon: <CheckCircle size={20} /> },
    { id: 'journal', icon: <BookOpen size={20} /> },
  ];

  if (!isDataReady) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#09090b] text-white">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
        <p className="text-sm font-bold uppercase tracking-widest opacity-50">Serafim OS...</p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col relative" style={themeColors as any}>
      <style>{`
        body { 
          background: ${themeColors['--bg-main']}; 
          color: ${themeColors['--text-main']}; 
        }
      `}</style>
      
      <header className="flex-none flex items-center justify-between px-6 py-4 z-40 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="font-black text-xl tracking-tighter text-indigo-500">S.</span>
          <h1 className="font-bold text-lg opacity-90 hidden sm:block">Serafim</h1>
          {!hasAiKey && (
            <button 
              onClick={() => window.aistudio?.openSelectKey().then(() => setHasAiKey(true))}
              className="ml-2 px-3 py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-[10px] font-bold uppercase"
            >
              AI OFF
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowTimer(!showTimer)} className={`p-2 transition-all ${showTimer ? 'text-indigo-500' : 'text-[var(--text-muted)]'}`} aria-label="Timer"><Zap size={18} /></button>
          <button onClick={() => setShowProfile(true)} className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-lg border-2 border-white/10" aria-label="Profile">
            {userName.charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <Ticker thoughts={thoughts} />

      <main className="flex-1 relative overflow-hidden z-10 pb-20">
        {view === 'dashboard' && (
          <Dashboard 
            tasks={tasks} thoughts={thoughts} journal={journal} projects={projects} habits={habits}
            sessions={sessions} activeSessionId={activeSessionId} onSelectSession={setActiveSessionId}
            onUpdateMessages={(msgs) => handleUpdateSessionMessages(activeSessionId!, msgs)}
            onNewSession={handleCreateNewSession} onDeleteSession={handleDeleteSession}
            onAddTask={t => setTasks([t, ...tasks])} onAddProject={p => setProjects([p, ...projects])}
            onAddThought={t => setThoughts([t, ...thoughts])} onNavigate={setView}
          />
        )}
        {view === 'chat' && (
          <Mentorship 
            tasks={tasks} thoughts={thoughts} journal={journal} projects={projects} habits={habits} 
            sessions={sessions} activeSessionId={activeSessionId} onSelectSession={setActiveSessionId}
            onUpdateMessages={(msgs) => handleUpdateSessionMessages(activeSessionId!, msgs)}
            onNewSession={handleCreateNewSession} onDeleteSession={handleDeleteSession}
            onAddTask={t => setTasks([t, ...tasks])} onAddProject={p => setProjects([p, ...projects])} 
            onAddThought={t => setThoughts([t, ...thoughts])} 
          />
        )}
        {view === 'projects' && <ProjectsView projects={projects} tasks={tasks} thoughts={thoughts} onAddProject={p => setProjects([p, ...projects])} onDeleteProject={id => setProjects(projects.filter(p => p.id !== id))} onAddTask={t => setTasks([t, ...tasks])} onToggleTask={id => setTasks(tasks.map(t => t.id === id ? {...t, isCompleted: !t.isCompleted} : t))} onDeleteTask={id => setTasks(tasks.filter(t => t.id !== id))} />}
        {view === 'journal' && <JournalView journal={journal} onSave={(d, c, n, m) => { const i = journal.findIndex(j => j.date === d); if (i >= 0) { const next = [...journal]; next[i] = {...next[i], content: c, notes: n, mood: m}; setJournal(next); } else { setJournal([...journal, {id: Date.now().toString(), date: d, content: c, notes: n, mood: m}]); } }} />}
        {view === 'planner' && <PlannerView tasks={tasks} projects={projects} habits={habits} onAddTask={t => setTasks([t, ...tasks])} onToggleTask={id => setTasks(tasks.map(t => t.id === id ? {...t, isCompleted: !t.isCompleted} : t))} onAddHabit={h => setHabits([...habits, h])} onToggleHabit={(id, d) => setHabits(habits.map(h => h.id === id ? {...h, completedDates: h.completedDates.includes(d) ? h.completedDates.filter(cd => cd !== d) : [...h.completedDates, d]} : h))} onDeleteHabit={id => setHabits(habits.filter(h => h.id !== id))} />}
      </main>

      {/* FIXED NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center z-[100] pointer-events-none p-6 pb-8">
        <nav className="pointer-events-auto flex items-center gap-2 px-3 py-2 bg-[var(--bg-item)]/90 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl">
          {navItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => setView(item.id as ViewState)} 
              className={`transition-all duration-300 p-3 rounded-full flex items-center justify-center ${view === item.id ? 'text-indigo-400 bg-indigo-500/10 scale-110 shadow-inner shadow-indigo-500/20' : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'}`}
            >
              {item.icon}
            </button>
          ))}
        </nav>
      </div>

      {showTimer && <FocusTimer onClose={() => setShowTimer(false)} />}
      {showProfile && (
        <ProfileModal 
          appState={{tasks, thoughts, journal, projects, habits, view}} 
          userName={userName} 
          currentTheme={currentTheme} 
          setTheme={setCurrentTheme} 
          onClose={() => setShowProfile(false)} 
          onImport={d => { if(d.tasks) setTasks(d.tasks); }} 
          canInstall={!!deferredPrompt}
          onInstall={() => { if(deferredPrompt) deferredPrompt.prompt(); }}
          swStatus={swStatus}
        />
      )}
    </div>
  );
};

export default App;
