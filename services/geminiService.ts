
import { GoogleGenAI, Chat, Type, FunctionDeclaration } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit, Priority, ThemeKey } from "../types";
import { format } from "date-fns";
import { ru } from 'date-fns/locale/ru';

// --- ИНСТРУКЦИЯ СЕРАФИМА (БАЗА ЗНАНИЙ) ---
const APP_MANUAL = `
РУКОВОДСТВО ПО ИНТЕРФЕЙСУ SERAFIM OS:

1. СИСТЕМНЫЕ УВЕДОМЛЕНИЯ (PWA):
   - Ты используешь технологию Notification Triggers. Если пользователь просит напомнить, создай задачу.
   - Уведомление сработает на уровне системы, ДАЖЕ ЕСЛИ ПРИЛОЖЕНИЕ ЗАКРЫТО или выгружено из памяти (особенно на Android).
   - Инструмент: 'manage_task' с параметром 'dueDate'.

2. РАБОТА СО ВРЕМЕНЕМ (КРИТИЧНО ВАЖНО):
   - Ты получаешь "SYSTEM_CONTEXT" с точным временем устройства пользователя в формате ISO (например, 2023-10-25T20:00:00+03:00).
   - ВСЕГДА используй это время как точку отсчета "СЕЙЧАС".
   - Если пользователь просит "в 20:00", создай ISO-строку с ТЕМ ЖЕ смещением часового пояса, что и в SYSTEM_CONTEXT (не UTC/Z).
   - Пример: Если сейчас +03:00, и просят на 20:00, результат должен быть ...T20:00:00+03:00.

3. БЕСКОНЕЧНАЯ ДОСКА (В ПРОЕКТАХ):
   - Чтобы изменить размер фото: нажми двумя пальцами на фото и разведи их (Pinch-to-Zoom на объекте).
   - Чтобы двигать доску: используй один или два пальца на пустом месте.
   - Чтобы переместить текстовую заметку (annotation): нажми и удерживай (Long Press), затем двигай. Обычное нажатие открывает редактирование.
   - Центровка: кнопка "Прицел" внизу справа возвращает камеру к центру.
   - Связи: нажми кнопку "Скребка" (Link) на одной ноде, затем на другую, чтобы связать их линией.

4. АРХИВ ИДЕЙ vs ПРОЕКТЫ:
   - "Архив Идей" (вкладка "Мысли"): Это отдельное хранилище для свободных идей, инсайтов, дневниковых записей. Они НЕ связаны с проектами.
   - "Проекты": Здесь работа идет по задачам и на досках. То, что создается на доске проекта, живет ТОЛЬКО в проекте.
`;

const tools: FunctionDeclaration[] = [
  {
    name: "manage_task",
    description: "Создает, обновляет, планирует или завершает задачи. Используй для напоминаний и дел. dueDate ДОЛЖЕН быть в формате ISO с часовым поясом пользователя.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["create", "complete", "delete"], description: "Действие с задачей." },
        title: { type: Type.STRING, description: "Название задачи." },
        priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
        dueDate: { type: Type.STRING, description: "Дата и время напоминания (ISO 8601 с Offset, например +03:00)." },
        projectId: { type: Type.STRING, description: "ID проекта, если применимо." }
      },
      required: ["action", "title"]
    }
  },
  {
    name: "create_idea",
    description: "Создает новую ИДЕЮ в Архиве Идей. Используй, когда пользователь хочет 'записать мысль', 'сохранить идею', 'начать дневник' по теме, не связанной с текущими проектами.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Заголовок идеи." },
        content: { type: Type.STRING, description: "Текст или описание идеи." },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Теги для поиска." }
      },
      required: ["title"]
    }
  },
  {
    name: "add_to_project_board",
    description: "Добавляет заметку или цель на ДОСКУ конкретного проекта. Используй, если пользователь говорит 'добавь на доску проекта Х'.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectName: { type: Type.STRING, description: "Название проекта (неточное совпадение)." },
        contentType: { type: Type.STRING, enum: ["task_node", "thought"], description: "Тип: 'task_node' (цель) или 'thought' (заметка)." },
        content: { type: Type.STRING, description: "Текст заметки." }
      },
      required: ["projectName", "content"]
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
    description: "Ищет информацию в прошлом: дневнике, мыслях и архивах.",
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
      contents: `SYSTEM: Fix grammar and remove stuttering. Keep conciseness. Output strictly Russian text. INPUT: "${text}"`,
    });
    return response.text?.trim() || text;
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
  
  // Initial timestamp (static fallback)
  const today = format(new Date(), 'eeee, d MMMM yyyy, HH:mm', { locale: ru });

  const SYSTEM_INSTRUCTION = `
Ты — Serafim OS v4 Pro, высший ИИ-агент управления личной эффективностью.

${APP_MANUAL}

ВНИМАНИЕ: Для каждой реплики пользователя ты будешь получать актуальный SYSTEM_CONTEXT с временем устройства. 
Опирайся ТОЛЬКО на него при расчете времени напоминаний. 
Твоя задача — формировать корректные ISO строки (yyyy-MM-ddTHH:mm:ss+HH:mm) для поля dueDate.

Тон: лаконичный, футуристичный, предельно полезный.
Дата инициализации сессии: ${today}.
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
    tasks: tasks.map(t => ({ title: t.title, completed: t.isCompleted })),
    habits: habits.map(h => ({ title: h.title, completions: h.completedDates.length })),
    moods: journal.map(j => j.mood).filter(Boolean)
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Проанализируй состояние. Данные: ${JSON.stringify(data)}. JSON { status, insight, focusArea }`,
    config: { 
      responseMimeType: "application/json",
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
  
  try { return JSON.parse(response.text || "{}"); } catch (e) { return {}; }
};
