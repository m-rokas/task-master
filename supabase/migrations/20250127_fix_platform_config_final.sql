-- Final fix for platform_config table and RLS policies

-- Ensure the table exists with correct structure
CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Make sure RLS is enabled
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (clean slate)
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname FROM pg_policies WHERE tablename = 'platform_config'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON platform_config', policy_name);
  END LOOP;
END $$;

-- Create simple policies
-- 1. Anyone can read platform config
CREATE POLICY "platform_config_read_all" ON platform_config
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- 2. Only admins can insert
CREATE POLICY "platform_config_insert_admin" ON platform_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 3. Only admins can update
CREATE POLICY "platform_config_update_admin" ON platform_config
  FOR UPDATE
  TO authenticated
  USING (
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

-- 4. Only admins can delete
CREATE POLICY "platform_config_delete_admin" ON platform_config
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default settings if they don't exist
INSERT INTO platform_config (key, value, category, description) VALUES
  ('site_name', 'TaskMaster', 'general', 'The name of your platform'),
  ('site_description', 'Professional Task Management Platform', 'general', 'Platform description for SEO'),
  ('site_url', '', 'general', 'The main URL of your platform'),
  ('support_email', 'support@taskmaster.com', 'general', 'Email for support inquiries'),
  ('trial_days', '14', 'billing', 'Number of days for free trial'),
  ('trial_enabled', 'true', 'billing', 'Enable/disable free trial for new users'),
  ('signup_enabled', 'true', 'features', 'Allow new user registrations'),
  ('maintenance_mode', 'false', 'features', 'Put site in maintenance mode'),
  ('email_notifications_enabled', 'true', 'notifications', 'Enable email notifications globally'),
  ('welcome_email_enabled', 'true', 'notifications', 'Send welcome email to new users'),
  ('task_reminder_enabled', 'true', 'notifications', 'Send task due date reminders'),
  ('max_login_attempts', '5', 'security', 'Max failed login attempts before lockout'),
  ('session_timeout_hours', '24', 'security', 'Hours before session expires')
ON CONFLICT (key) DO NOTHING;
