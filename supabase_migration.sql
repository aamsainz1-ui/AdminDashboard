-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/kmloseczqatswwczqajs/sql/new
CREATE TABLE IF NOT EXISTS mkt_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date text NOT NULL,
  tab text NOT NULL,
  name text NOT NULL,
  fb numeric DEFAULT 0,
  google numeric DEFAULT 0,
  tiktok numeric DEFAULT 0,
  register numeric DEFAULT 0,
  deposit_member numeric DEFAULT 0,
  first_deposit numeric DEFAULT 0,
  daily_deposit numeric DEFAULT 0,
  month_deposit numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, tab, name)
);

-- Enable RLS (allow anon read/write for this table)
ALTER TABLE mkt_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON mkt_data FOR ALL USING (true) WITH CHECK (true);

-- Tasks (Notion-style)
CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id text,
  due_date date,
  tags text[] DEFAULT '{}',
  subtasks jsonb DEFAULT '[]'::jsonb,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  author_id text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON task_comments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
