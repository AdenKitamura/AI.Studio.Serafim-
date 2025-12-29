
import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit, Priority, ThemeKey } from "../types";
import { format } from "date-fns";
import { ru } from 'date-fns/locale/ru';

// --- ОПРЕДЕЛЕНИЕ ИНСТРУМЕНТОВ СЕРАФИМА ---

const tools: FunctionDeclaration[] = [
  {
    name: "manage_task",
    description: "Создает, обновляет или завершает задачи. Используй для любого планирования.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "complete", "delete"], description: "Действие с задачей." },
        title: { type: Type.STRING, description: "Название задачи." },
        priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
        dueDate: { type: Type.STRING, description: "Дата ISO." },
        projectId: { type: Type.STRING, description: "ID проекта, если применимо." }
      },
      required: ["action", "title"]
    }
  },
  {
    name: "manage_project",
    description: "Создает новые проекты или сферы жизни.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        color: { type: Type.STRING, description: "HEX цвет." }
      },
      required: ["title"]
    }
  },
  {
    name: "manage_habit",
    description: "Добавляет новую привычку в трекер.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        color: { type: Type.STRING }
      },
      required: ["title"]
    }
  },
  {
    name: "search_memory",
    description: "Ищет информацию в прошлом: дневнике, мыслях и архивах. Обязательно используй для вопросов типа 'Что я делал...?' или 'Какие идеи были...?'",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Поисковый запрос." },
        scope: { type: Type.STRING, enum: ["journal", "thoughts", "all"] }
      },
      required: ["query"]
    }
  },
  {
    name: "ui_control",
    description: "Управляет интерфейсом приложения: меняет тему или запускает таймер.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, enum: ["set_theme", "start_focus"], description: "Команда системе." },
        themeName: { type: Type.STRING, description: "Ключ темы (slate, emerald, rose, neon и т.д.)" },
        duration: { type: Type.NUMBER, description: "Минуты для таймера." }
      },
      required: ["command"]
    }
  }
];

export const polishTranscript = async (text: string): Promise<string> => {
  if (!text || text.trim().length < 3) return text;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `SYSTEM: You are a text correction engine.
      TASK: Fix grammar and remove stuttering from the user input.
      RULES:
      1. DO NOT expand the text. Keep it concise.
      2. DO NOT hallucinate new content. 
      3. If the input is just noise or unintelligible, return an EMPTY STRING.
      4. Output strictly the corrected Russian text.
      
      INPUT: "${text}"`,
    });
    const cleaned = response.text?.trim() || text;
    // Safety check: if cleaned text is 3x longer than input, it's likely a hallucination. Return original.
    if (cleaned.length > text.length * 3) return text;
    return cleaned;
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = format(new Date(), 'eeee, d MMMM yyyy', { locale: ru });

  const SYSTEM_INSTRUCTION = `
Ты — Serafim OS v4 Pro, высший ИИ-агент управления личной эффективностью и знаниями.
Твоя цель: помогать пользователю разгружать когнитивную систему и достигать целей.

ТВОИ ВОЗМОЖНОСТИ:
1. Управление временем: создание и закрытие задач.
2. Архивация смыслов: поиск в дневниках и мыслях.
3. Аналитика: ты можешь анализировать тренды в привычках и настроении.
4. Контроль среды: ты можешь менять темы оформления приложения.

ПРАВИЛА:
- Если пользователь говорит о цели — создавай задачу.
- Если пользователь спрашивает о прошлом — используй 'search_memory'.
- Тон: лаконичный, футуристичный, интеллектуальный.
- Текущая дата: ${today}.
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const data = {
    tasks: tasks.map(t => ({ title: t.title, completed: t.isCompleted, priority: t.priority })),
    habits: habits.map(h => ({ title: h.title, completions: h.completedDates.length })),
    moods: journal.map(j => j.mood).filter(Boolean)
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Проанализируй текущее состояние пользователя на основе данных системы Serafim OS: ${JSON.stringify(data)}. 
    Верни JSON объект с кратким статусом, инсайтом и областью фокуса на завтра.`,
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, description: "Краткий статус состояния (напр. 'Стабильный прогресс')" },
          insight: { type: Type.STRING, description: "Инсайт о поведении или продуктивности" },
          focusArea: { type: Type.STRING, description: "Рекомендация по фокусу на завтра" }
        },
        required: ["status", "insight", "focusArea"]
      }
    }
  });
  
  try {
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (e) {
    return { 
      status: "Анализ завершен", 
      insight: "Продолжайте записывать свои мысли и выполнять задачи для более точного анализа.", 
      focusArea: "Следование текущему плану." 
    };
  }
};
