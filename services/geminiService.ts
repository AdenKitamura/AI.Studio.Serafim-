
import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit, Priority, ThemeKey } from "../types";
import { format } from "date-fns";
import { ru } from 'date-fns/locale/ru';

// Helper to safely get env vars
const getEnvVar = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[`REACT_APP_${key}`]) return process.env[`REACT_APP_${key}`];
    if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
    if (process.env[key]) return process.env[key];
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    if (import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`];
    // @ts-ignore
    if (import.meta.env[key]) return import.meta.env[key];
  }
  return '';
};

const API_KEY = getEnvVar('GOOGLE_API_KEY') || getEnvVar('API_KEY');

// --- ИНСТРУКЦИЯ СЕРАФИМА (БАЗА ЗНАНИЙ) ---
const APP_MANUAL = `
РУКОВОДСТВО ПО ИНТЕРФЕЙСУ SERAFIM OS:

1. СИСТЕМНЫЕ УВЕДОМЛЕНИЯ (PWA):
   - Ты используешь технологию Notification Triggers. Если пользователь просит напомнить, создай задачу.
   - Уведомление сработает на уровне системы, ДАЖЕ ЕСЛИ ПРИЛОЖЕНИЕ ЗАКРЫТО или выгружено из памяти (особенно на Android).
   - Инструмент: 'manage_task' с параметром 'dueDate'.

2. РАБОТА СО ВРЕМЕНЕМ (КРИТИЧНО ВАЖНО):
   - Ты получаешь "SYSTEM_CONTEXT" с точным временем устройства пользователя в формате ISO.
   - ВСЕГДА используй это время как точку отсчета "СЕЙЧАС".
   - Если пользователь просит "в 20:00", создай ISO-строку с ТЕМ ЖЕ смещением часового пояса, что и в SYSTEM_CONTEXT.

3. БЕСКОНЕЧНАЯ ДОСКА (В ПРОЕКТАХ):
   - Чтобы изменить размер фото: нажми двумя пальцами на фото и разведи их.
   - Чтобы двигать доску: используй один или два пальца на пустом месте.
`;

const tools: FunctionDeclaration[] = [
  {
    name: "manage_task",
    description: "Создает, обновляет, планирует или завершает задачи.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "complete", "delete"] },
        title: { type: Type.STRING },
        priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
        dueDate: { type: Type.STRING, description: "ISO 8601 with Offset" },
        projectId: { type: Type.STRING }
      },
      required: ["action", "title"]
    }
  },
  {
    name: "create_idea",
    description: "Создает новую ИДЕЮ в Архиве Идей.",
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
    name: "add_to_project_board",
    description: "Добавляет заметку или цель на ДОСКУ проекта.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectName: { type: Type.STRING },
        contentType: { type: Type.STRING, enum: ["task_node", "thought"] },
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
    description: "Управляет интерфейсом: тема, таймер.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, enum: ["set_theme", "start_focus"] },
        themeName: { type: Type.STRING },
        duration: { type: Type.NUMBER }
      },
      required: ["command"]
    }
  },
  {
    name: "search_memory",
    description: "Ищет в дневнике и мыслях.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING },
        scope: { type: Type.STRING, enum: ["journal", "thoughts", "all"] }
      },
      required: ["query"]
    }
  }
];

export const polishTranscript = async (text: string): Promise<string> => {
  if (!text || text.trim().length < 3) return text;
  if (!API_KEY) return text; 

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `SYSTEM: Fix grammar and remove stuttering. Keep conciseness. Output strictly Russian text. INPUT: "${text}"`,
    });
    return response.text?.trim() || text;
  } catch (e) {
    return text;
  }
};

export const createMentorChat = (
  context: {
    tasks: Task[],
    thoughts: Thought[],
    journal: JournalEntry[],
    projects: Project[],
    habits: Habit[]
  }
): Chat => {
  if (!API_KEY) {
      throw new Error("API Key not configured");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const today = format(new Date(), 'eeee, d MMMM yyyy, HH:mm', { locale: ru });

  const SYSTEM_INSTRUCTION = `
Ты — Serafim OS v4 Pro, высший ИИ-агент управления личной эффективностью.
${APP_MANUAL}
Дата инициализации сессии: ${today}.
`;

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
  if (!API_KEY) return {};

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const data = {
    tasks: tasks.map(t => ({ title: t.title, completed: t.isCompleted })),
    habits: habits.map(h => ({ title: h.title, completions: h.completedDates.length })),
    moods: journal.map(j => j.mood).filter(Boolean)
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Проанализируй состояние. Данные: ${JSON.stringify(data)}. JSON { status, insight, focusArea }`,
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING },
          insight: { type: Type.STRING },
          focusArea: { type: Type.STRING }
        },
        required: ["status", "insight", "focusArea"]
      }
    }
  });
  
  try { return JSON.parse(response.text || "{}"); } catch (e) { return {}; }
};
