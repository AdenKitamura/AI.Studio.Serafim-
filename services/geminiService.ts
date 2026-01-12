import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit, Priority, ThemeKey } from "../types";
import { format } from "date-fns";
import { ru } from 'date-fns/locale';

// Dynamic retrieval to handle runtime injection
const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_GOOGLE_API_KEY) {
    return process.env.REACT_APP_GOOGLE_API_KEY;
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_GOOGLE_API_KEY;
  }
  // Fallback to local storage if user entered it manually in a settings modal (hypothetical)
  return localStorage.getItem('google_api_key') || '';
};

const APP_MANUAL = `
РУКОВОДСТВО ПО ИНТЕРФЕЙСУ SERAFIM OS:
1. СИСТЕМНЫЕ УВЕДОМЛЕНИЯ (PWA):
   - Используй 'manage_task' с параметром 'dueDate' для напоминаний.
2. ВРЕМЯ:
   - ВСЕГДА используй ISO формат.
3. ПРОЕКТЫ:
   - Создавай проекты через 'manage_project'.
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
        dueDate: { type: Type.STRING },
        projectId: { type: Type.STRING }
      },
      required: ["action", "title"]
    }
  },
  {
    name: "create_idea",
    description: "Создает новую ИДЕЮ в Архиве.",
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
    description: "Добавляет заметку на ДОСКУ проекта.",
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
    description: "Управляет интерфейсом.",
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
  const apiKey = getApiKey();
  if (!apiKey) return text; 

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `SYSTEM: Fix grammar and remove stuttering. Keep conciseness. Output strictly Russian text. INPUT: "${text}"`,
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
  const SYSTEM_INSTRUCTION = `Ты — Serafim OS v4 Pro (AI Mentor). ${APP_MANUAL} 
  Текущая дата: ${today}.
  Твоя цель: Помогать пользователю достигать ясности и продуктивности. Будь краток, точен и харизматичен.`;

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
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Проанализируй состояние. JSON { status, insight, focusArea }`,
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { status: { type: Type.STRING }, insight: { type: Type.STRING }, focusArea: { type: Type.STRING } },
        required: ["status", "insight", "focusArea"]
      }
    }
  });
  try { return JSON.parse(response.text || "{}"); } catch (e) { return {}; }
};