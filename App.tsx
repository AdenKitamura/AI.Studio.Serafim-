
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ViewState, Task, Thought, Priority, ThemeKey, JournalEntry, Project, Habit, ChatMessage, ChatSession } from './types';
import Mentorship from './components/Mentorship';
import PlannerView from './components/PlannerView';
import JournalView from './components/JournalView';
import ProjectsView from './components/ProjectsView';
import Ticker from './components/Ticker';
import ProfileModal from './components/ProfileModal';
import FocusTimer from './components/FocusTimer';
import Dashboard from './components/Dashboard';
import InteractiveTour from './components/InteractiveTour';
import { themes } from './themes';
import { dbService } from './services/dbService';
import { 
  MessageSquare,
  CheckCircle,
  Folder,
  Zap,
  BookOpen,
  Loader2,
  LayoutDashboard,
  AlertCircle,
  Mic
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
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Signal for Mentorship component to start recording immediately
  const [voiceTrigger, setVoiceTrigger] = useState(0);

  const [hasAiKey, setHasAiKey] = useState(() => {
    const envKey = process.env.API_KEY;
    return !!(envKey && envKey !== 'undefined');
  });
  
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
        setProjects(p.length > 0 ? p : [{ id: 'p1', title: 'Личное', color: '#6366f1', createdAt: new Date().toISOString() }]);
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

        const onboarded = localStorage.getItem('serafim_onboarded');
        if (!onboarded) {
          setShowTutorial(true);
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
      navigator.serviceWorker.ready.then(() => {
        setSwStatus('active');
      }).catch(() => setSwStatus('error'));
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) setHasAiKey(true);
      } else {
        const envKey = process.env.API_KEY;
        if (envKey && envKey !== 'undefined') setHasAiKey(true);
      }
    };
    checkKey();
    if (window.aistudio) {
      const interval = setInterval(checkKey, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleConnectAI = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasAiKey(true);
      } catch (err) {
        console.error("Failed to open key selector", err);
      }
    } else {
      alert("Для работы ИИ необходимо установить переменную API_KEY в настройках вашего проекта.");
    }
  };

  useEffect(() => { if (isDataReady) dbService.saveAll('tasks', tasks); }, [tasks, isDataReady]);
  useEffect(() => { if (isDataReady) dbService.saveAll('thoughts', thoughts); }, [thoughts, isDataReady]);
  useEffect(() => { if (isDataReady) dbService.saveAll('journal', journal); }, [journal, isDataReady]);
  useEffect(() => { if (isDataReady) dbService.saveAll('projects', projects); }, [projects, isDataReady]);
  useEffect(() => { if (isDataReady) dbService.saveAll('habits', habits); }, [habits, isDataReady]);
  useEffect(() => { if (isDataReady) dbService.saveAll('chat_sessions', sessions); }, [sessions, isDataReady]);
  
  useEffect(() => { localStorage.setItem('sb_theme', currentTheme); }, [currentTheme]);

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
  const isLightTheme = useMemo(() => themes[currentTheme]?.type === 'light', [currentTheme]);

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  const handleMicClick = () => {
    setView('chat');
    setVoiceTrigger(prev => prev + 1);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  if (!isDataReady) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#000000] text-white">
        <Loader2 className="animate-spin text-indigo-500 mb-6" size={48} />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">System Core Warming Up...</p>
      </div>
    );
  }

  return (
    <div 
      className={`h-[100dvh] w-full overflow-hidden flex flex-col relative transition-colors duration-500 ${isLightTheme ? 'light-theme' : ''}`} 
      style={themeColors as any}
    >
      <style>{`
        body { 
          background: ${themeColors['--bg-main']}; 
          color: ${themeColors['--text-main']}; 
        }
      `}</style>
      
      <header className="flex-none flex items-center justify-between px-6 py-5 z-40 bg-[var(--bg-main)]/60 backdrop-blur-3xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform">
            <span className="font-black text-xl text-white">S</span>
          </div>
          <h1 className="font-extrabold text-2xl tracking-tighter opacity-90 hidden sm:block">Serafim OS</h1>
          {!hasAiKey && (
            <button 
              onClick={handleConnectAI}
              className="ml-3 px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse"
            >
              <AlertCircle size={10} /> Connect AI
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowTimer(!showTimer)} 
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${showTimer ? 'text-indigo-400 bg-indigo-500/10' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] bg-white/5'}`}
          >
            <Zap size={20} />
          </button>
          <button 
            onClick={() => setShowProfile(true)} 
            className="w-11 h-11 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 font-bold text-sm shadow-sm transition-transform active:scale-90"
            aria-label="Profile"
          >
            {userName.charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      <Ticker thoughts={thoughts} />

      <main className="flex-1 relative overflow-hidden z-10 page-enter">
        {view === 'dashboard' && (
          <Dashboard 
            tasks={tasks} thoughts={thoughts} journal={journal} projects={projects} habits={habits}
            onAddTask={t => setTasks([t, ...tasks])} onAddProject={p => setProjects([p, ...projects])}
            onAddThought={t => setThoughts([t, ...thoughts])} onNavigate={setView}
            onToggleTask={handleToggleTask}
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
            hasAiKey={hasAiKey}
            onConnectAI={handleConnectAI}
            voiceTrigger={voiceTrigger}
          />
        )}
        {view === 'projects' && <ProjectsView projects={projects} tasks={tasks} thoughts={thoughts} onAddProject={p => setProjects([p, ...projects])} onDeleteProject={id => setProjects(projects.filter(p => p.id !== id))} onAddTask={t => setTasks([t, ...tasks])} onToggleTask={id => setTasks(tasks.map(t => t.id === id ? {...t, isCompleted: !t.isCompleted} : t))} onDeleteTask={id => setTasks(tasks.filter(t => t.id !== id))} />}
        {view === 'journal' && <JournalView journal={journal} onSave={(d, c, n, m) => { const i = journal.findIndex(j => j.date === d); if (i >= 0) { const next = [...journal]; next[i] = {...next[i], content: c, notes: n, mood: m}; setJournal(next); } else { setJournal([...journal, {id: Date.now().toString(), date: d, content: c, notes: n, mood: m}]); } }} />}
        {view === 'planner' && <PlannerView tasks={tasks} projects={projects} habits={habits} onAddTask={t => setTasks([t, ...tasks])} onToggleTask={id => setTasks(tasks.map(t => t.id === id ? {...t, isCompleted: !t.isCompleted} : t))} onAddHabit={h => setHabits([...habits, h])} onToggleHabit={(id, d) => setHabits(habits.map(h => h.id === id ? {...h, completedDates: h.completedDates.includes(d) ? h.completedDates.filter(cd => cd !== d) : [...h.completedDates, d]} : h))} onDeleteHabit={id => setHabits(habits.filter(h => h.id !== id))} />}
      </main>

      {/* OS Dock Navigation - Centralized and Balanced */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center z-[100] pointer-events-none p-8" id="nav-container">
        <nav className="pointer-events-auto flex items-center gap-1.5 p-2 glass bg-[var(--bg-item)]/70 border border-white/10 rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-10 duration-700">
          <button 
            onClick={() => setView('dashboard')} 
            className={`transition-all duration-300 w-12 h-12 rounded-[1.75rem] flex items-center justify-center ${view === 'dashboard' ? 'text-indigo-400 bg-indigo-500/10' : 'text-[var(--text-muted)] hover:text-white'}`}
            aria-label="Dashboard"
          >
            <LayoutDashboard size={20} />
          </button>
          <button 
            onClick={() => setView('projects')} 
            className={`transition-all duration-300 w-12 h-12 rounded-[1.75rem] flex items-center justify-center ${view === 'projects' ? 'text-indigo-400 bg-indigo-500/10' : 'text-[var(--text-muted)] hover:text-white'}`}
            aria-label="Projects"
          >
            <Folder size={20} />
          </button>

          {/* ACTION BUTTON: MIC */}
          <button 
            onClick={handleMicClick}
            className="mx-2 w-16 h-16 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all hover:scale-110 active:scale-90 group relative overflow-hidden"
            aria-label="Voice Input"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-40"></div>
            <Mic size={28} className="relative z-10" />
          </button>

          <button 
            onClick={() => setView('planner')} 
            className={`transition-all duration-300 w-12 h-12 rounded-[1.75rem] flex items-center justify-center ${view === 'planner' ? 'text-indigo-400 bg-indigo-500/10' : 'text-[var(--text-muted)] hover:text-white'}`}
            aria-label="Planner"
          >
            <CheckCircle size={20} />
          </button>
          <button 
            onClick={() => setView('chat')} 
            className={`transition-all duration-300 w-12 h-12 rounded-[1.75rem] flex items-center justify-center ${view === 'chat' ? 'text-indigo-400 bg-indigo-500/10' : 'text-[var(--text-muted)] hover:text-white'}`}
            aria-label="Mentorship Chat"
          >
            <MessageSquare size={20} />
          </button>
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
          hasAiKey={hasAiKey}
        />
      )}

      {showTutorial && (
        <InteractiveTour onComplete={() => {
          localStorage.setItem('serafim_onboarded', 'true');
          setShowTutorial(false);
        }} />
      )}
    </div>
  );
};

export default App;
