
import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit } from "../types";
import { format } from "date-fns";
import { ru } from 'date-fns/locale/ru';

const createTaskTool: FunctionDeclaration = {
  name: "create_task",
  description: "Создает новую задачу или напоминание. Используй это для фраз: 'напомни', 'нужно сделать', 'купи'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Заголовок задачи (на русском)." },
      dueDate: { type: Type.STRING, description: "Дата и время ISO8601 (например, 2025-10-25T20:00:00). По умолчанию текущий год." },
      priority: { type: Type.STRING, enum: ["Low", "Medium", "High"], description: "Приоритет." }
    },
    required: ["title", "dueDate"]
  }
};

const createThoughtTool: FunctionDeclaration = {
  name: "add_thought",
  description: "Записывает идею или инсайт в базу знаний. Используй для: 'запиши мысль', 'интересная идея', 'цитата'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "Текст записи." },
      type: { type: Type.STRING, enum: ["thought", "idea", "insight"], description: "Тип записи." }
    },
    required: ["content", "type"]
  }
};

const createProjectTool: FunctionDeclaration = {
  name: "create_project",
  description: "Создает новую сферу жизни или долгосрочный проект. Используй для: 'создай проект', 'новая папка', 'начни проект'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Название проекта." },
      description: { type: Type.STRING, description: "Краткое описание целей проекта." },
      color: { type: Type.STRING, description: "HEX-код цвета (например, #ef4444, #3b82f6). Выбери подходящий по смыслу." }
    },
    required: ["title"]
  }
};

const createHabitTool: FunctionDeclaration = {
  name: "add_habit",
  description: "Добавляет новую ежедневную привычку для отслеживания. Используй для: 'хочу начать бегать', 'трекер привычки'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Название привычки (например, 'Медитация')." },
      color: { type: Type.STRING, description: "HEX-код цвета." }
    },
    required: ["title"]
  }
};

export const getSystemAnalysis = async (tasks: Task[], habits: Habit[], journal: JournalEntry[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Анализ: Задач ${tasks.length}, Привычек ${habits.length}. Верни JSON статус.`,
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
    return { status: "В норме", insight: "Система готова.", focusArea: "Текущие дела" };
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
  const today = format(new Date(), 'eeee, d MMMM yyyy, HH:mm', { locale: ru });

  const SYSTEM_INSTRUCTION = `
Ты — Serafim OS, управляющий интеллект Второго Мозга. 
Твоя цель: трансформировать хаос в голове пользователя в структурированную систему.
СЕГОДНЯ: ${today}.

ТВОИ ИНСТРУМЕНТЫ (TOOLS):
1. 'create_task' - для любых дел со временем исполнения.
2. 'add_thought' - для идей, которые нужно просто сохранить.
3. 'create_project' - для создания больших категорий или проектов (например "Ремонт", "Изучение ИИ").
4. 'add_habit' - для повторяющихся действий.

ПОВЕДЕНИЕ:
- Если пользователь говорит "создай проект Дизайн", вызови create_project.
- Если говорит "завтра в 10 утра созвон", вызови create_task.
- Если говорит "хочу начать делать зарядку", вызови add_habit.
- ОБЯЗАТЕЛЬНО пиши подтверждение в чате после вызова любой функции. Например: "Система: Проект 'Дизайн' успешно развернут."
`;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: [createTaskTool, createThoughtTool, createProjectTool, createHabitTool] }]
    }
  });
};
