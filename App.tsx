import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, Task, Thought, JournalEntry, Project, Habit, ChatSession, ThemeKey, IconWeight, Memory, GeminiModel } from './types';
import Mentorship from './components/Mentorship';
import PlannerView from './components/PlannerView';
import JournalView from './components/JournalView';
import ProjectsView from './components/ProjectsView';
import ThoughtsView from './components/ThoughtsView';
import Ticker from './components/Ticker';
import ProfileModal from './components/ProfileModal';
import FocusTimer from './components/FocusTimer';
import Dashboard from './components/Dashboard';
import AnalyticsView from './components/AnalyticsView';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import Fab from './components/Fab';
import QuotesLibrary from './components/QuotesLibrary';
import ChatHistoryModal from './components/ChatHistoryModal';
import Login from './components/Login'; 
import { themes } from './themes';
import { dbService } from './services/dbService';
import { supabase } from './services/supabaseClient';
import { logger } from './services/logger';
import { 
  Zap, Loader2, Settings as SettingsIcon
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';

declare global {
  interface Window {
    deferredPrompt: any;
  }
}

const App = () => {
  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [isDataReady, setIsDataReady] = useState(false);
  const [view, setView] = useState<ViewState>('dashboard');
  
  // Customization State
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(() => (localStorage.getItem('sb_theme') || 'emerald') as ThemeKey);
  const [iconWeight, setIconWeight] = useState<IconWeight>(() => (localStorage.getItem('sb_icon_weight') || '2px') as IconWeight);
  const [geminiModel, setGeminiModel] = useState<GeminiModel>(() => (localStorage.getItem('sb_gemini_model') || 'flash') as GeminiModel);

  // App Logic States
  const [showSettings, setShowSettings] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showPWAInstall, setShowPWAInstall] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);

  // Data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [voiceTrigger, setVoiceTrigger] = useState(0);

  // --- NAVIGATION & HISTORY API ---
  // This enables native "Back" swipe gesture on mobile
  useEffect(() => {
    // Set initial state
    window.history.replaceState({ view: 'dashboard' }, '');

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setView(event.state.view);
        logger.log('Nav', `Navigated back to ${event.state.view}`, 'info');
      } else {
        // Fallback or exit
        setView('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newView: ViewState) => {
    if (newView === view) return;
    logger.log('Nav', `Switching view to: ${newView}`, 'info');
    window.history.pushState({ view: newView }, '', '');
    setView(newView);
  };

  // --- AUTH INITIALIZATION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if(session) logger.log('Auth', 'Session restored', 'success');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session && window.location.hash && window.location.hash.includes('access_token')) {
         window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  const userName = session?.user?.user_metadata?.full_name || userEmail?.split('@')[0] || 'User';

  // --- DATA SYNC (Load -> Sync -> Reload Pattern) ---
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      const loadFromDB = async () => {
        logger.log('System', 'Loading local data...', 'info');
        const [t, th, j, p, h, s, m] = await Promise.all([
          dbService.getAll<Task>('tasks'),
          dbService.getAll<Thought>('thoughts'),
          dbService.getAll<JournalEntry>('journal'),
          dbService.getAll<Project>('projects'),
          dbService.getAll<Habit>('habits'),
          dbService.getAll<ChatSession>('chat_sessions'),
          dbService.getAll<Memory>('memories')
        ]);
        
        setTasks(t); setThoughts(th); setJournal(j); setHabits(h); setMemories(m);
        // If projects empty, add default, BUT do not persist it yet to avoid conflict if cloud has data
        setProjects(p.length > 0 ? p : [{ id: 'p1', title: 'Личное', color: '#10b981', createdAt: new Date().toISOString() }]); 
        
        if (s.length > 0) {
          const sorted = s.sort((a, b) => b.lastInteraction - a.lastInteraction);
          setSessions(sorted); setActiveSessionId(sorted[0].id);
        } else {
          const initS: ChatSession = { id: 'init', title: 'Серафим', category: 'general', messages: [], lastInteraction: Date.now(), createdAt: new Date().toISOString() };
          setSessions([initS]); setActiveSessionId(initS.id);
        }
        logger.log('System', 'Local data loaded', 'success');
      };

      // 1. Start Background Sync (Async)
      // We do not await this immediately so the UI loads fast from local cache
      const syncPromise = dbService.setAuth(userId);

      // 2. Load what we have Locally immediately
      await loadFromDB();
      setIsDataReady(true);

      // 3. Wait for Cloud Sync to finish
      await syncPromise;

      // 4. Reload Data to reflect Cloud State (Fixes empty projects on new devices)
      await loadFromDB();
    };

    if (userId && !authLoading) {
      fetchData();
    } else {
      setIsDataReady(false);
    }
  }, [userId, authLoading]);

  // Theme Application
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
    
    // Background handling removed from here as per request, just clean up
    body.setAttribute('data-texture', 'none');
    root.style.removeProperty('--custom-bg');

    localStorage.setItem('sb_theme', validTheme);
    localStorage.setItem('sb_icon_weight', iconWeight);
    localStorage.setItem('sb_gemini_model', geminiModel);

  }, [currentTheme, iconWeight, geminiModel]);

  // --- HANDLERS ---
  const persist = (store: string, item: any) => { dbService.saveItem(store, item); };
  const remove = (store: string, id: string) => { dbService.deleteItem(store, id); };

  const handleAddTask = (task: Task) => { 
      setTasks(prev => [task, ...prev]); 
      persist('tasks', task); 
      logger.log('User', `Created task: ${task.title}`, 'success');
  };
  
  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => {
        const taskIndex = prev.findIndex(t => t.id === id);
        if (taskIndex === -1) return prev;
        
        const updatedTask = { ...prev[taskIndex], ...updates };
        persist('tasks', updatedTask);
        
        // Semantic Logging for meaningful updates
        if (updates.isCompleted !== undefined) {
            logger.log('User', updates.isCompleted ? 'Task completed' : 'Task restored', 'info');
        }
        
        const newTasks = [...prev];
        newTasks[taskIndex] = updatedTask;
        return newTasks;
    });
  };

  const handleDeleteTask = (id: string) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      remove('tasks', id);
      logger.log('User', 'Task deleted', 'warning');
  };

  const handleUpdateProject = (id: string, updates: Partial<Project>) => {
    const updatedProject = projects.find(p => p.id === id);
    if(updatedProject) { const newProj = { ...updatedProject, ...updates }; setProjects(prev => prev.map(p => p.id === id ? newProj : p)); persist('projects', newProj); }
  };
  const handleUpdateThought = (id: string, updates: Partial<Thought>) => {
    const updatedThought = thoughts.find(t => t.id === id);
    if (updatedThought) { const newThought = { ...updatedThought, ...updates }; setThoughts(prev => prev.map(t => t.id === id ? newThought : t)); persist('thoughts', newThought); }
  };
  const handleAddHabit = (habit: Habit) => { setHabits(prev => [habit, ...prev]); persist('habits', habit); logger.log('User', `Habit added: ${habit.title}`, 'success'); };
  const handleToggleHabit = (id: string, date: string) => {
    const habit = habits.find(h => h.id === id);
    if (habit) { const exists = habit.completedDates.includes(date); const newHabit = { ...habit, completedDates: exists ? habit.completedDates.filter(d => d !== date) : [...habit.completedDates, date] }; setHabits(prev => prev.map(h => h.id === id ? newHabit : h)); persist('habits', newHabit); }
  };
  const handleDeleteHabit = (id: string) => { setHabits(prev => prev.filter(h => h.id !== id)); remove('habits', id); logger.log('User', 'Habit deleted', 'warning'); };
  const handleStartFocus = (mins: number) => { setShowTimer(true); };
  
  const hasAiKey = useMemo(() => {
     if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_GOOGLE_API_KEY) return true;
     // @ts-ignore
     if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_API_KEY) return true;
     return false;
  }, []);

  const isModalOpen = showSettings || showChatHistory || showQuotes || showTimer;

  if (authLoading) return <div className="h-screen w-full flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;

  if (!session) {
    return <Login />;
  }

  if (!isDataReady) return <div className="h-full w-full flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-black relative">
      
      {/* UNIFIED FIXED HEADER & TICKER (The Levitating Glass) */}
      <div className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 pointer-events-none">
        {/* Actual Header Content */}
        <div className="bg-[var(--bg-main)]/85 backdrop-blur-xl border-b border-[var(--border-color)] pointer-events-auto transition-colors duration-500">
           <header className="flex items-center justify-between px-6 pt-safe-top h-[70px] max-w-7xl mx-auto w-full">
            <button 
              onClick={() => setShowChatHistory(true)}
              className="group flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
            >
              <h1 className="font-extrabold text-2xl tracking-tighter text-[var(--text-main)] drop-shadow-lg">
                Serafim OS<span className="text-[var(--accent)] text-3xl leading-none">.</span>
              </h1>
            </button>

            <div className="flex items-center gap-3">
              <button onClick={() => setShowTimer(!showTimer)} className="w-10 h-10 rounded-2xl flex items-center justify-center glass-panel text-[var(--accent)] hover:text-white transition-all hover:bg-[var(--accent)] glass-btn"><Zap size={20} /></button>
              
              <button 
                onClick={() => setShowSettings(true)} 
                className="w-10 h-10 rounded-2xl glass-panel flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-item)] hover:text-[var(--text-main)] transition-all glass-btn relative"
              >
                {session && <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full"></div>}
                <SettingsIcon size={20} />
              </button>
            </div>
          </header>

          <Ticker onClick={() => setShowQuotes(true)} />
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {/* Updated padding-bottom to 128px (approx 32 tailwind units) for the new larger Dock */}
      <div 
        className={`h-full w-full flex flex-col bg-[var(--bg-main)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isModalOpen ? 'scale-[0.92] opacity-50 rounded-[2rem] overflow-hidden pointer-events-none brightness-75' : ''}`}
        style={{ transformOrigin: 'center center' }}
      >
        <main className="flex-1 relative overflow-hidden z-10 pt-[110px] pb-32">
          {view === 'dashboard' && (
              <Dashboard 
                  tasks={tasks} 
                  thoughts={thoughts} 
                  journal={journal} 
                  projects={projects} 
                  habits={habits} 
                  onAddTask={handleAddTask} 
                  onAddProject={p => { setProjects([p, ...projects]); persist('projects', p); logger.log('User', 'Project created', 'success'); }} 
                  onAddThought={t => { setThoughts([t, ...thoughts]); persist('thoughts', t); logger.log('User', 'Thought added', 'success'); }} 
                  onNavigate={navigateTo} 
                  onToggleTask={(id, updates) => handleUpdateTask(id, updates || { isCompleted: !tasks.find(t=>t.id===id)?.isCompleted })}
                  onDeleteTask={handleDeleteTask}
                  onAddHabit={handleAddHabit}
                  onToggleHabit={handleToggleHabit}
                  onDeleteHabit={handleDeleteHabit}
              />
          )}
          {view === 'chat' && (
            <Mentorship 
              tasks={tasks} thoughts={thoughts} journal={journal} projects={projects} habits={habits} memories={memories}
              sessions={sessions} activeSessionId={activeSessionId} onSelectSession={setActiveSessionId}
              onUpdateMessages={(msgs) => { 
                  const sessionIndex = sessions.findIndex(s => s.id === activeSessionId);
                  if (sessionIndex === -1) return; // Guard against missing session
                  
                  const updatedSession = { ...sessions[sessionIndex], messages: msgs, lastInteraction: Date.now() };
                  
                  // Optimistic update
                  const newSessions = [...sessions];
                  newSessions[sessionIndex] = updatedSession;
                  
                  setSessions(newSessions);
                  persist('chat_sessions', updatedSession);
              }}
              onNewSession={(title, cat) => { const ns = { id: Date.now().toString(), title, category: cat, messages: [], lastInteraction: Date.now(), createdAt: new Date().toISOString() }; setSessions(prev => [ns, ...prev]); setActiveSessionId(ns.id); persist('chat_sessions', ns); logger.log('User', 'New chat session started', 'info'); }}
              onDeleteSession={id => { setSessions(prev => prev.filter(s => s.id !== id)); if(activeSessionId === id) setActiveSessionId(null); remove('chat_sessions', id); logger.log('User', 'Chat session deleted', 'warning'); }}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onAddThought={t => { setThoughts(prev => [t, ...prev]); persist('thoughts', t); }}
              onAddProject={p => { setProjects(prev => [p, ...prev]); persist('projects', p); }}
              onAddHabit={handleAddHabit}
              onAddMemory={m => { setMemories(prev => [m, ...prev]); persist('memories', m); logger.log('Memory', 'Fact memorized', 'success'); }}
              onSetTheme={setCurrentTheme}
              onStartFocus={handleStartFocus}
              hasAiKey={hasAiKey}
              onConnectAI={() => setShowSettings(true)}
              voiceTrigger={voiceTrigger}
              userName={userName}
              session={session}
            />
          )}
          {view === 'journal' && (
              <JournalView 
                  journal={journal} 
                  tasks={tasks} 
                  onSave={(d, c, n, m, r, t) => { 
                      const i = journal.findIndex(j => j.date === d); 
                      let newEntry;
                      if (i >= 0) { 
                          const next = [...journal]; 
                          next[i] = {...next[i], content: c, notes: n, mood: m, reflection: r, tags: t}; 
                          setJournal(next); 
                          newEntry = next[i];
                      } else { 
                          newEntry = {id: Date.now().toString(), date: d, content: c, notes: n, mood: m, reflection: r, tags: t};
                          setJournal([...journal, newEntry]); 
                      }
                      persist('journal', newEntry);
                  }} 
              />
          )}
          {view === 'thoughts' && (
            <ThoughtsView 
              thoughts={thoughts} 
              onAdd={(c, t, tags, metadata) => { 
                  const newItem = {id: Date.now().toString(), content: c, type: t, tags, createdAt: new Date().toISOString(), metadata};
                  setThoughts([newItem, ...thoughts]); 
                  persist('thoughts', newItem);
                  logger.log('User', 'Thought created', 'success');
              }} 
              onUpdate={handleUpdateThought}
              onDelete={id => { setThoughts(thoughts.filter(t => t.id !== id)); remove('thoughts', id); logger.log('User', 'Thought deleted', 'warning'); }} 
            />
          )}
          {view === 'planner' && (
            <PlannerView 
              tasks={tasks} 
              projects={projects} 
              habits={habits} 
              thoughts={thoughts}
              onAddTask={handleAddTask} 
              onToggleTask={(id, updates) => handleUpdateTask(id, updates || { isCompleted: !tasks.find(t=>t.id===id)?.isCompleted })} 
              onDeleteTask={handleDeleteTask}
              onAddThought={t => { setThoughts([t, ...thoughts]); persist('thoughts', t); }}
              onUpdateThought={handleUpdateThought}
              onDeleteThought={id => { setThoughts(prev => prev.filter(t => t.id !== id)); remove('thoughts', id); }}
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
              onAddProject={p => { setProjects([p, ...projects]); persist('projects', p); logger.log('User', 'Project created', 'success'); }} 
              onUpdateProject={handleUpdateProject}
              onDeleteProject={id => { setProjects(prev => prev.filter(p => p.id !== id)); remove('projects', id); logger.log('User', 'Project deleted', 'warning'); }} 
              onAddTask={handleAddTask} 
              onUpdateTask={handleUpdateTask} 
              onToggleTask={id => handleUpdateTask(id, { isCompleted: !tasks.find(t=>t.id===id)?.isCompleted })} 
              onDeleteTask={handleDeleteTask} 
              onAddThought={t => { setThoughts([t, ...thoughts]); persist('thoughts', t); }}
              onUpdateThought={handleUpdateThought}
              onDeleteThought={id => { setThoughts(prev => prev.filter(t => t.id !== id)); remove('thoughts', id); }}
            />
          )}
          {view === 'analytics' && <AnalyticsView tasks={tasks} habits={habits} journal={journal} currentTheme={currentTheme} onClose={() => navigateTo('dashboard')} />}
        </main>
        
        <Fab 
          onNavigate={navigateTo}
          currentView={view}
          onAddTask={() => { navigateTo('planner'); }} 
          onAddThought={(type) => { navigateTo('thoughts'); }}
          onAddJournal={() => { navigateTo('journal'); }}
          onOpenQuotes={() => setShowQuotes(true)}
          onVoiceChat={() => { navigateTo('chat'); setVoiceTrigger(v => v + 1); }}
        />
      </div>

      {showTimer && <FocusTimer onClose={() => setShowTimer(false)} />}
      {showQuotes && (
          <QuotesLibrary 
            myQuotes={thoughts} 
            onAddQuote={(text, author, cat) => { 
                const q: Thought = {
                    id: Date.now().toString(), 
                    content: text, 
                    author, 
                    type: 'quote', 
                    tags: [cat], 
                    createdAt: new Date().toISOString()
                }; 
                setThoughts([q, ...thoughts]); 
                persist('thoughts', q); 
            }} 
            onDeleteQuote={(id) => { 
                setThoughts(thoughts.filter(t => t.id !== id)); 
                remove('thoughts', id); 
            }} 
            onClose={() => setShowQuotes(false)} 
          />
      )}
      
      {showChatHistory && (
        <ChatHistoryModal 
          sessions={sessions} 
          activeSessionId={activeSessionId}
          projects={projects}
          onSelectSession={(id) => { setActiveSessionId(id); navigateTo('chat'); setShowChatHistory(false); }}
          onNewSession={(title, projectId) => {
             const ns: ChatSession = { id: Date.now().toString(), title, category: 'general', projectId: projectId, messages: [], lastInteraction: Date.now(), createdAt: new Date().toISOString() };
             setSessions(prev => [ns, ...prev]); setActiveSessionId(ns.id); persist('chat_sessions', ns); navigateTo('chat'); setShowChatHistory(false); logger.log('User', 'New chat created', 'info');
          }}
          onDeleteSession={(id) => { setSessions(prev => prev.filter(s => s.id !== id)); if(activeSessionId === id) setActiveSessionId(null); remove('chat_sessions', id); logger.log('User', 'Chat deleted', 'warning'); }}
          onClose={() => setShowChatHistory(false)}
        />
      )}

      {showSettings && (
        <ProfileModal 
          appState={{tasks, thoughts, journal, projects, habits, view}} 
          userName={userName} 
          currentTheme={currentTheme} 
          setTheme={setCurrentTheme} 
          geminiModel={geminiModel}
          setGeminiModel={setGeminiModel}
          onClose={() => setShowSettings(false)} 
          onImport={d => {setTasks(d.tasks || []); setThoughts(d.thoughts || []); persist('tasks', d.tasks || []); persist('thoughts', d.thoughts || []);}} 
          hasAiKey={hasAiKey}
          session={session}
          customization={{ font: 'JetBrains Mono', setFont: () => {}, iconWeight, setIconWeight, texture: 'none', setTexture: () => {} }}
        />
      )}

      {showPWAInstall && <PWAInstallPrompt onClose={() => setShowPWAInstall(false)} />}
    </div>
  );
};

export default App;