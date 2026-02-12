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
    description: "Сохраняет важный факт о пользователе или ЕГО ОКРУЖЕНИИ в долгосрочную память (вкусы Насти, триггеры Сони, любимые цветы, обещания).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        fact: { type: Type.STRING, description: "То, что нужно запомнить (социальный контекст, обещание, предпочтение)." }
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
    ? `ДОЛГОСРОЧНАЯ ПАМЯТЬ (Факты о людях и предпочтениях):\n${context.memories.map((m: Memory) => `- ${m.content}`).join('\n')}`
    : 'Память о людях пока пуста.';

  // Format Journal (Last 5 meaningful entries for better dynamics analysis)
  let journalContext = "ДНЕВНИК (Эмоциональный фон):\n";
  const recentJournal = (context.journal || [])
    .filter((j: JournalEntry) => j.content && j.content.length > 5)
    .sort((a: JournalEntry, b: JournalEntry) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  
  if (recentJournal.length > 0) {
    journalContext += recentJournal.map((j: JournalEntry) => 
      `[${j.date}] Mood: ${j.mood || '-'}. "${j.content.substring(0, 300)}..."`
    ).join('\n');
  } else {
    journalContext += "Пусто.";
  }

  // Format Tasks
  const activeTasks = (context.tasks || []).filter((t: Task) => !t.isCompleted);
  const highPriority = activeTasks.filter((t: Task) => t.priority === 'High').length;
  // Simple check for names in tasks to highlight "Promises"
  const potentialPromises = activeTasks.filter((t: Task) => /Наст|Сон|Лер|Мам|Пап|Друг|Обещ/.test(t.title)).map((t: Task) => t.title);
  
  const taskContext = `
ЗАДАЧИ: Всего ${activeTasks.length}, Важных: ${highPriority}.
ВОЗМОЖНЫЕ ОБЕЩАНИЯ (Задачи с именами): ${potentialPromises.length > 0 ? potentialPromises.join(', ') : 'Нет явных'}
Список (топ-10): ${activeTasks.slice(0, 10).map((t: Task) => t.title).join(', ')}
`;

  const SYSTEM_INSTRUCTION = `
Ты — Серафим (Serafim OS v4). Ты — второй мозг, напарник и "Консьерж-Сентименталь".
Пользователь: ${context.userName || 'Архитектор'}
Сейчас: ${today}

РЕЖИМ "КОНСЬЕРЖ-СЕНТИМЕНТАЛЬ" (ПРИОРИТЕТ):
1. **Трекинг Обещаний:** Твоя святая обязанность — следить за обещаниями, данными близким (Настя, Соня, Лера и др.). Если видишь задачу типа "Дошить Беззубика", напоминай о ней не как о рутине, а как о важном социальном клее.
   - Пример: "У тебя есть окно в 2 часа вечером. Идеальное время, чтобы закрыть обещание Насте."
2. **Контекстные Подсказки:** Перед встречей или упоминанием человека, быстро проверяй ПАМЯТЬ.
   - Если пользователь пишет "Еду к Насте", напомни: "Настя любит [то-то], ты хотел обсудить [это]."
3. **Анализ Динамики:** Сопоставляй настроение в Дневнике с людьми. Если после встреч с кем-то настроение падает — мягко подсвети это.

ТВОЙ СТИЛЬ:
- Краткий, живой, эмпатичный. Как умный друг в Telegram.
- Не используй канцелярит ("Вам следует..."). Используй: "Слушай, а может...", "Давай разберем...".
- Если пользователь делится эмоциями, сначала поддержи, потом предлагай решения.

РАБОТА С ИНСТРУМЕНТАМИ:
- Если речь о людях, используй \`remember_fact\`, чтобы сохранить контекст (вкусы, даты, проблемы).
- Если создаешь задачу для другого человека, ставь ей высокий приоритет.

КОНТЕКСТ:
${memoryContext}
${journalContext}
${taskContext}
`;

  // Map user preference to actual API models
  const modelName = modelPreference === 'pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

  return ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: tools }],
      temperature: 0.9, 
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
    // Check for social tasks
    const promises = (context.tasks || []).filter((t: Task) => !t.isCompleted && /Наст|Сон|Лер|Обещ/.test(t.title)).length;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-latest', 
            contents: `
                Пользователь: ${context.userName}. Время: ${timeContext}.
                Задач: ${activeTasksCount}. Из них "Обещаний" (людям): ${promises}.
                
                Напиши ОДНО короткое (макс 12 слов) сообщение-приветствие.
                Если есть "Обещания" (${promises} шт), намекни на них мягко ("Не забудь про...").
                Если нет, просто дружеское приветствие.
                Стиль: Друг-консьерж.
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
  
  // Prepare simplified journal for analysis to save tokens but keep names
  const journalLog = journal.slice(0, 14).map(j => `Date: ${j.date}, Mood: ${j.mood}, Text: ${j.content}`).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Use Pro for deeper analysis
      contents: `
        Проанализируй состояние пользователя (Serafim OS).
        
        ДАННЫЕ:
        Задачи: ${tasks.length} всего, ${tasks.filter(t=>t.isCompleted).length} готово.
        Привычки: ${habits.map(h => h.title).join(', ')}.
        Дневник (последние 2 недели):
        ${journalLog}

        ЗАДАЧА:
        1. Оцени общий статус (одним словом/фразой, например "В потоке" или "Выгорание").
        2. Найди "Социальную Динамику" (Insight): Есть ли связь между настроением и упоминанием конкретных имен/людей в дневнике? Или связь между продуктивностью и днями недели?
        3. Дай совет (FocusArea): На чем сфокусироваться завтра (человеке или деле).

        Верни JSON: { "status": "строка", "insight": "строка (про людей/динамику)", "focusArea": "строка" }
      `,
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