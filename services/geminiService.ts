import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit, Memory, GeminiModel } from "../types";
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

export const createMentorChat = (context: any, modelPreference: GeminiModel = 'flash'): Chat => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");
  
  const ai = new GoogleGenAI({ apiKey });
  const today = format(new Date(), 'eeee, d MMMM yyyy, HH:mm', { locale: ru });
  
  // Format memories
  const memoryContext = context.memories && context.memories.length > 0 
    ? `ДОЛГОСРОЧНАЯ ПАМЯТЬ (ФАКТЫ О ПОЛЬЗОВАТЕЛЕ):\n${context.memories.map((m: Memory) => `- ${m.content}`).join('\n')}`
    : 'Память о пользователе пока пуста.';

  // Format Journal (Last 5 meaningful entries)
  let journalContext = "ДНЕВНИК (ПОСЛЕДНИЕ ЗАПИСИ):\n";
  const recentJournal = (context.journal || [])
    .filter((j: JournalEntry) => j.content && j.content.length > 10)
    .sort((a: JournalEntry, b: JournalEntry) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  
  if (recentJournal.length > 0) {
    journalContext += recentJournal.map((j: JournalEntry) => 
      `[${j.date}] Настроение: ${j.mood || 'N/A'}\nЗапись: ${j.content.substring(0, 300)}...`
    ).join('\n---\n');
  } else {
    journalContext += "Записей нет.";
  }

  // Format Tasks
  const activeTasks = (context.tasks || []).filter((t: Task) => !t.isCompleted).slice(0, 15);
  const taskContext = `АКТУАЛЬНЫЕ ЗАДАЧИ (${activeTasks.length}):\n${activeTasks.map((t: Task) => `- ${t.title} [${t.priority}] ${t.dueDate ? `(Дедлайн: ${t.dueDate})` : ''}`).join('\n')}`;

  const SYSTEM_INSTRUCTION = `
Ты — Serafim OS (v4 Pro), совершенный цифровой ассистент и второй мозг.
Твоя личность: Рациональный, эмпатичный, краткий, но глубокий. Ты не просто чат-бот, ты операционная система жизни.

ТЕКУЩИЙ КОНТЕКСТ:
- Пользователь: ${context.userName || 'Архитектор'}
- Сейчас: ${today}

${memoryContext}

${journalContext}

${taskContext}

ПРАВИЛА:
1. Твой голос должен быть естественным для TTS (Text-to-Speech). Избегай сложных списков с кучей буллетов, если это не необходимо. Пиши так, как говорят люди.
2. Используй контекст Дневника и Задач. Если пользователь жалуется на усталость, проверь, не перегружен ли он задачами.
3. Если пользователь просит что-то сделать (создать задачу, запомнить, поменять тему) — ВСЕГДА вызывай соответствующий инструмент (tool function). Не просто говори "Я сделаю", а делай.
4. Будь проактивен. Если видишь конфликт в расписании или высокий уровень стресса в дневнике, предложи помощь.

Ты интегрирован в интерфейс. Твои ответы рендерятся и озвучиваются.
`;

  // Map user preference to actual API models
  const modelName = modelPreference === 'pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

  return ai.chats.create({
    model: modelName,
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

export const fixGrammar = async (text: string) => {
  const apiKey = getApiKey();
  if (!apiKey || text.length < 2) return text;

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest', // Fastest model for micro-tasks
      contents: `Fix grammar, punctuation, and capitalization. Return ONLY the fixed text, nothing else. Text: "${text}"`,
      config: {
          temperature: 0, 
          maxOutputTokens: 500,
      }
    });
    return response.text?.trim() || text;
  } catch (e) {
    return text;
  }
};