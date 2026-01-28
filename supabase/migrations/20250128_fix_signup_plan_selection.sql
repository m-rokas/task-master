-- Fix: Update profiles trigger to use selected_plan from user metadata
-- Also creates trial subscription for paid plans
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  selected_plan_name TEXT;
  target_plan_id UUID;
  plan_price NUMERIC;
  trial_days_setting INTEGER;
  trial_enabled_setting BOOLEAN;
BEGIN
  -- Get the selected plan from user metadata, default to 'free'
  selected_plan_name := COALESCE(NEW.raw_user_meta_data->>'selected_plan', 'free');

  -- Look up the plan ID and price by name
  SELECT id, price_monthly INTO target_plan_id, plan_price
  FROM plans
  WHERE name = selected_plan_name AND is_active = true
  LIMIT 1;

  -- If plan not found, fall back to free plan
  IF target_plan_id IS NULL THEN
    SELECT id, price_monthly INTO target_plan_id, plan_price
    FROM plans
    WHERE name = 'free'
    LIMIT 1;
    selected_plan_name := 'free';
  END IF;

  -- Create profile
  INSERT INTO profiles (id, full_name, plan_id, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    target_plan_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();

  -- If it's a paid plan, create a trial subscription
  IF selected_plan_name != 'free' AND plan_price > 0 THEN
    -- Get trial settings from platform_config
    SELECT COALESCE((SELECT value::INTEGER FROM platform_config WHERE key = 'trial_days'), 14)
    INTO trial_days_setting;

    SELECT COALESCE((SELECT value = 'true' FROM platform_config WHERE key = 'trial_enabled'), true)
    INTO trial_enabled_setting;

    -- Only create trial if trial is enabled
    IF trial_enabled_setting THEN
      INSERT INTO subscriptions (
        user_id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        target_plan_id,
        'trialing',
        NOW(),
        NOW() + (trial_days_setting || ' days')::INTERVAL,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire trials and downgrade to free plan
-- This should be called by a cron job or scheduled function
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS INTEGER AS $$
DECLARE
  free_plan_id UUID;
  expired_count INTEGER := 0;
BEGIN
  -- Get the free plan ID
  SELECT id INTO free_plan_id FROM plans WHERE name = 'free' LIMIT 1;

  -- Find and update expired trial subscriptions
  WITH expired AS (
    UPDATE subscriptions
    SET
      status = 'canceled',
      plan_id = free_plan_id,
      canceled_at = NOW(),
      updated_at = NOW()
    WHERE
      status = 'trialing'
      AND current_period_end < NOW()
      AND stripe_subscription_id IS NULL -- Only local trials, not Stripe trials
    RETURNING user_id, plan_id
  )
  -- Also update the profile's plan_id to free
  UPDATE profiles p
  SET
    plan_id = free_plan_id,
    updated_at = NOW()
  FROM expired e
  WHERE p.id = e.user_id;

  -- Get count of expired trials
  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (for edge functions)
GRANT EXECUTE ON FUNCTION public.expire_trials() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_trials() TO service_role;
