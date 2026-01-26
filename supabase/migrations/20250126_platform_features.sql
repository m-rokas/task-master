-- Platform Configuration Table
CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read platform config
CREATE POLICY "platform_config_read" ON platform_config
  FOR SELECT USING (true);

-- Only admins can update (check profile.role = 'admin')
CREATE POLICY "platform_config_admin_write" ON platform_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default settings if not exist
INSERT INTO platform_config (key, value, category, description) VALUES
  ('site_name', 'TaskMaster', 'general', 'The name of your platform'),
  ('site_description', 'Professional Task Management Platform', 'general', 'Platform description'),
  ('support_email', 'support@taskmaster.com', 'general', 'Support email address'),
  ('trial_days', '14', 'billing', 'Trial period in days'),
  ('trial_enabled', 'true', 'billing', 'Enable free trial'),
  ('signup_enabled', 'true', 'features', 'Allow new registrations'),
  ('maintenance_mode', 'false', 'features', 'Maintenance mode status')
ON CONFLICT (key) DO NOTHING;

-- Update plans with features JSON
UPDATE plans SET features = jsonb_build_object(
  'custom_labels', false,
  'file_attachments', false,
  'team_collaboration', false,
  'advanced_time_tracking', false,
  'api_access', false
) WHERE name = 'free';

UPDATE plans SET features = jsonb_build_object(
  'custom_labels', true,
  'file_attachments', true,
  'team_collaboration', true,
  'advanced_time_tracking', true,
  'api_access', false
) WHERE name = 'pro';

UPDATE plans SET features = jsonb_build_object(
  'custom_labels', true,
  'file_attachments', true,
  'team_collaboration', true,
  'advanced_time_tracking', true,
  'api_access', true
) WHERE name = 'business';

-- Create storage bucket for attachments (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for attachments
DROP POLICY IF EXISTS "attachments_select" ON storage.objects;
CREATE POLICY "attachments_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'attachments' AND
    auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "attachments_insert" ON storage.objects;
CREATE POLICY "attachments_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'attachments' AND
    auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "attachments_delete" ON storage.objects;
CREATE POLICY "attachments_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'attachments' AND
    auth.role() = 'authenticated'
  );

-- Task attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tm_tasks(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on task_attachments
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_attachments
CREATE POLICY "task_attachments_select" ON task_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tm_tasks t
      JOIN project_members pm ON t.project_id = pm.project_id
      WHERE t.id = task_attachments.task_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "task_attachments_insert" ON task_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tm_tasks t
      JOIN project_members pm ON t.project_id = pm.project_id
      WHERE t.id = task_attachments.task_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "task_attachments_delete" ON task_attachments
  FOR DELETE USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tm_tasks t
      JOIN project_members pm ON t.project_id = pm.project_id
      WHERE t.id = task_attachments.task_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

-- Task labels table
CREATE TABLE IF NOT EXISTS task_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES tm_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task label assignments (many-to-many)
CREATE TABLE IF NOT EXISTS task_label_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tm_tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, label_id)
);

-- Enable RLS
ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_label_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_labels
CREATE POLICY "task_labels_select" ON task_labels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = task_labels.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "task_labels_insert" ON task_labels
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = task_labels.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "task_labels_delete" ON task_labels
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = task_labels.project_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
    )
  );

-- RLS policies for task_label_assignments
CREATE POLICY "task_label_assignments_select" ON task_label_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tm_tasks t
      JOIN project_members pm ON t.project_id = pm.project_id
      WHERE t.id = task_label_assignments.task_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "task_label_assignments_insert" ON task_label_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tm_tasks t
      JOIN project_members pm ON t.project_id = pm.project_id
      WHERE t.id = task_label_assignments.task_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "task_label_assignments_delete" ON task_label_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tm_tasks t
      JOIN project_members pm ON t.project_id = pm.project_id
      WHERE t.id = task_label_assignments.task_id
      AND pm.user_id = auth.uid()
    )
  );
