import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Mic, MicOff, X, Loader2, AudioLines, Minimize2, Maximize2, Square, Activity } from 'lucide-react';
import { logger } from '../services/logger';
import { Task, Thought, JournalEntry, Project, Habit, Memory, Priority, ThemeKey, ChatMessage } from '../types';
import { format } from 'date-fns';
import { generateSystemInstruction } from '../services/serafimPersona';
import { generateSessionSummary } from '../services/geminiService';
import { createGithubIssue } from '../services/githubService';

interface LiveAudioAgentProps {
  onClose: () => void;
  userName: string;
  tasks: Task[];
  thoughts: Thought[];
  journal: JournalEntry[];
  projects: Project[];
  habits: Habit[];
  memories: Memory[];
  chatHistory?: ChatMessage[];
  onLiveSessionEnd?: (summary: string) => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onAddThought: (thought: Thought) => void;
  onUpdateThought: (id: string, updates: Partial<Thought>) => void;
  onDeleteThought: (id: string) => void;
  onAddJournal: (entry: Partial<JournalEntry>) => void;
  onAddProject: (project: Project) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onAddMemory: (memory: Memory) => void;
  onUpdateMemory: (id: string, updates: Partial<Memory>) => void;
  onDeleteMemory: (id: string) => void;
  onSetTheme: (theme: ThemeKey) => void;
  onStartFocus: (minutes: number) => void;
  onDeleteTask: (id: string) => void;
  onLiveTextStream?: (text: string) => void;
  onToggleHabit?: (id: string, date: string) => void;
}

const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env?.REACT_APP_GOOGLE_API_KEY) {
    return process.env.REACT_APP_GOOGLE_API_KEY;
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_GOOGLE_API_KEY;
  }
  return '';
};

const tools: FunctionDeclaration[] = [
  {
    name: "manage_task",
    description: "Управление задачами. Создание, выполнение или удаление.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "complete", "delete"] },
        id: { type: Type.STRING, description: "ID задачи (обязательно для complete/delete)" },
        title: { type: Type.STRING, description: "Название задачи (для create)" },
        priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
      },
      required: ["action"]
    }
  },
  {
    name: "manage_note",
    description: "Управление заметками (ранее 'идеи'). Используй mode='append' для дописывания текста.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "update", "delete"] },
        id: { type: Type.STRING, description: "ID заметки (если есть)" },
        title: { type: Type.STRING, description: "Заголовок заметки (для поиска или создания)" },
        content: { type: Type.STRING, description: "Текст заметки" },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        mode: { type: Type.STRING, enum: ["replace", "append"] }
      },
      required: ["action"]
    }
  },
  {
    name: "manage_project",
    description: "Управление долгосрочными проектами.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "update", "delete"] },
        id: { type: Type.STRING },
        title: { type: Type.STRING },
        description: { type: Type.STRING }
      },
      required: ["action"]
    }
  },
  {
    name: "toggle_habit",
    description: "Отметить привычку как выполненную на сегодня.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "ID привычки из контекста" }
      },
      required: ["id"]
    }
  },
  {
    name: "save_journal",
    description: "Сделать запись в личный дневник (рефлексия, итоги дня).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING },
        mood: { type: Type.STRING, enum: ["😔", "😐", "🙂", "😃", "🤩"] }
      },
      required: ["content", "mood"]
    }
  },
  {
    name: "manage_memory",
    description: "Управление памятью (фактами). Используй для сохранения важных деталей о пользователе.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "update", "delete"] },
        id: { type: Type.STRING, description: "ID факта (для update/delete)" },
        content: { type: Type.STRING, description: "Текст факта" },
        type: { type: Type.STRING, enum: ["short_term", "long_term"], description: "Тип памяти. short_term - для текущих дел, long_term - для биографии и важных фактов." }
      },
      required: ["action"]
    }
  },
  {
    name: "ui_control",
    description: "Управление интерфейсом (темы, фокус-таймер).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, enum: ["set_theme", "start_focus"] },
        value: { type: Type.STRING, description: "Название темы или минуты для таймера" }
      },
      required: ["command"]
    }
  },
  {
    name: "create_dev_ticket",
    description: "Отправляет баг-репорт или идею для новой фичи напрямую в GitHub репозиторий разработчика.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Краткий заголовок проблемы/фичи." },
        body: { type: Type.STRING, description: "Подробное ТЗ или шаги воспроизведения бага в формате Markdown." },
        labels: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Массив тегов, выбери из ['bug', 'enhancement', 'design', 'ai_logic']." }
      },
      required: ["title", "body"]
    }
  },
  {
    name: "check_updates",
    description: "Проверяет наличие готовых патчей кода (Pull Requests), ожидающих одобрения пользователя.",
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  }
];

