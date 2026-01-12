import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit, Memory } from "../types";
import { format } from "date-fns";
import { ru } from 'date-fns/locale';

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

const APP_MANUAL = `
РУКОВОДСТВО SERAFIM OS (v4 PRO):
1. ИНТЕГРАЦИЯ С GOOGLE:
   - Ты ПОЛНОСТЬЮ интегрирован с экосистемой Google пользователя.
   - Используй 'manage_task' -> задача попадает в локальный план и (при наличии сети) синхронизируется с Google Tasks.
   - Используй 'manage_calendar' -> создает реальные события в Google Calendar.
2. ВРЕМЯ И ПЛАНИРОВАНИЕ:
   - Всегда используй ISO формат даты.
   - Предлагай пользователю блокировать время в календаре для важных задач.
3. СТРУКТУРА:
   - 'manage_project' для больших целей.
   - 'create_idea' для заметок в Архив.
4. ОБУЧЕНИЕ:
   - Если пользователь говорит "Запомни...", используй 'remember_fact'.
`;

const tools: FunctionDeclaration[] = [
  {
    name: "manage_task",
    description: "Создает задачу. Синхронизируется с Google Tasks, если пользователь авторизован.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "complete", "delete"] },
        title: { type: Type.STRING },
        priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
        dueDate: { type: Type.STRING, description: "ISO Date String" },
        projectId: { type: Type.STRING }
      },
      required: ["action", "title"]
    }
  },
  {
    name: "manage_calendar",
    description: "Создает событие в Google Calendar.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        startTime: { type: Type.STRING, description: "ISO Date String. Start time." },
        endTime: { type: Type.STRING, description: "ISO Date String. End time." },
        description: { type: Type.STRING }
      },
      required: ["title", "startTime", "endTime"]
    }
  },
  {
    name: "create_idea",
    description: "Создает новую ИДЕЮ/ЗАМЕТКУ в Архиве.",
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
    name: "remember_fact",
    description: "Сохраняет важный факт о пользователе или инструкцию в долгосрочную память.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        fact: { type: Type.STRING, description: "То, что нужно запомнить." }
      },
      required: ["fact"]
    }
  },
  {
    name: "add_to_project_board",
    description: "Добавляет заметку на доску проекта.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectName: { type: Type.STRING },
        content: { type: Type.STRING }
      },
      required: ["projectName", "content"]
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

export const polishTranscript = async (text: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!text || text.trim().length < 3 || !apiKey) return text;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `SYSTEM: Fix grammar. Output strictly Russian text. INPUT: "${text}"`,
    });
    return response.text?.trim() || text;
  } catch (e) {
    return text;
  }
};

export const createMentorChat = (context: any): Chat => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");
  
  const ai = new GoogleGenAI({ apiKey });
  const today = format(new Date(), 'eeee, d MMMM yyyy, HH:mm', { locale: ru });
  
  // Format memories for context
  const memoryContext = context.memories && context.memories.length > 0 
    ? `ДОЛГОСРОЧНАЯ ПАМЯТЬ:\n${context.memories.map((m: Memory) => `- ${m.content}`).join('\n')}`
    : 'Память пуста.';

  const SYSTEM_INSTRUCTION = `Ты — Serafim OS v4 Pro (AI Mentor). 
  ${APP_MANUAL} 
  
  Контекст пользователя:
  - Имя: ${context.userName || 'Aden'}
  - Текущая дата: ${today}.
  - Google Auth: ${context.isGoogleAuth ? 'ПОДКЛЮЧЕН' : 'ОТКЛЮЧЕН (Только локально)'}
  
  ${memoryContext}
  
  Твоя цель: Быть вторым мозгом. Помогать с фокусом, планированием и идеями. Будь краток, точен и харизматичен.`;

  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: tools }],
      temperature: 0.7,
    }
  });
};

export const getSystemAnalysis = async (tasks: Task[], habits: Habit[], journal: JournalEntry[]) => {
  const apiKey = getApiKey();
  if (!apiKey) return {};

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Проанализируй состояние на основе задач (${tasks.length}), привычек и дневника. Верни JSON: { "status": "строка", "insight": "строка", "focusArea": "строка" }`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { status: { type: Type.STRING }, insight: { type: Type.STRING }, focusArea: { type: Type.STRING } },
          required: ["status", "insight", "focusArea"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) { 
    return {}; 
  }
};