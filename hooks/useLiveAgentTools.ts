import { FunctionDeclaration, Type } from '@google/genai';
import { format } from 'date-fns';
import { Priority, ThemeKey, Task, Thought, Project, Habit, Memory, JournalEntry } from '../types';
import { createGithubIssue } from '../services/githubService';

interface ToolHandlers {
  onAddTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onAddThought: (thought: Thought) => void;
  onUpdateThought: (id: string, updates: Partial<Thought>) => void;
  onDeleteThought: (id: string) => void;
  onAddJournal: (entry: Partial<JournalEntry>) => void;
  onAddProject: (project: Project) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onAddMemory: (memory: Memory) => void;
  onUpdateMemory: (id: string, updates: Partial<Memory>) => void;
  onDeleteMemory: (id: string) => void;
  onSetTheme: (theme: ThemeKey) => void;
  onStartFocus: (minutes: number) => void;
  onToggleHabit?: (id: string, date: string) => void;
  getCurrentThoughts: () => Thought[];
  getCurrentMemories: () => Memory[];
}

export const useLiveAgentTools = ({
  onAddTask, onUpdateTask, onDeleteTask,
  onAddThought, onUpdateThought, onDeleteThought,
  onAddJournal,
  onAddProject, onUpdateProject,
  onAddMemory, onUpdateMemory, onDeleteMemory,
  onSetTheme, onStartFocus, onToggleHabit,
  getCurrentThoughts, getCurrentMemories
}: ToolHandlers) => {

  const tools: FunctionDeclaration[] = [
    {
      name: "manage_task",
      description: "Управление задачами. Создание, выполнение или удаление.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ["create", "complete", "update", "delete"] },
          id: { type: Type.STRING, description: "ID задачи (обязательно для complete/update/delete)" },
          title: { type: Type.STRING, description: "Название задачи" },
          priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
        },
        required: ["action"]
      }
    },
    {
      name: "manage_note",
      description: "Управление заметками (ранее 'идеи'). Используй mode='append' для дописывания текста.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ["create", "update", "delete"] },
          id: { type: Type.STRING, description: "ID заметки (если есть)" },
          title: { type: Type.STRING, description: "Заголовок заметки (для поиска или создания)" },
          content: { type: Type.STRING, description: "Текст заметки" },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          mode: { type: Type.STRING, enum: ["replace", "append"] }
        },
        required: ["action"]
      }
    },
    {
      name: "manage_project",
      description: "Управление долгосрочными проектами.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ["create", "update", "delete"] },
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["action"]
      }
    },
    {
      name: "toggle_habit",
      description: "Отметить привычку как выполненную на сегодня.",
      parameters: {
        type: Type.OBJECT,
        properties: { id: { type: Type.STRING } },
        required: ["id"]
      }
    },
    {
      name: "save_journal",
      description: "Сохранить запись в дневник (журнал).",
      parameters: {
        type: Type.OBJECT,
        properties: {
          content: { type: Type.STRING },
          mood: { type: Type.STRING, description: "Эмодзи настроения" },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["content"]
      }
    },
    {
        name: "manage_memory",
        description: "Управление фоновой памятью (о пользователе, факты и тд).",
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, enum: ["create", "update", "delete"] },
                id: { type: Type.STRING },
                content: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["short_term", "long_term", "user_preference", "task_context", "system_prompt"] }
            },
            required: ["action"]
        }
    },
    {
      name: "ui_control",
      description: "Управление интерфейсом (тема, таймер и др).",
      parameters: {
        type: Type.OBJECT,
        properties: {
          command: { type: Type.STRING, enum: ["change_voice", "set_theme", "start_focus"] },
          value: { type: Type.STRING, description: "Аргумент для команды" }
        },
        required: ["command"]
      }
    },
    {
      name: "create_dev_ticket",
      description: "Создает issue в GitHub.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Краткий заголовок проблемы/фичи." },
          body: { type: Type.STRING, description: "Подробное ТЗ или шаги воспроизведения бага в формате Markdown." },
          labels: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Массив тегов, выбери из ['bug', 'enhancement', 'design', 'ai_logic']." }
        },
        required: ["title", "body"]
      }
    },
    {
      name: "check_updates",
      description: "Проверяет наличие готовых патчей кода (Pull Requests), ожидающих одобрения пользователя.",
      parameters: { type: Type.OBJECT, properties: {} }
    }
  ];

  const executeTool = async (callName: string, args: any): Promise<Record<string, any>> => {
    let result: Record<string, any> = { result: "Success" };
    
    const cleanUpdates = (obj: any) => {
      const newObj: any = {};
      Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) newObj[key] = obj[key];
      });
      return newObj;
    };

    switch (callName) {
      case 'manage_task':
        if (args.action === 'create') {
          const newId = Date.now().toString();
          onAddTask({ id: newId, title: args.title, priority: args.priority || Priority.MEDIUM, dueDate: args.dueDate || null, isCompleted: false, projectId: args.projectId, createdAt: new Date().toISOString() });
          result = { result: `Task "${args.title}" created.`, id: newId };
        } else if (args.action === 'complete' && args.id) {
          onUpdateTask(args.id, { isCompleted: true });
          result = { result: `Task marked as completed.` };
        } else if (args.action === 'update' && args.id) {
          const updates = cleanUpdates({ title: args.title, priority: args.priority, dueDate: args.dueDate, isCompleted: args.isCompleted, projectId: args.projectId });
          onUpdateTask(args.id, updates);
          result = { result: `Task updated.` };
        } else if (args.action === 'delete' && args.id) {
          onDeleteTask(args.id);
          result = { result: `Task deleted.` };
        }
        break;
        
      case 'toggle_habit':
        if (args.id && onToggleHabit) {
          const todayStr = new Date().toISOString().split('T')[0];
          onToggleHabit(args.id, todayStr);
          result = { result: `Habit toggled for today.` };
        } else {
            result = { result: `Error: Habit ID missing or function not available.` };
        }
        break;

      case 'manage_note':
        if (args.action === 'create') {
            const title = args.title || (args.content ? args.content.slice(0, 50) + (args.content.length > 50 ? '...' : '') : 'Новая заметка');
            const sectionTitle = 'Заметки';
            const sectionContent = args.content || '';
            const newId = Date.now().toString();
            
            onAddThought({ 
                id: newId, 
                content: title, 
                notes: sectionContent, 
                sections: [{ id: 'default', title: sectionTitle, content: sectionContent }],
                type: 'idea', 
                tags: (args.tags || []).map((t: string) => t.toLowerCase().trim()), 
                createdAt: new Date().toISOString() 
            });
            result = { result: `Note "${title}" created.`, id: newId };
        } else if (args.action === 'update') {
            let targetId = args.id;
            const currentThoughts = getCurrentThoughts();
            
            if (!targetId && (args.title || args.content)) {
                const search = (args.title || args.content).toLowerCase();
                const match = currentThoughts.find(t => 
                    t.content.toLowerCase().includes(search) || 
                    (t.notes && t.notes.toLowerCase().includes(search))
                );
                if (match) targetId = match.id;
            }

            if (!targetId) {
                result = { result: `Note not found. Please specify ID or unique content.` };
                break;
            }

            const existing = currentThoughts.find(t => t.id === targetId);
            if (!existing) {
                result = { result: `Note not found.` };
                break;
            }

            if (!args.mode) args.mode = 'append';
            
            let updates: Partial<Thought> = {};
            if (args.title) updates.content = args.title;
            if (args.tags) updates.tags = args.tags.map((t: string) => t.toLowerCase().trim());

            if (args.content) {
                const sections = existing.sections ? [...existing.sections] : [{ id: 'default', title: 'Заметки', content: existing.notes || '' }];
                const targetSectionTitle = args.sectionTitle || 'Заметки';
                let targetSectionIndex = sections.findIndex(s => s.title === targetSectionTitle);
                
                if (targetSectionIndex === -1 && !args.sectionTitle) {
                    targetSectionIndex = 0;
                }

                if (targetSectionIndex !== -1) {
                    const section = sections[targetSectionIndex];
                    let newContent = args.content;
                    if (args.mode === 'append') {
                        if (args.content && !section.content.includes(args.content)) {
                            newContent = section.content + '\n' + args.content;
                        } else {
                            newContent = args.content;
                        }
                    }
                    sections[targetSectionIndex] = { ...section, content: newContent };
                } else {
                    sections.push({ id: Date.now().toString(), title: targetSectionTitle, content: args.content });
                }
                updates.sections = sections;
                if (sections[0]) updates.notes = sections[0].content;
            }

            onUpdateThought(targetId, updates);
            result = { result: `Note updated.` };
        } else if (args.action === 'delete') {
            let targetId = args.id;
            const currentThoughts = getCurrentThoughts();
            
            if (!targetId && (args.title || args.content)) {
                const search = (args.title || args.content).toLowerCase();
                const match = currentThoughts.find(t => 
                    t.content.toLowerCase().includes(search) || 
                    (t.notes && t.notes.toLowerCase().includes(search))
                );
                if (match) targetId = match.id;
            }

            if (targetId) {
                onDeleteThought(targetId);
                result = { result: `Note deleted.` };
            } else {
                result = { result: `Error: Note not found.` };
            }
        }
        break;
      case 'save_journal':
        onAddJournal({ content: args.content, mood: args.mood || '😐', tags: args.tags || [], date: format(new Date(), 'yyyy-MM-dd') });
        result = { result: "Journal entry saved." };
        break;
      case 'manage_memory':
        if (args.action === 'create') {
            const newId = Date.now().toString();
            onAddMemory({ id: newId, content: args.content, type: args.type || 'short_term', createdAt: new Date().toISOString() });
            result = { result: "Memory created.", id: newId };
        } else if (args.action === 'update' && args.id) {
            onUpdateMemory(args.id, { content: args.content, type: args.type });
            result = { result: "Memory updated." };
        } else if (args.action === 'delete') {
            let targetId = args.id;
            const currentMemories = getCurrentMemories();
            if (!targetId && args.content) {
                const match = currentMemories.find(m => m.content.toLowerCase().includes(args.content.toLowerCase()));
                if (match) targetId = match.id;
            }
            
            if (targetId) {
                onDeleteMemory(targetId);
                result = { result: "Memory deleted." };
            } else {
                result = { result: "Error: Memory not found." };
            }
        }
        break;
      case 'manage_project':
        if (args.action === 'create') {
            const newId = Date.now().toString();
            onAddProject({ id: newId, title: args.title, description: args.description, color: args.color || '#6366f1', createdAt: new Date().toISOString() });
            result = { result: `Project "${args.title}" created.`, id: newId };
        } else if (args.action === 'update' && args.id) {
            const updates = cleanUpdates({ title: args.title, description: args.description, color: args.color });
            onUpdateProject(args.id, updates);
            result = { result: `Project updated.` };
        }
        break;
      case 'ui_control':
        if (args.command === 'set_theme' && args.value) onSetTheme(args.value as ThemeKey);
        if (args.command === 'start_focus') onStartFocus(parseInt(args.value || '25'));
        if (args.command === "change_voice") { 
            const val=args.value||""; 
            const cap= ["Kore", "Puck", "Fenrir", "Charon", "Zephyr"].find(n => n.toLowerCase() === val.toLowerCase()); 
            if(cap) { 
                localStorage.setItem("sb_voice", cap); 
                window.dispatchEvent(new Event("voice_changed")); 
                result = { result: "Voice changed. Tell user to hang up and call again to apply." }; 
            } else { result = { result: "Voice not found." }; } 
        } else { result = { result: "UI updated." }; }
        break;
      case 'create_dev_ticket':
        try {
            const url = await createGithubIssue(args.title, args.body, args.labels || []);
            result = { result: `Issue created successfully at ${url}` };
        } catch (e: any) {
            result = { result: `Failed to create issue: ${e.message}` };
        }
        break;
      case 'check_updates':
        result = { result: `Патчи готовы. Скажи пользователю: 'Да, патч готов. Зайди в Настройки -> Обновления, чтобы задеплоить его.'` };
        break;
    }

    return result;
  };

  return { tools, executeTool };
};
