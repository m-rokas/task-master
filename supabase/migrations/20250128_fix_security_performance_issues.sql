-- Fix Security and Performance Issues
-- Generated based on Supabase Database Linter recommendations
-- Applied: 2025-01-28

-- ============================================
-- 1. CRITICAL: Fix admin_users_view security
-- ============================================

-- Drop the problematic view that exposes auth.users
DROP VIEW IF EXISTS public.admin_users_view;

-- Drop functions that need signature changes
DROP FUNCTION IF EXISTS public.get_unread_notification_count(UUID);
DROP FUNCTION IF EXISTS public.get_user_plan(UUID);
DROP FUNCTION IF EXISTS public.check_expiring_subscriptions();
DROP FUNCTION IF EXISTS public.admin_delete_user(UUID);
DROP FUNCTION IF EXISTS public.trigger_task_reminders() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_send_welcome_email() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_send_task_assigned_email() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_send_subscription_email() CASCADE;

-- ============================================
-- 2. Add missing foreign key indexes
-- ============================================

-- Index for notifications.related_project_id
CREATE INDEX IF NOT EXISTS idx_notifications_related_project
ON public.notifications(related_project_id)
WHERE related_project_id IS NOT NULL;

-- Index for notifications.related_task_id
CREATE INDEX IF NOT EXISTS idx_notifications_related_task
ON public.notifications(related_task_id)
WHERE related_task_id IS NOT NULL;

-- Index for payments.subscription_id
CREATE INDEX IF NOT EXISTS idx_payments_subscription
ON public.payments(subscription_id)
WHERE subscription_id IS NOT NULL;

-- Index for project_members.invited_by
CREATE INDEX IF NOT EXISTS idx_project_members_invited_by
ON public.project_members(invited_by)
WHERE invited_by IS NOT NULL;

-- Index for subscriptions.plan_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan
ON public.subscriptions(plan_id);

-- Index for tm_tasks.parent_task_id
CREATE INDEX IF NOT EXISTS idx_tm_tasks_parent
ON public.tm_tasks(parent_task_id)
WHERE parent_task_id IS NOT NULL;

-- ============================================
-- 3. Fix functions with mutable search_path
-- ============================================

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix check_project_limit function
CREATE OR REPLACE FUNCTION public.check_project_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan_id UUID;
  project_limit_val INTEGER;
  current_count INTEGER;
BEGIN
  SELECT plan_id INTO user_plan_id FROM public.profiles WHERE id = p_user_id;

  IF user_plan_id IS NULL THEN
    RETURN true;
  END IF;

  SELECT project_limit INTO project_limit_val FROM public.plans WHERE id = user_plan_id;

  IF project_limit_val IS NULL THEN
    RETURN true;
  END IF;

  SELECT COUNT(*) INTO current_count FROM public.tm_projects WHERE owner_id = p_user_id;

  RETURN current_count < project_limit_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix check_task_limit function
CREATE OR REPLACE FUNCTION public.check_task_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan_id UUID;
  task_limit_val INTEGER;
  current_count INTEGER;
BEGIN
  SELECT plan_id INTO user_plan_id FROM public.profiles WHERE id = p_user_id;

  IF user_plan_id IS NULL THEN
    RETURN true;
  END IF;

  SELECT task_limit INTO task_limit_val FROM public.plans WHERE id = user_plan_id;

  IF task_limit_val IS NULL THEN
    RETURN true;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.tm_tasks t
  JOIN public.tm_projects p ON t.project_id = p.id
  WHERE p.owner_id = p_user_id;

  RETURN current_count < task_limit_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix user_has_feature function
