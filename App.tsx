
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ViewState, Task, Thought, JournalEntry, Project, Habit, ChatSession, ThemeKey, IconWeight, Memory, GeminiModel } from './types';
import Mentorship from './components/Mentorship';
import PlannerView from './components/PlannerView';
import JournalView from './components/JournalView';
import ProjectsView from './components/ProjectsView';
import ThoughtsView from './components/ThoughtsView';
import ProfileModal from './components/ProfileModal';
import FocusTimer from './components/FocusTimer';
import Dashboard from './components/Dashboard';
import AnalyticsView from './components/AnalyticsView';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import QuotesLibrary from './components/QuotesLibrary';
import ChatHistoryModal from './components/ChatHistoryModal';
import Login from './components/Login'; 
import Sidebar from './components/Sidebar'; 
import BackgroundGlow from './components/BackgroundGlow';
import { themes } from './themes';
import { dbService } from './services/dbService';
import { supabase } from './services/supabaseClient';
import { logger } from './services/logger';
import { 
  Zap, Loader2, Settings as SettingsIcon, History, Menu, Mic
} from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import LiveAudioAgent from './components/LiveAudioAgent';

import { generateSessionSummary } from './services/geminiService';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Sidebar State
  
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
  const [showLiveAgent, setShowLiveAgent] = useState(false);

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
  const [liveStreamText, setLiveStreamText] = useState<string>('');
  const liveTextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLiveTextStream = (text: string) => {
      setLiveStreamText(prev => {
          const newText = prev + text;
          return newText.length > 200 ? newText.slice(-200) : newText; // Keep last 200 chars
      });
      
      if (liveTextTimeoutRef.current) clearTimeout(liveTextTimeoutRef.current);
      liveTextTimeoutRef.current = setTimeout(() => setLiveStreamText(''), 4000);
  };

  // --- NAVIGATION & HISTORY API ---
  useEffect(() => {
    window.history.replaceState({ view: 'dashboard' }, '');
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setView(event.state.view);
      } else {
        setView('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newView: ViewState) => {
    if (newView === view) return;
    window.history.pushState({ view: newView }, '', '');
    setView(newView);
  };

  // --- AUTH INITIALIZATION ---
  useEffect(() => {
    // Check local session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      // Try to save token if it exists initially (rare but possible on direct redirect)
      if (session?.provider_token) {
          localStorage.setItem('google_access_token', session.provider_token);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      // CRITICAL: Persist Google Token because Supabase drops it on refresh
      if (session?.provider_token) {
          localStorage.setItem('google_access_token', session.provider_token);
          logger.log('Auth', 'Google Token refreshed and saved', 'success');
      }

      if (session && window.location.hash && window.location.hash.includes('access_token')) {
         window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  const userName = session?.user?.user_metadata?.full_name || userEmail?.split('@')[0] || 'User';

  // --- DATA SYNC ---
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      const loadFromDB = async () => {
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
        setProjects(p.length > 0 ? p : [{ id: 'p1', title: 'Личное', color: '#10b981', createdAt: new Date().toISOString() }]); 
        
        if (s.length > 0) {
          const sorted = s.sort((a, b) => b.lastInteraction - a.lastInteraction);
          setSessions(sorted); setActiveSessionId(sorted[0].id);
        } else {
          const initS: ChatSession = { id: 'init', title: 'Серафим', category: 'general', messages: [], lastInteraction: Date.now(), createdAt: new Date().toISOString() };
          setSessions([initS]); setActiveSessionId(initS.id);
        }
      };

      const syncPromise = dbService.setAuth(userId);
      await loadFromDB();
      setIsDataReady(true);
      await syncPromise;
      await loadFromDB();
    };

    if (userId && !authLoading) {
      fetchData();
    } else {
      setIsDataReady(false);
    }

    // ДОБАВЛЯЕМ СЛУШАТЕЛЬ СЕТИ
    const handleOnline = () => {
      logger.log('System', 'Internet restored. Syncing...', 'info');
      if (userId) {
        dbService.syncAllTables(); // Как только появился инет - пушим всё в облако
      }
    };
  
    window.addEventListener('online', handleOnline);
  
    return () => {
      window.removeEventListener('online', handleOnline);
    };
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
    
    localStorage.setItem('sb_theme', validTheme);
    localStorage.setItem('sb_icon_weight', iconWeight);
    localStorage.setItem('sb_gemini_model', geminiModel);

  }, [currentTheme, iconWeight, geminiModel]);

  // --- HANDLERS ---
  const persist = (store: string, item: any) => { dbService.saveItem(store, item); };
  const remove = (store: string, id: string) => { dbService.deleteItem(store, id); };

  // NEW: Handle Session Switching with Background Summarization
  const handleSelectSession = async (newId: string) => {
      const oldSessionId = activeSessionId;
      setActiveSessionId(newId); // Мгновенно переключаем UI

      // А В ФОНЕ (не блокируя интерфейс) жмем старую сессию:
      if (oldSessionId && oldSessionId !== newId) {
          const oldSession = sessions.find(s => s.id === oldSessionId);
          // Сжимаем, только если там больше 4 сообщений и еще нет саммари (или оно устарело, но пока просто если нет)
          if (oldSession && oldSession.messages.length >= 4 && !oldSession.summary) {
              logger.log('Memory', `Compressing session ${oldSession.title}...`, 'info');
              // Запускаем без await, чтобы не блочить UI, но нам нужен результат для сохранения
              // Поэтому делаем это в отдельном промисе
              generateSessionSummary(oldSession.messages).then(summary => {
                  if (summary) {
                      const updatedSession = { ...oldSession, summary };
                      setSessions(prev => prev.map(s => s.id === oldSessionId ? updatedSession : s));
                      persist('chat_sessions', updatedSession);
                      logger.log('Memory', 'Session compressed and saved.', 'success');
                  }
              });
          }
      }
  };

  const handleAddTask = (task: Task) => { 
      setTasks(prev => [task, ...prev]); 
      persist('tasks', task); 
  };
  
  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => {
        const taskIndex = prev.findIndex(t => t.id === id);
        if (taskIndex === -1) return prev;
        const updatedTask = { ...prev[taskIndex], ...updates };
        persist('tasks', updatedTask);
        const newTasks = [...prev];
        newTasks[taskIndex] = updatedTask;
        return newTasks;
    });
  };

  const handleDeleteTask = (id: string) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      remove('tasks', id);
  };

  const handleUpdateProject = (id: string, updates: Partial<Project>) => {
    const updatedProject = projects.find(p => p.id === id);
    if(updatedProject) { const newProj = { ...updatedProject, ...updates }; setProjects(prev => prev.map(p => p.id === id ? newProj : p)); persist('projects', newProj); }
  };
  const handleUpdateThought = (id: string, updates: Partial<Thought>) => {
    const updatedThought = thoughts.find(t => t.id === id);
    if (updatedThought) { const newThought = { ...updatedThought, ...updates }; setThoughts(prev => prev.map(t => t.id === id ? newThought : t)); persist('thoughts', newThought); }
  };
  const handleDeleteThought = (id: string) => {
    setThoughts(prev => prev.filter(t => t.id !== id));
    remove('thoughts', id);
  };
  const handleAddHabit = (habit: Habit) => { setHabits(prev => [habit, ...prev]); persist('habits', habit); };
  const handleToggleHabit = (id: string, date: string) => {
    const habit = habits.find(h => h.id === id);
    if (habit) { const exists = habit.completedDates.includes(date); const newHabit = { ...habit, completedDates: exists ? habit.completedDates.filter(d => d !== date) : [...habit.completedDates, date] }; setHabits(prev => prev.map(h => h.id === id ? newHabit : h)); persist('habits', newHabit); }
  };
  const handleDeleteHabit = (id: string) => { setHabits(prev => prev.filter(h => h.id !== id)); remove('habits', id); };
  
  // NEW: Handle Journal Entry via Chat
  const handleAddJournalEntry = (entry: Partial<JournalEntry>) => {
      const date = entry.date || new Date().toISOString().split('T')[0];
      const existingIndex = journal.findIndex(j => j.date === date);
      
      let newEntry: JournalEntry;
      if (existingIndex >= 0) {
          const existing = journal[existingIndex];
          newEntry = {
              ...existing,
              content: existing.content + '\n\n' + (entry.content || ''),
              mood: entry.mood || existing.mood,
              tags: [...(existing.tags || []), ...(entry.tags || [])]
          };
          const newJournal = [...journal];
          newJournal[existingIndex] = newEntry;
          setJournal(newJournal);
      } else {
          newEntry = {
              id: Date.now().toString(),
              date: date,
              content: entry.content || '',
              mood: entry.mood || '😐',
              tags: entry.tags || [],
              notes: '',
          };
          setJournal(prev => [newEntry, ...prev]);
      }
      persist('journal', newEntry);
  };

  const handleStartFocus = (mins?: number) => { setShowTimer(true); };
  
  const hasAiKey = useMemo(() => {
     if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_GOOGLE_API_KEY) return true;
     // @ts-ignore
     if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_API_KEY) return true;
     return false;
  }, []);

  const isModalOpen = showSettings || showChatHistory || showQuotes || showTimer;

  // --- GESTURE HANDLING ---
  const touchStart = React.useRef<{ x: number, y: number } | null>(null);
  const touchEnd = React.useRef<{ x: number, y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
      touchEnd.current = null; 
      touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };

  const onTouchMove = (e: React.TouchEvent) => {
      touchEnd.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };

  const onTouchEnd = () => {
      if (!touchStart.current || !touchEnd.current) return;
      
      const distanceX = touchStart.current.x - touchEnd.current.x;
      const distanceY = touchStart.current.y - touchEnd.current.y;
      const isRightSwipe = distanceX < -100; // Swiped right (negative distance)
      const isEdgeStart = touchStart.current.x < 50; // Started from left edge (increased to 50px for better detection)
      
      // Check if it's mostly horizontal and valid back gesture
      if (isRightSwipe && isEdgeStart && Math.abs(distanceY) < 60) {
          // Only go back if we are not on the dashboard (root)
          if (view !== 'dashboard') {
             window.history.back();
          }
      }
  };

  if (authLoading) return <div className="h-screen w-full flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;

  if (!session) {
    return <Login />;
  }

  if (!isDataReady) return <div className="h-full w-full flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div 
      className="h-[100dvh] w-full overflow-hidden bg-transparent relative selection:bg-[var(--accent)]/30 flex flex-col md:flex-row"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <BackgroundGlow />
      
      {/* Global Live Agent */}
      {showLiveAgent && (
        <LiveAudioAgent 
          onClose={() => setShowLiveAgent(false)} 
          userName={userName}
          tasks={tasks}
          thoughts={thoughts}
          journal={journal}
          projects={projects}
          habits={habits}
          memories={memories}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onLiveTextStream={handleLiveTextStream}
          onAddThought={t => { setThoughts(prev => [t, ...prev]); persist('thoughts', t); }}
          onUpdateThought={handleUpdateThought}
          onDeleteThought={handleDeleteThought}
          onAddJournal={handleAddJournalEntry}
          onAddProject={p => { setProjects(prev => [p, ...prev]); persist('projects', p); }}
          onUpdateProject={handleUpdateProject}
          onAddMemory={m => { setMemories(prev => [m, ...prev]); persist('memories', m); }}
          onSetTheme={setCurrentTheme}
          onStartFocus={handleStartFocus}
        />
      )}

      {/* Live Text Stream Overlay */}
      {showLiveAgent && liveStreamText && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-black/60 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full shadow-2xl pointer-events-none max-w-md w-full text-center animate-in fade-in slide-in-from-top-4">
              <p className="text-emerald-400 text-sm font-mono tracking-wide mb-1">СЕРАФИМ ПИШЕТ...</p>
              <p className="text-white/90 text-sm leading-relaxed">{liveStreamText}</p>
          </div>
      )}

      {/* Hidden button for programmatic trigger from Dashboard */}
      <button id="sidebar-trigger" className="hidden" onClick={() => setIsSidebarOpen(true)}></button>

      {/* SIDEBAR (Responsive) */}
      <Sidebar 
        currentView={view} 
        onNavigate={navigateTo} 
        onOpenSettings={() => setShowSettings(true)}
        onOpenHistory={() => setShowChatHistory(true)}
        onVoiceChat={() => setShowLiveAgent(true)} 
        onStartFocus={handleStartFocus}
        userName={userName}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* MAIN CONTENT AREA */}
      <div 
        className={`flex-1 h-full flex flex-col bg-transparent transition-all duration-300 relative ${isModalOpen ? 'scale-[0.99] opacity-80 rounded-[2rem] overflow-hidden pointer-events-none brightness-50' : ''}`}
        style={{ transformOrigin: 'center center' }}
      >
        <main className="flex-1 relative overflow-hidden z-10 md:pb-0">
          {view === 'dashboard' && (
              <Dashboard 
                  tasks={tasks} 
                  thoughts={thoughts} 
                  journal={journal} 
                  projects={projects} 
                  habits={habits} 
                  onAddTask={handleAddTask} 
                  onAddProject={p => { setProjects([p, ...projects]); persist('projects', p); }} 
                  onAddThought={t => { setThoughts([t, ...thoughts]); persist('thoughts', t); }} 
                  onNavigate={navigateTo} 
                  onToggleTask={(id, updates) => handleUpdateTask(id, updates || { isCompleted: !tasks.find(t=>t.id===id)?.isCompleted })}
                  onDeleteTask={handleDeleteTask}
                  onAddHabit={handleAddHabit}
                  onToggleHabit={handleToggleHabit}
                  onDeleteHabit={handleDeleteHabit}
                  onOpenQuotes={() => setShowQuotes(true)}
                  onStartLiveAudio={() => setShowLiveAgent(true)} // Pass handler
              />
          )}
          {view === 'chat' && (
            <Mentorship 
              tasks={tasks} thoughts={thoughts} journal={journal} projects={projects} habits={habits} memories={memories}
              sessions={sessions} activeSessionId={activeSessionId} onSelectSession={handleSelectSession}
              onUpdateMessages={(msgs) => { 
                  const sessionIndex = sessions.findIndex(s => s.id === activeSessionId);
                  if (sessionIndex === -1) return;
                  const updatedSession = { ...sessions[sessionIndex], messages: msgs, lastInteraction: Date.now() };
                  const newSessions = [...sessions];
                  newSessions[sessionIndex] = updatedSession;
                  setSessions(newSessions);
                  persist('chat_sessions', updatedSession);
              }}
              onNewSession={(title, cat) => { const ns = { id: Date.now().toString(), title, category: cat, messages: [], lastInteraction: Date.now(), createdAt: new Date().toISOString() }; setSessions(prev => [ns, ...prev]); setActiveSessionId(ns.id); persist('chat_sessions', ns); }}
              onDeleteSession={id => { setSessions(prev => prev.filter(s => s.id !== id)); if(activeSessionId === id) setActiveSessionId(null); remove('chat_sessions', id); }}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onAddThought={t => { setThoughts(prev => [t, ...prev]); persist('thoughts', t); }}
              onUpdateThought={handleUpdateThought}
              onDeleteThought={handleDeleteThought}
              onAddProject={p => { setProjects(prev => [p, ...prev]); persist('projects', p); }}
              onUpdateProject={handleUpdateProject}
              onAddHabit={handleAddHabit}
              onAddMemory={m => { setMemories(prev => [m, ...prev]); persist('memories', m); }}
              onAddJournal={handleAddJournalEntry} 
              onSetTheme={setCurrentTheme}
              onStartFocus={handleStartFocus}
              hasAiKey={hasAiKey}
              onConnectAI={() => setShowSettings(true)}
              voiceTrigger={voiceTrigger}
              userName={userName}
              session={session}
              onStartLiveAudio={() => setShowLiveAgent(true)} 
              onOpenHistory={() => setShowChatHistory(true)}
            />
          )}
          {/* ... other views ... */}
          {view === 'journal' && (
              <JournalView 
                  journal={journal} 
                  tasks={tasks} 
                  onNavigate={navigateTo}
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
                  const newItem = {
                    id: Date.now().toString(), 
                    content: c, 
                    type: t, 
                    tags, 
                    category: metadata?.category,
                    createdAt: new Date().toISOString(), 
                    metadata
                  };
                  setThoughts([newItem, ...thoughts]); 
                  persist('thoughts', newItem);
              }} 
              onUpdate={handleUpdateThought}
              onDelete={id => { setThoughts(thoughts.filter(t => t.id !== id)); remove('thoughts', id); }} 
              onNavigate={navigateTo}
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
              onNavigate={navigateTo}
            />
          )}
          {view === 'projects' && (
            <ProjectsView 
              projects={projects} 
              tasks={tasks} 
              thoughts={thoughts} 
              onAddProject={p => { setProjects([p, ...projects]); persist('projects', p); }} 
              onUpdateProject={handleUpdateProject}
              onDeleteProject={id => { setProjects(prev => prev.filter(p => p.id !== id)); remove('projects', id); }} 
              onAddTask={handleAddTask} 
              onUpdateTask={handleUpdateTask} 
              onToggleTask={id => handleUpdateTask(id, { isCompleted: !tasks.find(t=>t.id===id)?.isCompleted })} 
              onDeleteTask={handleDeleteTask} 
              onAddThought={t => { setThoughts([t, ...thoughts]); persist('thoughts', t); }}
              onUpdateThought={handleUpdateThought}
              onDeleteThought={id => { setThoughts(prev => prev.filter(t => t.id !== id)); remove('thoughts', id); }}
              onNavigate={navigateTo}
            />
          )}
          {view === 'analytics' && <AnalyticsView tasks={tasks} habits={habits} journal={journal} currentTheme={currentTheme} onNavigate={navigateTo} />}
        </main>
      </div>

      {showTimer && <FocusTimer onClose={() => setShowTimer(false)} />}
      {showQuotes && (
          <QuotesLibrary 
            myQuotes={thoughts} 
            onAddQuote={(text, author, cat) => { 
                const q: Thought = { 
                  id: Date.now().toString(), 
                  content: text, 
                  notes: author, // Store author in notes
                  type: 'quote', 
                  tags: [cat], 
                  category: 'Wisdom', // Explicit category for quotes
                  createdAt: new Date().toISOString() 
                }; 
                setThoughts([q, ...thoughts]); 
                persist('thoughts', q); 
            }} 
            onDeleteQuote={(id) => { setThoughts(thoughts.filter(t => t.id !== id)); remove('thoughts', id); }} 
            onClose={() => setShowQuotes(false)} 
          />
      )}
      
      {showChatHistory && (
        <ChatHistoryModal 
          sessions={sessions} 
          activeSessionId={activeSessionId}
          projects={projects}
          onSelectSession={(id) => { handleSelectSession(id); navigateTo('chat'); setShowChatHistory(false); }}
          onNewSession={(title, projectId) => {
             const ns: ChatSession = { id: Date.now().toString(), title, category: 'general', projectId: projectId, messages: [], lastInteraction: Date.now(), createdAt: new Date().toISOString() };
             setSessions(prev => [ns, ...prev]); setActiveSessionId(ns.id); persist('chat_sessions', ns); navigateTo('chat'); setShowChatHistory(false);
          }}
          onDeleteSession={(id) => { setSessions(prev => prev.filter(s => s.id !== id)); if(activeSessionId === id) setActiveSessionId(null); remove('chat_sessions', id); }}
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
