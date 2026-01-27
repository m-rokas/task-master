-- Fix the audit log trigger - entity_id should be text, not uuid
ALTER TABLE audit_logs ALTER COLUMN entity_id TYPE text USING entity_id::text;

-- Recreate the subscription audit trigger with correct type
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
