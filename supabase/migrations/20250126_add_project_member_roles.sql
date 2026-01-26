-- Add role column to project_members table if it doesn't exist
-- Roles: owner, admin, member, viewer

-- First, check if the role column exists and add it if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_members' AND column_name = 'role'
  ) THEN
    ALTER TABLE project_members
    ADD COLUMN role TEXT NOT NULL DEFAULT 'member';

    -- Add check constraint for valid roles
    ALTER TABLE project_members
    ADD CONSTRAINT project_members_role_check
    CHECK (role IN ('owner', 'admin', 'member', 'viewer'));
  END IF;
END $$;

-- Add joined_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_members' AND column_name = 'joined_at'
  ) THEN
    ALTER TABLE project_members
    ADD COLUMN joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Update existing members to have appropriate roles
-- The first member (earliest) for each project becomes owner
WITH ranked_members AS (
  SELECT
    id,
    project_id,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC, id ASC) as rn
  FROM project_members
)
UPDATE project_members pm
SET role = 'owner'
FROM ranked_members rm
WHERE pm.id = rm.id AND rm.rn = 1 AND pm.role = 'member';

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);

-- Add RLS policy for role-based access (if not exists)
-- Owners and admins can manage project members
DROP POLICY IF EXISTS "project_admins_manage_members" ON project_members;
CREATE POLICY "project_admins_manage_members" ON project_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner', 'admin')
    )
  );

-- Members and viewers can read project members
DROP POLICY IF EXISTS "project_members_read" ON project_members;
CREATE POLICY "project_members_read" ON project_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
    )
  );
