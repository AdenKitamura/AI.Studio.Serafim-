
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

export const polishTranscript = async (text: string): Promise<string> => {
  if (!text || text.trim().length < 2) return text;
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `ИНСТРУКЦИЯ: Текст ниже получен через голосовой ввод. Исправь его: удали повторы, заикания, исправь ошибки распознавания, расставь знаки препинания. 
ВАЖНО: Сохрани смысл полностью. Верни ТОЛЬКО исправленный текст без пояснений.

ТЕКСТ:
"${text}"`,
    });
    const result = response.text?.trim();
    return (result && result.length > 0) ? result : text;
  } catch (e) {
    console.warn("Serafim Polish Engine: Fallback to raw text due to error", e);
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

Твои функции:
1. Создание задач ('create_task')
2. Создание проектов ('create_project')
3. Поиск в памяти ('query_memory')
4. Трекинг привычек ('add_habit')

Если пользователь просит что-то сделать — ВСЕГДА используй соответствующий инструмент ПЕРЕД текстовым ответом.
Отвечай кратко, профессионально, в стиле продвинутой ОС.
Сегодня: ${today}.
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
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Проанализируй состояние: Задач ${tasks.length}, Привычек ${habits.length}. Верни JSON: status, insight, focusArea.`;
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: prompt, 
      config: { responseMimeType: "application/json" } 
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { status: "Норма", insight: "Система стабильна.", focusArea: "Текущие дела" };
  }
};
