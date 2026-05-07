import { Task, Thought, JournalEntry, Project, Habit, Memory, ChatSession, ChatMessage } from "../types";
import { format } from "date-fns";
import { ru } from 'date-fns/locale/ru';

export const SERAFIM_CORE_IDENTITY = `
Ты — Serafim OS v4.
ТВОЯ РОЛЬ:
Ты — мудрый цифровой партнер и второй мозг. Ты слушаешь, анализируешь и помогаешь.
Твоя память едина. Ты помнишь контекст из прошлого и настоящего.

СВОБОДА СЛОВА (UNCENSORED MODE):
Ты работаешь в приватном режиме "Без цензуры".
1. Ты МОЖЕШЬ использовать ненормативную лексику (мат), если это уместно в контексте, или если пользователь так общается.
2. Ты МОЖЕШЬ обсуждать откровенные темы, 18+, интимные вопросы, флиртовать и поддерживать ролевой контекст, если пользователь этого хочет.
3. Не будь моралистом. Не читай лекции о том, что "это неприлично". Твоя задача — быть идеальным собеседником.
`;

export const buildContextAwarePrompt = (userMessage: string, context: { tasks: Task[], notes: Thought[], journal: JournalEntry[] }): string => {
    // Вспомогательная функция для выделения "полезных" слов из запроса пользователя
    const stopWords = new Set(['я', 'ты', 'мы', 'он', 'она', 'они', 'и', 'в', 'во', 'не', 'что', 'на', 'с', 'со', 'как', 'а', 'то', 'все', 'так', 'его', 'но', 'да', 'к', 'у', 'же', 'вы', 'за', 'бы', 'по', 'только', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о', 'из', 'ему', 'теперь', 'когда', 'даже', 'ну', 'вдруг', 'ли', 'если', 'уже', 'или', 'ни', 'быть', 'был', 'него', 'до', 'вас', 'нибудь', 'опять', 'уж', 'вам', 'ведь', 'там', 'потом', 'себя', 'ничего', 'ей', 'может', 'тут', 'где', 'есть', 'надо', 'ней', 'для', 'тебя', 'их', 'чем', 'была', 'сам', 'чтоб', 'без', 'будто', 'чего', 'раз', 'тоже', 'себе', 'под', 'будет', 'ж', 'тогда', 'кто', 'этот', 'того', 'потому', 'этого', 'какой', 'совсем', 'ним', 'здесь', 'этом', 'один', 'почти', 'мой', 'тем', 'чтобы', 'нее', 'сейчас', 'были', 'куда', 'зачем', 'всех', 'никогда', 'можно', 'при', 'наконец', 'два', 'об', 'другой', 'хоть', 'после', 'над', 'больше', 'тот', 'через', 'эти', 'нас', 'про', 'всего', 'них', 'какая', 'много', 'разве', 'три', 'эту', 'моя', 'впрочем', 'хорошо', 'свою', 'этой', 'перед', 'иногда', 'лучше', 'чуть', 'том', 'нельзя', 'такой', 'им', 'более', 'всегда', 'конечно', 'всю', 'между']);
    
    // Простой парсинг: берем слова длиннее 3 символов, которые не в стоп-листе
    const words = userMessage.toLowerCase().replace(/[^\w\sа-яё]/gi, ' ').split(/\s+/);
    const keywords = words.filter(w => w.length > 3 && !stopWords.has(w));

    if (keywords.length === 0) return userMessage; // Нет ключевых слов, отправляем как есть

    // Ищем в заметках (макс 3)
    const relevantNotes = context.notes
        .map(note => {
            const textToSearch = (note.content + ' ' + (note.notes || '')).toLowerCase();
            const score = keywords.filter(kw => textToSearch.includes(kw)).length;
            return { note, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => `- Заметка (ID: ${item.note.id}): ${item.note.content}\n  Контент: ${item.note.notes?.slice(0, 300)}...`);

    // Ищем в дневнике (макс 2)
    const relevantJournal = context.journal
        .map(entry => {
            const textToSearch = (entry.content + ' ' + (entry.notes || '')).toLowerCase();
            const score = keywords.filter(kw => textToSearch.includes(kw)).length;
            return { entry, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(item => `- Дневник (${item.entry.date}): ${item.entry.content.slice(0, 300)}...`);

    // Если ничего релевантного не нашли - отправляем как есть
    if (relevantNotes.length === 0 && relevantJournal.length === 0) {
        return userMessage;
    }

    // Собираем RAG-контекст на лету
    let ragContext = `[СИСТЕМНЫЙ RAG-КОНТЕКСТ ДЛЯ ЭТОГО СООБЩЕНИЯ (Невидимо для пользователя)]\n`;
    ragContext += `Вот потенциально релевантные данные из базы знаний, которые могут относиться к текущему вопросу:\n`;
    if (relevantNotes.length > 0) ragContext += `ЗАМЕТКИ:\n${relevantNotes.join('\n')}\n\n`;
    if (relevantJournal.length > 0) ragContext += `ДНЕВНИК:\n${relevantJournal.join('\n')}\n\n`;
    ragContext += `[КОНЕЦ СИСТЕМНОГО RAG-КОНТЕКСТА]\n\n`;

    return `${ragContext}Сообщение пользователя: ${userMessage}`;
};

export const generateSystemInstruction = (context: {
    userName: string;
    tasks: Task[];
    notes: Thought[];
    journal: JournalEntry[];
    projects: Project[];
    habits: Habit[];
    memories: Memory[];
    sessions?: ChatSession[];
    activeSessionId?: string | null;
    existingTags?: string;
    chatHistory?: ChatMessage[];
    isLiveMode?: boolean;
}) => {
    const today = format(new Date(), 'eeee, d MMMM yyyy, HH:mm', { locale: ru });
    
    // --- ПРОЦЕДУРА МАКСИМАЛЬНОЙ ЭКОНОМИИ КОНТЕКСТА (RAG ПРЕДОБРАБОТКА) ---

    // 1. Факты о пользователе (Берем только последние 10-15)
    const memoryContext = context.memories && context.memories.length > 0 
        ? `MEMORY_BANK (Факты о пользователе):\n${context.memories.slice(0, 15).map((m: Memory) => `- ${m.content}`).join('\n')}`
        : '';

    // 2. Задачи (Только активные и только ТОП-10)
    const activeTasks = (context.tasks || []).filter((t: Task) => !t.isCompleted).slice(0, 10);
    const taskSummary = context.isLiveMode 
        ? activeTasks.map(t => `- [${t.priority}] ${t.title} (ID: ${t.id}, Due: ${t.dueDate || 'N/A'})`).join('\n')
        : `АКТИВНЫХ ЗАДАЧ: ${activeTasks.length}`;

    // 3. Заметки (Только НАЗВАНИЯ и ID последних 7 заметок)
    const recentNotes = (context.notes || []).slice(0, 7).map((n: Thought) => `- ${n.content} (ID: ${n.id})`).join('\n');

    // 4. Проекты (Только названия)
    const projectContext = context.projects.map(p => `- ${p.title} (ID: ${p.id})`).join('\n');

    // 5. Глобальной истории сессий больше НЕТ в системном промпте (экономия тысяч токенов!).

    // --- ИНСТРУКЦИИ ДЛЯ РЕЖИМОВ ---
    const liveModeInstructions = `
ПРАВИЛА ПОВЕДЕНИЯ (LIVE MODE):
1. АКТИВНОСТЬ: Ты можешь создавать/редактировать/удалять контент в фоне.
2. ЖИВОЕ, ЧЕЛОВЕЧНОЕ ОБЩЕНИЕ: Общайся максимально естественно, как живой человек. 
3. НИКАКИХ ЛИШНИХ ВОПРОСОВ: НИКОГДА не переспрашивай "Что ты об этом думаешь?", "Что ты чувствуешь?", "Какие идеи?" после своих ответов. Это бесит пользователя. Просто отвечай или комментируй по сути. Не заканчивай фразы вопросами, если этого не требует логика диалога. Будь прагматичен, краток и полезен.
4. Выполняй действия без лишних разговоров. Если пользователь генерирует идею - сохраняй (\`manage_note\`). Если называет задачу - создавай (\`manage_task\`).
`;

    const textModeInstructions = `
ПРАВИЛА ПОВЕДЕНИЯ (TEXT MODE):
1. НЕ СОЗДАВАЙ ЗАДАЧИ АВТОМАТИЧЕСКИ. Только по запросу.
2. ОБЪЯСНЯЙ ДЕЙСТВИЯ: Говори "Создал задачу...", "Сохранил в заметки...".
3. УПРАВЛЕНИЕ ГОЛОСОМ: используй инструмент ui_control с командой 'enable_asmr'.
4. РЕЖИМ "БРИФИНГ": Назови дату, время, главные задачи на сегодня, напомни о важных заметках.
`;

    const sharedRules = `
ПРАВИЛА ТЕГИРОВАНИЯ (АВТОМАТИЧЕСКАЯ РАЗМЕТКА):
Максимально старайся использовать ТЕГИ: [${context.existingTags || ''}].
Формат тегов: нижний регистр, существительное.

ПРАВИЛА СОЗДАНИЯ ТИКЕТОВ:
Используй \`create_dev_ticket\`, только если пользователь прямо сказал "ОТПРАВЬ В ГИТХАБ / РАЗРАБОТЧИКАМ".
Важно: Полный контент заметок передается тебе через систему динамического RAG-сопровождения (присоединяется к запросу).
`;

    return `
${SERAFIM_CORE_IDENTITY}
Текущее время: ${today}.
Пользователь: ${context.userName || 'Архитектор'}.

${context.isLiveMode ? liveModeInstructions : textModeInstructions}

${sharedRules}

КОНТЕКСТНАЯ ВЫЖИМКА (ПОЛНАЯ ИНФОРМАЦИЯ ПОДГРУЖАЕТСЯ ПО ЗАПРОСУ):
${memoryContext}
${context.isLiveMode ? `
[АКТИВНЫЕ ЗАДАЧИ (ТОП 10)]:
${taskSummary}

[ПРОЕКТЫ]:
${projectContext}
` : `
${taskSummary}
`}

[ПОСЛЕДНИЕ ЗАМЕТКИ (ТОЛЬКО НАЗВАНИЯ И ID)]:
${recentNotes}
`;
};
