-- Fix RLS Infinite Recursion and Add Plan-Based Team Collaboration
-- This migration fixes the circular dependency between tm_projects and project_members RLS policies
-- and implements plan-based team collaboration logic with configurable role permissions
-- Applied: 2025-01-29

-- ============================================
-- 1. Add platform_config setting for free team collaboration
-- ============================================

-- Global toggle for team collaboration (applies to ALL plans)
-- 'true' = team collaboration enabled for everyone
-- 'false' = team collaboration disabled for everyone (only owners can manage)
INSERT INTO public.platform_config (key, value, category, description)
VALUES ('team_collaboration_enabled', 'true', 'features', 'Enable team collaboration globally (when false, only project owners can manage projects)')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 1.5 Create project_role_permissions table for custom role settings
-- ============================================

-- Table to store customizable role permissions per project
CREATE TABLE IF NOT EXISTS public.project_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.tm_projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  -- Permission flags
  can_manage_tasks BOOLEAN NOT NULL DEFAULT false,      -- Create/edit/delete tasks
  can_assign_tasks BOOLEAN NOT NULL DEFAULT false,      -- Assign users to tasks
  can_comment BOOLEAN NOT NULL DEFAULT false,           -- Add comments
  can_manage_labels BOOLEAN NOT NULL DEFAULT false,     -- Create/edit labels
  can_upload_files BOOLEAN NOT NULL DEFAULT false,      -- Upload attachments
  can_invite_members BOOLEAN NOT NULL DEFAULT false,    -- Invite new members
  can_remove_members BOOLEAN NOT NULL DEFAULT false,    -- Remove members
  can_change_roles BOOLEAN NOT NULL DEFAULT false,      -- Change member roles
  can_edit_project BOOLEAN NOT NULL DEFAULT false,      -- Edit project settings
  can_view_time_entries BOOLEAN NOT NULL DEFAULT false, -- View others' time entries
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, role)
);

-- Enable RLS
ALTER TABLE public.project_role_permissions ENABLE ROW LEVEL SECURITY;

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_project_role_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS project_role_permissions_updated_at ON public.project_role_permissions;
CREATE TRIGGER project_role_permissions_updated_at
  BEFORE UPDATE ON public.project_role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_project_role_permissions_updated_at();

