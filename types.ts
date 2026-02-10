
// Enums and Basic Types first
export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export type ChatCategory = 'general' | 'strategy' | 'productivity' | 'learning' | 'mental';
export type LinkType = 'related' | 'cause' | 'effect' | 'hypothesis' | 'blocker';
export type ViewState = 'dashboard' | 'chat' | 'journal' | 'thoughts' | 'planner' | 'settings' | 'projects' | 'analytics';
export type ThemeKey = 'emerald' | 'amber' | 'neon' | 'ocean' | 'obsidian' | 'crimson' | 'cloud' | 'paper';
export type FontFamily = 'JetBrains Mono';
export type IconWeight = '1px' | '1.5px' | '2px' | '2.5px' | '3px';
export type TextureType = 'custom' | 'none';
export type CalendarMode = 'week' | 'month';
export type GeminiModel = 'flash' | 'pro';

// Interfaces depending on Basic Types
export interface Attachment {
  id: string;
  type: 'link' | 'file' | 'image' | 'audio';
  content: string; // URL or Base64
  name: string;
}

export interface NodeLink {
  targetId: string;
  type: LinkType;
  color?: string;
}

export interface ProjectColumn {
  id: string;
  title: string;
  order: number;
  color?: string;
}

export interface ProjectBoard {
  id: string;
  title: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  color: string;
  createdAt: string;
  columns?: ProjectColumn[];
  boards?: ProjectBoard[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string | null;
  reminderTime?: string;
  isCompleted: boolean;
  priority: Priority;
  projectId?: string;
  columnId?: string;
  attachments?: Attachment[];
  createdAt: string;
}

export interface Thought {
  id: string;
  content: string;
  notes?: string;
  type: 'thought' | 'idea' | 'insight' | 'quote' | 'link' | 'file' | 'task_node' | 'image' | 'annotation';
  tags: string[];
  author?: string;
  projectId?: string;
  boardId?: string;
  createdAt: string;
  x?: number;
  y?: number;
  width?: number;
  linkedIds?: string[];
  links?: NodeLink[];
  attachments?: Attachment[];
  isArchived?: boolean; 
  metadata?: {
    url?: string;
    fileName?: string;
    fileType?: string;
    fileData?: string;
    isTaskSynced?: boolean;
    taskStatus?: boolean;
    imageSrc?: string;
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
  projectId?: string;
  messages: ChatMessage[];
  lastInteraction: number;
  createdAt: string;
}

export interface Memory {
  id: string;
  content: string;
  createdAt: string;
}

export interface AppState {
  tasks: Task[];
  thoughts: Thought[];
  journal: JournalEntry[];
  projects: Project[];
  habits: Habit[];
  view: ViewState;
}
