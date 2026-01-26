# TaskMaster - System Architecture

> Generated via `/sc:design` phase
> Date: 2025-01-26
> Supabase Project: `aseeuadyafuntohgisig`

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    React 19 + TypeScript + Vite                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │   │
│  │  │   Auth   │  │  Tasks   │  │ Projects │  │  Admin Panel     │    │   │
│  │  │  Context │  │  Kanban  │  │  Manager │  │  (role=admin)    │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SUPABASE LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │   Supabase  │  │   Supabase  │  │   Supabase  │  │    Supabase     │   │
│  │    Auth     │  │  Database   │  │   Storage   │  │  Edge Functions │   │
│  │             │  │ (PostgreSQL)│  │             │  │                 │   │
│  │  • Email    │  │  • Tables   │  │  • Avatars  │  │  • Email Jobs   │   │
│  │  • OAuth    │  │  • RLS      │  │  • Files    │  │  • Cron Tasks   │   │
│  │  • Sessions │  │  • Triggers │  │  • 10MB max │  │  • Webhooks     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘   │
│                          │                                    │             │
│                          │ Realtime                          │             │
│                          ▼                                    ▼             │
│                   ┌─────────────┐                    ┌─────────────────┐   │
│                   │  WebSocket  │                    │     Resend      │   │
│                   │   Channels  │                    │   (Email API)   │   │
│                   └─────────────┘                    └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### 2.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌────────────────┐
│  auth.users  │       │     profiles     │       │     plans      │
│──────────────│       │──────────────────│       │────────────────│
│ id (PK)      │──────▶│ id (PK, FK)      │       │ id (PK)        │
│ email        │       │ full_name        │       │ name           │
│ ...          │       │ avatar_url       │◀──────│ project_limit  │
└──────────────┘       │ role             │       │ task_limit     │
                       │ plan_id (FK)     │───────│ features       │
                       │ language         │       └────────────────┘
                       │ is_active        │
                       └──────────────────┘
                                │
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│    projects      │   │  subscriptions   │   │   audit_logs     │
│──────────────────│   │──────────────────│   │──────────────────│
│ id (PK)          │   │ id (PK)          │   │ id (PK)          │
│ name             │   │ user_id (FK)     │   │ user_id (FK)     │
│ description      │   │ plan_id (FK)     │   │ action           │
│ color            │   │ status           │   │ entity_type      │
│ owner_id (FK)    │   │ current_period   │   │ entity_id        │
│ is_personal      │   │ stripe_*         │   │ old_values       │
└──────────────────┘   └──────────────────┘   │ new_values       │
        │                                      │ ip_address       │
        │                                      │ user_agent       │
        ▼                                      └──────────────────┘
┌──────────────────┐
│ project_members  │
│──────────────────│
│ id (PK)          │
│ project_id (FK)  │
│ user_id (FK)     │
│ role             │
└──────────────────┘
        │
        ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│     tasks        │   │  task_assignees  │   │  task_comments   │
│──────────────────│   │──────────────────│   │──────────────────│
│ id (PK)          │──▶│ task_id (FK)     │   │ id (PK)          │
│ project_id (FK)  │   │ user_id (FK)     │   │ task_id (FK)     │
│ title            │   └──────────────────┘   │ user_id (FK)     │
│ description      │                          │ content          │
│ status           │   ┌──────────────────┐   │ mentions         │
│ priority         │   │ task_attachments │   └──────────────────┘
│ due_date         │   │──────────────────│
│ position         │──▶│ id (PK)          │   ┌──────────────────┐
│ recurrence_*     │   │ task_id (FK)     │   │   time_entries   │
│ created_by       │   │ file_name        │   │──────────────────│
└──────────────────┘   │ file_path        │   │ id (PK)          │
        │              │ file_size        │   │ task_id (FK)     │
        │              └──────────────────┘   │ user_id (FK)     │
        ▼                                      │ duration_minutes │
┌──────────────────┐   ┌──────────────────┐   │ description      │
│   task_labels    │   │ task_label_asgn  │   │ started_at       │
│──────────────────│   │──────────────────│   └──────────────────┘
│ id (PK)          │──▶│ task_id (FK)     │
│ project_id (FK)  │   │ label_id (FK)    │
│ name             │   └──────────────────┘
│ color            │
└──────────────────┘

