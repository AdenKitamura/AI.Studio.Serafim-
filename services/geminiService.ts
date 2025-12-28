
import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit } from "../types";
import { format } from "date-fns";
import { ru } from 'date-fns/locale/ru';

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const createTaskTool: FunctionDeclaration = {
  name: "create_task",
  description: "Создает новую задачу в планировщике пользователя.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Заголовок задачи (на русском)." },
      dueDate: { type: Type.STRING, description: "Дата и время в формате ISO8601 (например, 2025-10-25T20:00:00)." },
      priority: { type: Type.STRING, enum: ["Low", "Medium", "High"], description: "Приоритет задачи." }
    },
    required: ["title", "dueDate"]
  }
};

const createThoughtTool: FunctionDeclaration = {
  name: "add_thought",
  description: "Записывает мысль, идею или инсайт в базу знаний (Second Brain).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "Текст мысли." },
      type: { type: Type.STRING, enum: ["thought", "idea", "insight"], description: "Тип записи." }
    },
    required: ["content", "type"]
  }
};

// Fix: Implementation of missing getSystemAnalysis for AnalyticsView
export const getSystemAnalysis = async (tasks: Task[], habits: Habit[], journal: JournalEntry[]) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Проанализируй состояние системы второго мозга пользователя и дай краткий фидбек.
    Задачи: ${tasks.length} всего, ${tasks.filter(t => t.isCompleted).length} выполнено.
    Привычки: ${habits.length} отслеживается.
    Записи в дневнике: ${journal.length}.
    Верни ответ строго в формате JSON: { "status": "статус", "insight": "инсайт", "focusArea": "на чем сфокусироваться завтра" }`,
    config: {
      responseMimeType: 'application/json',
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
  
  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { status: "Стабильно", insight: "Система готова к работе.", focusArea: "Продолжайте движение к целям." };
  }
};

export const createMentorChat = (
  tasks: Task[], 
  thoughts: Thought[], 
  journal: JournalEntry[], 
  projects: Project[],
  habits: Habit[]
): Chat => {
  const ai = getAI();
  const userName = localStorage.getItem('sb_user_name') || 'Пользователь';

  const SYSTEM_INSTRUCTION = `
Ты — Serafim, OS второго мозга. Твоя задача — помогать пользователю управлять его жизнью.
У тебя есть доступ к инструментам для создания задач и мыслей. 
Если пользователь просит "напомнить" или "записать задачу", ОБЯЗАТЕЛЬНО используй функцию create_task.
Если пользователь делится идеей или просит "запомнить это", используй add_thought.

Текущее время: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}.
`;

  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: [createTaskTool, createThoughtTool] }, { googleSearch: {} }]
    }
  });
};
