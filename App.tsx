
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ViewState, Task, Thought, Priority, ThemeKey, JournalEntry, Project, Habit, ChatMessage, ChatSession, ChatCategory, FontFamily, IconWeight, TextureType } from './types';
import Mentorship from './components/Mentorship';
import PlannerView from './components/PlannerView';
import JournalView from './components/JournalView';
import ProjectsView from './components/ProjectsView';
import ThoughtsView from './components/ThoughtsView';
import Ticker from './components/Ticker';
import ProfileModal from './components/ProfileModal';
import FocusTimer from './components/FocusTimer';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import AnalyticsView from './components/AnalyticsView';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import Fab from './components/Fab';
import QuotesLibrary from './components/QuotesLibrary';
import ChatHistoryModal from './components/ChatHistoryModal';
import { themes } from './themes';
import { dbService } from './services/dbService';
import { requestNotificationPermission } from './services/notificationService';
import * as googleService from './services/googleService';
import { 
  Zap, Loader2, Settings as SettingsIcon, Cloud, CloudOff, RefreshCw
} from 'lucide-react';
import { addMinutes, addHours } from 'date-fns';

// Extend window definition to store PWA prompt
declare global {
  interface Window {
    deferredPrompt: any;
    google: any;
    gapi: any;
  }
}

type SyncStatus = 'offline' | 'synced' | 'syncing' | 'error' | 'auth_needed';

