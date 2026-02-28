
import { GoogleGenAI, Chat, Type, FunctionDeclaration, Modality } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit, Memory, GeminiModel, ChatSession, ChatMessage } from "../types";
import { format, isAfter } from "date-fns";
import { ru } from 'date-fns/locale/ru';
import { generateSystemInstruction } from "./serafimPersona";

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

// --- SAFETY SETTINGS: UNLEASHED ---
// Используем 'any', чтобы избежать ошибки TS2322 (Type string is not assignable to HarmCategory)
const SAFETY_SETTINGS: any = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
];

const tools: FunctionDeclaration[] = [
  {
    name: "manage_task",
    description: "Создает задачу. ВЫЗЫВАЙ ТОЛЬКО ЕСЛИ ПОЛЬЗОВАТЕЛЬ ЯВНО ПОПРОСИЛ или это критически необходимо.",
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
    name: "manage_thought",
    description: "Управляет идеями и заметками. ОБЯЗАТЕЛЬНО генерируй 1-3 релевантных хештега в массив tags (на русском языке, строчными буквами, без решетки, например ['идеи', 'проект_х']). Семантически анализируй текст пользователя для подбора тегов.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "update"] },
        id: { type: Type.STRING, description: "ID идеи (обязательно для update)" },
        title: { type: Type.STRING, description: "Заголовок идеи (для create)" },
        content: { type: Type.STRING, description: "Текст заметки" },
        sectionTitle: { type: Type.STRING, description: "Название раздела/секции (например: 'Критика', 'План', 'Ссылки'). Если не указано - 'Заметки'." },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Массив хештегов (без #). Пример: ['работа', 'важное']" },
        mode: { type: Type.STRING, enum: ["replace", "append"], description: "append - добавить к тексту секции, replace - заменить текст секции." }
      },
      required: ["action"]
    }
  },
  {
    name: "save_journal_entry",
    description: "Сохраняет запись в Дневник. Используй ПОСЛЕ того, как пользователь подтвердил текст записи.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING, description: "Основной текст записи (красиво оформленный)" },
        mood: { type: Type.STRING, enum: ["😔", "😐", "🙂", "😃", "🤩"], description: "Настроение (смайл)" },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["content", "mood"]
    }
  },
  {
    name: "remember_fact",
    description: "Сохраняет важный факт о пользователе.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        fact: { type: Type.STRING }
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
    description: "Управляет интерфейсом приложения (темы, таймер, режим голоса).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, enum: ["set_theme", "start_focus", "enable_asmr"] },
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
  
  const SYSTEM_INSTRUCTION = generateSystemInstruction({
      userName: context.userName,
      tasks: context.tasks || [],
      thoughts: context.thoughts || [],
      journal: context.journal || [],
      projects: context.projects || [],
      habits: context.habits || [],
      memories: context.memories || [],
      sessions: context.sessions || [],
      activeSessionId: context.activeSessionId,
      existingTags: context.existingTags,
      isLiveMode: false
  });

  const modelName = modelPreference === 'pro' ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview';

  return ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: tools }],
      temperature: 1.0,
      safetySettings: SAFETY_SETTINGS, // <--- ОТКЛЮЧАЕМ ФИЛЬТРЫ ЗДЕСЬ
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
            contents: { parts: [{ text: `Serafim: ${text}` }] },
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: [
                            { speaker: 'Serafim', voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
                            { speaker: 'System', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
                        ]
                    }
                },
                safetySettings: SAFETY_SETTINGS // Отключаем фильтры для генерации речи (чтобы читал 18+ текст)
            }
        });
        
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
            model: 'gemini-3-flash-preview', 
            contents: `
                Пользователь: ${context.userName}. Время: ${timeContext}.
                Напиши ОДНО приветствие (макс 6 слов). Живое, дерзкое или теплое. Можно с перчинкой.
            `,
            config: { 
                temperature: 1.1,
                safetySettings: SAFETY_SETTINGS 
            }
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
      model: 'gemini-3.1-pro-preview', 
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
        },
        safetySettings: SAFETY_SETTINGS
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
      model: 'gemini-3-flash-preview', 
      contents: `Fix grammar. Return ONLY fixed text. Text: "${text}"`,
      config: { safetySettings: SAFETY_SETTINGS }
    });
    return response.text?.trim() || text;
  } catch (e) {
    return text;
  }
};

export const polishText = async (text: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey || text.length < 2) return text;
    
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `
                Ты редактор текста.
                Твоя задача: 
                1. УДАЛИТЬ повторяющиеся слова и фразы.
                2. Исправить пунктуацию, орфографию и регистр.
                3. Убрать слова-паразиты.
                4. Сделай текст читаемым и естественным, но НЕ меняй смысл.
                
                Входной текст: "${text}"
                
                Верни ТОЛЬКО исправленный текст без кавычек и комментариев.
            `,
            config: {
                temperature: 0.1,
                safetySettings: SAFETY_SETTINGS
            }
        });
        return response.text?.trim() || text;
    } catch (e) {
        console.error("Polish Error", e);
        return text;
    }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    try {
        const apiKey = process.env.VITE_GOOGLE_API_KEY || localStorage.getItem('google_api_key') || '';
        const ai = new GoogleGenAI({ apiKey });

        // Важно: если mimeType пустой, ставим дефолтный (обычно это Chrome)
        const finalMimeType = mimeType || 'audio/webm';

        console.log(`📡 Отправка аудио в Gemini... MIME: ${finalMimeType}`);

        const response = await ai.models.generateContent({
            // Используем Flash, он быстрый и отлично понимает звук
            model: 'gemini-1.5-flash', 
            contents: [
                {
                    role: 'user',
                    parts: [
                        { 
                            // Жесткий промпт, чтобы он не умничал, а только транскрибировал
                            text: 'Ты — профессиональный транскрибатор. Точно переведи это аудио в текст. Верни ТОЛЬКО распознанный текст без кавычек, комментариев и форматирования. Если на аудио тишина или шум — верни пустоту.' 
                        },
                        {
                            inlineData: {
                                mimeType: finalMimeType,
                                data: base64Audio
                            }
                        }
                    ]
                }
            ]
        });

        const transcribedText = response.text || '';
        console.log(`✅ Транскрибация успешна: ${transcribedText}`);
        
        return transcribedText;

    } catch (error: any) {
        console.error("❌ Ошибка Gemini transcribeAudio:", error);
        // Пробрасываем ошибку дальше, чтобы увидеть ее в логах компонента
        throw error; 
    }
};

export const generateSessionSummary = async (transcript: ChatMessage[]): Promise<string> => {
    if (!transcript || transcript.length === 0) return "";

    const apiKey = getApiKey();
    if (!apiKey) return "";

    const ai = new GoogleGenAI({ apiKey });

    const conversationText = transcript.map(m => `${m.role === 'user' ? 'User' : 'Serafim'}: ${m.content}`).join('\n');

    const prompt = `
    Ты — ассистент, который подводит итоги голосовой сессии.
    Твоя задача: Сжать этот диалог в короткий, информативный конспект (summary).
    
    Правила:
    1. Пиши от третьего лица ("Пользователь обсудил...", "Серафим создал задачу...").
    2. Выдели главные темы и принятые решения.
    3. Если были созданы задачи или заметки, обязательно упомяни их.
    4. Будь краток. Максимум 3-4 предложения.
    5. Язык: Русский.

    Диалог:
    ${conversationText}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text?.trim() || "Голосовая сессия завершена.";
    } catch (e) {
        console.error("Summary generation failed", e);
        return "Голосовая сессия завершена (не удалось создать конспект).";
    }
};
