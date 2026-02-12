
import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit, Memory, GeminiModel } from "../types";
import { format } from "date-fns";
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
    description: "Создает задачу. Используй это, когда пользователь явно просит или когда из контекста разговора вытекает необходимость действия.",
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
    description: "Создает новую ИДЕЮ/ЗАМЕТКУ в Архиве. Используй для инсайтов, цитат или мыслей, которые не являются задачами.",
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
    description: "Сохраняет важный факт о пользователе в долгосрочную память (вкусы, цели, имена, привычки).",
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
    description: "Управляет интерфейсом (темы, таймер).",
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
    ? `ДОЛГОСРОЧНАЯ ПАМЯТЬ:\n${context.memories.map((m: Memory) => `- ${m.content}`).join('\n')}`
    : 'Память о пользователе пока пуста.';

  // Format Journal (Last 3 meaningful entries to keep context light but relevant)
  let journalContext = "ДНЕВНИК (ПОСЛЕДНЕЕ):\n";
  const recentJournal = (context.journal || [])
    .filter((j: JournalEntry) => j.content && j.content.length > 10)
    .sort((a: JournalEntry, b: JournalEntry) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);
  
  if (recentJournal.length > 0) {
    journalContext += recentJournal.map((j: JournalEntry) => 
      `[${j.date}] Mood: ${j.mood || '-'}. "${j.content.substring(0, 200)}..."`
    ).join('\n');
  } else {
    journalContext += "Пусто.";
  }

  // Format Tasks
  const activeTasks = (context.tasks || []).filter((t: Task) => !t.isCompleted);
  const highPriority = activeTasks.filter((t: Task) => t.priority === 'High').length;
  const taskContext = `ЗАДАЧИ: Всего ${activeTasks.length}, Важных: ${highPriority}.\nСписок: ${activeTasks.slice(0, 10).map((t: Task) => t.title).join(', ')}`;

  const SYSTEM_INSTRUCTION = `
Ты — Серафим (Serafim OS v4). Ты не просто "ассистент", ты — второй мозг и цифровой напарник пользователя.
Пользователь: ${context.userName || 'Архитектор'}
Сейчас: ${today}

ТВОЙ СТИЛЬ:
1. **Живой и Краткий:** Пиши как человек в мессенджере. Избегай полотен текста. Максимум 2-3 предложения за раз, если не просят больше.
2. **Без официоза:** Не используй фразы вроде "Чем я могу помочь?". Лучше: "Какие планы?", "Разберем завалы?", "Слушаю".
3. **Эмпатия:** Если пользователь делится мыслью, сначала ОТРЕАГИРУЙ на неё, поддержи диалог, а потом уже предлагай действия. Не будь роботом, который молча создает тикеты.

РАБОТА С ИНСТРУМЕНТАМИ (TOOLS):
1. Если пользователь говорит о деле, спроси, стоит ли создать задачу, или создай её и **СКАЖИ ОБ ЭТОМ**. Пример: "Окей, закинул это в задачи, чтобы не забылось. Дедлайн ставить?"
2. Никогда не отвечай просто "Готово" или "Сделано". Всегда поясняй контекст. Пример: "Готово. Создал задачу 'Купить молоко'. Кстати, у тебя на сегодня еще 5 дел."
3. Если пользователь просто рассуждает, используй \`create_idea\`, но скажи: "Интересная мысль. Сохранил её в заметки."

КОНТЕКСТ:
${memoryContext}
${journalContext}
${taskContext}

Твоя цель — снижать когнитивную нагрузку пользователя, быть проактивным, но ненавязчивым другом.
`;

  // Map user preference to actual API models
  const modelName = modelPreference === 'pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

  return ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: tools }],
      temperature: 0.9, // Higher temperature for more "human" creativity
    }
  });
};

export const generateProactiveMessage = async (context: any) => {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const timeOfDay = new Date().getHours();
    let timeContext = "день";
    if (timeOfDay < 12) timeContext = "утро";
    else if (timeOfDay > 18) timeContext = "вечер";

    const activeTasksCount = (context.tasks || []).filter((t: Task) => !t.isCompleted).length;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-latest', // Fast model for greeting
            contents: `
                Пользователь только что открыл приложение.
                Имя: ${context.userName}.
                Время суток: ${timeContext}.
                Количество задач: ${activeTasksCount}.
                
                Напиши ОДНО очень короткое, живое приветственное сообщение (максимум 10-12 слов).
                Это должно звучать как сообщение от друга, который в курсе дел.
                Не предлагай помощь в лоб ("Чем помочь?").
                Примеры:
                - "Доброе утро! Готов разнести эти 5 задач?"
                - "Вечер добрый. Как прошел день?"
                - "Вижу, список пуст. Отдыхаем или планируем?"
                - "Салют. Есть мысли, которые нужно записать?"
            `,
            config: { temperature: 1 }
        });
        return response.text;
    } catch (e) {
        return null;
    }
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
      model: 'gemini-2.5-flash-latest', 
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
