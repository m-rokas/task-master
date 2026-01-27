-- Add Stripe Price IDs to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_price_monthly TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_price_yearly TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

-- Add stripe_subscription_id to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add stripe_invoice_id to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;
