import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit } from "../types";
import { format } from "date-fns";
import { ru } from 'date-fns/locale';

const getApiKey = () => {
  // Проверка всех возможных вариантов переменных окружения
  if (typeof process !== 'undefined' && process.env?.REACT_APP_GOOGLE_API_KEY) {
    return process.env.REACT_APP_GOOGLE_API_KEY;
  }
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_GOOGLE_API_KEY;
  }
  // Ключ из локального хранилища (если вводился вручную)
  return typeof localStorage !== 'undefined' ? localStorage.getItem('google_api_key') : '';
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
    description: "Создает, обновляет или завершает задачи.",
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
    description: "Добавляет заметку в проект.",
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
  const SYSTEM_INSTRUCTION = `Ты — Serafim OS v4 Pro (AI Mentor). ${APP_MANUAL} 
  Текущая дата: ${today}.
  Твоя цель: Помогать пользователю достигать ясности. Будь краток и точен.`;

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