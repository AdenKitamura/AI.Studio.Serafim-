
export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export type ChatCategory = 'general' | 'strategy' | 'productivity' | 'learning' | 'mental';

export interface Attachment {
  id: string;
  type: 'link' | 'file' | 'image' | 'audio';
  content: string; // URL or Base64
  name: string;
}

export interface ProjectColumn {
  id: string;
  title: string;
  order: number;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  color: string;
  createdAt: string;
  columns?: ProjectColumn[]; // Kanban columns
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string | null; // Nullable for backlog tasks
  reminderTime?: string;
  isCompleted: boolean;
  priority: Priority;
  projectId?: string;
  columnId?: string; // Kanban column linkage
  attachments?: Attachment[]; // Files/Links
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
  attachments?: Attachment[]; // Files/Links for whiteboard nodes
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

export type ThemeKey = 'emerald' | 'amber' | 'neon' | 'ocean';
export type FontFamily = 'JetBrains Mono';
export type IconWeight = '1px' | '1.5px' | '2px' | '2.5px' | '3px';
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
