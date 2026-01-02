
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
  reminderTime?: string;
  isCompleted: boolean;
  priority: Priority;
  projectId?: string;
  createdAt: string;
}

export type LinkType = 'related' | 'cause' | 'effect' | 'hypothesis' | 'blocker';

export interface NodeLink {
  targetId: string;
  type: LinkType;
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
  links?: NodeLink[];
  isArchived?: boolean; 
  metadata?: {
    url?: string;
    fileName?: string;
    fileType?: string;
    fileData?: string;
    isTaskSynced?: boolean;
    taskStatus?: boolean;
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

export type ViewState = 'dashboard' | 'chat' | 'journal' | 'thoughts' | 'planner' | 'settings' | 'projects' | 'analytics';

// Restricted Theme List
export type ThemeKey = 'emerald' | 'amber' | 'neon' | 'ocean';

// Restricted Font List (Only Mono)
export type FontFamily = 'JetBrains Mono';

// Expanded Icon Weights
export type IconWeight = '1px' | '1.5px' | '2px' | '2.5px' | '3px';

// Texture Types (Added custom)
export type TextureType = 'custom' | 'none';

export type CalendarMode = 'week' | 'month';

export interface AppState {
  tasks: Task[];
  thoughts: Thought[];
  journal: JournalEntry[];
  projects: Project[];
  habits: Habit[];
  view: ViewState;
}
