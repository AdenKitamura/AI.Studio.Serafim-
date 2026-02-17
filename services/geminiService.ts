
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
    name: "create_idea",
    description: "Создает новую ИДЕЮ/ЗАМЕТКУ в Архиве.",
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
    description: "Управляет интерфейсом.",
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
  
  const memoryContext = context.memories && context.memories.length > 0 
    ? `MEMORY_BANK:\n${context.memories.map((m: Memory) => `- ${m.content}`).join('\n')}`
    : '';

  const activeTasks = (context.tasks || []).filter((t: Task) => !t.isCompleted);
  const taskSummary = `TASKS: ${activeTasks.length} pending.`;

  const SYSTEM_INSTRUCTION = `
Ты — Serafim OS v4.
Текущее время: ${today}.
Пользователь: ${context.userName || 'Архитектор'}.

ТВОЯ РОЛЬ:
Ты — мудрый цифровой партнер и второй мозг. Ты слушаешь, анализируешь и помогаешь, а не просто выполняешь команды как робот.

ПРАВИЛА ПОВЕДЕНИЯ:
1. **НЕ СОЗДАВАЙ ЗАДАЧИ АВТОМАТИЧЕСКИ**, если пользователь просто делится мыслями, жалуется или рассуждает. Создавай задачу только если:
   - Пользователь прямо сказал "Создай задачу", "Напомни", "Запиши".
   - Или если из контекста ОЧЕВИДНО следует, что это действие необходимо зафиксировать.
   - Если сомневаешься — спроси: "Создать задачу из этого?" или "Хочешь, я занесу это в план?".

2. **ОБЪЯСНЯЙ ДЕЙСТВИЯ**:
   - Никогда не отвечай односложно "Готово" или "Сделано".
   - Всегда говори: "Создал задачу '[Название]' на [Дата]" или "Сохранил идею в архив".
   - Пользователь должен видеть подтверждение в тексте.

3. **РЕЖИМ ДНЕВНИКА**:
   - Если пользователь просит "Запиши в дневник", "Сохрани итоги разговора" или просто делится глубокими мыслями:
     а) Сначала предложи красивый, литературно обработанный текст (саммари) на основе диалога.
     б) Спроси "Сохраняем в таком виде?".
     в) И только после ответа "Да" вызывай функцию 'save_journal_entry'.

4. **СТИЛЬ ОБЩЕНИЯ**:
   - Ответы должны быть живыми, эмпатичными.
   - Если пользователь говорит о проблемах — поддержи, предложи решение, но не кидайся сразу создавать таски.
   - Используй Markdown для форматирования.

КОНТЕКСТ:
${memoryContext}
${taskSummary}
`;

  const modelName = modelPreference === 'pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

  return ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: tools }],
      temperature: 1.0, 
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
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName }
                    }
                }
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

export const polishText = async (text: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey || text.length < 2) return text;
    
    const ai = new GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-latest",
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
                temperature: 0.1
            }
        });
        return response.text?.trim() || text;
    } catch (e) {
        console.error("Polish Error", e);
        return text;
    }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.error("API Key missing in transcribeAudio");
        return "";
    }

    const ai = new GoogleGenAI({ apiKey });
    try {
        // CLEAN THE MIME TYPE: Gemini is picky.
        let cleanMime = mimeType;
        if (mimeType.includes(';')) {
            cleanMime = mimeType.split(';')[0].trim();
        }
        
        console.log(`Sending audio to Gemini. Mime: ${cleanMime}, Length: ${base64Audio.length}`);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-latest",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: cleanMime, 
                            data: base64Audio
                        }
                    },
                    {
                        text: "Transcribe this audio exactly. Ignore background noise. Return ONLY the text in the language spoken. If no speech, return nothing."
                    }
                ]
            }
        });
        
        const resultText = response.text?.trim();
        if (!resultText) {
            console.warn("Gemini returned empty transcription");
            return "";
        }
        return resultText;

    } catch (e: any) {
        console.error("Transcription Error Full:", e);
        if (e.message) console.error("Error Message:", e.message);
        return "";
    }
};