┌──────────────────┐   ┌──────────────────┐
│   notifications  │   │     payments     │
│──────────────────│   │──────────────────│
│ id (PK)          │   │ id (PK)          │
│ user_id (FK)     │   │ user_id (FK)     │
│ type             │   │ amount           │
│ title            │   │ currency         │
│ data             │   │ status           │
│ is_read          │   │ stripe_*         │
└──────────────────┘   └──────────────────┘
```

### 2.2 Table Definitions

#### Core Tables

```sql
-- profiles (extends auth.users)
profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  avatar_url      TEXT,
  role            user_role DEFAULT 'user',        -- 'user' | 'admin'
  plan_id         UUID REFERENCES plans(id),
  language        TEXT DEFAULT 'en',               -- 'en' | 'lt'
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- plans (subscription plan definitions)
plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,            -- 'free' | 'pro' | 'business'
  display_name    TEXT NOT NULL,
  project_limit   INTEGER,                         -- NULL = unlimited
  task_limit      INTEGER,                         -- NULL = unlimited
  features        JSONB DEFAULT '{}',              -- feature flags
  price_monthly   DECIMAL(10,2),
  price_yearly    DECIMAL(10,2),
  stripe_price_monthly TEXT,
  stripe_price_yearly  TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- subscriptions (user subscription records)
subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id         UUID REFERENCES plans(id),
  status          subscription_status DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  stripe_customer_id   TEXT,
  stripe_subscription_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- payments (payment history)
payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  amount          DECIMAL(10,2) NOT NULL,
  currency        TEXT DEFAULT 'EUR',
  status          payment_status DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

#### Project & Task Tables

```sql
-- projects
projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  color           TEXT DEFAULT '#6366f1',
  owner_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_personal     BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- project_members (team membership)
project_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role            project_role DEFAULT 'member',   -- 'owner' | 'admin' | 'member' | 'viewer'
  invited_by      UUID REFERENCES profiles(id),
  joined_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
)

-- tasks
tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  status          task_status DEFAULT 'todo',      -- 'todo' | 'in_progress' | 'review' | 'done'
  priority        task_priority DEFAULT 'medium',  -- 'urgent' | 'high' | 'medium' | 'low'
  due_date        DATE,
  position        INTEGER DEFAULT 0,               -- for ordering in kanban
  -- Recurrence fields
  recurrence_pattern   recurrence_type,            -- 'daily' | 'weekly' | 'monthly' | 'custom'
  recurrence_interval  INTEGER DEFAULT 1,
  recurrence_end_date  DATE,
  parent_task_id       UUID REFERENCES tasks(id),  -- for recurring task chain
  -- Metadata
  created_by      UUID NOT NULL REFERENCES profiles(id),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- task_assignees (many-to-many)
task_assignees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by     UUID REFERENCES profiles(id),
  assigned_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, user_id)
)

-- task_comments
task_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  mentions        UUID[],                          -- array of mentioned user IDs
  is_edited       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- task_attachments
task_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by     UUID NOT NULL REFERENCES profiles(id),
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL,                   -- Supabase Storage path
  file_size       BIGINT NOT NULL,
  file_type       TEXT NOT NULL,                   -- MIME type
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- task_labels (Pro/Business feature)
task_labels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT '#6366f1',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, name)
)

-- task_label_assignments (many-to-many)
task_label_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID REFERENCES tasks(id) ON DELETE CASCADE,
  label_id        UUID REFERENCES task_labels(id) ON DELETE CASCADE,
  assigned_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, label_id)
)

-- time_entries
time_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  description     TEXT,
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ,
  is_running      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

#### System Tables

```sql
-- notifications
notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            notification_type NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  data            JSONB DEFAULT '{}',
  is_read         BOOLEAN DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- audit_logs (compliance-ready)
audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action          audit_action NOT NULL,           -- 'create' | 'update' | 'delete'
  entity_type     TEXT NOT NULL,                   -- 'task', 'project', 'profile', etc.
  entity_id       UUID NOT NULL,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

### 2.3 Enum Types

```sql
-- User & Auth
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Projects
CREATE TYPE project_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Tasks
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE task_priority AS ENUM ('urgent', 'high', 'medium', 'low');
CREATE TYPE recurrence_type AS ENUM ('daily', 'weekly', 'monthly', 'custom');

-- Subscriptions
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- Notifications
CREATE TYPE notification_type AS ENUM (
  'task_assigned',
  'task_comment',
  'task_mention',
  'task_due_soon',
  'task_overdue',
  'project_invite',
  'system'
);

-- Audit
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete');
```

---

## 3. Row Level Security (RLS) Policies

### 3.1 Profile Policies

```sql
-- Users can read all profiles (for team features)
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
```

### 3.2 Project Policies

