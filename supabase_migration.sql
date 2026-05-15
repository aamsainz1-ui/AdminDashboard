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

-- Finance / company operations
CREATE TABLE IF NOT EXISTS finance_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  bank text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'HOLD', 'CLOSED')),
  limit_text text DEFAULT '-',
  owner text DEFAULT 'คุณ',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(id)
);

CREATE TABLE IF NOT EXISTS finance_pending_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,
  amount text NOT NULL,
  account text NOT NULL,
  age text NOT NULL,
  status text NOT NULL DEFAULT 'WAIT' CHECK (status IN ('URGENT', 'CHECK', 'WAIT')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  datetime text NOT NULL,
  type text NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAW')),
  amount text NOT NULL,
  account text NOT NULL,
  note text DEFAULT '',
  by text DEFAULT 'คุณ',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS line_broadcast_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  datetime text NOT NULL,
  topic text NOT NULL,
  caption text DEFAULT '',
  image_url text DEFAULT '',
  audience text NOT NULL DEFAULT 'All',
  has_image boolean DEFAULT false,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('SCHEDULED', 'REVIEW', 'DRAFT', 'SENT')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cashbook_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  datetime text NOT NULL,
  category text NOT NULL,
  category_color text NOT NULL,
  description text NOT NULL,
  type text NOT NULL CHECK (type IN ('IN', 'OUT')),
  amount text NOT NULL,
  recorded_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cashbook_fixed_costs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  category_color text NOT NULL,
  amount text NOT NULL,
  due_date text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PAID', 'PENDING', 'AWAIT_BILL')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cashbook_company_loans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower text NOT NULL,
  amount text NOT NULL,
  purpose text NOT NULL,
  date text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REPAID')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cashbook_payment_maps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  card text NOT NULL,
  purpose text NOT NULL,
  account text NOT NULL,
  handler text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_registry_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,
  name text NOT NULL,
  owner text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  rights text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_payment_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  card text NOT NULL,
  service text NOT NULL,
  date text NOT NULL,
  category text NOT NULL,
  category_color text NOT NULL,
  handler text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brain_dump_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_pending_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_broadcast_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook_fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook_company_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook_payment_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_registry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_dump_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON finance_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON finance_pending_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON finance_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON line_broadcast_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON cashbook_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON cashbook_fixed_costs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON cashbook_company_loans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON cashbook_payment_maps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON account_registry_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON account_payment_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON brain_dump_items FOR ALL USING (true) WITH CHECK (true);