-- Function to create default role permissions for a project
CREATE OR REPLACE FUNCTION public.create_default_role_permissions(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Admin role - almost everything except project deletion
  INSERT INTO public.project_role_permissions (project_id, role, can_manage_tasks, can_assign_tasks, can_comment, can_manage_labels, can_upload_files, can_invite_members, can_remove_members, can_change_roles, can_edit_project, can_view_time_entries)
  VALUES (p_project_id, 'admin', true, true, true, true, true, true, true, false, true, true)
  ON CONFLICT (project_id, role) DO NOTHING;

  -- Member role - can work on tasks but not manage project
  INSERT INTO public.project_role_permissions (project_id, role, can_manage_tasks, can_assign_tasks, can_comment, can_manage_labels, can_upload_files, can_invite_members, can_remove_members, can_change_roles, can_edit_project, can_view_time_entries)
  VALUES (p_project_id, 'member', true, true, true, false, true, false, false, false, false, false)
  ON CONFLICT (project_id, role) DO NOTHING;

  -- Viewer role - read only
  INSERT INTO public.project_role_permissions (project_id, role, can_manage_tasks, can_assign_tasks, can_comment, can_manage_labels, can_upload_files, can_invite_members, can_remove_members, can_change_roles, can_edit_project, can_view_time_entries)
  VALUES (p_project_id, 'viewer', false, false, false, false, false, false, false, false, false, false)
  ON CONFLICT (project_id, role) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create default permissions when project is created
CREATE OR REPLACE FUNCTION public.handle_new_project_permissions()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.create_default_role_permissions(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_project_created_permissions ON public.tm_projects;
CREATE TRIGGER on_project_created_permissions
  AFTER INSERT ON public.tm_projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_project_permissions();

-- Create default permissions for existing projects
DO $$
DECLARE
  project_record RECORD;
BEGIN
  FOR project_record IN SELECT id FROM public.tm_projects
  LOOP
    PERFORM public.create_default_role_permissions(project_record.id);
  END LOOP;
END $$;

-- ============================================
-- 2. Create helper functions with SECURITY DEFINER to bypass RLS
-- These functions are critical to break the circular dependency
-- ============================================

-- Function to get all project IDs a user is a member of (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_member_project_ids(p_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT DISTINCT project_id
    FROM public.project_members
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get all project IDs a user owns (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_owned_project_ids(p_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT id FROM public.tm_projects WHERE owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user is project member (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_project_member(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = p_user_id AND project_id = p_project_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user is project owner (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_project_owner(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tm_projects
    WHERE id = p_project_id AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get user's role in a project (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_project_role(p_user_id UUID, p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  member_role TEXT;
BEGIN
  SELECT role INTO member_role
  FROM public.project_members
  WHERE user_id = p_user_id AND project_id = p_project_id;

  RETURN member_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if team collaboration is enabled globally
CREATE OR REPLACE FUNCTION public.is_team_collaboration_enabled()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT value = 'true' FROM public.platform_config WHERE key = 'team_collaboration_enabled'),
    true  -- Default to enabled if not set
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user has team collaboration enabled
-- Returns true if:
-- 1. Global team_collaboration_enabled is true, AND
-- 2. User's plan has team_collaboration feature (or global setting overrides plan)
CREATE OR REPLACE FUNCTION public.user_can_team_collaborate(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan_id UUID;
  plan_features JSONB;
  global_enabled BOOLEAN;
BEGIN
  -- Check global setting first
  global_enabled := public.is_team_collaboration_enabled();

  IF NOT global_enabled THEN
    RETURN false;
  END IF;

  -- Get user's plan
  SELECT plan_id INTO user_plan_id FROM public.profiles WHERE id = p_user_id;

  IF user_plan_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get plan features
  SELECT features INTO plan_features FROM public.plans WHERE id = user_plan_id;

  -- Check if plan has team_collaboration feature
  RETURN COALESCE((plan_features->>'team_collaboration')::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get role permission for a specific action
CREATE OR REPLACE FUNCTION public.get_role_permission(
  p_project_id UUID,
  p_role TEXT,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  -- Owner always has all permissions
  IF p_role = 'owner' THEN
    RETURN true;
  END IF;

  EXECUTE format(
    'SELECT %I FROM public.project_role_permissions WHERE project_id = $1 AND role = $2',
    p_permission
  ) INTO has_permission USING p_project_id, p_role;

  RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user has specific permission in project
CREATE OR REPLACE FUNCTION public.user_has_project_permission(
  p_user_id UUID,
  p_project_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  project_owner_id UUID;
BEGIN
  -- Platform admin has all permissions
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  -- Check if user is project owner
  SELECT owner_id INTO project_owner_id FROM public.tm_projects WHERE id = p_project_id;

  IF project_owner_id = p_user_id THEN
    RETURN true;
  END IF;

  -- Check if team collaboration is enabled for project owner
  IF NOT public.user_can_team_collaborate(project_owner_id) THEN
    RETURN false;
  END IF;

  -- Get user's role in project
  user_role := public.get_project_role(p_user_id, p_project_id);

  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Check role permission
  RETURN public.get_role_permission(p_project_id, user_role, p_permission);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user can access a project
-- Logic:
-- 1. User is platform admin -> can access all projects
-- 2. User is project owner -> can access
-- 3. User is project member AND project owner has team_collaboration enabled
CREATE OR REPLACE FUNCTION public.can_access_project(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  project_owner_id UUID;
BEGIN
  -- Platform admin can access everything
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  -- Check if user is owner
  IF public.is_project_owner(p_user_id, p_project_id) THEN
    RETURN true;
  END IF;

  -- Check if user is a member
  IF NOT public.is_project_member(p_user_id, p_project_id) THEN
    RETURN false;
  END IF;

  -- User is a member - check if team collaboration is allowed
  SELECT owner_id INTO project_owner_id FROM public.tm_projects WHERE id = p_project_id;

  -- If project owner has team_collaboration enabled, member can access
  RETURN public.user_can_team_collaborate(project_owner_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user can modify project settings (name, description, etc)
CREATE OR REPLACE FUNCTION public.can_modify_project(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_has_project_permission(p_user_id, p_project_id, 'can_edit_project');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user can manage tasks (create/edit/delete)
CREATE OR REPLACE FUNCTION public.can_manage_tasks(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_has_project_permission(p_user_id, p_project_id, 'can_manage_tasks');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user can assign tasks
CREATE OR REPLACE FUNCTION public.can_assign_tasks(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_has_project_permission(p_user_id, p_project_id, 'can_assign_tasks');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user can comment
CREATE OR REPLACE FUNCTION public.can_comment(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_has_project_permission(p_user_id, p_project_id, 'can_comment');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user can manage labels
CREATE OR REPLACE FUNCTION public.can_manage_labels(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_has_project_permission(p_user_id, p_project_id, 'can_manage_labels');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user can upload files
CREATE OR REPLACE FUNCTION public.can_upload_files(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_has_project_permission(p_user_id, p_project_id, 'can_upload_files');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user can invite members
CREATE OR REPLACE FUNCTION public.can_invite_members(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_has_project_permission(p_user_id, p_project_id, 'can_invite_members');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user can remove members
CREATE OR REPLACE FUNCTION public.can_remove_members(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_has_project_permission(p_user_id, p_project_id, 'can_remove_members');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user can change member roles
CREATE OR REPLACE FUNCTION public.can_change_roles(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.user_has_project_permission(p_user_id, p_project_id, 'can_change_roles');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Legacy function for backward compatibility - checks if user can manage content (tasks, comments)
CREATE OR REPLACE FUNCTION public.can_manage_project_content(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.can_manage_tasks(p_user_id, p_project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- 3. Drop ALL existing RLS policies on affected tables
-- ============================================

-- tm_projects
DROP POLICY IF EXISTS "projects_select" ON public.tm_projects;
DROP POLICY IF EXISTS "projects_insert" ON public.tm_projects;
DROP POLICY IF EXISTS "projects_update" ON public.tm_projects;
DROP POLICY IF EXISTS "projects_delete" ON public.tm_projects;
DROP POLICY IF EXISTS "Members can view projects" ON public.tm_projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.tm_projects;
DROP POLICY IF EXISTS "Admins can update projects" ON public.tm_projects;
DROP POLICY IF EXISTS "Owners can delete projects" ON public.tm_projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.tm_projects;

-- project_members
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;
DROP POLICY IF EXISTS "project_members_update" ON public.project_members;

-- tm_tasks
DROP POLICY IF EXISTS "tasks_select" ON public.tm_tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tm_tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tm_tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tm_tasks;
DROP POLICY IF EXISTS "Members can view tasks" ON public.tm_tasks;
DROP POLICY IF EXISTS "Members can create tasks" ON public.tm_tasks;
DROP POLICY IF EXISTS "Members can update tasks" ON public.tm_tasks;
DROP POLICY IF EXISTS "Members can delete tasks" ON public.tm_tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tm_tasks;

-- task_comments
DROP POLICY IF EXISTS "task_comments_select" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_insert" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_update" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_delete" ON public.task_comments;

-- task_assignees
DROP POLICY IF EXISTS "task_assignees_select" ON public.task_assignees;
DROP POLICY IF EXISTS "task_assignees_insert" ON public.task_assignees;
DROP POLICY IF EXISTS "task_assignees_delete" ON public.task_assignees;

-- task_labels
DROP POLICY IF EXISTS "task_labels_select" ON public.task_labels;
DROP POLICY IF EXISTS "task_labels_insert" ON public.task_labels;
DROP POLICY IF EXISTS "task_labels_update" ON public.task_labels;
DROP POLICY IF EXISTS "task_labels_delete" ON public.task_labels;

-- task_label_assignments
DROP POLICY IF EXISTS "task_label_assignments_select" ON public.task_label_assignments;
DROP POLICY IF EXISTS "task_label_assignments_insert" ON public.task_label_assignments;
DROP POLICY IF EXISTS "task_label_assignments_delete" ON public.task_label_assignments;

-- task_attachments
DROP POLICY IF EXISTS "task_attachments_select" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_insert" ON public.task_attachments;
DROP POLICY IF EXISTS "task_attachments_delete" ON public.task_attachments;

-- time_entries
DROP POLICY IF EXISTS "time_entries_select" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_insert" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_update" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_delete" ON public.time_entries;

-- ============================================
-- 4. Create new RLS policies using helper functions
-- ============================================

-- ---- tm_projects ----

-- SELECT: User can see projects they own OR are members of (with team collaboration)
CREATE POLICY "projects_select" ON public.tm_projects
  FOR SELECT USING (
    public.can_access_project((SELECT auth.uid()), id)
  );

-- INSERT: Any authenticated user can create projects (they become owner)
CREATE POLICY "projects_insert" ON public.tm_projects
  FOR INSERT WITH CHECK (
    owner_id = (SELECT auth.uid())
  );

-- UPDATE: Only owner or admin members can update (if team collaboration enabled)
CREATE POLICY "projects_update" ON public.tm_projects
  FOR UPDATE USING (
    public.can_modify_project((SELECT auth.uid()), id)
  );

-- DELETE: Only owner can delete
CREATE POLICY "projects_delete" ON public.tm_projects
  FOR DELETE USING (
    owner_id = (SELECT auth.uid())
  );

-- ---- project_members ----

-- SELECT: Can see members if can access the project
CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT USING (
    public.can_access_project((SELECT auth.uid()), project_id)
  );

-- INSERT: Can add members if has can_invite_members permission
CREATE POLICY "project_members_insert" ON public.project_members
  FOR INSERT WITH CHECK (
    public.can_invite_members((SELECT auth.uid()), project_id)
  );

-- UPDATE: Can update roles if has can_change_roles permission
CREATE POLICY "project_members_update" ON public.project_members
  FOR UPDATE USING (
    public.can_change_roles((SELECT auth.uid()), project_id)
  );

-- DELETE: Can remove members if has can_remove_members permission
CREATE POLICY "project_members_delete" ON public.project_members
  FOR DELETE USING (
    public.can_remove_members((SELECT auth.uid()), project_id)
  );

-- ---- tm_tasks ----

-- SELECT: Can see tasks if can access the project
CREATE POLICY "tasks_select" ON public.tm_tasks
  FOR SELECT USING (
    public.can_access_project((SELECT auth.uid()), project_id)
  );

-- INSERT: Can create tasks if has can_manage_tasks permission
CREATE POLICY "tasks_insert" ON public.tm_tasks
  FOR INSERT WITH CHECK (
    public.can_manage_tasks((SELECT auth.uid()), project_id)
  );

-- UPDATE: Can update tasks if has can_manage_tasks permission
CREATE POLICY "tasks_update" ON public.tm_tasks
  FOR UPDATE USING (
    public.can_manage_tasks((SELECT auth.uid()), project_id)
  );

-- DELETE: Can delete tasks if has can_manage_tasks permission
CREATE POLICY "tasks_delete" ON public.tm_tasks
  FOR DELETE USING (
    public.can_manage_tasks((SELECT auth.uid()), project_id)
  );

-- ---- task_comments ----

-- SELECT: Can see comments if can access the project
CREATE POLICY "task_comments_select" ON public.task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = task_comments.task_id
      AND public.can_access_project((SELECT auth.uid()), t.project_id)
    )
  );

-- INSERT: Can add comments if has can_comment permission
CREATE POLICY "task_comments_insert" ON public.task_comments
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = task_comments.task_id
      AND public.can_comment((SELECT auth.uid()), t.project_id)
    )
  );

-- UPDATE: Can only update own comments
CREATE POLICY "task_comments_update" ON public.task_comments
  FOR UPDATE USING (
    user_id = (SELECT auth.uid())
  );

-- DELETE: Can delete own comments OR project owner/admin can delete any
CREATE POLICY "task_comments_delete" ON public.task_comments
  FOR DELETE USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = task_comments.task_id
      AND public.is_project_owner((SELECT auth.uid()), t.project_id)
    )
    OR public.is_admin()
  );

-- ---- task_assignees ----

-- SELECT: Can see assignees if can access the project
CREATE POLICY "task_assignees_select" ON public.task_assignees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = task_assignees.task_id
      AND public.can_access_project((SELECT auth.uid()), t.project_id)
    )
  );

-- INSERT: Can assign if has can_assign_tasks permission
CREATE POLICY "task_assignees_insert" ON public.task_assignees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = task_assignees.task_id
      AND public.can_assign_tasks((SELECT auth.uid()), t.project_id)
    )
  );

-- DELETE: Can unassign if has can_assign_tasks permission
CREATE POLICY "task_assignees_delete" ON public.task_assignees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = task_assignees.task_id
      AND public.can_assign_tasks((SELECT auth.uid()), t.project_id)
    )
  );

-- ---- task_labels ----

-- SELECT: Can see labels if can access the project
CREATE POLICY "task_labels_select" ON public.task_labels
  FOR SELECT USING (
    public.can_access_project((SELECT auth.uid()), project_id)
  );

-- INSERT: Can create labels if has can_manage_labels permission
CREATE POLICY "task_labels_insert" ON public.task_labels
  FOR INSERT WITH CHECK (
    public.can_manage_labels((SELECT auth.uid()), project_id)
  );

-- UPDATE: Can update labels if has can_manage_labels permission
CREATE POLICY "task_labels_update" ON public.task_labels
  FOR UPDATE USING (
    public.can_manage_labels((SELECT auth.uid()), project_id)
  );

-- DELETE: Can delete labels if has can_manage_labels permission
CREATE POLICY "task_labels_delete" ON public.task_labels
  FOR DELETE USING (
    public.can_manage_labels((SELECT auth.uid()), project_id)
  );

-- ---- task_label_assignments ----

-- SELECT: Can see label assignments if can access the project
CREATE POLICY "task_label_assignments_select" ON public.task_label_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = task_label_assignments.task_id
      AND public.can_access_project((SELECT auth.uid()), t.project_id)
    )
  );

-- INSERT: Can assign labels if can manage project content
CREATE POLICY "task_label_assignments_insert" ON public.task_label_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = task_label_assignments.task_id
      AND public.can_manage_project_content((SELECT auth.uid()), t.project_id)
    )
  );

-- DELETE: Can remove labels if can manage project content
CREATE POLICY "task_label_assignments_delete" ON public.task_label_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = task_label_assignments.task_id
      AND public.can_manage_project_content((SELECT auth.uid()), t.project_id)
    )
  );

-- ---- task_attachments ----

-- SELECT: Can see attachments if can access the project
CREATE POLICY "task_attachments_select" ON public.task_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = task_attachments.task_id
      AND public.can_access_project((SELECT auth.uid()), t.project_id)
    )
  );

-- INSERT: Can add attachments if has can_upload_files permission
CREATE POLICY "task_attachments_insert" ON public.task_attachments
  FOR INSERT WITH CHECK (
    uploaded_by = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = task_attachments.task_id
      AND public.can_upload_files((SELECT auth.uid()), t.project_id)
    )
  );

-- DELETE: Can delete own attachments OR project owner can delete any
CREATE POLICY "task_attachments_delete" ON public.task_attachments
  FOR DELETE USING (
    uploaded_by = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = task_attachments.task_id
      AND public.is_project_owner((SELECT auth.uid()), t.project_id)
    )
    OR public.is_admin()
  );

-- ---- time_entries ----

-- SELECT: Can see own time entries OR project owner/admin can see all in their projects
CREATE POLICY "time_entries_select" ON public.time_entries
  FOR SELECT USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = time_entries.task_id
      AND public.can_modify_project((SELECT auth.uid()), t.project_id)
    )
  );

-- INSERT: Can only create own time entries
CREATE POLICY "time_entries_insert" ON public.time_entries
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.tm_tasks t
      WHERE t.id = time_entries.task_id
      AND public.can_access_project((SELECT auth.uid()), t.project_id)
    )
  );

