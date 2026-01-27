-- Drop all existing policies on platform_config
DROP POLICY IF EXISTS "platform_config_public_read" ON platform_config;
DROP POLICY IF EXISTS "platform_config_admin_insert" ON platform_config;
DROP POLICY IF EXISTS "platform_config_admin_update" ON platform_config;
DROP POLICY IF EXISTS "platform_config_admin_delete" ON platform_config;
DROP POLICY IF EXISTS "Anyone can read platform config" ON platform_config;
DROP POLICY IF EXISTS "Admins can manage platform config" ON platform_config;
DROP POLICY IF EXISTS "platform_config_read" ON platform_config;
DROP POLICY IF EXISTS "platform_config_admin_write" ON platform_config;

-- Create simple, clear policies
-- Everyone can read
CREATE POLICY "platform_config_select" ON platform_config
  FOR SELECT USING (true);

-- Admins can do everything (using direct query, not function)
CREATE POLICY "platform_config_admin_all" ON platform_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
