-- Add canceled_at column to subscriptions table
-- This is needed by the send-subscription-email webhook
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;