-- UPDATE: Can only update own time entries
CREATE POLICY "time_entries_update" ON public.time_entries
  FOR UPDATE USING (
    user_id = (SELECT auth.uid())
  );

-- DELETE: Can only delete own time entries
CREATE POLICY "time_entries_delete" ON public.time_entries
  FOR DELETE USING (
    user_id = (SELECT auth.uid())
  );

-- ---- project_role_permissions ----
-- Only project owners can view and modify role permissions

CREATE POLICY "role_permissions_select" ON public.project_role_permissions
  FOR SELECT USING (
    public.is_project_owner((SELECT auth.uid()), project_id)
    OR public.is_admin()
  );

CREATE POLICY "role_permissions_update" ON public.project_role_permissions
  FOR UPDATE USING (
    public.is_project_owner((SELECT auth.uid()), project_id)
  );

-- Insert and delete are handled by triggers, but allow owner to manage
CREATE POLICY "role_permissions_insert" ON public.project_role_permissions
  FOR INSERT WITH CHECK (
    public.is_project_owner((SELECT auth.uid()), project_id)
  );

CREATE POLICY "role_permissions_delete" ON public.project_role_permissions
  FOR DELETE USING (
    public.is_project_owner((SELECT auth.uid()), project_id)
  );

-- ============================================
-- 5. Grant execute permissions on new functions
-- ============================================