const App = () => {
  const [isDataReady, setIsDataReady] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('sb_user_name') || '');
  const [view, setView] = useState<ViewState>('dashboard');
  
  // Customization State - Forced Mono
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(() => (localStorage.getItem('sb_theme') || 'emerald') as ThemeKey);
  const [iconWeight, setIconWeight] = useState<IconWeight>(() => (localStorage.getItem('sb_icon_weight') || '2px') as IconWeight);
  const [customBg, setCustomBg] = useState<string>(() => localStorage.getItem('sb_custom_bg') || '');

  // App Logic States
  const [showSettings, setShowSettings] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showPWAInstall, setShowPWAInstall] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);

  // GOOGLE / SYNC STATE
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [googleUser, setGoogleUser] = useState<googleService.GoogleUserProfile | null>(null);
  const syncTimeoutRef = useRef<any>(null);

  // Data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [voiceTrigger, setVoiceTrigger] = useState(0);

  // --- INIT GOOGLE SERVICES ---
  useEffect(() => {
    const initGoogle = async () => {
      // Parallel initialization so Auth (GIS) doesn't wait for API (GAPI)
      // This prevents "try again in a second" errors if GAPI fails
      
      // 1. Initialize API Client (for Drive/Tasks calls)
      googleService.initGapiClient().catch(err => {
        console.error("GAPI Init Failed:", err);
        setSyncStatus('error');
      });

      // 2. Initialize Auth Client (for Sign In button)
      googleService.initGisClient(async () => {
          // Callback when token received (User Signed In via popup)
          setSyncStatus('synced');
          const profile = await googleService.getUserProfile();
          setGoogleUser(profile);
      }).catch(err => {
        console.error("GIS Init Failed:", err);
      });
      
      // Initial online check
      setSyncStatus(navigator.onLine ? 'auth_needed' : 'offline');

      // Check if we have a token from a previous session in this load (unlikely for pure oauth2 without storage, but safety check)
      if(googleService.checkSignInStatus()) {
            const profile = await googleService.getUserProfile();
            setGoogleUser(profile);
            setSyncStatus('synced');
      }
    };

    initGoogle();

    window.addEventListener('online', () => setSyncStatus('auth_needed'));
    window.addEventListener('offline', () => setSyncStatus('offline'));
  }, []);

  // --- AUTO SYNC LOGIC (Drive) ---
  const triggerAutoSync = useCallback(() => {
    // CRITICAL: Do not sync if error, offline, or auth is missing.
    if (syncStatus === 'offline' || syncStatus === 'auth_needed' || syncStatus === 'error') return;

    setSyncStatus('syncing');
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        const fullDump = { tasks, thoughts, journal, projects, habits, sessions, user: userName };
        const result = await googleService.syncToDrive(fullDump);
        if (result) setSyncStatus('synced');
        else setSyncStatus('auth_needed'); // Fallback if sync skipped
      } catch (e) {
        console.error("Auto Sync Failed", e);
        // Do not set global error state to avoid blocking UI, just visual indicator
        setSyncStatus('error'); 
      }
    }, 5000); // Debounce 5 seconds
  }, [tasks, thoughts, journal, projects, habits, sessions, userName, syncStatus]);

  useEffect(() => {
    if (isDataReady) triggerAutoSync();
  }, [tasks, thoughts, journal, projects, habits, sessions, isDataReady, triggerAutoSync]);

  // --- PWA PROMPT CAPTURE ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      window.deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // --- NOTIFICATION PERMISSION ---
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // --- THEME & APPEARANCE HANDLING ---
  useEffect(() => {
    const validTheme = themes[currentTheme] ? currentTheme : 'emerald';
    const theme = themes[validTheme];
    const root = document.documentElement;
    const body = document.body;

    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value as string);
    });

    root.style.setProperty('--app-font', `"JetBrains Mono", monospace`);
    root.style.setProperty('--icon-weight', iconWeight);
    body.setAttribute('data-theme-type', theme.type);
    
    if (customBg) {
      body.setAttribute('data-texture', 'custom');
      root.style.setProperty('--custom-bg', `url(${customBg})`);
    } else {
      body.setAttribute('data-texture', 'none');
      root.style.removeProperty('--custom-bg');
    }

    localStorage.setItem('sb_theme', validTheme);
    localStorage.setItem('sb_icon_weight', iconWeight);
    if (customBg) localStorage.setItem('sb_custom_bg', customBg);
    else localStorage.removeItem('sb_custom_bg');

  }, [currentTheme, iconWeight, customBg]);

  // --- DATA LOADING ---
  useEffect(() => {
    const loadData = async () => {
      try {
        await dbService.migrateFromLocalStorage();
        const [t, th, j, p, h, s] = await Promise.all([
          dbService.getAll<Task>('tasks'),
          dbService.getAll<Thought>('thoughts'),
          dbService.getAll<JournalEntry>('journal'),
          dbService.getAll<Project>('projects'),
          dbService.getAll<Habit>('habits'),
          dbService.getAll<ChatSession>('chat_sessions')
        ]);
        setTasks(t); setThoughts(th); setJournal(j); setHabits(h);
        setProjects(p.length > 0 ? p : [{ id: 'p1', title: 'Личное', color: '#10b981', createdAt: new Date().toISOString() }]); 
        
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

  // --- HANDLERS WITH GOOGLE INTEGRATION ---

  const handleAddTask = (task: Task) => {
    setTasks(prev => [task, ...prev]);
    
    // Google Integration
    if (task.dueDate) {
       // Push to Google Tasks
       googleService.createGoogleTask(task.title, task.description || '', task.dueDate);
       
       // If specifically formatted or user implies duration (future enhancement), add to Calendar
       // For now, if priority is HIGH, duplicate to Calendar for extra alerting
       if (task.priority === Priority.HIGH) {
         const end = addHours(new Date(task.dueDate), 1).toISOString();
         googleService.createCalendarEvent(task.title, task.dueDate, end, task.description || '');
       }
    } else {
       googleService.createGoogleTask(task.title, task.description || '');
    }
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleUpdateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleUpdateThought = (id: string, updates: Partial<Thought>) => {
    setThoughts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleAddHabit = (habit: Habit) => {
    setHabits(prev => [habit, ...prev]);
  };

  const handleToggleHabit = (id: string, date: string) => {
    setHabits(prev => prev.map(h => {
        if (h.id === id) {
            const exists = h.completedDates.includes(date);
            return {
                ...h,
                completedDates: exists 
                    ? h.completedDates.filter(d => d !== date)
                    : [...h.completedDates, date]
            };
        }
        return h;
    }));
  };

  const handleDeleteHabit = (id: string) => {
      setHabits(prev => prev.filter(h => h.id !== id));
  };

  const handleStartFocus = (mins: number) => {
    setShowTimer(true);
  };

  const navigateTo = (newView: ViewState) => {
    setView(newView);
  };
  
  const hasAiKey = useMemo(() => {
     if (typeof process !== 'undefined' && process.env) {
         if (process.env.REACT_APP_GOOGLE_API_KEY) return true;
         if (process.env.GOOGLE_API_KEY) return true;
     }
     // @ts-ignore
     if (typeof import.meta !== 'undefined' && import.meta.env) {
         // @ts-ignore
         if (import.meta.env.VITE_GOOGLE_API_KEY) return true;
         // @ts-ignore
         if (import.meta.env.GOOGLE_API_KEY) return true;
     }
     return false;
  }, []);

  const handleOnboardingComplete = (name: string) => {
    setUserName(name);
    localStorage.setItem('sb_user_name', name);
    setTimeout(() => setShowPWAInstall(true), 1000);
  };

  const handleCloudClick = () => {
    if (syncStatus === 'auth_needed' || syncStatus === 'error') {
      googleService.signIn();
    } else if (syncStatus === 'synced') {
      // Manual sync
      triggerAutoSync();
    }
  };

  const isModalOpen = showSettings || showChatHistory || showQuotes || showTimer;

  // Pass googleUser to Onboarding so it can reactively update
  if (!userName && isDataReady) return <Onboarding onComplete={handleOnboardingComplete} googleUser={googleUser} />;
  
  if (!isDataReady) return <div className="h-full w-full flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-black relative">
      
      {/* MAIN APP CONTENT */}
      <div 
        className={`h-full w-full flex flex-col bg-[var(--bg-main)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isModalOpen ? 'scale-[0.92] opacity-50 rounded-[2rem] overflow-hidden pointer-events-none brightness-75' : ''}`}
        style={{ transformOrigin: 'center center' }}
      >
        <header className="flex-none flex items-center justify-between px-6 py-6 z-40 bg-transparent relative">
          <button 
            onClick={() => setShowChatHistory(true)}
            className="group flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
          >
            <h1 className="font-extrabold text-2xl tracking-tighter text-[var(--text-main)] drop-shadow-lg">
              Serafim OS<span className="text-[var(--accent)] text-3xl leading-none">.</span>
            </h1>
            <span className="text-[10px] font-bold text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity ml-2 uppercase tracking-widest border border-[var(--border-color)] px-2 py-0.5 rounded-md">
              История
            </span>
          </button>

          <div className="flex items-center gap-3">
             {/* Cloud Status Indicator */}
            <button 
              onClick={handleCloudClick}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center glass-panel transition-all glass-btn ${
                syncStatus === 'synced' ? 'text-emerald-500' :
                syncStatus === 'syncing' ? 'text-amber-500' :
                syncStatus === 'offline' ? 'text-[var(--text-muted)] opacity-50' :
                'text-rose-500'
              }`}
            >
               {syncStatus === 'syncing' ? <RefreshCw size={20} className="animate-spin" /> : 
                syncStatus === 'offline' ? <CloudOff size={20} /> : 
                googleUser ? <img src={googleUser.picture} className="w-6 h-6 rounded-full border border-emerald-500/50" alt="user" /> : <Cloud size={20} />
               }
            </button>

            <button onClick={() => setShowTimer(!showTimer)} className="w-11 h-11 rounded-2xl flex items-center justify-center glass-panel text-[var(--accent)] hover:text-white transition-all hover:bg-[var(--accent)] glass-btn"><Zap size={20} /></button>
            <button onClick={() => setShowSettings(true)} className="w-11 h-11 rounded-2xl glass-panel flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-item)] hover:text-[var(--text-main)] transition-all glass-btn"><SettingsIcon size={20} /></button>
          </div>
        </header>

        <Ticker thoughts={thoughts} onClick={() => setShowQuotes(true)} />

        <main className="flex-1 relative overflow-hidden z-10 page-enter">
          {view === 'dashboard' && <Dashboard tasks={tasks} thoughts={thoughts} journal={journal} projects={projects} habits={habits} onAddTask={handleAddTask} onAddProject={p => setProjects([p, ...projects])} onAddThought={t => setThoughts([t, ...thoughts])} onNavigate={navigateTo} onToggleTask={id => handleUpdateTask(id, { isCompleted: !tasks.find(t=>t.id===id)?.isCompleted })} />}
          {view === 'chat' && (
            <Mentorship 
              tasks={tasks} thoughts={thoughts} journal={journal} projects={projects} habits={habits}
              sessions={sessions} activeSessionId={activeSessionId} onSelectSession={setActiveSessionId}
              onUpdateMessages={(msgs) => setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: msgs, lastInteraction: Date.now() } : s))}
              onNewSession={(title, cat) => { const ns = { id: Date.now().toString(), title, category: cat, messages: [], lastInteraction: Date.now(), createdAt: new Date().toISOString() }; setSessions(prev => [ns, ...prev]); setActiveSessionId(ns.id); }}
              onDeleteSession={id => { setSessions(prev => prev.filter(s => s.id !== id)); if(activeSessionId === id) setActiveSessionId(null); }}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onAddThought={t => setThoughts(prev => [t, ...prev])}
              onAddProject={p => setProjects(prev => [p, ...prev])}
              onAddHabit={handleAddHabit}
              onSetTheme={setCurrentTheme}
              onStartFocus={handleStartFocus}
              hasAiKey={hasAiKey}
              onConnectAI={() => window.aistudio?.openSelectKey()}
              voiceTrigger={voiceTrigger}
            />
          )}
          {view === 'journal' && (
              <JournalView 
                  journal={journal} 
                  tasks={tasks} 
                  onSave={(d, c, n, m, r, t) => { const i = journal.findIndex(j => j.date === d); if (i >= 0) { const next = [...journal]; next[i] = {...next[i], content: c, notes: n, mood: m, reflection: r, tags: t}; setJournal(next); } else { setJournal([...journal, {id: Date.now().toString(), date: d, content: c, notes: n, mood: m, reflection: r, tags: t}]); } }} 
              />
          )}
          {view === 'thoughts' && (
            <ThoughtsView 
              thoughts={thoughts} 
              onAdd={(c, t, tags, metadata) => setThoughts([{id: Date.now().toString(), content: c, type: t, tags, createdAt: new Date().toISOString(), metadata}, ...thoughts])} 
              onUpdate={handleUpdateThought}
              onDelete={id => setThoughts(thoughts.filter(t => t.id !== id))} 
            />
          )}
          {view === 'planner' && (
            <PlannerView 
              tasks={tasks} 
              projects={projects} 
              habits={habits} 
              thoughts={thoughts}
              onAddTask={handleAddTask} 
              onToggleTask={id => handleUpdateTask(id, { isCompleted: !tasks.find(t=>t.id===id)?.isCompleted })} 
              onAddThought={t => setThoughts([t, ...thoughts])}
              onUpdateThought={t => setThoughts(prev => prev.map(prevT => prevT.id === t.id ? t : prevT))}
              onDeleteThought={id => setThoughts(prev => prev.filter(t => t.id !== id))}
              onAddHabit={handleAddHabit}
              onToggleHabit={handleToggleHabit}
              onDeleteHabit={handleDeleteHabit}
            />
          )}
          {view === 'projects' && (
            <ProjectsView 
              projects={projects} 
              tasks={tasks} 
              thoughts={thoughts} 
              onAddProject={p => setProjects([p, ...projects])} 
              onUpdateProject={handleUpdateProject}
              onDeleteProject={id => setProjects(projects.filter(p => p.id !== id))} 
              onAddTask={handleAddTask} 
              onUpdateTask={handleUpdateTask} 
              onToggleTask={id => handleUpdateTask(id, { isCompleted: !tasks.find(t=>t.id===id)?.isCompleted })} 
              onDeleteTask={id => setTasks(tasks.filter(t => t.id !== id))} 
              onAddThought={t => setThoughts([t, ...thoughts])}
              onUpdateThought={t => setThoughts(prev => prev.map(prevT => prevT.id === t.id ? t : prevT))}
              onDeleteThought={id => setThoughts(prev => prev.filter(t => t.id !== id))}
            />
          )}
          {view === 'analytics' && <AnalyticsView tasks={tasks} habits={habits} journal={journal} currentTheme={currentTheme} onClose={() => navigateTo('dashboard')} />}
        </main>
        
        <Fab 
          onNavigate={navigateTo}
          currentView={view}
          onAddTask={() => { setView('planner'); }} 
          onAddThought={(type) => { setView('thoughts'); }}
          onAddJournal={() => { setView('journal'); }}
          onOpenQuotes={() => setShowQuotes(true)}
          onVoiceChat={() => { setView('chat'); setVoiceTrigger(v => v + 1); }}
        />
      </div>

      {showTimer && <FocusTimer onClose={() => setShowTimer(false)} />}
      {showQuotes && <QuotesLibrary myQuotes={thoughts} onAddQuote={(text, author, cat) => setThoughts([{id: Date.now().toString(), content: text, author, type: 'quote', tags: [cat], createdAt: new Date().toISOString()}, ...thoughts])} onDeleteQuote={(id) => setThoughts(thoughts.filter(t => t.id !== id))} onClose={() => setShowQuotes(false)} />}
      
      {showChatHistory && (
        <ChatHistoryModal 
          sessions={sessions} 
          activeSessionId={activeSessionId}
          projects={projects}
          onSelectSession={(id) => { setActiveSessionId(id); setView('chat'); setShowChatHistory(false); }}
          onNewSession={(title, projectId) => {
             const ns: ChatSession = { id: Date.now().toString(), title, category: 'general', projectId: projectId, messages: [], lastInteraction: Date.now(), createdAt: new Date().toISOString() };
             setSessions(prev => [ns, ...prev]); setActiveSessionId(ns.id); setView('chat'); setShowChatHistory(false);
          }}
          onDeleteSession={(id) => { setSessions(prev => prev.filter(s => s.id !== id)); if(activeSessionId === id) setActiveSessionId(null); }}
          onClose={() => setShowChatHistory(false)}
        />
      )}

      {showSettings && (
        <ProfileModal 
          appState={{tasks, thoughts, journal, projects, habits, view}} 
          userName={userName} 
          currentTheme={currentTheme} 
          setTheme={setCurrentTheme} 
          onClose={() => setShowSettings(false)} 
          onImport={d => {setTasks(d.tasks || []); setThoughts(d.thoughts || []);}} 
          hasAiKey={hasAiKey}
          customization={{ font: 'JetBrains Mono', setFont: () => {}, iconWeight, setIconWeight, texture: customBg ? 'custom' : 'none', setTexture: () => {}, customBg, setCustomBg }}
          googleUser={googleUser}
        />
      )}

      {showPWAInstall && <PWAInstallPrompt onClose={() => setShowPWAInstall(false)} />}
    </div>
  );
};

export default App;