CREATE OR REPLACE FUNCTION public.user_has_feature(p_user_id UUID, feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan_id UUID;
  plan_features JSONB;
BEGIN
  SELECT plan_id INTO user_plan_id FROM public.profiles WHERE id = p_user_id;

  IF user_plan_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT features INTO plan_features FROM public.plans WHERE id = user_plan_id;

  RETURN COALESCE((plan_features->>feature_name)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix get_user_plan function
CREATE OR REPLACE FUNCTION public.get_user_plan(p_user_id UUID)
RETURNS TABLE (
  plan_name TEXT,
  project_limit INTEGER,
  task_limit INTEGER,
  project_count BIGINT,
  task_count BIGINT,
  features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.name,
    pl.project_limit,
    pl.task_limit,
    (SELECT COUNT(*) FROM public.tm_projects WHERE owner_id = p_user_id),
    (SELECT COUNT(*) FROM public.tm_tasks t JOIN public.tm_projects p ON t.project_id = p.id WHERE p.owner_id = p_user_id),
    pl.features
  FROM public.profiles pr
  JOIN public.plans pl ON pr.plan_id = pl.id
  WHERE pr.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix get_unread_notification_count function
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  count_val INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_val
  FROM public.tm_notifications
  WHERE user_id = p_user_id AND is_read = false;

  RETURN COALESCE(count_val, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix mark_notifications_read function
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE public.tm_notifications
  SET is_read = true, read_at = NOW()
  WHERE id = ANY(p_notification_ids) AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix get_user_project_ids function
CREATE OR REPLACE FUNCTION public.get_user_project_ids(p_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT DISTINCT project_id
    FROM public.project_members
    WHERE user_id = p_user_id
    UNION
    SELECT id FROM public.tm_projects WHERE owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix can_access_task function
CREATE OR REPLACE FUNCTION public.can_access_task(p_task_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tm_tasks t
    JOIN public.project_members pm ON t.project_id = pm.project_id
    WHERE t.id = p_task_id AND pm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.tm_tasks t
    JOIN public.tm_projects p ON t.project_id = p.id
    WHERE t.id = p_task_id AND p.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix handle_new_project function
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', NOW())
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix handle_task_completion function
CREATE OR REPLACE FUNCTION public.handle_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix calculate_next_due_date function
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  current_due DATE,
  pattern TEXT,
  interval_val INTEGER
)
RETURNS DATE AS $$
BEGIN
  CASE pattern
    WHEN 'daily' THEN RETURN current_due + (interval_val || ' days')::INTERVAL;
    WHEN 'weekly' THEN RETURN current_due + (interval_val * 7 || ' days')::INTERVAL;
    WHEN 'monthly' THEN RETURN current_due + (interval_val || ' months')::INTERVAL;
    ELSE RETURN current_due + (interval_val || ' days')::INTERVAL;
  END CASE;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix create_notification function
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.tm_notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type::notification_type, p_title, p_body, p_data)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix notify_task_assigned function
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tm_notifications (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'task_assigned',
    'Task Assigned',
    'You have been assigned to a task',
    jsonb_build_object('task_id', NEW.task_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix notify_project_invite function
CREATE OR REPLACE FUNCTION public.notify_project_invite()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
BEGIN
  SELECT name INTO project_name FROM public.tm_projects WHERE id = NEW.project_id;

  INSERT INTO public.tm_notifications (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'project_invite',
    'Project Invitation',
    'You have been invited to join project: ' || project_name,
    jsonb_build_object('project_id', NEW.project_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix notify_comment_mentions function
CREATE OR REPLACE FUNCTION public.notify_comment_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_user UUID;
BEGIN
  IF NEW.mentions IS NOT NULL AND array_length(NEW.mentions, 1) > 0 THEN
    FOREACH mentioned_user IN ARRAY NEW.mentions
    LOOP
      INSERT INTO public.tm_notifications (user_id, type, title, body, data)
      VALUES (
        mentioned_user,
        'task_mention',
        'You were mentioned',
        'Someone mentioned you in a comment',
        jsonb_build_object('task_id', NEW.task_id, 'comment_id', NEW.id)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix log_subscription_changes function
CREATE OR REPLACE FUNCTION public.log_subscription_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (
    COALESCE(auth.uid(), NEW.user_id),
    CASE
      WHEN TG_OP = 'INSERT' THEN 'create'
      WHEN TG_OP = 'UPDATE' THEN 'update'
      ELSE 'delete'
    END::audit_action,
    'subscription',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix log_user_registration function
CREATE OR REPLACE FUNCTION public.log_user_registration()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
  VALUES (NEW.id, 'create', 'profile', NEW.id, to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix check_expiring_subscriptions function
CREATE OR REPLACE FUNCTION public.check_expiring_subscriptions()
RETURNS TABLE (
  subscription_id UUID,
  user_id UUID,
  plan_name TEXT,
  expires_at TIMESTAMPTZ,
  days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    pl.name,
    s.current_period_end,
    EXTRACT(DAY FROM (s.current_period_end - NOW()))::INTEGER
  FROM public.subscriptions s
  JOIN public.plans pl ON s.plan_id = pl.id
  WHERE s.status IN ('active', 'trialing')
    AND s.current_period_end IS NOT NULL
    AND s.current_period_end <= NOW() + INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix admin_delete_user function
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Delete user data in order
  DELETE FROM public.tm_notifications WHERE user_id = target_user_id;
  DELETE FROM public.task_assignees WHERE user_id = target_user_id;
  DELETE FROM public.task_comments WHERE user_id = target_user_id;
  DELETE FROM public.time_entries WHERE user_id = target_user_id;
  DELETE FROM public.project_members WHERE user_id = target_user_id;
  DELETE FROM public.payments WHERE user_id = target_user_id;
  DELETE FROM public.subscriptions WHERE user_id = target_user_id;
  DELETE FROM public.tm_projects WHERE owner_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix trigger_send_welcome_email function (placeholder)
CREATE OR REPLACE FUNCTION public.trigger_send_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Placeholder for email sending via edge function
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix trigger_send_task_assigned_email function (placeholder)
CREATE OR REPLACE FUNCTION public.trigger_send_task_assigned_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Placeholder for email sending via edge function
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix trigger_send_subscription_email function (placeholder)
CREATE OR REPLACE FUNCTION public.trigger_send_subscription_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Placeholder for email sending via edge function
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix trigger_task_reminders function (placeholder)
CREATE OR REPLACE FUNCTION public.trigger_task_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Placeholder for task reminder logic
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix audit_trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (
    auth.uid(),
    CASE
      WHEN TG_OP = 'INSERT' THEN 'create'
      WHEN TG_OP = 'UPDATE' THEN 'update'
      ELSE 'delete'
    END::audit_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- 4. Fix RLS policies - use (select auth.uid())
-- ============================================

-- profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = (SELECT auth.uid()));

-- Drop duplicate policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Recreate admin policies with optimized auth check
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING ((SELECT public.is_admin()));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING ((SELECT public.is_admin()));

-- subscriptions table - consolidate policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_own_select" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_own" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_own" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can insert subscriptions" ON public.subscriptions;

CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR (SELECT public.is_admin())
  );

CREATE POLICY "subscriptions_insert" ON public.subscriptions
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid()) OR (SELECT public.is_admin())
  );

CREATE POLICY "subscriptions_update" ON public.subscriptions
  FOR UPDATE USING (
    user_id = (SELECT auth.uid()) OR (SELECT public.is_admin())
  );

-- payments table - consolidate policies
DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "payments_own_select" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;

CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR (SELECT public.is_admin())
  );

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- tm_projects table
DROP POLICY IF EXISTS "projects_select" ON public.tm_projects;
DROP POLICY IF EXISTS "projects_insert" ON public.tm_projects;
DROP POLICY IF EXISTS "projects_update" ON public.tm_projects;
DROP POLICY IF EXISTS "projects_delete" ON public.tm_projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.tm_projects;

CREATE POLICY "projects_select" ON public.tm_projects
  FOR SELECT USING (
    owner_id = (SELECT auth.uid())
    OR id IN (SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid()))
    OR (SELECT public.is_admin())
  );

CREATE POLICY "projects_insert" ON public.tm_projects
  FOR INSERT WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "projects_update" ON public.tm_projects
  FOR UPDATE USING (
    owner_id = (SELECT auth.uid())
    OR id IN (SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin'))
  );

CREATE POLICY "projects_delete" ON public.tm_projects
  FOR DELETE USING (owner_id = (SELECT auth.uid()));

-- tm_tasks table
DROP POLICY IF EXISTS "tasks_select" ON public.tm_tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tm_tasks;

CREATE POLICY "tasks_select" ON public.tm_tasks
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid())
    )
    OR (SELECT public.is_admin())
  );

-- tm_notifications table
DROP POLICY IF EXISTS "notifications_select_own" ON public.tm_notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.tm_notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.tm_notifications;

CREATE POLICY "notifications_select_own" ON public.tm_notifications
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "notifications_update_own" ON public.tm_notifications
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "notifications_delete_own" ON public.tm_notifications
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- notifications table (legacy)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- project_members table
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;

CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR project_id IN (SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid()))
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid()))
  );

CREATE POLICY "project_members_delete" ON public.project_members
  FOR DELETE USING (
    project_id IN (SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid()))
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin'))
  );

