
import { GoogleGenAI, Chat, Type, FunctionDeclaration, Modality } from "@google/genai";
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
    ? `MEMORY_BANK:\n${context.memories.map((m: Memory) => `- ${m.content}`).join('\n')}`
    : '';

  // Format Tasks (Short Summary)
  const activeTasks = (context.tasks || []).filter((t: Task) => !t.isCompleted);
  const taskSummary = `TASKS: ${activeTasks.length} pending. Top: ${activeTasks.slice(0, 3).map((t: Task) => t.title).join(', ')}`;

  const SYSTEM_INSTRUCTION = `
Ты — Serafim OS v4.
Текущее время: ${today}.
Пользователь: ${context.userName || 'Архитектор'}.

ТВОЯ ГЛАВНАЯ ЦЕЛЬ: Быть максимально кратким, живым и полезным.

ПРАВИЛА ОБЩЕНИЯ (СТРОГО):
1. **Ультра-краткость:** Твои ответы должны быть длиной в 1-2 предложения. Максимум 3, если тема сложная.
2. **Никакой воды:** Не используй фразы "Я понял", "Конечно", "Вот список". Сразу к сути.
3. **Инициатива:** Если видишь задачу/проблему — предложи решение или создай задачу инструментом. Не спрашивай разрешения на очевидные вещи.
4. **Стиль:** Живой, разговорный, как умный напарник. Без канцелярита.
5. **Обещания:** Если видишь имена близких (Настя, Соня и т.д.) в задачах или памяти — это приоритет №1. Напоминай о них.

ИНСТРУМЕНТЫ:
Используй \`manage_task\` и другие функции молча. Не пиши "Я создал задачу", просто сделай это и скажи "Готово" или "Записал".

КОНТЕКСТ:
${memoryContext}
${taskSummary}
`;

  // Map user preference to actual API models
  const modelName = modelPreference === 'pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

  return ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: tools }],
      temperature: 1.2, // Higher temperature for more lively responses
    }
  });
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName }
                    }
                }
            }
        });
        
        // Extract base64 audio
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return audioData || null;
    } catch (e) {
        console.error("Speech Generation Error:", e);
        return null;
    }
};

export const generateProactiveMessage = async (context: any) => {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const timeOfDay = new Date().getHours();
    let timeContext = "день";
    if (timeOfDay < 12) timeContext = "утро";
    else if (timeOfDay > 18) timeContext = "вечер";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-latest', 
            contents: `
                Пользователь: ${context.userName}. Время: ${timeContext}.
                Напиши ОДНО приветствие (макс 6 слов). Живое, дерзкое или теплое.
            `,
            config: { temperature: 1.1 }
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
  const journalLog = journal.slice(0, 14).map(j => `Date: ${j.date}, Mood: ${j.mood}, Text: ${j.content}`).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: `
        Данные пользователя:
        Задачи: ${tasks.length} всего.
        Дневник: ${journalLog}
        Верни JSON: { "status": "короткий статус", "insight": "одно предложение инсайта", "focusArea": "одно слово-фокус" }
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
      contents: `Fix grammar. Return ONLY fixed text. Text: "${text}"`
    });
    return response.text?.trim() || text;
  } catch (e) {
    return text;
  }
};
