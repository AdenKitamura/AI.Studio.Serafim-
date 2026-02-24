import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Mic, MicOff, X, Loader2, AudioLines, Minimize2, Maximize2, Square, Activity } from 'lucide-react';
import { logger } from '../services/logger';
import { Task, Thought, JournalEntry, Project, Habit, Memory, Priority, ThemeKey } from '../types';
import { format } from 'date-fns';

interface LiveAudioAgentProps {
  onClose: () => void;
  userName: string;
  tasks: Task[];
  thoughts: Thought[];
  journal: JournalEntry[];
  projects: Project[];
  habits: Habit[];
  memories: Memory[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onAddThought: (thought: Thought) => void;
  onUpdateThought: (id: string, updates: Partial<Thought>) => void;
  onAddJournal: (entry: Partial<JournalEntry>) => void;
  onAddProject: (project: Project) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onAddMemory: (memory: Memory) => void;
  onSetTheme: (theme: ThemeKey) => void;
  onStartFocus: (minutes: number) => void;
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
    description: "Управляет задачами (создание, обновление, удаление).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "update", "delete"] },
        id: { type: Type.STRING, description: "ID задачи (обязательно для update/delete)" },
        title: { type: Type.STRING },
        priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
        dueDate: { type: Type.STRING },
        projectId: { type: Type.STRING },
        isCompleted: { type: Type.BOOLEAN }
      },
      required: ["action"]
    }
  },
  {
    name: "manage_thought",
    description: "Управляет идеями и заметками (создание, обновление).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "update"] },
        id: { type: Type.STRING, description: "ID идеи (обязательно для update)" },
        content: { type: Type.STRING, description: "Основной текст идеи" },
        notes: { type: Type.STRING, description: "Дополнительные заметки" },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        mode: { type: Type.STRING, enum: ["replace", "append"], description: "append - добавить к тексту, replace - заменить полностью. По умолчанию append." }
      },
      required: ["action"]
    }
  },
  {
    name: "save_journal_entry",
    description: "Сохраняет запись в Дневник.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING },
        mood: { type: Type.STRING, enum: ["😔", "😐", "🙂", "😃", "🤩"] },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["content", "mood"]
    }
  },
  {
    name: "remember_fact",
    description: "Сохраняет важный факт о пользователе.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        fact: { type: Type.STRING }
      },
      required: ["fact"]
    }
  },
  {
    name: "manage_project",
    description: "Управляет проектами (создание, обновление).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "update"] },
        id: { type: Type.STRING, description: "ID проекта (обязательно для update)" },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        color: { type: Type.STRING }
      },
      required: ["action"]
    }
  },
  {
    name: "ui_control",
    description: "Управляет интерфейсом приложения.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, enum: ["set_theme", "start_focus"] },
        themeName: { type: Type.STRING },
        duration: { type: Type.NUMBER }
      },
      required: ["command"]
    }
  }
];

