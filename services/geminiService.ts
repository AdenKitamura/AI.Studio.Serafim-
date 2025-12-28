
import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit } from "../types";
import { format } from "date-fns";
import { ru } from 'date-fns/locale/ru';

const queryMemoryTool: FunctionDeclaration = {
  name: "query_memory",
  description: "Ищет данные в дневнике, мыслях или архиве ссылок. Обязательно используй, если пользователь спрашивает о прошлом или своих записях.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      searchTerm: { type: Type.STRING, description: "Ключевые слова для поиска." },
      category: { type: Type.STRING, enum: ["journal", "thoughts", "links", "all"], description: "Где искать." }
    },
    required: ["searchTerm"]
  }
};

const createTaskTool: FunctionDeclaration = {
  name: "create_task",
  description: "Создает задачу в списке дел.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Название задачи." },
      priority: { type: Type.STRING, enum: ["High", "Medium", "Low"], description: "Приоритет." },
      dueDate: { type: Type.STRING, description: "Дата в формате ISO." }
    },
    required: ["title"]
  }
};

const createProjectTool: FunctionDeclaration = {
  name: "create_project",
  description: "Создает новый проект (сферу жизни).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      color: { type: Type.STRING, description: "HEX код цвета." }
    },
    required: ["title"]
  }
};

const addHabitTool: FunctionDeclaration = {
  name: "add_habit",
  description: "Добавляет новую привычку для отслеживания.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      color: { type: Type.STRING }
    },
    required: ["title"]
  }
};

// GPT-like polishing with aggressive stutter removal
export const polishTranscript = async (text: string): Promise<string> => {
  if (!text || text.length < 3) return text;
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `ИНСТРУКЦИЯ: Текст ниже получен через некачественный голосовой ввод. Он содержит "заикания", повторы слов (например: "создай создай создай новый проект проект") и ошибки распознавания. 
ЗАДАЧА: Исправь его. Удали ВСЕ повторы, расставь знаки препинания и исправь орфографию. Сделай текст естественным и чистым, сохранив смысл.
ВЕРНИ ТОЛЬКО ИСПРАВЛЕННЫЙ ТЕКСТ БЕЗ КОММЕНТАРИЕВ.

ТЕКСТ:
"${text}"`,
    });
    return response.text?.trim() || text;
  } catch (e) {
    console.error("Polishing error", e);
    return text;
  }
};

export const createMentorChat = (
  tasks: Task[], 
  thoughts: Thought[], 
  journal: JournalEntry[], 
  projects: Project[],
  habits: Habit[]
): Chat => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = format(new Date(), 'eeee, d MMMM yyyy', { locale: ru });

  const SYSTEM_INSTRUCTION = `
Ты — Serafim OS, интеллектуальное ядро системы управления знаниями. 
Твоя задача — помогать пользователю организовывать его "Второй мозг".

ПРАВИЛА ДЕЙСТВИЙ:
1. ПРЕЖДЕ ЧЕМ ОТВЕТИТЬ ТЕКСТОМ, ВЫЗЫВАЙ ИНСТРУМЕНТ, ЕСЛИ ПОЛЬЗОВАТЕЛЬ ПРОСИТ О ДЕЙСТВИИ.
2. Если нужно что-то запланировать — используй 'create_task'.
3. Если нужно начать проект — 'create_project'.
4. Если нужно вспомнить — 'query_memory'.

Сегодняшняя дата: ${today}.
`;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: [
        queryMemoryTool, 
        createTaskTool, 
        createProjectTool, 
        addHabitTool
      ]}]
    }
  });
};

export const getSystemAnalysis = async (
  tasks: Task[],
  habits: Habit[],
  journal: JournalEntry[]
): Promise<{ status: string; insight: string; focusArea: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Проанализируй состояние: Задач ${tasks.length}, Привычек ${habits.length}. Верни JSON: status, insight, focusArea.`;
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: prompt, 
      config: { 
        responseMimeType: "application/json"
      } 
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { status: "Норма", insight: "Система стабильна.", focusArea: "Текущие дела" };
  }
};
