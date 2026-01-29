# TaskMaster Database Documentation

Complete database schema documentation for TaskMaster SaaS application.

## Table of Contents

- [Overview](#overview)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Tables](#tables)
- [Enums & Types](#enums--types)
- [Functions](#functions)
- [Triggers](#triggers)
- [Indexes](#indexes)
- [RLS Policies](#rls-policies)
- [Storage Buckets](#storage-buckets)
- [Migrations](#migrations)

---

## Overview

TaskMaster uses **Supabase** (PostgreSQL) as its database with:
- **Row Level Security (RLS)** on all tables
- **Stripe integration** for payments and subscriptions
- **Audit logging** for compliance and debugging
- **Multi-tenant architecture** with project-based isolation

### Key Design Decisions

1. **profiles vs auth.users**: User metadata stored in `profiles` table, linked to Supabase `auth.users`
2. **Soft deletes**: `is_active` flags instead of hard deletes where applicable
3. **JSON features**: Plan features stored as JSONB for flexibility
4. **Audit trail**: Append-only `audit_logs` table for subscription and user changes

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AUTH LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  auth.users (Supabase Auth)                                                 │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────┐                                                            │
│  │  profiles   │◄─────────────────────────────────────────────────────┐     │
│  └──────┬──────┘                                                      │     │
│         │                                                              │     │
└─────────┼──────────────────────────────────────────────────────────────┼─────┘
          │                                                              │
┌─────────┼──────────────────────────────────────────────────────────────┼─────┐
│         │                    BILLING LAYER                             │     │
├─────────┼──────────────────────────────────────────────────────────────┼─────┤
│         │                                                              │     │
│         ▼                                                              │     │
│  ┌─────────────┐      ┌───────────────┐      ┌──────────────┐         │     │
│  │    plans    │◄─────│ subscriptions │─────►│   payments   │         │     │
│  └─────────────┘      └───────────────┘      └──────────────┘         │     │
│                                                                        │     │
└────────────────────────────────────────────────────────────────────────┼─────┘
                                                                         │
┌────────────────────────────────────────────────────────────────────────┼─────┐
│                           PROJECT LAYER                                │     │
├────────────────────────────────────────────────────────────────────────┼─────┤
│                                                                        │     │
│  ┌──────────────┐      ┌──────────────────┐                           │     │
│  │ tm_projects  │◄────►│ project_members  │◄──────────────────────────┘     │
│  └──────┬───────┘      └──────────────────┘                                 │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                           │
│  │ task_labels  │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                    │
└─────────┼────────────────────────────────────────────────────────────────────┘
          │
┌─────────┼────────────────────────────────────────────────────────────────────┐
│         │                      TASK LAYER                                    │
├─────────┼────────────────────────────────────────────────────────────────────┤
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                           │
│  │   tm_tasks   │◄──────────┐ (self-reference for subtasks)                 │
│  └──────┬───────┘           │                                               │
│         │                   │                                               │
│         ├───────────────────┘                                               │
│         │                                                                    │
│         ├────────►┌──────────────────────┐                                  │
│         │         │   task_assignees     │                                  │
│         │         └──────────────────────┘                                  │
│         │                                                                    │
│         ├────────►┌──────────────────────┐                                  │
│         │         │   task_comments      │                                  │
│         │         └──────────────────────┘                                  │
│         │                                                                    │
│         ├────────►┌──────────────────────┐                                  │
│         │         │  task_attachments    │                                  │
│         │         └──────────────────────┘                                  │
│         │                                                                    │
│         ├────────►┌──────────────────────┐      ┌──────────────┐            │
│         │         │task_label_assignments│◄────►│ task_labels  │            │
│         │         └──────────────────────┘      └──────────────┘            │
│         │                                                                    │
│         └────────►┌──────────────────────┐                                  │
│                   │    time_entries      │                                  │
│                   └──────────────────────┘                                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM LAYER                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │ platform_config  │    │  audit_logs      │    │ tm_notifications │       │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Tables

### 1. profiles

User profile data, linked to Supabase `auth.users`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | - | Primary key, references auth.users |
| `full_name` | TEXT | YES | NULL | User's display name |
| `avatar_url` | TEXT | YES | NULL | Profile picture URL |
| `role` | user_role | NO | 'user' | 'user' or 'admin' |
| `plan_id` | UUID | YES | NULL | FK to plans |
| `language` | TEXT | NO | 'en' | 'en' or 'lt' |
| `is_active` | BOOLEAN | NO | true | Account active status |
| `stripe_customer_id` | TEXT | YES | NULL | Stripe customer ID |
| `created_at` | TIMESTAMPTZ | NO | now() | - |
| `updated_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- FOREIGN KEY (`plan_id`) REFERENCES `plans(id)`

---

### 2. plans

Subscription plan definitions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `name` | TEXT | NO | - | Internal name: 'free', 'pro', 'business' |
| `display_name` | TEXT | NO | - | UI display name |
| `project_limit` | INTEGER | YES | NULL | NULL = unlimited |
| `task_limit` | INTEGER | YES | NULL | NULL = unlimited |
| `features` | JSONB | NO | '{}' | Feature flags and limits |
| `price_monthly` | NUMERIC | NO | 0 | Monthly price in EUR |
| `price_yearly` | NUMERIC | NO | 0 | Yearly price in EUR |
| `stripe_price_monthly` | TEXT | YES | NULL | Stripe Price ID (monthly) |
| `stripe_price_yearly` | TEXT | YES | NULL | Stripe Price ID (yearly) |
| `stripe_product_id` | TEXT | YES | NULL | Stripe Product ID |
| `is_active` | BOOLEAN | NO | true | Available for purchase |
| `created_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- UNIQUE (`name`)

**Default Plans:**
```sql
('free', 'Free', 1, 50, 0, 0)
('pro', 'Pro', 20, 500, 9.99, 99.99)
('business', 'Business', NULL, NULL, 29.99, 299.99)
```

---

### 3. subscriptions

User subscription records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `user_id` | UUID | NO | - | FK to profiles (UNIQUE) |
| `plan_id` | UUID | NO | - | FK to plans |
| `status` | subscription_status | NO | 'active' | Subscription state |
| `current_period_start` | TIMESTAMPTZ | NO | now() | Billing period start |
| `current_period_end` | TIMESTAMPTZ | YES | NULL | Billing period end |
| `cancel_at_period_end` | BOOLEAN | NO | false | Pending cancellation |
| `canceled_at` | TIMESTAMPTZ | YES | NULL | When canceled |
| `stripe_customer_id` | TEXT | YES | NULL | Stripe customer ID |
| `stripe_subscription_id` | TEXT | YES | NULL | Stripe subscription ID |
| `created_at` | TIMESTAMPTZ | NO | now() | - |
| `updated_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- UNIQUE (`user_id`) - One subscription per user
- FOREIGN KEY (`user_id`) REFERENCES `profiles(id)` ON DELETE CASCADE
- FOREIGN KEY (`plan_id`) REFERENCES `plans(id)`

---

### 4. tm_projects

Project/workspace definitions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `name` | TEXT | NO | - | Project name |
| `description` | TEXT | YES | NULL | Project description |
| `color` | TEXT | NO | '#6366f1' | Hex color code |
| `owner_id` | UUID | NO | - | FK to profiles |
| `is_personal` | BOOLEAN | NO | false | Personal vs team project |
| `created_at` | TIMESTAMPTZ | NO | now() | - |
| `updated_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- FOREIGN KEY (`owner_id`) REFERENCES `profiles(id)`

---

### 5. project_members

Project team membership (many-to-many).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `project_id` | UUID | NO | - | FK to tm_projects |
| `user_id` | UUID | NO | - | FK to profiles |
| `role` | project_role | NO | 'member' | Member's role |
| `invited_by` | UUID | YES | NULL | Who invited this member |
| `joined_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- UNIQUE (`project_id`, `user_id`)
- FOREIGN KEY (`project_id`) REFERENCES `tm_projects(id)` ON DELETE CASCADE
- FOREIGN KEY (`user_id`) REFERENCES `profiles(id)` ON DELETE CASCADE
- CHECK (`role` IN ('owner', 'admin', 'member', 'viewer'))

---

### 5.5 project_role_permissions

Customizable permissions for each role per project. Only project owners can view/edit these settings.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `project_id` | UUID | NO | - | FK to tm_projects |
| `role` | TEXT | NO | - | 'admin', 'member', or 'viewer' |
| `can_manage_tasks` | BOOLEAN | NO | false | Create/edit/delete tasks |
| `can_assign_tasks` | BOOLEAN | NO | false | Assign users to tasks |
| `can_comment` | BOOLEAN | NO | false | Add comments |
| `can_manage_labels` | BOOLEAN | NO | false | Create/edit labels |
| `can_upload_files` | BOOLEAN | NO | false | Upload attachments |
| `can_invite_members` | BOOLEAN | NO | false | Invite new members |
| `can_remove_members` | BOOLEAN | NO | false | Remove members |
| `can_change_roles` | BOOLEAN | NO | false | Change member roles |
| `can_edit_project` | BOOLEAN | NO | false | Edit project settings |
| `can_view_time_entries` | BOOLEAN | NO | false | View others' time entries |
| `created_at` | TIMESTAMPTZ | NO | now() | - |
| `updated_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- UNIQUE (`project_id`, `role`)
- FOREIGN KEY (`project_id`) REFERENCES `tm_projects(id)` ON DELETE CASCADE
- CHECK (`role` IN ('admin', 'member', 'viewer'))

**Default Permissions:**
| Role | Tasks | Assign | Comment | Labels | Files | Invite | Remove | Roles | Edit | Time |
|------|-------|--------|---------|--------|-------|--------|--------|-------|------|------|
| admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| member | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| viewer | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

---

### 6. tm_tasks

Task records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `project_id` | UUID | NO | - | FK to tm_projects |
| `title` | TEXT | NO | - | Task title |
| `description` | TEXT | YES | NULL | Task description (markdown) |
| `status` | task_status | NO | 'todo' | Current status |
| `priority` | task_priority | NO | 'medium' | Task priority |
| `due_date` | TIMESTAMPTZ | YES | NULL | Due date |
| `position` | INTEGER | NO | 0 | Order position |
| `recurrence_pattern` | recurrence_type | YES | NULL | Repeat pattern |
| `recurrence_interval` | INTEGER | NO | 1 | Repeat interval |
| `recurrence_end_date` | TIMESTAMPTZ | YES | NULL | Stop repeating after |
| `parent_task_id` | UUID | YES | NULL | FK to tm_tasks (subtasks) |
| `created_by` | UUID | NO | - | FK to profiles |
| `completed_at` | TIMESTAMPTZ | YES | NULL | When marked done |
| `created_at` | TIMESTAMPTZ | NO | now() | - |
| `updated_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- FOREIGN KEY (`project_id`) REFERENCES `tm_projects(id)` ON DELETE CASCADE
- FOREIGN KEY (`parent_task_id`) REFERENCES `tm_tasks(id)` ON DELETE CASCADE
- FOREIGN KEY (`created_by`) REFERENCES `profiles(id)`

---

### 7. task_assignees

Task assignments (many-to-many).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `task_id` | UUID | NO | - | FK to tm_tasks |
| `user_id` | UUID | NO | - | FK to profiles |
| `assigned_by` | UUID | YES | NULL | Who made assignment |
| `assigned_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- UNIQUE (`task_id`, `user_id`)
- FOREIGN KEY (`task_id`) REFERENCES `tm_tasks(id)` ON DELETE CASCADE
- FOREIGN KEY (`user_id`) REFERENCES `profiles(id)` ON DELETE CASCADE

---

### 8. task_comments

Task comments/discussions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `task_id` | UUID | NO | - | FK to tm_tasks |
| `user_id` | UUID | NO | - | FK to profiles |
| `content` | TEXT | NO | - | Comment content |
| `mentions` | TEXT[] | NO | '{}' | Mentioned user IDs |
| `is_edited` | BOOLEAN | NO | false | Has been edited |
| `created_at` | TIMESTAMPTZ | NO | now() | - |
| `updated_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- FOREIGN KEY (`task_id`) REFERENCES `tm_tasks(id)` ON DELETE CASCADE
- FOREIGN KEY (`user_id`) REFERENCES `profiles(id)`

---

### 9. task_attachments

Task file attachments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `task_id` | UUID | NO | - | FK to tm_tasks |
| `uploaded_by` | UUID | NO | - | FK to auth.users |
| `file_name` | TEXT | NO | - | Original filename |
| `file_path` | TEXT | NO | - | Storage bucket path |
| `file_size` | INTEGER | NO | - | Size in bytes |
| `file_type` | TEXT | NO | - | MIME type |
| `created_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- FOREIGN KEY (`task_id`) REFERENCES `tm_tasks(id)` ON DELETE CASCADE
- FOREIGN KEY (`uploaded_by`) REFERENCES `auth.users(id)`

---

### 10. task_labels

Project-scoped task labels/tags.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `project_id` | UUID | NO | - | FK to tm_projects |
| `name` | TEXT | NO | - | Label name |
| `color` | TEXT | NO | '#6366f1' | Hex color |
| `created_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- UNIQUE (`project_id`, `name`)
- FOREIGN KEY (`project_id`) REFERENCES `tm_projects(id)` ON DELETE CASCADE

---

### 11. task_label_assignments

Task-label assignments (many-to-many).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `task_id` | UUID | NO | - | FK to tm_tasks |
| `label_id` | UUID | NO | - | FK to task_labels |
| `assigned_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- UNIQUE (`task_id`, `label_id`)
- FOREIGN KEY (`task_id`) REFERENCES `tm_tasks(id)` ON DELETE CASCADE
- FOREIGN KEY (`label_id`) REFERENCES `task_labels(id)` ON DELETE CASCADE

---

### 12. time_entries

Time tracking records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `task_id` | UUID | NO | - | FK to tm_tasks |
| `user_id` | UUID | NO | - | FK to profiles |
| `duration_minutes` | INTEGER | NO | 0 | Duration in minutes |
| `description` | TEXT | YES | NULL | Work description |
| `started_at` | TIMESTAMPTZ | NO | now() | Start time |
| `ended_at` | TIMESTAMPTZ | YES | NULL | End time |
| `is_running` | BOOLEAN | NO | false | Timer active |
| `created_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- FOREIGN KEY (`task_id`) REFERENCES `tm_tasks(id)` ON DELETE CASCADE
- FOREIGN KEY (`user_id`) REFERENCES `profiles(id)`

---

### 13. payments

Payment transaction records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `user_id` | UUID | NO | - | FK to profiles |
| `subscription_id` | UUID | YES | NULL | FK to subscriptions |
| `amount` | NUMERIC | NO | - | Amount in currency |
| `currency` | TEXT | NO | 'EUR' | ISO currency code |
| `status` | payment_status | NO | 'pending' | Payment state |
| `stripe_payment_intent_id` | TEXT | YES | NULL | Stripe PaymentIntent ID |
| `stripe_invoice_id` | TEXT | YES | NULL | Stripe Invoice ID |
| `created_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- FOREIGN KEY (`user_id`) REFERENCES `profiles(id)`
- FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions(id)`

---

### 14. tm_notifications

User notification records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `user_id` | UUID | NO | - | FK to profiles |
| `type` | notification_type | NO | - | Notification category |
| `title` | TEXT | NO | - | Notification title |
| `body` | TEXT | YES | NULL | Notification body |
| `data` | JSONB | NO | '{}' | Additional metadata |
| `is_read` | BOOLEAN | NO | false | Read status |
| `read_at` | TIMESTAMPTZ | YES | NULL | When read |
| `created_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- FOREIGN KEY (`user_id`) REFERENCES `profiles(id)` ON DELETE CASCADE

---

### 15. audit_logs

Append-only audit trail.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `user_id` | UUID | YES | NULL | Who performed action |
| `action` | TEXT | NO | - | 'create', 'update', 'delete' |
| `entity_type` | TEXT | NO | - | Table/entity name |
| `entity_id` | TEXT | NO | - | Record ID |
| `old_values` | JSONB | YES | NULL | Previous values |
| `new_values` | JSONB | YES | NULL | New values |
| `ip_address` | TEXT | YES | NULL | Client IP |
| `user_agent` | TEXT | YES | NULL | Client user agent |
| `created_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- **READ-ONLY** - No insert/update from application (trigger-only)

---

### 16. platform_config

Platform-wide configuration settings.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | gen_random_uuid() | Primary key |
| `key` | TEXT | NO | - | Setting key |
| `value` | TEXT | NO | - | Setting value |
| `category` | TEXT | NO | 'general' | Setting category |
| `description` | TEXT | YES | NULL | Human description |
| `created_at` | TIMESTAMPTZ | NO | now() | - |
| `updated_at` | TIMESTAMPTZ | NO | now() | - |

**Constraints:**
- PRIMARY KEY (`id`)
- UNIQUE (`key`)

**Default Settings:**
| Key | Default Value | Category |
|-----|---------------|----------|
| `site_name` | 'TaskMaster' | general |
| `site_description` | 'Professional Task Management' | general |
| `site_url` | '' | general |
| `support_email` | 'support@taskmaster.com' | general |
| `trial_days` | '14' | billing |
| `trial_enabled` | 'true' | billing |
| `signup_enabled` | 'true' | features |
| `maintenance_mode` | 'false' | features |

---

## Enums & Types

```sql
-- User roles
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Project member roles
CREATE TYPE project_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Task status workflow
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');

-- Task priority levels
CREATE TYPE task_priority AS ENUM ('urgent', 'high', 'medium', 'low');

-- Recurrence patterns
CREATE TYPE recurrence_type AS ENUM ('daily', 'weekly', 'monthly', 'custom');

-- Subscription states
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');

-- Payment states
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- Notification categories
CREATE TYPE notification_type AS ENUM (
  'task_assigned',
  'task_comment',
  'task_mention',
  'task_due_soon',
  'task_overdue',
  'project_invite',
  'system'
);
```

---

## Functions

### handle_new_user()

Creates profile and optional trial subscription when user registers.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  selected_plan_name TEXT;
  target_plan_id UUID;
  plan_price NUMERIC;
  trial_days_setting INTEGER;
  trial_enabled_setting BOOLEAN;
BEGIN
  -- Read selected_plan from user metadata (passed during signup)
  selected_plan_name := COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'free');

  -- Look up the plan
  SELECT id, price_monthly INTO target_plan_id, plan_price
  FROM public.plans
  WHERE name = selected_plan_name AND is_active = true
  LIMIT 1;

  -- Fallback to free plan if not found
  IF target_plan_id IS NULL THEN
    SELECT id, price_monthly INTO target_plan_id, plan_price
    FROM public.plans WHERE name = 'free' LIMIT 1;
    selected_plan_name := 'free';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, full_name, plan_id, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    target_plan_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();

  -- Create trial subscription for paid plans (if trial enabled)
  IF selected_plan_name != 'free' AND plan_price > 0 THEN
    SELECT COALESCE((SELECT value::INTEGER FROM public.platform_config WHERE key = 'trial_days'), 14)
    INTO trial_days_setting;

    SELECT COALESCE((SELECT value = 'true' FROM public.platform_config WHERE key = 'trial_enabled'), true)
    INTO trial_enabled_setting;

    IF trial_enabled_setting THEN
      INSERT INTO public.subscriptions (
        user_id, plan_id, status,
        current_period_start, current_period_end,
        cancel_at_period_end, created_at, updated_at
      )
      VALUES (
        NEW.id, target_plan_id, 'trialing',
        NOW(), NOW() + (trial_days_setting || ' days')::INTERVAL,
        false, NOW(), NOW()
      )
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

### expire_trials()

Expires trial subscriptions and downgrades users to free plan.

```sql
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS INTEGER AS $$
DECLARE
  free_plan_id UUID;
  expired_count INTEGER := 0;
BEGIN
  SELECT id INTO free_plan_id FROM public.plans WHERE name = 'free' LIMIT 1;

  WITH expired AS (
    UPDATE public.subscriptions
    SET status = 'canceled', plan_id = free_plan_id,
        canceled_at = NOW(), updated_at = NOW()
    WHERE status = 'trialing'
      AND current_period_end < NOW()
      AND stripe_subscription_id IS NULL  -- Only local trials
    RETURNING user_id
  )
  UPDATE public.profiles p
  SET plan_id = free_plan_id, updated_at = NOW()
  FROM expired e WHERE p.id = e.user_id;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

### is_admin()

Checks if current user is an admin.

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### handle_new_project()

Auto-adds project owner as member with 'owner' role.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### log_subscription_changes()

Audit logging for subscription changes.

```sql
CREATE OR REPLACE FUNCTION public.log_subscription_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (NEW.user_id, 'create', 'subscriptions', NEW.id::text,
      jsonb_build_object('plan_id', NEW.plan_id, 'status', NEW.status));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (NEW.user_id, 'update', 'subscriptions', NEW.id::text,
      jsonb_build_object('plan_id', OLD.plan_id, 'status', OLD.status, 'cancel_at_period_end', OLD.cancel_at_period_end),
      jsonb_build_object('plan_id', NEW.plan_id, 'status', NEW.status, 'cancel_at_period_end', NEW.cancel_at_period_end));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values)
    VALUES (OLD.user_id, 'delete', 'subscriptions', OLD.id::text,
      jsonb_build_object('plan_id', OLD.plan_id, 'status', OLD.status));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Triggers

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| `on_auth_user_created` | auth.users | AFTER INSERT | `handle_new_user()` |
| `on_project_created` | tm_projects | AFTER INSERT | `handle_new_project()` |
| `subscription_audit_trigger` | subscriptions | AFTER INSERT/UPDATE/DELETE | `log_subscription_changes()` |
| `profile_registration_audit_trigger` | profiles | AFTER INSERT | `log_user_registration()` |

---

## Indexes

```sql
-- Project member role lookups
CREATE INDEX idx_project_members_role ON project_members(role);

-- Task queries by status
CREATE INDEX idx_tasks_status ON tm_tasks(status);

-- Task queries by project
CREATE INDEX idx_tasks_project ON tm_tasks(project_id);

-- Task due date queries
CREATE INDEX idx_tasks_due_date ON tm_tasks(due_date) WHERE due_date IS NOT NULL;

-- Subscription user lookup
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

-- Notification user queries
CREATE INDEX idx_notifications_user ON tm_notifications(user_id);

-- Notification unread queries
CREATE INDEX idx_notifications_unread ON tm_notifications(user_id, is_read) WHERE is_read = false;

-- Audit log queries
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

---

## RLS Policies

### profiles

```sql
-- Users can view own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can view team member profiles
CREATE POLICY "Users can view team member profiles" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT pm.user_id FROM project_members pm
      WHERE pm.project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (is_admin());
```

### subscriptions

```sql
-- Users can view own subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update own subscription
CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions" ON subscriptions
  FOR SELECT USING (is_admin());

-- Admins can insert subscriptions
CREATE POLICY "Admins can insert subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (is_admin());

-- Admins can update all subscriptions
CREATE POLICY "Admins can update all subscriptions" ON subscriptions
  FOR UPDATE USING (is_admin());

-- Admins can delete subscriptions
CREATE POLICY "Admins can delete subscriptions" ON subscriptions
  FOR DELETE USING (is_admin());
```

### platform_config

```sql
-- Everyone can read platform config
CREATE POLICY "Anyone can read platform config" ON platform_config
  FOR SELECT USING (true);

-- Only admins can modify platform config
CREATE POLICY "Admins can insert platform config" ON platform_config
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update platform config" ON platform_config
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete platform config" ON platform_config
  FOR DELETE USING (is_admin());
```

### tm_projects

```sql
-- Project members can view projects
CREATE POLICY "Members can view projects" ON tm_projects
  FOR SELECT USING (
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

-- Users can create projects
CREATE POLICY "Users can create projects" ON tm_projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Project admins/owners can update
CREATE POLICY "Admins can update projects" ON tm_projects
  FOR UPDATE USING (
    id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Owners can delete projects
CREATE POLICY "Owners can delete projects" ON tm_projects
  FOR DELETE USING (auth.uid() = owner_id);
```

### tm_tasks

```sql
-- Project members can view tasks
CREATE POLICY "Members can view tasks" ON tm_tasks
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

-- Project members can create tasks
CREATE POLICY "Members can create tasks" ON tm_tasks
  FOR INSERT WITH CHECK (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

-- Project members can update tasks
CREATE POLICY "Members can update tasks" ON tm_tasks
  FOR UPDATE USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

-- Project members can delete tasks
CREATE POLICY "Members can delete tasks" ON tm_tasks
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );
```

---

## Storage Buckets

### attachments

Task file attachments bucket.

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);

-- RLS Policies
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own uploads" ON storage.objects
  FOR DELETE USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Migrations

### Migration History

| Date | File | Description |
|------|------|-------------|
| 2025-01-26 | `20250126_add_project_member_roles.sql` | Add role column to project_members |
| 2025-01-26 | `20250126_platform_features.sql` | Create platform_config table with defaults |
| 2025-01-26 | `20250126_fix_profiles_trigger.sql` | Fix handle_new_user trigger |
| 2025-01-26 | `20250126_fix_platform_config_rls.sql` | RLS policies for platform_config |
| 2025-01-26 | `20250126_subscription_audit_logs.sql` | Audit logging for subscriptions |
| 2025-01-27 | `20250127_admin_rls_policies.sql` | Admin RLS for profiles/subscriptions |
| 2025-01-27 | `20250127_fix_audit_log_trigger.sql` | Fix audit log trigger |
| 2025-01-27 | `20250127_add_subscription_unique_constraint.sql` | Unique user_id on subscriptions |
| 2025-01-27 | `20250127_add_stripe_customer_id.sql` | Add stripe_customer_id to profiles |
| 2025-01-27 | `20250127_add_subscriptions_user_fkey.sql` | FK from subscriptions to profiles |
| 2025-01-27 | `20250127_add_canceled_at_column.sql` | Add canceled_at to subscriptions |
| 2025-01-27 | `20250127_add_stripe_price_ids.sql` | Add Stripe price IDs to plans |
| 2025-01-27 | `20250127_fix_platform_config_rls_v2.sql` | Fix platform_config RLS |
| 2025-01-27 | `20250127_fix_platform_config_final.sql` | Final platform_config RLS fix |
| 2025-01-28 | `20250128_fix_signup_plan_selection.sql` | Plan selection during signup + trial |
| 2025-01-28 | `20250128_fix_security_performance_issues.sql` | Fix RLS policies with optimized auth.uid() |
| 2025-01-29 | `20250129_fix_missing_rls_policies.sql` | Add missing INSERT/UPDATE/DELETE for tasks, SELECT for comments, assignees policies |
| 2025-01-29 | `20250129_fix_rls_recursion_and_team_collab.sql` | Fix RLS infinite recursion, add role-based permissions, team collaboration settings |

### Running Migrations

```bash
# Apply all migrations
supabase db push

# Apply specific migration
supabase migration up 20250128_fix_signup_plan_selection

# Reset database (DANGER: deletes all data)
supabase db reset
```

---

## Database Utilities

### Check user's plan and limits

```sql
SELECT
  p.full_name,
  pl.name as plan_name,
  pl.project_limit,
  pl.task_limit,
  s.status as subscription_status,
  s.current_period_end
FROM profiles p
LEFT JOIN plans pl ON p.plan_id = pl.id
LEFT JOIN subscriptions s ON p.id = s.user_id
WHERE p.id = 'USER_UUID';
```

### Get project with all members

```sql
SELECT
  pr.*,
  json_agg(
    json_build_object(
      'user_id', pm.user_id,
      'role', pm.role,
      'full_name', pf.full_name
    )
  ) as members
FROM tm_projects pr
JOIN project_members pm ON pr.id = pm.project_id
JOIN profiles pf ON pm.user_id = pf.id
WHERE pr.id = 'PROJECT_UUID'
GROUP BY pr.id;
```

### Expire all trials manually

```sql
SELECT expire_trials();
```

### Check subscription stats

```sql
SELECT
  status,
  COUNT(*) as count
FROM subscriptions
GROUP BY status;
```

---

## Best Practices

1. **Always use RLS** - Never disable RLS in production
2. **Use service_role sparingly** - Only in Edge Functions when needed
3. **Index foreign keys** - All FK columns should have indexes
4. **Audit sensitive changes** - Log billing and user changes
5. **Soft delete when possible** - Use `is_active` flags
6. **Use transactions** - Wrap related changes in transactions
7. **Validate on both ends** - Database constraints + application validation

---

*Last updated: 2025-01-29*
