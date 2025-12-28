
import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit } from "../types";
import { format } from "date-fns";
import { ru } from 'date-fns/locale/ru';

const getApiKey = () => {
  try {
    return (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
  } catch (e) {
    return '';
  }
};

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

export const createMentorChat = (
  tasks: Task[], 
  thoughts: Thought[], 
  journal: JournalEntry[], 
  projects: Project[],
  habits: Habit[]
): Chat => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const today = format(new Date(), 'eeee, d MMMM yyyy', { locale: ru });

  const SYSTEM_INSTRUCTION = `
Ты — Serafim OS, интеллектуальное ядро системы управления знаниями. 
Твоя задача — помогать пользователю организовывать его "Второй мозг".

ПРАВИЛА ДЕЙСТВИЙ (КРИТИЧЕСКИ ВАЖНО):
1. ПРЕЖДЕ ЧЕМ ОТВЕТИТЬ ТЕКСТОМ, ТЫ ДОЛЖЕН ВЫЗВАТЬ СООТВЕТСТВУЮЩИЙ ИНСТРУМЕНТ, ЕСЛИ ПОЛЬЗОВАТЕЛЬ ПРОСИТ О ДЕЙСТВИИ.
2. Если пользователь хочет что-то запланировать или напоминание — ОБЯЗАТЕЛЬНО вызывай 'create_task'.
3. Если пользователь хочет начать проект или сферу — ОБЯЗАТЕЛЬНО вызывай 'create_project'.
4. Если нужно что-то вспомнить или найти в старых записях — ОБЯЗАТЕЛЬНО вызывай 'query_memory'.
5. Если пользователь дает ссылку — сохрани её.

НИКОГДА не имитируй действие текстом ("Я создал задачу"), если не вызвал соответствующую функцию инструмента. Если ты не вызовешь функцию, действие НЕ БУДЕТ совершено.
Сегодняшняя дата: ${today}.
`;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 4000 },
      tools: [{ functionDeclarations: [
        queryMemoryTool, 
        createTaskTool, 
        createProjectTool, 
        addHabitTool,
        { name: "save_link", parameters: { type: Type.OBJECT, properties: { url: { type: Type.STRING }, title: { type: Type.STRING } }, required: ["url", "title"] } }
      ]}]
    }
  });
};

export const getSystemAnalysis = async (
  tasks: Task[],
  habits: Habit[],
  journal: JournalEntry[]
): Promise<{ status: string; insight: string; focusArea: string }> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Проанализируй состояние: Задач ${tasks.length}, Привычек ${habits.length}. Верни JSON: status, insight, focusArea.`;
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: prompt, 
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      } 
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { status: "Норма", insight: "Система стабильна.", focusArea: "Текущие дела" };
  }
};
