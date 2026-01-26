-- Fix platform_config RLS policies
-- The issue is that FOR ALL policy might conflict with read policy

-- Drop existing policies
DROP POLICY IF EXISTS "platform_config_read" ON platform_config;
DROP POLICY IF EXISTS "platform_config_admin_write" ON platform_config;

-- Allow anyone (including anonymous/unauthenticated) to read
CREATE POLICY "platform_config_public_read" ON platform_config
  FOR SELECT
  TO public
  USING (true);

-- Only admins can insert (using SECURITY DEFINER function to avoid RLS recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "platform_config_admin_insert" ON platform_config
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Only admins can update
CREATE POLICY "platform_config_admin_update" ON platform_config
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admins can delete
CREATE POLICY "platform_config_admin_delete" ON platform_config
  FOR DELETE
  TO authenticated
  USING (is_admin());
