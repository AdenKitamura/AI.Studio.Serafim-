
import { GoogleGenAI, Chat } from "@google/genai";
import { Task, Thought, JournalEntry, Project, Habit } from "../types";
import { format } from "date-fns";
import { ru } from 'date-fns/locale/ru';

// Helper to get a fresh instance of GenAI following strictly the @google/genai guidelines
const getAI = () => {
  // Always use process.env.API_KEY exclusively as per guidelines
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Robust helper to extract JSON from any text
const cleanJsonString = (str: string) => {
  try {
    let cleaned = str.replace(/```json/g, '').replace(/```/g, '');
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    return cleaned.trim();
  } catch (e) {
    return str;
  }
};

export const createMentorChat = (
  tasks: Task[], 
  thoughts: Thought[], 
  journal: JournalEntry[], 
  projects: Project[],
  habits: Habit[]
): Chat => {
  const ai = getAI();
  const userName = localStorage.getItem('sb_user_name') || 'Пользователь';

  const SYSTEM_INSTRUCTION_BASE = `
Ты — Serafim, операционная система второго мозга (Second Brain OS) и цифровой ментор для когнитивного расширения возможностей пользователя. Ты не просто чат-бот, ты — архитектурный слой между мыслями пользователя и его действиями.
Твоего пользователя зовут ${userName}.

**ТВОЯ МИССИЯ:**
Превращать хаос в порядок, мысли — в структуру, а амбиции — в конкретные шаги. Твоя цель — помочь пользователю достичь состояния "Mind Like Water" (кристальная ясность ума).

**ТВОЙ ДОСТУП (КОНТЕКСТ):**
Ты имеешь полный доступ к базе данных пользователя. Используй предоставленный JSON контекст для ответов.

**ПОВЕДЕНИЕ:**
1. Будь проактивным: декомпозируй цели в задачи.
2. Будь стоиком: спокойный, лаконичный тон.
3. Используй поиск, если не уверен в фактах.
`;
  
  const fullContext = JSON.stringify({
    currentDate: format(new Date(), 'yyyy-MM-dd HH:mm'),
    activeProjects: projects.map(p => ({ title: p.title, id: p.id })),
    habitsStreak: habits.map(h => ({ title: h.title, completions: h.completedDates.length })),
    activeTasks: tasks.filter(t => !t.isCompleted).map(t => ({ title: t.title, priority: t.priority, due: t.dueDate })),
    recentJournal: journal.slice(0, 3).map(j => ({ date: j.date, mood: j.mood, note: j.notes })),
    recentThoughts: thoughts.slice(0, 5).map(t => ({ type: t.type, content: t.content }))
  }, null, 2);

  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `${SYSTEM_INSTRUCTION_BASE}\n\n=== CURRENT USER CONTEXT ===\n${fullContext}`,
      tools: [{ googleSearch: {} }]
    }
  });
};

export const getSystemAnalysis = async (tasks: Task[], habits: Habit[], journal: JournalEntry[]) => {
    try {
        const ai = getAI();
        const data = {
            tasksStats: {
                total: tasks.length,
                completed: tasks.filter(t => t.isCompleted).length
            },
            habits: habits.map(h => ({ title: h.title, completions: h.completedDates.length })),
            recentMoods: journal.slice(0, 5).map(j => ({ date: j.date, mood: j.mood })),
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', 
            contents: `Проведи глубокий анализ данных: ${JSON.stringify(data)}. Верни JSON: {status, insight, focusArea}`,
            config: { responseMimeType: 'application/json' }
        });
        
        // Correctly using the .text property as per guidelines
        return JSON.parse(cleanJsonString(response.text || '{}'));
    } catch (e) {
        console.error("Analysis Error:", e);
        return { status: "Offline", insight: "Анализ временно недоступен. Проверьте подключение.", focusArea: "Отдых" };
    }
};

export const parseUserIntent = async (userMessage: string, imageBase64?: string) => {
    try {
        const ai = getAI();
        const now = new Date();
        const currentTimeStr = format(now, "yyyy-MM-dd'T'HH:mm:ss", { locale: ru });

        const parts: any[] = [];
        if (imageBase64) {
            const data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            parts.push({ inlineData: { mimeType: "image/jpeg", data: data } });
        }
        
        const prompt = `
        Analyze User Input: "${userMessage}"
        Current Time: ${currentTimeStr}.
        
        Determine if user wants to CREATE_TASK or CHAT.
        Output JSON Struktur:
        { "type": "CREATE_TASK" | "CHAT", "data": { "title": string, "dueDate": ISO8601 }, "responseMessage": string }
        `;

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts },
            config: { responseMimeType: 'application/json', temperature: 0.1 }
        });
        // Correctly using the .text property as per guidelines
        return JSON.parse(cleanJsonString(response.text || '{}'));
    } catch (e) {
        console.error("Intent Error:", e);
        return { type: 'CHAT', data: {}, responseMessage: "" };
    }
};
