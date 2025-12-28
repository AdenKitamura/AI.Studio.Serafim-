
export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export type ChatCategory = 'general' | 'strategy' | 'productivity' | 'learning' | 'mental';

export interface Project {
  id: string;
  title: string;
  description?: string;
  color: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string | null;
  isCompleted: boolean;
  priority: Priority;
  projectId?: string;
  createdAt: string;
}

export interface Thought {
  id: string;
  content: string;
  type: 'thought' | 'idea' | 'insight' | 'quote' | 'link' | 'file' | 'task_node';
  tags: string[];
  author?: string;
  projectId?: string;
  createdAt: string;
  x?: number;
  y?: number;
  linkedIds?: string[];
  isArchived?: boolean; 
  metadata?: {
    url?: string;
    fileName?: string;
    fileType?: string;
    fileData?: string; // Base64
    isTaskSynced?: boolean;
  };
}

export interface DailyReflection {
  mainFocus: string;
  gratitude: string;
  blockers: string;
  tomorrowGoal: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  notes?: string;
  mood?: string;
  tags?: string[];
  reflection?: DailyReflection;
}

export interface Habit {
  id: string;
  title: string;
  color: string;
  completedDates: string[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  image?: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  category: ChatCategory;
  messages: ChatMessage[];
  lastInteraction: number;
  createdAt: string;
}

export type ViewState = 'dashboard' | 'chat' | 'journal' | 'thoughts' | 'planner' | 'settings' | 'projects';
export type ThemeKey = 'slate' | 'emerald' | 'rose' | 'ocean' | 'amber' | 'carbon' | 'amethyst' | 'crimson' | 'neon' | 'polar' | 'paper' | 'lilac';

// Added missing exported member 'CalendarMode' for CalendarView.tsx
export type CalendarMode = 'week' | 'month';

// Added missing exported member 'AppState' for ProfileModal.tsx
export interface AppState {
  tasks: Task[];
  thoughts: Thought[];
  journal: JournalEntry[];
  projects: Project[];
  habits: Habit[];
  view: ViewState;
}
