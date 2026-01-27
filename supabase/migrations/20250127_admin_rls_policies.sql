-- Add admin RLS policies for profiles and subscriptions
-- This allows admins to view all users and subscriptions in admin dashboard

-- Create or replace is_admin function if not exists
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

-- Add admin policy to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

-- Add admin policy to update all profiles (for user management)
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (is_admin());

-- Enable RLS on subscriptions if not already
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own subscription (for cancel_at_period_end etc)
DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON subscriptions
  FOR SELECT USING (is_admin());

-- Admins can insert subscriptions (for starting trials, etc)
DROP POLICY IF EXISTS "Admins can insert subscriptions" ON subscriptions;
CREATE POLICY "Admins can insert subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (is_admin());

-- Admins can update all subscriptions
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON subscriptions;
CREATE POLICY "Admins can update all subscriptions" ON subscriptions
  FOR UPDATE USING (is_admin());

-- Admins can delete subscriptions
DROP POLICY IF EXISTS "Admins can delete subscriptions" ON subscriptions;
CREATE POLICY "Admins can delete subscriptions" ON subscriptions
  FOR DELETE USING (is_admin());

-- Also ensure admins can view all tasks and projects for platform stats
DROP POLICY IF EXISTS "Admins can view all projects" ON tm_projects;
CREATE POLICY "Admins can view all projects" ON tm_projects
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can view all tasks" ON tm_tasks;
CREATE POLICY "Admins can view all tasks" ON tm_tasks
  FOR SELECT USING (is_admin());
