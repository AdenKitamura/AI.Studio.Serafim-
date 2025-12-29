
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
import { 
  Zap, Loader2, Settings as SettingsIcon
} from 'lucide-react';

const App = () => {
  const [isDataReady, setIsDataReady] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('sb_user_name') || '');
  const [view, setView] = useState<ViewState>('dashboard');
  
  // Customization State
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(() => (localStorage.getItem('sb_theme') || 'slate') as ThemeKey);
  const [currentFont, setCurrentFont] = useState<FontFamily>(() => (localStorage.getItem('sb_font') || 'Plus Jakarta Sans') as FontFamily);
  const [iconWeight, setIconWeight] = useState<IconWeight>(() => (localStorage.getItem('sb_icon_weight') || '2px') as IconWeight);
  const [textureType, setTextureType] = useState<TextureType>(() => (localStorage.getItem('sb_texture_type') || 'noise') as TextureType);

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
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [voiceTrigger, setVoiceTrigger] = useState(0);

  // --- THEME & APPEARANCE HANDLING ---
  useEffect(() => {
    const theme = themes[currentTheme];
    const root = document.documentElement;
    const body = document.body;

    // Apply Colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value as string);
    });

    // Apply Font
    root.style.setProperty('--app-font', `"${currentFont}", sans-serif`);
    if (currentFont === 'Playfair Display') {
       root.style.setProperty('--app-font', `"${currentFont}", serif`);
    }
    
    // Apply Icon Weight
    root.style.setProperty('--icon-weight', iconWeight);

    // Apply Attributes
    body.setAttribute('data-theme-type', theme.type);
    body.setAttribute('data-texture', textureType);

    // Save preferences
    localStorage.setItem('sb_theme', currentTheme);
    localStorage.setItem('sb_font', currentFont);
    localStorage.setItem('sb_icon_weight', iconWeight);
    localStorage.setItem('sb_texture_type', textureType);

  }, [currentTheme, currentFont, iconWeight, textureType]);

  // --- DATA LOADING ---
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try migration first
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

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleStartFocus = (mins: number) => {
    setShowTimer(true);
  };

  const navigateTo = (newView: ViewState) => {
    setView(newView);
  };
  
  const hasAiKey = useMemo(() => !!process.env.API_KEY, []);

  // Handle Onboarding Completion
  const handleOnboardingComplete = (name: string) => {
    setUserName(name);
    localStorage.setItem('sb_user_name', name);
    setTimeout(() => setShowPWAInstall(true), 1000);
  };

  if (!userName && isDataReady) return <Onboarding onComplete={handleOnboardingComplete} />;
  if (!isDataReady) return <div className="h-full w-full flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className={`h-[100dvh] w-full overflow-hidden flex flex-col relative transition-all duration-700`}>
      
      {/* GLOBAL HEADER */}
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
          <button onClick={() => setShowTimer(!showTimer)} className="w-11 h-11 rounded-2xl flex items-center justify-center glass-panel text-[var(--accent)] hover:text-white transition-all hover:bg-[var(--accent)] glass-btn"><Zap size={20} /></button>
          <button onClick={() => setShowSettings(true)} className="w-11 h-11 rounded-2xl glass-panel flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-item)] hover:text-[var(--text-main)] transition-all glass-btn"><SettingsIcon size={20} /></button>
        </div>
      </header>

      <Ticker thoughts={thoughts} onClick={() => setShowQuotes(true)} />

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
        {view === 'thoughts' && <ThoughtsView thoughts={thoughts} onAdd={(c, t, tags, metadata) => setThoughts([{id: Date.now().toString(), content: c, type: t, tags, createdAt: new Date().toISOString(), metadata}, ...thoughts])} onDelete={id => setThoughts(thoughts.filter(t => t.id !== id))} />}
        {view === 'planner' && (
          <PlannerView 
            tasks={tasks} 
            projects={projects} 
            habits={habits} 
            thoughts={thoughts}
            onAddTask={t => setTasks([t, ...tasks])} 
            onToggleTask={id => handleUpdateTask(id, { isCompleted: !tasks.find(t=>t.id===id)?.isCompleted })} 
            onAddThought={t => setThoughts([t, ...thoughts])}
            onUpdateThought={t => setThoughts(prev => prev.map(prevT => prevT.id === t.id ? t : prevT))}
            onDeleteThought={id => setThoughts(prev => prev.filter(t => t.id !== id))}
          />
        )}
        {view === 'projects' && <ProjectsView projects={projects} tasks={tasks} thoughts={thoughts} onAddProject={p => setProjects([p, ...projects])} onDeleteProject={id => setProjects(projects.filter(p => p.id !== id))} onAddTask={t => setTasks([t, ...tasks])} onToggleTask={id => handleUpdateTask(id, { isCompleted: !tasks.find(t=>t.id===id)?.isCompleted })} onDeleteTask={id => setTasks(tasks.filter(t => t.id !== id))} />}
        {view === 'analytics' && <AnalyticsView tasks={tasks} habits={habits} journal={journal} currentTheme={currentTheme} onClose={() => navigateTo('dashboard')} />}
      </main>
      
      {/* PRIMARY NAVIGATION FAB */}
      <Fab 
        onNavigate={navigateTo}
        currentView={view}
        onAddTask={() => { setView('planner'); }} 
        onAddThought={(type) => { setView('thoughts'); /* Trigger add logic inside view if needed */ }}
        onAddJournal={() => { setView('journal'); }}
        onOpenQuotes={() => setShowQuotes(true)}
        onVoiceChat={() => { setView('chat'); setVoiceTrigger(v => v + 1); }}
      />

      {showTimer && <FocusTimer onClose={() => setShowTimer(false)} />}
      {showQuotes && <QuotesLibrary myQuotes={thoughts} onAddQuote={(text, author, cat) => setThoughts([{id: Date.now().toString(), content: text, author, type: 'quote', tags: [cat], createdAt: new Date().toISOString()}, ...thoughts])} onDeleteQuote={(id) => setThoughts(thoughts.filter(t => t.id !== id))} onClose={() => setShowQuotes(false)} />}
      
      {showChatHistory && (
        <ChatHistoryModal 
          sessions={sessions} 
          activeSessionId={activeSessionId}
          projects={projects}
          onSelectSession={(id) => { setActiveSessionId(id); setView('chat'); setShowChatHistory(false); }}
          onNewSession={(title, projectId) => {
             const ns: ChatSession = { 
               id: Date.now().toString(), 
               title, 
               category: 'general', // Default or legacy
               projectId: projectId, // Link to project
               messages: [], 
               lastInteraction: Date.now(), 
               createdAt: new Date().toISOString() 
             };
             setSessions(prev => [ns, ...prev]); 
             setActiveSessionId(ns.id); 
             setView('chat'); 
             setShowChatHistory(false);
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
          customization={{
            font: currentFont,
            setFont: setCurrentFont,
            iconWeight,
            setIconWeight,
            texture: textureType,
            setTexture: setTextureType
          }}
        />
      )}

      {showPWAInstall && <PWAInstallPrompt onClose={() => setShowPWAInstall(false)} />}
    </div>
  );
};

export default App;