GRANT EXECUTE ON FUNCTION public.get_user_member_project_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_owned_project_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_collaboration_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_team_collaborate(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role_permission(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_project_permission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_project(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_modify_project(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_tasks(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_assign_tasks(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_comment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_labels(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_upload_files(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_invite_members(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_remove_members(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_change_roles(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_project_content(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_role_permissions(UUID) TO authenticated;

-- ============================================
-- 6. Add helpful comments
-- ============================================

COMMENT ON TABLE public.project_role_permissions IS 'Customizable permissions for each role (admin, member, viewer) per project. Owner can configure what each role can do.';
COMMENT ON FUNCTION public.is_team_collaboration_enabled IS 'Checks if team collaboration is enabled globally via platform_config';
COMMENT ON FUNCTION public.user_can_team_collaborate IS 'Checks if user has team collaboration enabled (global setting + plan feature)';
COMMENT ON FUNCTION public.can_access_project IS 'Checks if user can view project (owner, member with team_collab, or platform admin)';
COMMENT ON FUNCTION public.can_modify_project IS 'Checks if user can modify project settings (needs can_edit_project permission)';
COMMENT ON FUNCTION public.can_manage_tasks IS 'Checks if user can create/edit/delete tasks';
COMMENT ON FUNCTION public.can_manage_project_content IS 'Legacy function - same as can_manage_tasks';

-- ============================================
-- 7. Add indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_project_role_permissions_project ON public.project_role_permissions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_role_permissions_role ON public.project_role_permissions(project_id, role);

-- ============================================
-- 8. Add RLS policies for plans table (admin can manage all plan settings)
-- ============================================

-- Enable RLS on plans if not already
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "plans_select" ON public.plans;
DROP POLICY IF EXISTS "plans_insert" ON public.plans;
DROP POLICY IF EXISTS "plans_update" ON public.plans;
DROP POLICY IF EXISTS "plans_delete" ON public.plans;
DROP POLICY IF EXISTS "Anyone can view plans" ON public.plans;

-- Everyone can view available plans
CREATE POLICY "plans_select" ON public.plans
  FOR SELECT USING (true);

-- Only admins can create new plans
CREATE POLICY "plans_insert" ON public.plans
  FOR INSERT WITH CHECK ((SELECT public.is_admin()));

-- Only admins can update plans (features, limits, prices, etc.)
CREATE POLICY "plans_update" ON public.plans
  FOR UPDATE USING ((SELECT public.is_admin()));

-- Only admins can delete plans
CREATE POLICY "plans_delete" ON public.plans
  FOR DELETE USING ((SELECT public.is_admin()));
