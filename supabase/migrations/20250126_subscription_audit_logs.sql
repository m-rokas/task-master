-- Add audit logging for subscriptions
-- This will track when users subscribe, cancel, or change plans

-- Create audit log trigger for subscriptions
CREATE OR REPLACE FUNCTION log_subscription_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
    VALUES (
      NEW.user_id,
      'create',
      'subscriptions',
      NEW.id::text,
      jsonb_build_object(
        'plan_id', NEW.plan_id,
        'status', NEW.status,
        'current_period_end', NEW.current_period_end
      ),
      NOW()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if status or plan changed
    IF OLD.status != NEW.status OR OLD.plan_id != NEW.plan_id OR OLD.cancel_at_period_end != NEW.cancel_at_period_end THEN
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, created_at)
      VALUES (
        NEW.user_id,
        'update',
        'subscriptions',
        NEW.id::text,
        jsonb_build_object(
          'plan_id', OLD.plan_id,
          'status', OLD.status,
          'cancel_at_period_end', OLD.cancel_at_period_end
        ),
        jsonb_build_object(
          'plan_id', NEW.plan_id,
          'status', NEW.status,
          'cancel_at_period_end', NEW.cancel_at_period_end
        ),
        NOW()
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, created_at)
    VALUES (
      OLD.user_id,
      'delete',
      'subscriptions',
      OLD.id::text,
      jsonb_build_object(
        'plan_id', OLD.plan_id,
        'status', OLD.status
      ),
      NOW()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS subscription_audit_trigger ON subscriptions;
CREATE TRIGGER subscription_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION log_subscription_changes();

-- Also log user registrations (profile creation)
CREATE OR REPLACE FUNCTION log_user_registration()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, created_at)
  VALUES (
    NEW.id,
    'create',
    'profiles',
    NEW.id::text,
    jsonb_build_object(
      'full_name', NEW.full_name,
      'plan_id', NEW.plan_id,
      'role', NEW.role
    ),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile creation (user registration)
DROP TRIGGER IF EXISTS profile_registration_audit_trigger ON profiles;
CREATE TRIGGER profile_registration_audit_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_user_registration();
