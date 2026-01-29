-- Fix Missing RLS Policies
-- This migration adds missing RLS policies for tm_tasks, task_comments, and task_assignees
-- Applied: 2025-01-29

-- ============================================
-- 1. Fix tm_tasks - Add missing INSERT/UPDATE/DELETE policies
-- ============================================

DROP POLICY IF EXISTS "tasks_insert" ON public.tm_tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tm_tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tm_tasks;

-- Project members can create tasks
CREATE POLICY "tasks_insert" ON public.tm_tasks
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid())
    )
    OR project_id IN (
      SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
    )
  );

-- Project members can update tasks
CREATE POLICY "tasks_update" ON public.tm_tasks
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid())
    )
    OR project_id IN (
      SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
    )
  );

-- Project members can delete tasks (owner, admin, member - not viewer)
CREATE POLICY "tasks_delete" ON public.tm_tasks
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin', 'member')
    )
    OR project_id IN (
      SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
    )
  );

-- ============================================
-- 2. Fix task_comments - Add missing SELECT policy
-- ============================================

DROP POLICY IF EXISTS "task_comments_select" ON public.task_comments;

-- Project members can view comments on tasks in their projects
CREATE POLICY "task_comments_select" ON public.task_comments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM public.tm_tasks WHERE project_id IN (
        SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
        UNION
        SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid())
      )
    )
  );

-- ============================================
-- 3. Fix task_assignees - Add all missing policies
-- ============================================

DROP POLICY IF EXISTS "task_assignees_select" ON public.task_assignees;
DROP POLICY IF EXISTS "task_assignees_insert" ON public.task_assignees;
DROP POLICY IF EXISTS "task_assignees_delete" ON public.task_assignees;

-- Project members can view task assignees
CREATE POLICY "task_assignees_select" ON public.task_assignees
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM public.tm_tasks WHERE project_id IN (
        SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
        UNION
        SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid())
      )
    )
  );

-- Project members can assign users to tasks
CREATE POLICY "task_assignees_insert" ON public.task_assignees
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM public.tm_tasks WHERE project_id IN (
        SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
        UNION
        SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid())
      )
    )
  );

-- Project members can remove assignees
CREATE POLICY "task_assignees_delete" ON public.task_assignees
  FOR DELETE USING (
    task_id IN (
      SELECT id FROM public.tm_tasks WHERE project_id IN (
        SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
        UNION
        SELECT project_id FROM public.project_members WHERE user_id = (SELECT auth.uid())
      )
    )
  );

-- ============================================
-- 4. Fix project_members - Add missing INSERT policy
-- ============================================

DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;

-- Project owners and admins can add members
CREATE POLICY "project_members_insert" ON public.project_members
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM public.tm_projects WHERE owner_id = (SELECT auth.uid())
    )
    OR project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 5. Ensure RLS is enabled on all tables
-- ============================================

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. Add index for task_assignees performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON public.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