```sql
-- Users can see projects they own or are members of
CREATE POLICY "projects_select" ON projects FOR SELECT USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = projects.id AND user_id = auth.uid()
  )
);

-- Only owners can update/delete projects
CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "projects_delete" ON projects FOR DELETE
  USING (owner_id = auth.uid());

-- Insert with plan limit check
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (
  owner_id = auth.uid()
  AND check_project_limit(auth.uid())
);
```

### 3.3 Task Policies

```sql
-- Users can see tasks in their projects
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN project_members pm ON pm.project_id = p.id
    WHERE p.id = tasks.project_id
    AND (p.owner_id = auth.uid() OR pm.user_id = auth.uid())
  )
);

-- Members and above can create tasks (with limit check)
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (
  has_project_permission(project_id, auth.uid(), ARRAY['owner', 'admin', 'member'])
  AND check_task_limit(auth.uid())
);

-- Members and above can update tasks
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (
  has_project_permission(project_id, auth.uid(), ARRAY['owner', 'admin', 'member'])
);

-- Only owners/admins can delete tasks
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (
  has_project_permission(project_id, auth.uid(), ARRAY['owner', 'admin'])
);
```

### 3.4 Label Policies (Pro/Business only)

```sql
-- Labels visible to project members with paid plans
CREATE POLICY "task_labels_select" ON task_labels FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN project_members pm ON pm.project_id = p.id
    WHERE p.id = task_labels.project_id
    AND (p.owner_id = auth.uid() OR pm.user_id = auth.uid())
  )
  AND user_has_feature(auth.uid(), 'labels')
);

-- Only create labels if user has labels feature
CREATE POLICY "task_labels_insert" ON task_labels FOR INSERT WITH CHECK (
  has_project_permission(project_id, auth.uid(), ARRAY['owner', 'admin'])
  AND user_has_feature(auth.uid(), 'labels')
);
```

---

## 4. Database Functions & Triggers

### 4.1 Plan Limit Functions