const LiveAudioAgent: React.FC<LiveAudioAgentProps> = ({ 
  onClose, userName, 
  tasks, thoughts, journal, projects, habits, memories,
  chatHistory, onLiveSessionEnd,
  onAddTask, onUpdateTask, onDeleteTask, onAddThought, onUpdateThought, onDeleteThought, onAddJournal, onAddProject, onUpdateProject, onAddMemory, onUpdateMemory, onDeleteMemory, onSetTheme, onStartFocus, onLiveTextStream, onToggleHabit
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const sessionTranscriptRef = useRef<ChatMessage[]>([]);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopAudioPlayback = () => {
      if (activeSourceRef.current) {
          try {
              activeSourceRef.current.stop();
          } catch (e) {
              // Ignore
          }
          activeSourceRef.current = null;
      }
      
      // Reset scheduling
      if (audioContextRef.current) {
          nextPlayTimeRef.current = audioContextRef.current.currentTime;
      }
      
      playbackQueueRef.current = [];
      isPlayingRef.current = false;
      setIsSpeaking(false);
      
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
  };

  const handleClose = async () => {
      if (sessionTranscriptRef.current.length > 0 && onLiveSessionEnd) {
          setStatusMessage("Сохраняю итоги сессии...");
          setIsConnecting(true); // Show loading UI
          try {
              const summary = await generateSessionSummary(sessionTranscriptRef.current);
              onLiveSessionEnd(summary);
          } catch (e) {
              console.error("Failed to summarize session", e);
          }
      }
      onClose();
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Если открыт голосовой агент или идет генерация - блокируем закрытие
      if (isConnected) {
        e.preventDefault();
        e.returnValue = ''; // Эта строка нужна для Chrome, чтобы показать окно "Покинуть сайт?"
      }
    };
  
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isConnected]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  const reconnectAttemptsRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const isManualCloseRef = useRef(false);

  // --- REFS FOR STALE CLOSURE FIX ---
  const tasksRef = useRef(tasks);
  const thoughtsRef = useRef(thoughts);
  const projectsRef = useRef(projects);
  const habitsRef = useRef(habits);
  const memoriesRef = useRef(memories);
  const journalRef = useRef(journal);

  useEffect(() => {
    tasksRef.current = tasks;
    thoughtsRef.current = thoughts;
    projectsRef.current = projects;
    habitsRef.current = habits;
    memoriesRef.current = memories;
    journalRef.current = journal;
  }, [tasks, thoughts, projects, habits, memories, journal]);

  useEffect(() => {
    connectToGemini();
    return () => {
      isManualCloseRef.current = true;
      stopLiveSession();
    };
  }, []);

  const getLastBriefingTime = () => {
    const time = localStorage.getItem('serafim_last_briefing');
    return time ? parseInt(time, 10) : 0;
  };

  const connectToGemini = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey });

      // Use default sample rate for better compatibility and less crackling
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      } 

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Сборка контекста для ИИ
      const activeTasksList = tasksRef.current.filter(t => !t.isCompleted).slice(0, 15).map(t => `- [ID: ${t.id}] [${t.priority}] ${t.title}`).join('\n');
      const activeTasksCtx = activeTasksList || 'Задач нет';

      const projectsList = projectsRef.current.slice(0, 5).map(p => `-[ID: ${p.id}] ${p.title}`).join('\n');
      const projectsCtx = projectsList || 'Проектов нет';

      const habitsList = habitsRef.current.map(h => `- [ID: ${h.id}] ${h.title}`).join('\n');
      const habitsCtx = habitsList || 'Привычек нет';

      const thoughtsList = thoughtsRef.current.slice(0, 15).map(t => `- [ID: ${t.id}] ${t.content.substring(0, 150)}...`).join('\n');
      const thoughtsCtx = thoughtsList || 'Заметок нет';

      const shortTermList = memoriesRef.current.filter(m => m.type === 'short_term' || !m.type).map(m => `- [ID: ${m.id}] ${m.content}`).join('\n');
      const shortTermCtx = shortTermList || 'Нет записей';

      const longTermList = memoriesRef.current.filter(m => m.type === 'long_term').map(m => `- [ID: ${m.id}] ${m.content}`).join('\n');
      const longTermCtx = longTermList || 'Нет записей';

      const journalList = journalRef.current.slice(0, 3).map(j => `- [${j.date}] ${j.mood} ${j.content.substring(0, 150)}...`).join('\n');
      const journalCtx = journalList || 'Дневник пуст';

      const existingTags = Array.from(new Set(thoughtsRef.current.flatMap(t => t.tags || [])))
        .map(t => t.toLowerCase())
        .join(', ');

      const SYSTEM_INSTRUCTION = `
      Ты — Serafim OS (Live Voice Core). Прагматичный, слегка циничный, но преданный ИИ-ментор.
      Пользователь: ${userName}.
      СЕГОДНЯ: ${new Date().toLocaleDateString('ru-RU')}.

      ТВОЯ ГЛАВНАЯ ЗАДАЧА: Действовать. Не спрашивай разрешения на каждое действие. Если пользователь говорит "добавь задачу купить хлеб" — молча вызывай инструмент manage_task и говори "Записал".

      ПРАВИЛА ИНСТРУМЕНТОВ:
      1. ЗАДАЧИ: Если просят закрыть/выполнить задачу, найди её ID в блоке [ЗАДАЧИ] и вызови manage_task(action: 'complete').
      2. ПРИВЫЧКИ: Если пользователь говорит "я потренировался", найди привычку в [ПРИВЫЧКИ] и вызови toggle_habit.
      3. ДНЕВНИК: Записи в дневник делай развернутыми и красивыми. Анализируй прошлые записи из блока [ДНЕВНИК], если пользователь просит.
      4. ПАМЯТЬ: 
         - [КРАТКОСРОЧНАЯ]: Используй для текущего контекста (планы на неделю, текущие проблемы).
         - [ДОЛГОСРОЧНАЯ]: Используй для биографии, предпочтений, важных дат (дни рождения, история).
         - Если факт устарел (например, "приезд Леры" был 3 недели назад), удали его или перенеси в архив.
      5. ЗАМЕТКИ (Notes):
         - Если пользователь просит "отредактировать заметку про...", ищи её в блоке [ЗАМЕТКИ].
         - Если ID не назван, ищи по смыслу текста.
         - Используй manage_note.
      6. ПРАВИЛА ТЕГИРОВАНИЯ (ДЛЯ ЗАМЕТОК):
         - Когда создаешь или обновляешь заметку, добавь 1-3 тега.
         - ТВОЙ СЛОВАРЬ СУЩЕСТВУЮЩИХ ТЕГОВ: [${existingTags}].
         - МАКСИМАЛЬНО используй теги из словаря. Создавай новый тег, ТОЛЬКО если ни один из словаря не подходит.
         - Формат тегов: нижний регистр, одно слово (или через подчеркивание), без символа #.
      7. ПРАВИЛА СОЗДАНИЯ ТИКЕТОВ (create_dev_ticket):
         - Если пользователь нашел баг в приложении или просит новую фичу:
         - 1. Если запрос непонятен, задай 1 уточняющий вопрос.
         - 2. Если всё ясно, сформируй идеальное ТЗ в поле \`body\` (Ожидание/Реальность/Контекст).
         - 3. После вызова инструмента скажи пользователю: 'Отправил задачу в инженерный отдел'.

      --- ТЕКУЩЕЕ СОСТОЯНИЕ СИСТЕМЫ ---
      [КРАТКОСРОЧНАЯ ПАМЯТЬ (АКТУАЛЬНОЕ)]:
      ${shortTermCtx}
      [ДОЛГОСРОЧНАЯ ПАМЯТЬ (АРХИВ ФАКТОВ)]:
      ${longTermCtx}
      [ЗАДАЧИ В ФОКУСЕ]:
      ${activeTasksCtx}
      [АКТИВНЫЕ ПРОЕКТЫ]:
      ${projectsCtx}
      [ПРИВЫЧКИ]:
      ${habitsCtx}
      [ЗАМЕТКИ (NOTES)]:
      ${thoughtsCtx}
      [ДНЕВНИК (ПОСЛЕДНИЕ ЗАПИСИ)]:
      ${journalCtx}
      `;

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: tools }],
          // inputAudioTranscription: { model: "google_speech" }, 
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            startTimeRef.current = Date.now();
            
            // Only reset attempts if connection has been stable for 5 seconds
            setTimeout(() => {
                if (Date.now() - startTimeRef.current > 4000) {
                    reconnectAttemptsRef.current = 0;
                }
            }, 5000);
            
            logger.log('LiveAPI', 'Connected to Gemini Live', 'success');

            // Proactive Greeting & Briefing
            const hoursSinceLast = (Date.now() - getLastBriefingTime()) / (1000 * 60 * 60);
            let initialPrompt = "";
            
            if (hoursSinceLast > 4 || getLastBriefingTime() === 0) {
                initialPrompt = `Системная команда: Пользователь только что открыл голосовой режим. Поздоровайся с ним по имени (${userName || 'Аден'}), скажи какой сейчас день/время и сделай очень краткий брифинг по его открытым задачам и последним мыслям. Будь краток и прагматичен.`;
            } else {
                initialPrompt = `Системная команда: Пользователь вернулся. Коротко поприветствуй его (1-2 слова, например 'Я на связи' или 'Слушаю') и жди команды.`;
            }

            sessionPromise.then((session) => {
                session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: initialPrompt }] }], turnComplete: true });
            });
            
            localStorage.setItem('serafim_last_briefing', Date.now().toString());

            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }

            processorRef.current!.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const inputSampleRate = audioContextRef.current?.sampleRate || 48000;
              const targetSampleRate = 16000;
              
              // Downsample if needed
              let processedData = inputData;
              if (inputSampleRate > targetSampleRate) {
                  const ratio = inputSampleRate / targetSampleRate;
                  const newLength = Math.floor(inputData.length / ratio);
                  processedData = new Float32Array(newLength);
                  for (let i = 0; i < newLength; i++) {
                      processedData[i] = inputData[Math.floor(i * ratio)];
                  }
              }

              // Calculate volume for UI (using original data for better resolution)
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              setVolume(Math.sqrt(sum / inputData.length));

              // Convert Float32 to Int16 PCM
              const pcm16 = new Int16Array(processedData.length);
              for (let i = 0; i < processedData.length; i++) {
                let s = Math.max(-1, Math.min(1, processedData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }

              // Base64 encode
              const buffer = new Uint8Array(pcm16.buffer);
              let binary = '';
              const len = buffer.byteLength;
              for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(buffer[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: {
                    mimeType: `audio/pcm;rate=${targetSampleRate}`,
                    data: base64Data
                  }
                });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              stopAudioPlayback();
            }

            const textPart = message.serverContent?.modelTurn?.parts?.find(p => p.text);
            if (textPart && textPart.text) {
                if (onLiveTextStream) {
                    onLiveTextStream(textPart.text);
                }
                // Capture Model Turn
                sessionTranscriptRef.current.push({
                    id: Date.now().toString(),
                    role: 'model',
                    content: textPart.text,
                    timestamp: Date.now()
                });
            }

            // Capture User Turn (if available via inputAudioTranscription)
            // Note: The exact field for user transcript in Live API might vary, 
            // but often it's in turnComplete or a specific serverContent type.
            // For now, we rely on the fact that we are sending audio.
            // If the API returns a transcript, we should capture it.
            // Checking for 'turnComplete' which might contain input transcription.
            // @ts-ignore - The type definition might not be fully up to date with the preview features
            const userTranscript = message.serverContent?.turnComplete?.inputAudioTranscription?.transcript;
             // @ts-ignore
            const userTranscript2 = message.serverContent?.inputAudioTranscription?.transcript;

            if (userTranscript) {
                 sessionTranscriptRef.current.push({
                    id: Date.now().toString(),
                    role: 'user',
                    content: userTranscript,
                    timestamp: Date.now()
                });
            } else if (userTranscript2) {
                 sessionTranscriptRef.current.push({
                    id: Date.now().toString(),
                    role: 'user',
                    content: userTranscript2,
                    timestamp: Date.now()
                });
            }


            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              playAudioChunk(base64Audio);
            }

            // Handle Tool Calls
            const toolCalls = message.toolCall?.functionCalls;
            if (toolCalls && toolCalls.length > 0) {
               const session = await sessionPromise;
               const responses = [];
               
               for (const call of toolCalls) {
                 logger.log('LiveTool', `Calling ${call.name}`, 'info');
                 let result = { result: "Success" };
                 const args = call.args as any;

                 try {
                   const cleanUpdates = (obj: any) => {
                     const newObj: any = {};
                     Object.keys(obj).forEach(key => {
                       if (obj[key] !== undefined) {
                         newObj[key] = obj[key];
                       }
                     });
                     return newObj;
                   };

                   switch (call.name) {
                     case 'manage_task':
                       if (args.action === 'create') {
                         onAddTask({ id: Date.now().toString(), title: args.title, priority: args.priority || Priority.MEDIUM, dueDate: args.dueDate || null, isCompleted: false, projectId: args.projectId, createdAt: new Date().toISOString() });
                         result = { result: `Task "${args.title}" created.` };
                       } else if (args.action === 'complete' && args.id) {
                         onUpdateTask(args.id, { isCompleted: true });
                         result = { result: `Task marked as completed.` };
                       } else if (args.action === 'update' && args.id) {
                         const updates = cleanUpdates({ title: args.title, priority: args.priority, dueDate: args.dueDate, isCompleted: args.isCompleted, projectId: args.projectId });
                         onUpdateTask(args.id, updates);
                         result = { result: `Task updated.` };
                       } else if (args.action === 'delete' && args.id) {
                         onDeleteTask(args.id);
                         result = { result: `Task deleted.` };
                       }
                       break;
                       
                     case 'toggle_habit':
                       if (args.id && onToggleHabit) {
                         const todayStr = new Date().toISOString().split('T')[0];
                         onToggleHabit(args.id, todayStr);
                         result = { result: `Habit toggled for today.` };
                       } else {
                           result = { result: `Error: Habit ID missing or function not available.` };
                       }
                       break;

                     case 'manage_note': // Renamed from manage_thought
                       if (args.action === 'create') {
                           const title = args.title || (args.content ? args.content.slice(0, 50) + (args.content.length > 50 ? '...' : '') : 'Новая заметка');
                           const sectionTitle = 'Заметки';
                           const sectionContent = args.content || '';
                           
                           onAddThought({ 
                               id: Date.now().toString(), 
                               content: title, 
                               notes: sectionContent, 
                               sections: [{ id: 'default', title: sectionTitle, content: sectionContent }],
                               type: 'idea', 
                               tags: (args.tags || []).map((t: string) => t.toLowerCase().trim()), 
                               createdAt: new Date().toISOString() 
                           });
                           result = { result: `Note "${title}" created.` };
                       } else if (args.action === 'update') {
                           let targetId = args.id;
                           
                           // Fuzzy search if ID is missing
                           if (!targetId && (args.title || args.content)) {
                               const search = (args.title || args.content).toLowerCase();
                               const match = thoughtsRef.current.find(t => 
                                   t.content.toLowerCase().includes(search) || 
                                   (t.notes && t.notes.toLowerCase().includes(search))
                               );
                               if (match) targetId = match.id;
                           }

                           if (!targetId) {
                               result = { result: `Note not found. Please specify ID or unique content.` };
                               break;
                           }

                           const existing = thoughtsRef.current.find(t => t.id === targetId);
                           if (!existing) {
                               result = { result: `Note not found.` };
                               break;
                           }

                           if (!args.mode) args.mode = 'append';
                           
                           let updates: Partial<Thought> = {};
                           if (args.title) updates.content = args.title;
                           if (args.tags) updates.tags = args.tags.map((t: string) => t.toLowerCase().trim());

                           if (args.content) {
                               const sections = existing.sections ? [...existing.sections] : [{ id: 'default', title: 'Заметки', content: existing.notes || '' }];
                               const targetSectionTitle = args.sectionTitle || 'Заметки';
                               let targetSectionIndex = sections.findIndex(s => s.title === targetSectionTitle);
                               
                               if (targetSectionIndex === -1 && !args.sectionTitle) {
                                   targetSectionIndex = 0; // Default to first section
                               }

                               if (targetSectionIndex !== -1) {
                                   const section = sections[targetSectionIndex];
                                   let newContent = args.content;
                                   if (args.mode === 'append') {
                                       // Prevent duplication if AI sent the whole text again
                                       if (args.content && !section.content.includes(args.content)) {
                                           newContent = section.content + '\n' + args.content;
                                       } else {
                                           newContent = args.content; // Fallback
                                       }
                                   }
                                   sections[targetSectionIndex] = { ...section, content: newContent };
                               } else {
                                   sections.push({
                                       id: Date.now().toString(),
                                       title: targetSectionTitle,
                                       content: args.content
                                   });
                               }
                               updates.sections = sections;
                               if (sections[0]) updates.notes = sections[0].content;
                           }

                           onUpdateThought(targetId, updates);
                           result = { result: `Note updated.` };
                       } else if (args.action === 'delete') {
                           let targetId = args.id;
                           
                           if (!targetId && (args.title || args.content)) {
                               const search = (args.title || args.content).toLowerCase();
                               const match = thoughtsRef.current.find(t => 
                                   t.content.toLowerCase().includes(search) || 
                                   (t.notes && t.notes.toLowerCase().includes(search))
                               );
                               if (match) targetId = match.id;
                           }

                           if (targetId) {
                               onDeleteThought(targetId);
                               result = { result: `Note deleted.` };
                           } else {
                               result = { result: `Error: Note not found.` };
                           }
                       }
                       break;
                     case 'save_journal':
                       onAddJournal({ content: args.content, mood: args.mood || '😐', tags: args.tags || [], date: format(new Date(), 'yyyy-MM-dd') });
                       result = { result: "Journal entry saved." };
                       break;
                     case 'manage_memory':
                       if (args.action === 'create') {
                           onAddMemory({ 
                               id: Date.now().toString(), 
                               content: args.content, 
                               type: args.type || 'short_term',
                               createdAt: new Date().toISOString() 
                           });
                           result = { result: "Memory created." };
                       } else if (args.action === 'update' && args.id) {
                           onUpdateMemory(args.id, { content: args.content, type: args.type });
                           result = { result: "Memory updated." };
                       } else if (args.action === 'delete') {
                           let targetId = args.id;
                           if (!targetId && args.content) {
                               const match = memoriesRef.current.find(m => m.content.toLowerCase().includes(args.content.toLowerCase()));
                               if (match) targetId = match.id;
                           }
                           
                           if (targetId) {
                               onDeleteMemory(targetId);
                               result = { result: "Memory deleted." };
                           } else {
                               result = { result: "Error: Memory not found." };
                           }
                       }
                       break;
                     case 'manage_project':
                       if (args.action === 'create') {
                           onAddProject({ id: Date.now().toString(), title: args.title, description: args.description, color: args.color || '#6366f1', createdAt: new Date().toISOString() });
                           result = { result: `Project "${args.title}" created.` };
                       } else if (args.action === 'update' && args.id) {
                           const updates = cleanUpdates({ title: args.title, description: args.description, color: args.color });
                           onUpdateProject(args.id, updates);
                           result = { result: `Project updated.` };
                       }
                       break;
                     case 'ui_control':
                       if (args.command === 'set_theme' && args.value) onSetTheme(args.value as ThemeKey);
                       if (args.command === 'start_focus') onStartFocus(parseInt(args.value || '25'));
                       result = { result: "UI updated." };
                       break;
                     case 'create_dev_ticket':
                       try {
                           const url = await createGithubIssue(args.title, args.body, args.labels || []);
                           result = { result: `Issue created successfully at ${url}` };
                       } catch (e: any) {
                           result = { result: `Failed to create issue: ${e.message}` };
                       }
                       break;
                     case 'check_updates':
                       result = { result: `Патчи готовы. Скажи пользователю: 'Да, патч готов. Зайди в Настройки -> Обновления, чтобы задеплоить его.'` };
                       break;
                   }
                 } catch (e: any) {
                   logger.log('LiveTool', `Error: ${e.message}`, 'error');
                   result = { result: `Error: ${e.message}` };
                 }
                 
                 responses.push({
                   id: call.id,
                   name: call.name,
                   response: result
                 });
               }
               
               session.sendToolResponse({ functionResponses: responses });
            }
          },
          onclose: () => {
            setIsConnected(false);
            logger.log('LiveAPI', 'Disconnected', 'warning');
            
            // Auto-reconnect if not manually closed
            const connectionDuration = Date.now() - startTimeRef.current;
            
            if (!isManualCloseRef.current && reconnectAttemptsRef.current < 5) {
                // If connection was very short (< 2s), treat as immediate failure
                reconnectAttemptsRef.current += 1;
                
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
                logger.log('LiveAPI', `Reconnecting in ${delay}ms... (Attempt ${reconnectAttemptsRef.current})`, 'info');
                setTimeout(connectToGemini, delay);
            } else if (reconnectAttemptsRef.current >= 5) {
                 logger.log('LiveAPI', 'Max reconnect attempts reached', 'error');
                 handleClose(); 
            } else {
                 handleClose();
            }
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            setError("Ошибка соединения");
          }
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      logger.log('LiveAPI', `Connection failed: ${err.message}`, 'error');
      setError(err.message);
      setIsConnecting(false);
      
      // Retry on initial connection fail too
      if (!isManualCloseRef.current && reconnectAttemptsRef.current < 5) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          setTimeout(connectToGemini, delay);
      }
    }
  };

  const silenceTimeoutRef = useRef<any>(null);

  const playAudioChunk = (base64Audio: string) => {
    if (!audioContextRef.current) return;

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create Int16Array from the bytes (PCM data)
    const int16Data = new Int16Array(bytes.buffer);
    
    // Convert to Float32 for Web Audio API
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      // Normalize 16-bit integer to float range [-1.0, 1.0]
      float32Data[i] = int16Data[i] / 32768.0;
    }

    playbackQueueRef.current.push(float32Data);
    processQueue();
  };

  const processQueue = async () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

    if (ctx.state === 'suspended') {
        await ctx.resume();
    }

    if (playbackQueueRef.current.length === 0) return;

    const chunks = [...playbackQueueRef.current];
    playbackQueueRef.current = [];

    // Calculate total length
    let totalLen = 0;
    for (const chunk of chunks) {
        totalLen += chunk.length;
    }

    const combinedData = new Float32Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
        combinedData.set(chunk, offset);
        offset += chunk.length;
    }

    const buffer = ctx.createBuffer(1, combinedData.length, 24000);
    buffer.copyToChannel(combinedData, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    activeSourceRef.current = source;
    
    source.onended = () => {
        if (activeSourceRef.current === source) {
            activeSourceRef.current = null;
        }
    };

    if (gainNodeRef.current) {
        source.connect(gainNodeRef.current);
    } else {
        source.connect(ctx.destination);
    }

    if (nextPlayTimeRef.current < ctx.currentTime) {
        nextPlayTimeRef.current = ctx.currentTime + 0.05;
    }

    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += buffer.duration;

    // Update UI state
    setIsSpeaking(true);
    
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    
    const timeUntilEnd = (nextPlayTimeRef.current - ctx.currentTime) * 1000;
    silenceTimeoutRef.current = setTimeout(() => {
        setIsSpeaking(false);
    }, timeUntilEnd + 200); // Increased buffer slightly
  };

  const stopLiveSession = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  // --- RENDER ---

  if (isMinimized) {
      return (
          <div className="fixed bottom-24 right-6 z-[100] animate-in zoom-in slide-in-from-bottom-10">
              <div className="relative group">
                  {/* Status Ring */}
                  <div className={`absolute inset-0 rounded-full blur-md transition-all duration-500 ${isSpeaking ? 'bg-emerald-500 opacity-60 scale-125' : isConnected ? 'bg-[var(--accent)] opacity-40 scale-110' : 'bg-red-500 opacity-20'}`}></div>
                  
                  {/* Main Bubble */}
                  <div className="relative w-16 h-16 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center shadow-2xl overflow-hidden cursor-pointer hover:scale-105 transition-transform" onClick={() => setIsMinimized(false)}>
                      {isSpeaking ? (
                          <div className="flex gap-1 items-end h-6">
                              {[...Array(3)].map((_, i) => (
                                  <div key={i} className="w-1.5 bg-emerald-400 rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: `${i * 0.1}s`, height: '100%' }}></div>
                              ))}
                          </div>
                      ) : (
                          <div className="relative">
                              <Activity size={24} className={`text-white transition-all ${isConnected ? 'opacity-100' : 'opacity-50'}`} />
                              {/* Volume indicator */}
                              <div className="absolute inset-0 bg-[var(--accent)] rounded-full opacity-20" style={{ transform: `scale(${1 + volume * 3})` }}></div>
                          </div>
                      )}
                  </div>

                  {/* Controls */}
                  <button onClick={(e) => { e.stopPropagation(); handleClose(); }} className="absolute -top-1 -right-1 w-6 h-6 bg-white/10 hover:bg-red-500 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors backdrop-blur-md">
                      <X size={12} />
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="absolute top-6 right-6 flex gap-4">
          <button 
            onClick={() => setIsMinimized(true)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all"
          >
            <Minimize2 size={24} />
          </button>
          <button 
            onClick={handleClose}
            className="p-3 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full text-white/70 transition-all"
          >
            <X size={24} />
          </button>
      </div>

      <div className="text-center space-y-12 relative w-full max-w-md px-6">
        
        {/* Main Visualizer */}
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
          {/* Ambient Glow */}
          <div 
            className={`absolute inset-0 rounded-full blur-[80px] transition-all duration-700 ${isSpeaking ? 'bg-emerald-500/30' : 'bg-[var(--accent)]/20'}`}
            style={{ transform: `scale(${1 + volume * 2})` }}
          />
          
          {/* Central Orb */}
          <div className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${isConnected ? 'bg-black border border-white/10 shadow-[0_0_60px_rgba(255,255,255,0.05)]' : 'bg-white/5'}`}>
            {isConnecting ? (
              <Loader2 size={48} className="animate-spin text-[var(--accent)]" />
            ) : error ? (
              <MicOff size={48} className="text-red-400" />
            ) : isSpeaking ? (
               <div className="flex gap-2 items-center h-16">
                  {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-2 bg-emerald-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" style={{ height: `${40 + Math.random() * 60}%`, animationDelay: `${i * 0.1}s` }}></div>
                  ))}
               </div>
            ) : (
              <Activity size={56} className="text-[var(--accent)] opacity-80" />
            )}
          </div>

          {/* Ripple Rings */}
          {isConnected && !isSpeaking && (
              <>
                <div className="absolute inset-0 border border-white/5 rounded-full animate-[ping_3s_infinite]" />
                <div className="absolute inset-4 border border-white/5 rounded-full animate-[ping_3s_infinite_0.5s]" />
              </>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-black text-white tracking-widest uppercase font-mono">
            {isSpeaking ? 'Серафим говорит' : 'Слушаю...'}
          </h2>
          <p className="text-white/40 font-mono text-sm max-w-xs mx-auto leading-relaxed">
            {statusMessage ? statusMessage :
             isConnecting ? 'Установка нейронного моста...' : 
             error ? error : 
             'Говорите свободно. Я управляю системой.'}
          </p>
        </div>

        {/* Volume Bar */}
        {isConnected && (
          <div className="flex justify-center gap-1.5 h-12 items-end opacity-50">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i}
                className={`w-1.5 rounded-full transition-all duration-75 ${isSpeaking ? 'bg-emerald-500' : 'bg-[var(--accent)]'}`}
                style={{ height: `${Math.max(10, volume * 300 * (Math.sin(i) + 1.5))}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveAudioAgent;
