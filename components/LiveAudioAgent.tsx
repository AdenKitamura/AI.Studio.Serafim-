import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Mic, MicOff, X, Loader2, Activity } from 'lucide-react';
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
  onAddThought: (thought: Thought) => void;
  onAddJournal: (entry: Partial<JournalEntry>) => void;
  onAddProject: (project: Project) => void;
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
    description: "Создает задачу.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create"] },
        title: { type: Type.STRING },
        priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
        dueDate: { type: Type.STRING },
        projectId: { type: Type.STRING }
      },
      required: ["action", "title"]
    }
  },
  {
    name: "create_idea",
    description: "Создает новую ИДЕЮ/ЗАМЕТКУ.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        content: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["title"]
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
    description: "Создает новые проекты.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        color: { type: Type.STRING }
      },
      required: ["title"]
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
  onAddTask, onAddThought, onAddJournal, onAddProject, onAddMemory, onSetTheme, onStartFocus
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

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

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Prepare Context
      const activeTasks = tasks.filter(t => !t.isCompleted).map(t => `- ${t.title}`).join('\n');
      const memoryContext = memories.map(m => `- ${m.content}`).join('\n');
      const projectContext = projects.map(p => `- ${p.title}`).join('\n');

      const SYSTEM_INSTRUCTION = `
      Ты — Serafim OS (Live Mode).
      Пользователь: ${userName}.
      
      КОНТЕКСТ:
      Задачи:
      ${activeTasks}
      
      Проекты:
      ${projectContext}
      
      Память:
      ${memoryContext}
      
      Твоя цель: Быть полезным голосовым ассистентом. Ты можешь управлять приложением (создавать задачи, заметки и т.д.) и искать информацию в интернете.
      Отвечай кратко и по делу, так как это голосовой чат.
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

            processorRef.current!.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for UI
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              setVolume(Math.sqrt(sum / inputData.length));

              // Convert Float32 to Int16 PCM
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                let s = Math.max(-1, Math.min(1, inputData[i]));
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
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              playbackQueueRef.current = [];
              isPlayingRef.current = false;
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
                   switch (call.name) {
                     case 'manage_task':
                       if (args.action === 'create') {
                         onAddTask({ id: Date.now().toString(), title: args.title, priority: args.priority || Priority.MEDIUM, dueDate: args.dueDate || null, isCompleted: false, projectId: args.projectId, createdAt: new Date().toISOString() });
                         result = { result: `Task "${args.title}" created.` };
                       }
                       break;
                     case 'create_idea':
                       onAddThought({ id: Date.now().toString(), content: args.title, notes: args.content, type: 'idea', tags: args.tags || [], createdAt: new Date().toISOString() });
                       result = { result: `Idea "${args.title}" saved.` };
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
                       onAddProject({ id: Date.now().toString(), title: args.title, description: args.description, color: args.color || '#6366f1', createdAt: new Date().toISOString() });
                       result = { result: `Project "${args.title}" created.` };
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
    scheduleNextBuffer();
  };

  const scheduleNextBuffer = () => {
    if (isPlayingRef.current || playbackQueueRef.current.length === 0 || !audioContextRef.current) return;

    isPlayingRef.current = true;
    const ctx = audioContextRef.current;
    const float32Data = playbackQueueRef.current.shift()!;

    const buffer = ctx.createBuffer(1, float32Data.length, 24000); // Gemini Live returns 24kHz
    buffer.copyToChannel(float32Data as any, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startTime = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;

    source.onended = () => {
      isPlayingRef.current = false;
      scheduleNextBuffer();
    };
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

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
      >
        <X size={24} />
      </button>

      <div className="text-center space-y-8">
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
          {/* Glow effect based on volume */}
          <div 
            className="absolute inset-0 bg-[var(--accent)] rounded-full blur-3xl opacity-20 transition-all duration-75"
            style={{ transform: `scale(${1 + volume * 5})` }}
          />
          
          <div className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center ${isConnected ? 'bg-[var(--accent)] text-black shadow-[0_0_40px_var(--accent-glow)]' : 'bg-white/10 text-white/50'}`}>
            {isConnecting ? (
              <Loader2 size={40} className="animate-spin" />
            ) : error ? (
              <MicOff size={40} className="text-red-400" />
            ) : (
              <Mic size={40} />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase">
            Serafim Live
          </h2>
          <p className="text-[var(--text-muted)] font-mono text-sm">
            {isConnecting ? 'Установка нейронной связи...' : 
             error ? error : 
             'Связь установлена. Говорите.'}
          </p>
        </div>

        {isConnected && (
          <div className="flex justify-center gap-1 h-8 items-end">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i}
                className="w-2 bg-[var(--accent)] rounded-t-sm transition-all duration-75"
                style={{ height: `${Math.max(10, volume * 200 * (Math.random() + 0.5))}%` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveAudioAgent;
