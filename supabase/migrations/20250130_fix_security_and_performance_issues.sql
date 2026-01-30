-- =====================================================
-- SECURITY & PERFORMANCE FIXES MIGRATION
-- =====================================================

-- 1. MOVE pg_trgm EXTENSION FROM PUBLIC TO EXTENSIONS SCHEMA
-- =====================================================
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- 2. FIX FUNCTIONS WITH MUTABLE SEARCH_PATH
-- =====================================================

-- Fix update_project_role_permissions_updated_at
CREATE OR REPLACE FUNCTION public.update_project_role_permissions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix create_notification (overload 1 - with notification_type cast)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.tm_notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type::notification_type, p_title, p_body, p_data)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- Fix get_user_project_ids (SQL function version)
DROP FUNCTION IF EXISTS public.get_user_project_ids();
CREATE FUNCTION public.get_user_project_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tm_projects WHERE owner_id = (select auth.uid())
  UNION
  SELECT project_id FROM public.project_members WHERE user_id = (select auth.uid());
$$;

-- Fix calculate_next_due_date
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  current_due TIMESTAMPTZ,
  pattern TEXT,
  interval_value INTEGER DEFAULT 1
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF current_due IS NULL THEN
    RETURN NULL;
  END IF;

  CASE pattern
    WHEN 'daily' THEN
      RETURN current_due + (interval_value || ' days')::INTERVAL;
    WHEN 'weekly' THEN
      RETURN current_due + (interval_value * 7 || ' days')::INTERVAL;
    WHEN 'monthly' THEN
      RETURN current_due + (interval_value || ' months')::INTERVAL;
    ELSE
      RETURN current_due + (interval_value || ' days')::INTERVAL;
  END CASE;
END;
$$;

-- 3. FIX RLS POLICIES - Replace auth.uid() with (select auth.uid())
-- =====================================================

-- subscriptions policies
DROP POLICY IF EXISTS subscriptions_insert ON public.subscriptions;
CREATE POLICY subscriptions_insert ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = (select auth.uid())) OR is_admin());

DROP POLICY IF EXISTS subscriptions_select ON public.subscriptions;
CREATE POLICY subscriptions_select ON public.subscriptions
  FOR SELECT TO authenticated
  USING ((user_id = (select auth.uid())) OR is_admin());

DROP POLICY IF EXISTS subscriptions_update ON public.subscriptions;
CREATE POLICY subscriptions_update ON public.subscriptions
  FOR UPDATE TO authenticated
  USING ((user_id = (select auth.uid())) OR is_admin());

-- tm_projects policies
DROP POLICY IF EXISTS projects_insert ON public.tm_projects;
CREATE POLICY projects_insert ON public.tm_projects
  FOR INSERT TO authenticated
  WITH CHECK (((owner_id = (select auth.uid())) OR (owner_id IS NULL)) AND can_create_project((select auth.uid())));

DROP POLICY IF EXISTS projects_select ON public.tm_projects;
CREATE POLICY projects_select ON public.tm_projects
  FOR SELECT TO authenticated
  USING ((owner_id = (select auth.uid())) OR can_access_project((select auth.uid()), id));

-- project_members select policy
DROP POLICY IF EXISTS project_members_select ON public.project_members;
CREATE POLICY project_members_select ON public.project_members
  FOR SELECT TO authenticated
  USING (
    (user_id = (select auth.uid()))
    OR (project_id IN (SELECT tm_projects.id FROM public.tm_projects WHERE tm_projects.owner_id = (select auth.uid())))
    OR is_admin()
  );

-- tm_tasks insert policy
DROP POLICY IF EXISTS tasks_insert ON public.tm_tasks;
CREATE POLICY tasks_insert ON public.tm_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    can_manage_tasks((select auth.uid()), project_id)
    AND can_create_task((SELECT tm_projects.owner_id FROM public.tm_projects WHERE tm_projects.id = tm_tasks.project_id))
  );

-- task_attachments insert policy
DROP POLICY IF EXISTS task_attachments_insert ON public.task_attachments;
CREATE POLICY task_attachments_insert ON public.task_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    (uploaded_by = (select auth.uid()))
    AND (EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = task_attachments.task_id
        AND can_upload_files((select auth.uid()), t.project_id)
        AND project_has_feature(t.project_id, 'file_attachments'::text)
    ))
  );

-- task_labels insert policy
DROP POLICY IF EXISTS task_labels_insert ON public.task_labels;
CREATE POLICY task_labels_insert ON public.task_labels
  FOR INSERT TO authenticated
  WITH CHECK (
    can_manage_labels((select auth.uid()), project_id)
    AND project_has_feature(project_id, 'custom_labels'::text)
  );

-- time_entries insert policy
DROP POLICY IF EXISTS time_entries_insert ON public.time_entries;
CREATE POLICY time_entries_insert ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = (select auth.uid()))
    AND (EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = time_entries.task_id
        AND can_access_project((select auth.uid()), t.project_id)
        AND project_has_feature(t.project_id, 'advanced_time_tracking'::text)
    ))
  );

-- 4. DROP DUPLICATE INDEXES
-- =====================================================
DROP INDEX IF EXISTS public.idx_task_assignees_task;
DROP INDEX IF EXISTS public.idx_task_assignees_user;
DROP INDEX IF EXISTS public.idx_task_comments_task;
