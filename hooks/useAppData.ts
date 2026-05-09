import { useState, useEffect } from 'react';
import { Task, Thought, JournalEntry, Project, Habit, ChatSession, Memory, TrashItem } from '../types';
import { dbService } from '../services/dbService';
import { supabase } from '../services/supabaseClient';
import { logger } from '../services/logger';

export const useAppData = (userId: string | undefined, authLoading: boolean) => {
  const [isDataReady, setIsDataReady] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

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

    const handleOnline = () => {
      logger.log('System', 'Internet restored. Syncing...', 'info');
      if (userId) {
        dbService.syncAllTables();
      }
    };
  
    window.addEventListener('online', handleOnline);
  
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [userId, authLoading]);

  // --- REALTIME SYNC ---
  useEffect(() => {
    if (!userId) return;

    let retryTimer: NodeJS.Timeout;

    const setupChannel = () => {
        logger.log('Sync', 'Initializing Realtime Sync...', 'info');
        
        const channel = supabase.channel('db-changes', {
            config: {
                presence: { key: userId },
            }
        })
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
            const { table, eventType, new: newRecord, old: oldRecord } = payload;
            
            const handleUpdate = async () => {
                 const newRecordData = newRecord as any;
                 if (newRecordData && newRecordData.user_id && newRecordData.user_id !== userId) return;
                 
                 logger.log('Sync', `Realtime payload received for ${table}: ${eventType}`, 'success');
                 
                 if (eventType === 'INSERT' || eventType === 'UPDATE') {
                     const item = dbService.mapFromSnakeCase(newRecord);
                     await dbService.saveItem(table, item, false);
                     
                     switch(table) {
                         case 'tasks': setTasks(prev => {
                             const exists = prev.find(p => p.id === item.id);
                             if (exists) return prev.map(p => p.id === item.id ? item : p);
                             return [...prev, item];
                         }); break;
                         case 'thoughts': setThoughts(prev => {
                             const exists = prev.find(p => p.id === item.id);
                             if (exists) return prev.map(p => p.id === item.id ? item : p);
                             return [item, ...prev];
                         }); break;
                         case 'journal': setJournal(prev => {
                             const exists = prev.find(p => p.id === item.id);
                             if (exists) return prev.map(p => p.id === item.id ? item : p);
                             return [item, ...prev];
                         }); break;
                         case 'projects': setProjects(prev => {
                             const exists = prev.find(p => p.id === item.id);
                             if (exists) return prev.map(p => p.id === item.id ? item : p);
                             return [...prev, item];
                         }); break;
                         case 'habits': setHabits(prev => {
                             const exists = prev.find(p => p.id === item.id);
                             if (exists) return prev.map(p => p.id === item.id ? item : p);
                             return [...prev, item];
                         }); break;
                         case 'chat_sessions': setSessions(prev => {
                             const exists = prev.find(p => p.id === item.id);
                             if (exists) return prev.map(p => p.id === item.id ? item : p);
                             return [...prev, item];
                         }); break;
                         case 'memories': setMemories(prev => {
                             const exists = prev.find(p => p.id === item.id);
                             if (exists) return prev.map(p => p.id === item.id ? item : p);
                             return [...prev, item];
                         }); break;
                     }
                 } else if (eventType === 'DELETE') {
                     const id = oldRecord.id;
                     await dbService.deleteItem(table, id, false);
                     
                     switch(table) {
                         case 'tasks': setTasks(prev => prev.filter(p => p.id !== id)); break;
                         case 'thoughts': setThoughts(prev => prev.filter(p => p.id !== id)); break;
                         case 'journal': setJournal(prev => prev.filter(p => p.id !== id)); break;
                         case 'projects': setProjects(prev => prev.filter(p => p.id !== id)); break;
                         case 'habits': setHabits(prev => prev.filter(p => p.id !== id)); break;
                         case 'chat_sessions': setSessions(prev => prev.filter(p => p.id !== id)); break;
                         case 'memories': setMemories(prev => prev.filter(p => p.id !== id)); break;
                     }
                 }
            };
            
            handleUpdate();
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                logger.log('Sync', 'Connected to Realtime successfully.', 'success');
            } else if (status === 'CLOSED') {
                logger.log('Sync', 'Realtime connection closed.', 'error');
            } else if (status === 'CHANNEL_ERROR') {
                logger.log('Sync', 'Realtime channel error. Retrying...', 'error');
                clearTimeout(retryTimer);
                retryTimer = setTimeout(setupChannel, 5000);
            }
        });

        return channel;
    };

    const channel = setupChannel();

    return () => {
      clearTimeout(retryTimer);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const persist = (store: string, item: any) => { dbService.saveItem(store, item); };
  const remove = (store: string, id: string) => { dbService.deleteItem(store, id); };

  const removeToTrash = (store: string, id: string, itemList: any[]) => {
      const item = itemList.find(i => i.id === id);
      if (item) {
          const trashItem: TrashItem = {
              id: item.id,
              storeName: store,
              originalItem: item,
              deletedAt: new Date().toISOString()
          };
          dbService.saveItem('trash', trashItem, false);
      }
      remove(store, id);
  };

  const handleUpdateMemory = (id: string, updates: Partial<Memory>) => {
    setMemories(prev => {
      const existing = prev.find(m => m.id === id);
      if (!existing) return prev;
      const updated = { ...existing, ...updates };
      persist('memories', updated);
      return prev.map(m => m.id === id ? updated : m);
    });
  };

  const handleDeleteMemory = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    removeToTrash('memories', id, memories);
  };

  const handleSelectSession = async (newId: string) => {
      const oldSessionId = activeSessionId;
      setActiveSessionId(newId);

      if (oldSessionId && oldSessionId !== newId) {
          const oldSession = sessions.find(s => s.id === oldSessionId);
          if (oldSession && (oldSession.messages || []).length >= 4 && !oldSession.summary) {
              logger.log('Memory', `Compressing session ${oldSession.title}...`, 'info');
              // generateSessionSummary must be passed or imported, but we'll import it at top
              import('../services/geminiService').then(({ generateSessionSummary }) => {
                generateSessionSummary(oldSession.messages).then(summary => {
                    if (summary) {
                        const updatedSession = { ...oldSession, summary };
                        setSessions(prev => prev.map(s => s.id === oldSessionId ? updatedSession : s));
                        persist('chat_sessions', updatedSession);
                        logger.log('Memory', 'Session compressed and saved.', 'success');
                    }
                });
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
      removeToTrash('tasks', id, tasks);
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
    removeToTrash('thoughts', id, thoughts);
  };
  const handleAddHabit = (habit: Habit) => { setHabits(prev => [habit, ...prev]); persist('habits', habit); };
  const handleToggleHabit = (id: string, date: string) => {
    const habit = habits.find(h => h.id === id);
    if (habit) { const exists = habit.completedDates.includes(date); const newHabit = { ...habit, completedDates: exists ? habit.completedDates.filter(d => d !== date) : [...habit.completedDates, date] }; setHabits(prev => prev.map(h => h.id === id ? newHabit : h)); persist('habits', newHabit); }
  };
  const handleDeleteHabit = (id: string) => { setHabits(prev => prev.filter(h => h.id !== id)); removeToTrash('habits', id, habits); };
  
  const handleRestoreTrash = (item: TrashItem) => {
     dbService.saveItem(item.storeName, item.originalItem);
     switch(item.storeName) {
        case 'tasks': setTasks(prev => [...prev, item.originalItem]); break;
        case 'thoughts': setThoughts(prev => [...prev, item.originalItem]); break;
        case 'projects': setProjects(prev => [...prev, item.originalItem]); break;
        case 'habits': setHabits(prev => [...prev, item.originalItem]); break;
        case 'memories': setMemories(prev => [...prev, item.originalItem]); break;
        case 'chat_sessions': setSessions(prev => [...prev, item.originalItem]); break;
        case 'journal': setJournal(prev => [...prev, item.originalItem]); break;
     }
     dbService.deleteItem('trash', item.id, false);
  };

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

  return {
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
  };
};
