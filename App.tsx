import React, { useState, useMemo, useRef } from 'react';
import { Task, Thought, ChatSession } from './types';
import Mentorship from './components/Mentorship';
import PlannerView from './components/PlannerView';
import JournalView from './components/JournalView';
import ProjectsView from './components/ProjectsView';
import ThoughtsView from './components/ThoughtsView';
import ProfileModal from './components/ProfileModal';
import FocusTimer from './components/FocusTimer';
import Dashboard from './components/Dashboard';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import QuotesLibrary from './components/QuotesLibrary';
import ChatHistoryModal from './components/ChatHistoryModal';
import Login from './components/Login'; 
import Sidebar from './components/Sidebar'; 
import { FallingPattern } from '@/components/ui/falling-pattern';
import { Loader2 } from 'lucide-react';
import LiveAudioAgent from './components/LiveAudioAgent';
import TrashModal from './components/TrashModal';

import { useAuth } from './hooks/useAuth';
import { useThemeManager } from './hooks/useThemeManager';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useAppData } from './hooks/useAppData';

const App = () => {
  const { session, authLoading, userId, userName } = useAuth();
  const { currentTheme, setCurrentTheme, currentFont, setCurrentFont, iconWeight, setIconWeight, geminiModel, setGeminiModel } = useThemeManager();
  const {
      view, isSidebarOpen, showSettings, showTimer, showPWAInstall, showQuotes, 
      showChatHistory, showLiveAgent, showTrash, 
      setShowLiveAgent, openModal, closeGlobalModal, navigateTo, isModalOpen
  } = useAppNavigation();

  const {
      isDataReady,
      tasks, setTasks,
      thoughts, setThoughts,
      journal, setJournal,
      projects, setProjects,
      habits, setHabits,
      sessions, setSessions,
      memories, setMemories,
      activeSessionId, setActiveSessionId,
      handleUpdateMemory,
      handleDeleteMemory,
      handleSelectSession,
      handleAddTask,
      handleUpdateTask,
      handleDeleteTask,
      handleUpdateProject,
      handleUpdateThought,
      handleDeleteThought,
      handleAddHabit,
      handleToggleHabit,
      handleDeleteHabit,
      handleRestoreTrash,
      handleAddJournalEntry,
      removeToTrash,
      persist,
      remove
  } = useAppData(userId, authLoading);

  const [voiceTrigger, setVoiceTrigger] = useState(0);
  const [liveStreamText, setLiveStreamText] = useState<string>('');
  const liveTextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLiveTextStream = (text: string) => {
      setLiveStreamText(prev => {
          const newText = prev + text;
          return newText.length > 200 ? newText.slice(-200) : newText; 
      });
      
      if (liveTextTimeoutRef.current) clearTimeout(liveTextTimeoutRef.current);
      liveTextTimeoutRef.current = setTimeout(() => setLiveStreamText(''), 4000);
  };

  const handleStartFocus = (mins?: number) => { openModal('timer'); };

  const hasAiKey = useMemo(() => {
     if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_GOOGLE_API_KEY) return true;
     // @ts-ignore
     if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_API_KEY) return true;
     return false;
  }, []);

  if (authLoading) return <div className="h-screen w-full flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;

  if (!session) {
    return <Login />;
  }

  if (!isDataReady) return <div className="h-full w-full flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-transparent relative selection:bg-[var(--accent)]/30 flex flex-col md:flex-row">
      <div className="absolute inset-0 -z-10 opacity-60">
        <FallingPattern />
      </div>
      
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
          onUpdateMemory={handleUpdateMemory}
          onDeleteMemory={handleDeleteMemory}
          onSetTheme={setCurrentTheme}
          onStartFocus={handleStartFocus}
          onToggleHabit={handleToggleHabit}
        />
      )}

      {showLiveAgent && liveStreamText && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-black/60 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full shadow-2xl pointer-events-none max-w-md w-full text-center animate-in fade-in slide-in-from-top-4">
              <p className="text-emerald-400 text-sm font-mono tracking-wide mb-1">СЕРАФИМ ПИШЕТ...</p>
              <p className="text-white/90 text-sm leading-relaxed">{liveStreamText}</p>
          </div>
      )}

      <button id="sidebar-trigger" className="hidden" onClick={() => openModal('sidebar')}></button>

      <Sidebar 
        currentView={view} 
        onNavigate={navigateTo} 
        onOpenSettings={() => openModal('settings')}
        onOpenHistory={() => openModal('chatHistory')}
        onOpenTrash={() => openModal('trash')}
        onVoiceChat={() => openModal('liveAgent')} 
        onStartFocus={handleStartFocus}
        userName={userName}
        isOpen={isSidebarOpen}
        onClose={closeGlobalModal}
      />

      <div 
        className={`flex-1 h-full flex flex-col bg-transparent transition-all duration-300 relative ${isModalOpen && view !== "dashboard" ? 'scale-[0.99] opacity-80 rounded-[2rem] overflow-hidden pointer-events-none brightness-50' : ''}`}
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
                  onOpenQuotes={() => openModal('quotes')}
                  onStartLiveAudio={() => openModal('liveAgent')}
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
              onDeleteSession={id => { setSessions(prev => prev.filter(s => s.id !== id)); if(activeSessionId === id) setActiveSessionId(null); removeToTrash('chat_sessions', id, sessions); }}
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
              onUpdateMemory={handleUpdateMemory}
              onDeleteMemory={handleDeleteMemory}
              onAddJournal={handleAddJournalEntry} 
              onSetTheme={setCurrentTheme}
              onStartFocus={handleStartFocus}
              hasAiKey={hasAiKey}
              onConnectAI={() => openModal('settings')}
              voiceTrigger={voiceTrigger}
              userName={userName}
              session={session}
              onStartLiveAudio={() => openModal('liveAgent')} 
              onOpenHistory={() => openModal('chatHistory')}
            />
          )}
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
              onDelete={id => { setThoughts(thoughts.filter(t => t.id !== id)); removeToTrash('thoughts', id, thoughts); }} 
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
              onDeleteThought={id => { setThoughts(prev => prev.filter(t => t.id !== id)); removeToTrash('thoughts', id, thoughts); }}
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
              onDeleteProject={id => { setProjects(prev => prev.filter(p => p.id !== id)); removeToTrash('projects', id, projects); }} 
              onAddTask={handleAddTask} 
              onUpdateTask={handleUpdateTask} 
              onToggleTask={id => handleUpdateTask(id, { isCompleted: !tasks.find(t=>t.id===id)?.isCompleted })} 
              onDeleteTask={handleDeleteTask} 
              onAddThought={t => { setThoughts([t, ...thoughts]); persist('thoughts', t); }}
              onUpdateThought={handleUpdateThought}
              onDeleteThought={id => { setThoughts(prev => prev.filter(t => t.id !== id)); removeToTrash('thoughts', id, thoughts); }}
              onNavigate={navigateTo}
            />
          )}
        </main>
      </div>

      {showTimer && <FocusTimer onClose={closeGlobalModal} />}
      {showQuotes && (
          <QuotesLibrary 
            myQuotes={thoughts} 
            onAddQuote={(text, author, cat) => { 
                const q: Thought = { 
                  id: Date.now().toString(), 
                  content: text, 
                  notes: author,
                  type: 'quote', 
                  tags: [cat], 
                  category: 'Wisdom',
                  createdAt: new Date().toISOString() 
                }; 
                setThoughts([q, ...thoughts]); 
                persist('thoughts', q); 
            }} 
            onDeleteQuote={(id) => { setThoughts(thoughts.filter(t => t.id !== id)); removeToTrash('thoughts', id, thoughts); }} 
            onClose={closeGlobalModal} 
          />
      )}
      
      {showChatHistory && (
        <ChatHistoryModal 
          sessions={sessions} 
          activeSessionId={activeSessionId}
          projects={projects}
          onSelectSession={(id) => { handleSelectSession(id); navigateTo('chat'); }}
          onNewSession={(title, projectId) => {
             const ns: ChatSession = { id: Date.now().toString(), title, category: 'general', projectId: projectId, messages: [], lastInteraction: Date.now(), createdAt: new Date().toISOString() };
             setSessions(prev => [ns, ...prev]); setActiveSessionId(ns.id); persist('chat_sessions', ns); navigateTo('chat');
          }}
          onDeleteSession={(id) => { setSessions(prev => prev.filter(s => s.id !== id)); if(activeSessionId === id) setActiveSessionId(null); removeToTrash('chat_sessions', id, sessions); }}
          onClose={closeGlobalModal}
        />
      )}

      {showTrash && (
        <TrashModal 
          onClose={closeGlobalModal} 
          onRestore={handleRestoreTrash} 
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
          onClose={closeGlobalModal} 
          onImport={d => {setTasks(d.tasks || []); setThoughts(d.thoughts || []); persist('tasks', d.tasks || []); persist('thoughts', d.thoughts || []);}} 
          hasAiKey={hasAiKey}
          session={session}
          customization={{ font: currentFont, setFont: setCurrentFont, iconWeight, setIconWeight, texture: 'none', setTexture: () => {} }}
        />
      )}

      {showPWAInstall && <PWAInstallPrompt onClose={closeGlobalModal} />}
    </div>
  );
};

export default App;