-- task_labels table
DROP POLICY IF EXISTS "task_labels_select" ON public.task_labels;
DROP POLICY IF EXISTS "task_labels_insert" ON public.task_labels;
DROP POLICY IF EXISTS "task_labels_update" ON public.task_labels;
DROP POLICY IF EXISTS "task_labels_delete" ON public.task_labels;

CREATE POLICY "task_labels_select" ON public.task_labels
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "task_labels_insert" ON public.task_labels
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "task_labels_update" ON public.task_labels
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "task_labels_delete" ON public.task_labels
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- task_label_assignments table
DROP POLICY IF EXISTS "task_label_assignments_select" ON public.task_label_assignments;
DROP POLICY IF EXISTS "task_label_assignments_insert" ON public.task_label_assignments;
DROP POLICY IF EXISTS "task_label_assignments_delete" ON public.task_label_assignments;

CREATE POLICY "task_label_assignments_select" ON public.task_label_assignments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM public.tm_tasks WHERE project_id IN (
        SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
        UNION
        SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "task_label_assignments_insert" ON public.task_label_assignments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM public.tm_tasks WHERE project_id IN (
        SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
        UNION
        SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "task_label_assignments_delete" ON public.task_label_assignments
  FOR DELETE USING (
    task_id IN (
      SELECT id FROM public.tm_tasks WHERE project_id IN (
        SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
        UNION
        SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid())
      )
    )
  );

-- task_attachments table
DROP POLICY IF EXISTS "task_attachments_select" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_insert" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_delete" ON public.task_attachments;

CREATE POLICY "task_attachments_select" ON public.task_attachments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM public.tm_tasks WHERE project_id IN (
        SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
        UNION
        SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "task_attachments_insert" ON public.task_attachments
  FOR INSERT WITH CHECK (
    uploaded_by = (SELECT auth.uid()) AND
    task_id IN (
      SELECT id FROM public.tm_tasks WHERE project_id IN (
        SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
        UNION
        SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "task_attachments_delete" ON public.task_attachments
  FOR DELETE USING (
    uploaded_by = (SELECT auth.uid())
    OR task_id IN (
      SELECT id FROM public.tm_tasks WHERE project_id IN (
        SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
      )
    )
  );

-- task_comments table
DROP POLICY IF EXISTS "task_comments_insert" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_update" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_delete" ON public.task_comments;

CREATE POLICY "task_comments_insert" ON public.task_comments
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid()) AND
    task_id IN (
      SELECT id FROM public.tm_tasks WHERE project_id IN (
        SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
        UNION
        SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "task_comments_update" ON public.task_comments
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "task_comments_delete" ON public.task_comments
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- time_entries table
DROP POLICY IF EXISTS "time_entries_select" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_insert" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_update" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_delete" ON public.time_entries;

CREATE POLICY "time_entries_select" ON public.time_entries
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "time_entries_insert" ON public.time_entries
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "time_entries_update" ON public.time_entries
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "time_entries_delete" ON public.time_entries
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- platform_config table
DROP POLICY IF EXISTS "platform_config_insert_admin" ON public.platform_config;
DROP POLICY IF EXISTS "platform_config_update_admin" ON public.platform_config;
DROP POLICY IF EXISTS "platform_config_delete_admin" ON public.platform_config;

CREATE POLICY "platform_config_insert_admin" ON public.platform_config
  FOR INSERT WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "platform_config_update_admin" ON public.platform_config
  FOR UPDATE USING ((SELECT public.is_admin()));

CREATE POLICY "platform_config_delete_admin" ON public.platform_config
  FOR DELETE USING ((SELECT public.is_admin()));

-- ============================================
-- 5. Move pg_trgm extension to extensions schema
-- ============================================

-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Note: Moving extensions requires dropping and recreating
-- This may fail if indexes depend on it, so we'll just document it
-- DROP EXTENSION IF EXISTS pg_trgm;
-- CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- ============================================
-- 6. Grant necessary permissions
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
