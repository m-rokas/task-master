-- Fix project_members RLS to avoid infinite recursion
-- Applied: 2025-01-29

-- Helper function to get user's project IDs without triggering RLS recursion
DROP FUNCTION IF EXISTS public.get_user_project_ids(UUID);

CREATE OR REPLACE FUNCTION public.get_user_project_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
  -- Return projects user owns
  RETURN QUERY SELECT id FROM public.tm_projects WHERE owner_id = p_user_id;

  -- Return projects user is member of (direct query, no RLS)
  RETURN QUERY SELECT project_id FROM public.project_members WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Fix project_members SELECT policy - simple approach without recursion
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;

CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT TO authenticated
  USING (
    -- User can see their own membership
    user_id = auth.uid()
    OR
    -- User can see members of projects they own (query tm_projects, not project_members)
    project_id IN (SELECT id FROM public.tm_projects WHERE owner_id = auth.uid())
    OR
    -- Admin can see all
    public.is_admin()
  );
