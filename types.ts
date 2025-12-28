
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
    isTaskSynced?: boolean;
  };
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  notes?: string;
  mood?: string;
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

export type ViewState = 'chat' | 'journal' | 'thoughts' | 'planner' | 'settings' | 'projects';
export type CalendarMode = 'day' | 'week' | 'month' | 'quarter';

export interface AppState {
  tasks: Task[];
  thoughts: Thought[];
  journal: JournalEntry[];
  projects: Project[];
  habits: Habit[];
  view: ViewState;
}

export type ThemeKey = 'slate' | 'emerald' | 'rose' | 'ocean' | 'amber' | 'carbon' | 'amethyst' | 'crimson' | 'neon' | 'polar' | 'paper' | 'lilac';
