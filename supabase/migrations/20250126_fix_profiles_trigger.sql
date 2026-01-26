-- Fix: Create profiles trigger for new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id FROM plans WHERE name = 'free' LIMIT 1;

  INSERT INTO profiles (id, full_name, plan_id, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    free_plan_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for existing users who don't have one
INSERT INTO profiles (id, full_name, plan_id, created_at, updated_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  (SELECT id FROM plans WHERE name = 'free' LIMIT 1),
  u.created_at,
  NOW()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

-- Ensure RLS is enabled on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view team member profiles" ON profiles;
CREATE POLICY "Users can view team member profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm1
      JOIN project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid()
        AND pm2.user_id = profiles.id
    )
  );

-- Fix: Auto-add owner as project member on project creation
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', NOW())
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_project_created ON tm_projects;

CREATE TRIGGER on_project_created
  AFTER INSERT ON tm_projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_project();

-- Add owners as members for existing projects
INSERT INTO project_members (project_id, user_id, role, joined_at)
SELECT p.id, p.owner_id, 'owner', p.created_at
FROM tm_projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = p.id AND pm.user_id = p.owner_id
);
