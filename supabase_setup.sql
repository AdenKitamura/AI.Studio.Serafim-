-- СБРОС И СОЗДАНИЕ СТРУКТУРЫ БД ДЛЯ SERAFIM OS (v4.4 FINAL)
-- Вставьте этот код в Supabase SQL Editor и нажмите Run.

-- 1. Таблицы (Создаем, если их нет)
create table if not exists tasks (
  id text primary key,
  user_id text not null default auth.uid()::text,
  title text not null,
  description text,
  due_date timestamptz,
  reminder_time text,
  is_completed boolean default false,
  priority text,
  project_id text,
  column_id text,
  created_at timestamptz default now()
);

create table if not exists projects (
  id text primary key,
  user_id text not null default auth.uid()::text,
  title text not null,
  description text,
  color text,
  created_at timestamptz default now(),
  columns jsonb,
  boards jsonb
);

create table if not exists thoughts (
  id text primary key,
  user_id text not null default auth.uid()::text,
  content text,
  notes text,
  type text,
  tags text[],
  author text,
  project_id text,
  board_id text,
  created_at timestamptz default now(),
  x numeric,
  y numeric,
  width numeric,
  linked_ids text[],
  links jsonb,
  attachments jsonb,
  is_archived boolean default false,
  metadata jsonb
);

create table if not exists journal (
  id text primary key,
  user_id text not null default auth.uid()::text,
  date text not null,
  content text,
  notes text,
  mood text,
  tags text[],
  reflection jsonb
);

create table if not exists habits (
  id text primary key,
  user_id text not null default auth.uid()::text,
  title text not null,
  color text,
  completed_dates text[],
  created_at timestamptz default now()
);

create table if not exists chat_sessions (
  id text primary key,
  user_id text not null default auth.uid()::text,
  title text,
  category text,
  project_id text,
  messages jsonb,
  last_interaction bigint,
  created_at timestamptz default now()
);

create table if not exists memories (
  id text primary key,
  user_id text not null default auth.uid()::text,
  content text not null,
  created_at timestamptz default now()
);

-- 2. Включение защиты (RLS)
alter table tasks enable row level security;
alter table projects enable row level security;
alter table thoughts enable row level security;
alter table journal enable row level security;
alter table habits enable row level security;
alter table chat_sessions enable row level security;
alter table memories enable row level security;

-- 3. Исправленные политики доступа (с приведением типов ::text)
do $$ 
declare 
  tbl text; 
begin 
  for tbl in select unnest(ARRAY['tasks', 'projects', 'thoughts', 'journal', 'habits', 'chat_sessions', 'memories']) 
  loop 
    -- Удаляем старые политики, чтобы избежать конфликтов
    execute format('drop policy if exists "Enable all for owner %s" on %s', tbl, tbl);
    execute format('drop policy if exists "Owner select %s" on %s', tbl, tbl);
    execute format('drop policy if exists "Owner insert %s" on %s', tbl, tbl);
    execute format('drop policy if exists "Owner update %s" on %s', tbl, tbl);
    execute format('drop policy if exists "Owner delete %s" on %s', tbl, tbl);

    -- Создаем универсальную политику.
    -- ВАЖНО: auth.uid()::text решает ошибку типа данных.
    execute format('create policy "Enable all for owner %s" on %s for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id)', tbl, tbl);
  end loop; 
end $$;

-- 4. Индексы
create index if not exists tasks_uid_idx on tasks(user_id);
create index if not exists projects_uid_idx on projects(user_id);
create index if not exists thoughts_uid_idx on thoughts(user_id);
create index if not exists journal_uid_idx on journal(user_id);
create index if not exists habits_uid_idx on habits(user_id);
create index if not exists chat_sessions_uid_idx on chat_sessions(user_id);
create index if not exists memories_uid_idx on memories(user_id);