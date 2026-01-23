-- 1. Helper function to get User ID from Clerk JWT
-- Reads the 'sub' claim from the JWT token passed by Clerk
create or replace function requesting_user_id()
returns text as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$ language sql stable;

-- 2. Create tables (Idempotent: uses IF NOT EXISTS)

-- TASKS
create table if not exists tasks (
  id text primary key,
  user_id text not null default requesting_user_id(),
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

-- PROJECTS
create table if not exists projects (
  id text primary key,
  user_id text not null default requesting_user_id(),
  title text not null,
  description text,
  color text,
  created_at timestamptz default now(),
  columns jsonb,
  boards jsonb
);

-- THOUGHTS (Zettelkasten)
create table if not exists thoughts (
  id text primary key,
  user_id text not null default requesting_user_id(),
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

-- JOURNAL
create table if not exists journal (
  id text primary key,
  user_id text not null default requesting_user_id(),
  date text not null,
  content text,
  notes text,
  mood text,
  tags text[],
  reflection jsonb
);

-- HABITS
create table if not exists habits (
  id text primary key,
  user_id text not null default requesting_user_id(),
  title text not null,
  color text,
  completed_dates text[],
  created_at timestamptz default now()
);

-- CHAT SESSIONS (AI History)
create table if not exists chat_sessions (
  id text primary key,
  user_id text not null default requesting_user_id(),
  title text,
  category text,
  project_id text,
  messages jsonb,
  last_interaction bigint,
  created_at timestamptz default now()
);

-- MEMORIES (Long term AI memory)
create table if not exists memories (
  id text primary key,
  user_id text not null default requesting_user_id(),
  content text not null,
  created_at timestamptz default now()
);

-- 3. Enable RLS on all tables
alter table tasks enable row level security;
alter table projects enable row level security;
alter table thoughts enable row level security;
alter table journal enable row level security;
alter table habits enable row level security;
alter table chat_sessions enable row level security;
alter table memories enable row level security;

-- 4. Function to create policies idempotently (Drop then Create)
-- This fixes the "policy already exists" error
create or replace function create_rls_policy(table_name text)
returns void as $$
begin
  -- Drop existing policies to avoid 42710 error
  execute format('drop policy if exists "Users can select own %1$s" on %1$s', table_name);
  execute format('drop policy if exists "Users can insert own %1$s" on %1$s', table_name);
  execute format('drop policy if exists "Users can update own %1$s" on %1$s', table_name);
  execute format('drop policy if exists "Users can delete own %1$s" on %1$s', table_name);

  -- Create new policies
  execute format('
    create policy "Users can select own %1$s" on %1$s for select
    using ( user_id = requesting_user_id() );

    create policy "Users can insert own %1$s" on %1$s for insert
    with check ( user_id = requesting_user_id() );

    create policy "Users can update own %1$s" on %1$s for update
    using ( user_id = requesting_user_id() );

    create policy "Users can delete own %1$s" on %1$s for delete
    using ( user_id = requesting_user_id() );
  ', table_name);
end;
$$ language plpgsql;

-- Apply policies
select create_rls_policy('tasks');
select create_rls_policy('projects');
select create_rls_policy('thoughts');
select create_rls_policy('journal');
select create_rls_policy('habits');
select create_rls_policy('chat_sessions');
select create_rls_policy('memories');

-- 5. Indexes for performance (User ID lookups are frequent)
create index if not exists tasks_user_id_idx on tasks(user_id);
create index if not exists projects_user_id_idx on projects(user_id);
create index if not exists thoughts_user_id_idx on thoughts(user_id);
create index if not exists journal_user_id_idx on journal(user_id);
create index if not exists habits_user_id_idx on habits(user_id);
create index if not exists chat_sessions_user_id_idx on chat_sessions(user_id);
create index if not exists memories_user_id_idx on memories(user_id);