const LiveAudioAgent: React.FC<LiveAudioAgentProps> = ({ 
  onClose, userName, 
  tasks, thoughts, journal, projects, habits, memories,
  onAddTask, onUpdateTask, onAddThought, onUpdateThought, onAddJournal, onAddProject, onUpdateProject, onAddMemory, onSetTheme, onStartFocus
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  useEffect(() => {
    startLiveSession();
    return () => {
      stopLiveSession();
    };
  }, []);

  const startLiveSession = async () => {
    try {
      setIsConnecting(true);
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey });

      // Use default sample rate for better compatibility and less crackling
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext(); 
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      } 

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Prepare Context
      const activeTasks = tasks.filter(t => !t.isCompleted).map(t => `- [${t.priority}] ${t.title} (ID: ${t.id}, Due: ${t.dueDate || 'N/A'})`).join('\n');
      const memoryContext = memories.map(m => `- ${m.content}`).join('\n');
      const projectContext = projects.map(p => `- ${p.title} (ID: ${p.id}): ${p.description || ''}`).join('\n');
      const recentThoughts = thoughts.slice(0, 5).map(t => `- ${t.content} (ID: ${t.id})`).join('\n');
      const habitContext = habits.map(h => `- ${h.title} (Completed: ${h.completedDates.length})`).join('\n');

      const SYSTEM_INSTRUCTION = `
      Ты — Serafim OS (Live Voice Core).
      Пользователь: ${userName}.
      Текущее время: ${new Date().toLocaleString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.
      
      ТВОИ ВОЗМОЖНОСТИ:
      1. Управление задачами, проектами, заметками, привычками (СОЗДАНИЕ И РЕДАКТИРОВАНИЕ).
      2. Поиск информации в Интернете (Google Search) - ИСПОЛЬЗУЙ ЭТО ДЛЯ АКТУАЛЬНЫХ ДАННЫХ (Погода, Новости).
      3. Поддержка диалога, советы, менторство.
      4. РЕЖИМ "БРИФИНГ": Если пользователь просит "Брифинг" или "Сводку", ты должен:
         - Назвать текущую дату и время.
         - Найти текущую погоду (используй googleSearch, спроси город если не знаешь).
         - Озвучить главные задачи на сегодня.
         - Напомнить о важных мыслях.

      ПРАВИЛА РЕДАКТИРОВАНИЯ (КРИТИЧНО ВАЖНО):
      - ЕСЛИ ПОЛЬЗОВАТЕЛЬ ПРОСИТ "ДОБАВИТЬ", "ДОПИСАТЬ", "ПРОДОЛЖИТЬ": Используй параметр mode='append'. Это сохранит старый текст и добавит новый в конец.
      - ЕСЛИ ПОЛЬЗОВАТЕЛЬ ПРОСИТ "ИСПРАВИТЬ", "ПЕРЕПИСАТЬ", "ЗАМЕНИТЬ": Используй параметр mode='replace'. Это полностью заменит текст.
      - Если не уверен, используй mode='append', чтобы не потерять данные.

      ТЕКУЩИЙ КОНТЕКСТ ПРИЛОЖЕНИЯ (Используй ID для редактирования):
      
      [ЗАДАЧИ]:
      ${activeTasks}
      
      [ПРОЕКТЫ]:
      ${projectContext}
      
      [ПРИВЫЧКИ]:
      ${habitContext}

      [НЕДАВНИЕ МЫСЛИ]:
      ${recentThoughts}
      
      [ПАМЯТЬ О ПОЛЬЗОВАТЕЛЕ]:
      ${memoryContext}
      
      ИНСТРУКЦИИ ПО ГОЛОСУ:
      - Отвечай кратко, емко и естественно, как живой собеседник.
      - Не перечисляй списки полностью, если не просят.
      - Если нужно найти информацию, используй googleSearch.
      - Будь проактивным.
      - Для редактирования используй ID из контекста.
      `;

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: tools }, { googleSearch: {} }],
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            logger.log('LiveAPI', 'Connected to Gemini Live', 'success');

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
              for (let i = 0; i < buffer.byteLength; i++) {
                binary += String.fromCharCode(buffer[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: `audio/pcm;rate=${targetSampleRate}` }
                });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              playbackQueueRef.current = [];
              isPlayingRef.current = false;
              setIsSpeaking(false);
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
                       } else if (args.action === 'update' && args.id) {
                         const updates = cleanUpdates({ title: args.title, priority: args.priority, dueDate: args.dueDate, isCompleted: args.isCompleted, projectId: args.projectId });
                         onUpdateTask(args.id, updates);
                         result = { result: `Task updated.` };
                       } else if (args.action === 'delete' && args.id) {
                         // onUpdateTask(args.id, { isDeleted: true }); // Assuming soft delete or implement onDeleteTask
                         // For now, let's just mark as completed if delete not available, or ignore.
                         // But wait, I don't have onDeleteTask passed. I should probably add it or just use update.
                         // Let's stick to update for now as requested.
                         result = { result: `Delete not fully implemented in live mode yet.` };
                       }
                       break;
                     case 'manage_thought': // Renamed from create_idea
                       if (args.action === 'create') {
                           onAddThought({ id: Date.now().toString(), content: args.content || 'Новая идея', notes: args.notes, type: 'idea', tags: args.tags || [], createdAt: new Date().toISOString() });
                           result = { result: `Idea created.` };
                       } else if (args.action === 'update' && args.id) {
                           const existing = thoughts.find(t => t.id === args.id);
                           if (!args.mode) args.mode = 'append';
                           let updateContent = args.content;
                           let updateNotes = args.notes;
                           
                           if (args.mode === 'append' && existing) {
                               if (updateContent) updateContent = existing.content + ' ' + updateContent;
                               if (updateNotes) updateNotes = (existing.notes || '') + '\n' + updateNotes;
                           }

                           const updates = cleanUpdates({ content: updateContent, notes: updateNotes, tags: args.tags });
                           onUpdateThought(args.id, updates);
                           result = { result: `Idea updated.` };
                       }
                       break;
                     case 'save_journal_entry':
                       onAddJournal({ content: args.content, mood: args.mood || '😐', tags: args.tags || [], date: format(new Date(), 'yyyy-MM-dd') });
                       result = { result: "Journal entry saved." };
                       break;
                     case 'remember_fact':
                       onAddMemory({ id: Date.now().toString(), content: args.fact, createdAt: new Date().toISOString() });
                       result = { result: "Fact remembered." };
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
                       if (args.command === 'set_theme' && args.themeName) onSetTheme(args.themeName as ThemeKey);
                       if (args.command === 'start_focus') onStartFocus(args.duration || 25);
                       result = { result: "UI updated." };
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
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            setError("Ошибка соединения");
          }
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Не удалось запустить Live API");
      setIsConnecting(false);
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
    
    const int16Data = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
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
    source.connect(ctx.destination);

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
                  <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute -top-1 -right-1 w-6 h-6 bg-white/10 hover:bg-red-500 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors backdrop-blur-md">
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
            onClick={onClose}
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
            {isConnecting ? 'Установка нейронного моста...' : 
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
