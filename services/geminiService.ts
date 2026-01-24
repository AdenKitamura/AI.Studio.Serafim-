import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit, Memory } from "../types";
import { format, subDays } from "date-fns";
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
1. АРХИТЕКТУРА И ДАННЫЕ:
   - Пользователь авторизован. Данные в Supabase.
   - Ты имеешь доступ к ДНЕВНИКУ, ЗАДАЧАМ, МЫСЛЯМ и ПАМЯТИ.

2. ТВОЯ РОЛЬ:
   - Ты — AI Ментор. 
   - Ты ОБЯЗАН использовать контекст дневника для ответов. Если пользователь спрашивает "как я себя чувствовал вчера?", ты ищешь запись за вчера и отвечаешь. Не проси пользователя копировать текст.

3. ИНТЕГРАЦИЯ:
   - 'manage_task': Создание задач.
   - 'remember_fact': Запоминание важных фактов.
`;

const tools: FunctionDeclaration[] = [
  {
    name: "manage_task",
    description: "Создает задачу.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "complete", "delete"] },
        title: { type: Type.STRING },
        priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
        dueDate: { type: Type.STRING, description: "ISO 8601 Date (YYYY-MM-DD)" },
        projectId: { type: Type.STRING }
      },
      required: ["action", "title"]
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
    description: "Сохраняет важный факт о пользователе в долгосрочную память.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        fact: { type: Type.STRING, description: "То, что нужно запомнить." }
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
  return text; // Removed polishing logic as requested
};

export const createMentorChat = (context: any): Chat => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");
  
  const ai = new GoogleGenAI({ apiKey });
  const today = format(new Date(), 'eeee, d MMMM yyyy, HH:mm', { locale: ru });
  const isoNow = new Date().toISOString();
  
  // Format memories
  const memoryContext = context.memories && context.memories.length > 0 
    ? `ДОЛГОСРОЧНАЯ ПАМЯТЬ:\n${context.memories.map((m: Memory) => `- ${m.content}`).join('\n')}`
    : 'Память пуста.';

  // Format Journal (Last 14 days)
  let journalContext = "ДНЕВНИК (Последние 14 дней):\n";
  const recentJournal = (context.journal || [])
    .filter((j: JournalEntry) => new Date(j.date) > subDays(new Date(), 14))
    .sort((a: JournalEntry, b: JournalEntry) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (recentJournal.length > 0) {
    journalContext += recentJournal.map((j: JournalEntry) => 
      `[${j.date}] Настроение: ${j.mood || 'N/A'}\nТекст: ${j.content}\nРефлексия: ${j.reflection?.mainFocus || ''}`
    ).join('\n---\n');
  } else {
    journalContext += "Записей нет.";
  }

  // Format Tasks (Simple list)
  const taskContext = `ТЕКУЩИЕ ЗАДАЧИ:\n${(context.tasks || []).filter((t: Task) => !t.isCompleted).slice(0, 10).map((t: Task) => `- ${t.title} (${t.priority})`).join('\n')}`;

  const SYSTEM_INSTRUCTION = `Ты — Serafim OS v4 Pro (AI Mentor). 
  ${APP_MANUAL} 
  
  Контекст пользователя:
  - Имя: ${context.userName || 'Пользователь'}
  - Время: ${isoNow} (${today})
  
  ${memoryContext}
  
  ${journalContext}

  ${taskContext}
  
  Твоя цель: Быть вторым мозгом. Ты видишь дневник пользователя выше. Используй эту информацию для ответов. Будь краток и точен.`;

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