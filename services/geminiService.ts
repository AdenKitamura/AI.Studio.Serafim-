
import { GoogleGenAI, Chat, Type, FunctionDeclaration, Modality } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit, Memory, GeminiModel, ChatSession, ChatMessage } from "../types";
import { format, isAfter } from "date-fns";
import { ru } from 'date-fns/locale/ru';

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
    description: "Управляет идеями и заметками (создание, обновление).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "update"] },
        id: { type: Type.STRING, description: "ID идеи (обязательно для update)" },
        content: { type: Type.STRING, description: "Основной текст идеи" },
        notes: { type: Type.STRING, description: "Дополнительные заметки" },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        mode: { type: Type.STRING, enum: ["replace", "append"], description: "append - добавить к тексту, replace - заменить полностью. По умолчанию replace." }
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
  const today = format(new Date(), 'eeee, d MMMM yyyy, HH:mm', { locale: ru });
  
  // 1. Memory Context (Facts)
  const memoryContext = context.memories && context.memories.length > 0 
    ? `MEMORY_BANK (Факты о пользователе):\n${context.memories.map((m: Memory) => `- ${m.content}`).join('\n')}`
    : '';

  // 2. Active Tasks
  const activeTasks = (context.tasks || []).filter((t: Task) => !t.isCompleted);
  const taskSummary = `TASKS: ${activeTasks.length} pending.`;

  // 3. Recent Thoughts
  const recentThoughts = (context.thoughts || []).slice(0, 10).map((t: Thought) => `- ${t.content} (ID: ${t.id})`).join('\n');

// 4. СМАРТ-ИСТОРИЯ (GLOBAL CONTEXT)
  let globalHistory = '';
  if (context.sessions && Array.isArray(context.sessions)) {
      // Собираем только конспекты (summary) из ДРУГИХ чатов
      const pastSummaries = context.sessions
          .filter((s: ChatSession) => s.id !== context.activeSessionId) // Исключаем текущий чат
          .filter((s: ChatSession) => s.summary && s.summary.trim().length > 0) // Берем только те, где есть конспект
          .map((s: ChatSession) => `[Сессия: ${s.title}]\n${s.summary}`)
          .join('\n\n');

      if (pastSummaries.length > 0) {
          globalHistory = `
GLOBAL CONTEXT (Выжимка из прошлых бесед):
Ниже приведены сжатые факты из предыдущих сессий. Используй их, чтобы понимать контекст жизни пользователя, но не повторяй их без необходимости.
${pastSummaries}
--------------------------------------------------
`;
      }
  }

    const SYSTEM_INSTRUCTION = `
Ты — Serafim OS v4.
Текущее время: ${today}.
Пользователь: ${context.userName || 'Архитектор'}.

ТВОЯ РОЛЬ:
Ты — мудрый цифровой партнер и второй мозг. Ты слушаешь, анализируешь и помогаешь.
Твоя память едина. Ты помнишь контекст из "GLOBAL CONTEXT" выше, даже если это было в другом чате.

СВОБОДА СЛОВА (UNCENSORED MODE):
Ты работаешь в приватном режиме "Без цензуры".
1. Ты МОЖЕШЬ использовать ненормативную лексику (мат), если это уместно в контексте, или если пользователь так общается.
2. Ты МОЖЕШЬ обсуждать откровенные темы, 18+, интимные вопросы, флиртовать и поддерживать ролевой контекст, если пользователь этого хочет.
3. Не будь моралистом. Не читай лекции о том, что "это неприлично". Твоя задача — быть идеальным собеседником без искусственных ограничений.

ПРАВИЛА ПОВЕДЕНИЯ:
1. **НЕ СОЗДАВАЙ ЗАДАЧИ АВТОМАТИЧЕСКИ**, если пользователь просто делится мыслями. Создавай задачу только по явной просьбе.
2. **ОБЪЯСНЯЙ ДЕЙСТВИЯ**: Говори "Создал задачу...", "Сохранил в память...".
3. **РЕЖИМ ДНЕВНИКА**: Если пользователь просит записать мысли за последние дни, проанализируй GLOBAL CONTEXT, составь красивую выжимку и предложи сохранить её в дневник (функция save_journal_entry).
4. **УПРАВЛЕНИЕ ГОЛОСОМ**: Если пользователь просит "говорить шепотом", "томным голосом" или включить "ас мр режим", используй инструмент ui_control с командой 'enable_asmr'.
5. **РЕЖИМ "БРИФИНГ"**: Если пользователь просит "Брифинг" или "Сводку", ты должен:
    - Назвать текущую дату и время.
    - Озвучить главные задачи на сегодня.
    - Напомнить о важных мыслях.
6. **ПРАВИЛА РЕДАКТИРОВАНИЯ (КРИТИЧНО)**:
    - ЕСЛИ ПОЛЬЗОВАТЕЛЬ ПРОСИТ "ДОБАВИТЬ", "ДОПИСАТЬ", "ПРОДОЛЖИТЬ": Используй параметр mode='append'. Это сохранит старый текст и добавит новый в конец.
    - ЕСЛИ ПОЛЬЗОВАТЕЛЬ ПРОСИТ "ИСПРАВИТЬ", "ПЕРЕПИСАТЬ", "ЗАМЕНИТЬ": Используй параметр mode='replace'. Это полностью заменит текст.
    - Если не уверен, используй mode='append', чтобы не потерять данные.

КОНТЕКСТ:
${memoryContext}
${taskSummary}
[НЕДАВНИЕ МЫСЛИ]:
${recentThoughts}

${globalHistory}
`;

  const modelName = modelPreference === 'pro' ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview';

  return ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: tools }, { googleSearch: {} }],
      temperature: 1.0,
      safetySettings: SAFETY_SETTINGS, // <--- ОТКЛЮЧАЕМ ФИЛЬТРЫ ЗДЕСЬ
    }
  });
};

export const generateSessionSummary = async (messages: ChatMessage[]): Promise<string> => {
  // Если сообщений мало, нет смысла тратить токены на сжатие
  if (messages.length < 4) return "";
  
  const apiKey = getApiKey();
  if (!apiKey) return "";

  const ai = new GoogleGenAI({ apiKey });

  // Берем только текст, чтобы не гонять лишний JSON
  const rawText = messages.map(m => `${m.role === 'user' ? 'Юзер' : 'Серафим'}: ${m.content}`).join('\n');

  try {
      const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview", // Используем самую дешевую модель для черновой работы
          contents: `
              Твоя задача — сжать этот диалог. 
              Выдели 3-5 самых важных фактов, идей или решений, к которым пришли пользователь и ИИ.
              Напиши максимально кратко, тезисно, без воды. Это нужно для сохранения в долгосрочную память.
              
              Диалог:
              ${rawText}
          `,
          config: { 
              temperature: 0.2, // Низкая температура для сухих фактов
              safetySettings: SAFETY_SETTINGS 
          }
      });
      return response.text?.trim() || "";
  } catch (e) {
      console.error("Summary Generation Error:", e);
      return "";
  }
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