```sql
-- Check if user can create more projects
CREATE FUNCTION check_project_limit(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  limit_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM projects WHERE owner_id = user_id;

  SELECT pl.project_limit INTO limit_count
  FROM profiles p
  JOIN plans pl ON pl.id = p.plan_id
  WHERE p.id = user_id;

  -- NULL limit means unlimited
  IF limit_count IS NULL THEN RETURN true; END IF;

  RETURN current_count < limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can create more tasks
CREATE FUNCTION check_task_limit(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  limit_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  WHERE p.owner_id = user_id;

  SELECT pl.task_limit INTO limit_count
  FROM profiles p
  JOIN plans pl ON pl.id = p.plan_id
  WHERE p.id = user_id;

  IF limit_count IS NULL THEN RETURN true; END IF;

  RETURN current_count < limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has specific feature
CREATE FUNCTION user_has_feature(user_id UUID, feature_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN plans pl ON pl.id = p.plan_id
    WHERE p.id = user_id
    AND (pl.features->>feature_name)::boolean = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2 Permission Helper Functions

```sql
-- Check project permission
CREATE FUNCTION has_project_permission(
  p_project_id UUID,
  p_user_id UUID,
  p_roles project_role[]
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects p
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = p_user_id
    WHERE p.id = p_project_id
    AND (
      (p.owner_id = p_user_id AND 'owner' = ANY(p_roles))
      OR pm.role = ANY(p_roles)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.3 Triggers

```sql
-- Auto-create profile on user signup
CREATE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id FROM plans WHERE name = 'free' LIMIT 1;

  INSERT INTO profiles (id, full_name, plan_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    free_plan_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-add owner as project member
CREATE FUNCTION handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION handle_new_project();

-- Update timestamps
CREATE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Audit logging trigger
CREATE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (auth.uid(), 'create', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), 'update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values)
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set task completed_at when status changes to done
CREATE FUNCTION handle_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    NEW.completed_at = now();

    -- Handle recurring task
    IF NEW.recurrence_pattern IS NOT NULL
       AND (NEW.recurrence_end_date IS NULL OR NEW.recurrence_end_date > CURRENT_DATE) THEN
      INSERT INTO tasks (
        project_id, title, description, status, priority,
        due_date, recurrence_pattern, recurrence_interval,
        recurrence_end_date, parent_task_id, created_by
      )
      VALUES (
        NEW.project_id, NEW.title, NEW.description, 'todo', NEW.priority,
        calculate_next_due_date(NEW.due_date, NEW.recurrence_pattern, NEW.recurrence_interval),
        NEW.recurrence_pattern, NEW.recurrence_interval,
        NEW.recurrence_end_date, NEW.id, NEW.created_by
      );
    END IF;
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_status_change
  BEFORE UPDATE OF status ON tasks
  FOR EACH ROW EXECUTE FUNCTION handle_task_completion();
```

---

## 5. Edge Functions Architecture

### 5.1 Email Functions

```
supabase/functions/
├── send-welcome-email/        # Triggered after signup
├── send-task-reminder/        # Cron: check due dates daily
├── send-task-overdue/         # Cron: check overdue tasks daily
├── send-task-assigned/        # Triggered on assignment
├── send-mention-notification/ # Triggered on comment with mentions
└── send-password-reset/       # Custom password reset flow
```

### 5.2 Cron Jobs (pg_cron)

```sql
-- Daily task reminders (8:00 AM UTC)
SELECT cron.schedule(
  'task-reminders',
  '0 8 * * *',
  $$SELECT net.http_post(
    url := 'https://aseeuadyafuntohgisig.supabase.co/functions/v1/send-task-reminder',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  )$$
);

-- Daily overdue check (9:00 AM UTC)
SELECT cron.schedule(
  'task-overdue',
  '0 9 * * *',
  $$SELECT net.http_post(
    url := 'https://aseeuadyafuntohgisig.supabase.co/functions/v1/send-task-overdue',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  )$$
);
```

### 5.3 Database Webhooks

| Trigger | Table | Event | Edge Function |
|---------|-------|-------|---------------|
| task_assigned | task_assignees | INSERT | send-task-assigned |
| comment_mention | task_comments | INSERT | send-mention-notification |
| user_signup | profiles | INSERT | send-welcome-email |

---

## 6. Storage Buckets

### 6.1 Bucket Configuration

```sql
-- Task attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('task-attachments', 'task-attachments', false, 10485760); -- 10MB

-- User avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('avatars', 'avatars', true, 2097152); -- 2MB
```

### 6.2 Storage Policies

```sql
-- Task attachments: Only project members can upload/view
CREATE POLICY "task_attachments_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments' AND (
    SELECT EXISTS (
      SELECT 1 FROM task_attachments ta
      JOIN tasks t ON t.id = ta.task_id
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN project_members pm ON pm.project_id = p.id
      WHERE ta.file_path = storage.objects.name
      AND (p.owner_id = auth.uid() OR pm.user_id = auth.uid())
    )
  ));

CREATE POLICY "task_attachments_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);

-- Avatars: Public read, own upload
CREATE POLICY "avatars_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## 7. Realtime Configuration

### 7.1 Enabled Tables

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE project_members;
```

### 7.2 Client Subscription Patterns

```typescript
// Subscribe to project tasks
supabase
  .channel('project-tasks')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks',
    filter: `project_id=eq.${projectId}`
  }, handleTaskChange)
  .subscribe();

// Subscribe to user notifications
supabase
  .channel('user-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, handleNotification)
  .subscribe();
```

---

## 8. Initial Data

### 8.1 Plans Seed Data

```sql
INSERT INTO plans (name, display_name, project_limit, task_limit, features, price_monthly, price_yearly) VALUES
('free', 'Free', 1, 25, '{"labels": false, "time_tracking": "basic", "team": false}', 0, 0),
('pro', 'Pro', 10, NULL, '{"labels": true, "time_tracking": "full", "team": true}', 9.99, 99),
('business', 'Business', NULL, NULL, '{"labels": true, "time_tracking": "full", "team": true, "admin_panel": true, "audit_logs": true}', 29.99, 299);
```

### 8.2 Default Labels Template

```sql
-- Function to create default labels for new projects (Pro/Business)
CREATE FUNCTION create_default_labels(p_project_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  IF user_has_feature(p_user_id, 'labels') THEN
    INSERT INTO task_labels (project_id, name, color) VALUES
      (p_project_id, 'Bug', '#ef4444'),
      (p_project_id, 'Feature', '#22c55e'),
      (p_project_id, 'Improvement', '#3b82f6'),
      (p_project_id, 'Documentation', '#8b5cf6');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 9. Next Steps

1. **Apply Migrations** - Run all SQL migrations via Supabase MCP
2. **Configure Auth** - Set up Google OAuth provider in Supabase Dashboard
3. **Deploy Edge Functions** - Create and deploy email notification functions
4. **Set up Cron Jobs** - Enable pg_cron for scheduled tasks
5. **Create Storage Buckets** - Set up attachment and avatar buckets
6. **Seed Initial Data** - Insert plan definitions
7. **Test RLS Policies** - Verify security policies work correctly
