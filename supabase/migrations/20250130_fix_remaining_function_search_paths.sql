-- Fix remaining function overloads without search_path

-- Fix calculate_next_due_date with recurrence_type parameter
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  current_due DATE,
  pattern recurrence_type,
  interval_value INTEGER DEFAULT 1
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF current_due IS NULL THEN
    RETURN NULL;
  END IF;

  CASE pattern
    WHEN 'daily' THEN
      RETURN current_due + (interval_value || ' days')::INTERVAL;
    WHEN 'weekly' THEN
      RETURN current_due + (interval_value * 7 || ' days')::INTERVAL;
    WHEN 'monthly' THEN
      RETURN current_due + (interval_value || ' months')::INTERVAL;
    ELSE
      RETURN current_due + (interval_value || ' days')::INTERVAL;
  END CASE;
END;
$$;

-- Fix create_notification with tm_notification_type parameter
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type tm_notification_type,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.tm_notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;
