-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    reminder_time TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    priority TEXT,
    project_id TEXT,
    column_id TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TEXT
);

-- THOUGHTS TABLE
CREATE TABLE IF NOT EXISTS thoughts (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    content TEXT,
    notes TEXT,
    type TEXT,
    tags TEXT[],
    author TEXT,
    project_id TEXT,
    board_id TEXT,
    category TEXT,
    sections JSONB DEFAULT '[]'::jsonb,
    created_at TEXT,
    x NUMERIC,
    y NUMERIC,
    width NUMERIC,
    linked_ids TEXT[],
    links JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_archived BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- JOURNAL TABLE
CREATE TABLE IF NOT EXISTS journal (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    date TEXT,
    content TEXT,
    notes TEXT,
    mood TEXT,
    tags TEXT[],
    reflection JSONB DEFAULT '{}'::jsonb
);

-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT,
    description TEXT,
    color TEXT,
    created_at TEXT,
    columns JSONB DEFAULT '[]'::jsonb,
    boards JSONB DEFAULT '[]'::jsonb
);

-- HABITS TABLE
CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT,
    color TEXT,
    completed_dates TEXT[],
    created_at TEXT
);

-- CHAT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT,
    category TEXT,
    project_id TEXT,
    messages JSONB DEFAULT '[]'::jsonb,
    last_interaction BIGINT,
    created_at TEXT,
    summary TEXT
);

-- MEMORIES TABLE
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    content TEXT,
    created_at TEXT
);

-- MIGRATIONS (Run these if tables already exist but are missing columns)

-- Tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_time TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS column_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Thoughts
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS linked_ids TEXT[];
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS x NUMERIC;
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS y NUMERIC;
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS width NUMERIC;
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS board_id TEXT;
ALTER TABLE thoughts ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb;

-- Projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS columns JSONB DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS boards JSONB DEFAULT '[]'::jsonb;

-- Chat Sessions
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS summary TEXT;
