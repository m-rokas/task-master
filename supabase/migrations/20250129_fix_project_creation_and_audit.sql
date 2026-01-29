-- Fix Project Creation and Audit Trigger
-- This migration fixes the 403 error on project creation by:
-- 1. Making audit_trigger SECURITY DEFINER to bypass RLS on audit_logs
-- 2. Adding INSERT policy for audit_logs
-- 3. Fixing tm_projects INSERT policy
-- Applied: 2025-01-29

-- ============================================
-- 1. Fix audit_trigger to bypass RLS
-- ============================================

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (
    auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN 'create' WHEN TG_OP = 'UPDATE' THEN 'update' ELSE 'delete' END::audit_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- 2. Add INSERT policy for audit_logs
-- ============================================

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================
-- 3. Fix tm_projects INSERT policy
-- ============================================

DROP POLICY IF EXISTS "projects_insert" ON public.tm_projects;

CREATE POLICY "projects_insert" ON public.tm_projects
  FOR INSERT TO authenticated
  WITH CHECK (
    -- User must be the owner (or owner_id will be set by trigger)
    (owner_id = auth.uid() OR owner_id IS NULL)
    AND
    -- Check plan limits
    public.can_create_project(auth.uid())
  );

-- ============================================
-- 4. Fix tm_projects SELECT policy (owner always sees their projects)
-- ============================================

DROP POLICY IF EXISTS "projects_select" ON public.tm_projects;

CREATE POLICY "projects_select" ON public.tm_projects
  FOR SELECT TO authenticated
  USING (
    -- Owner can always see their projects
    owner_id = auth.uid()
    OR
    -- Team members can see if collaboration enabled
    public.can_access_project(auth.uid(), id)
  );
