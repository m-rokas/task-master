-- Add foreign key from subscriptions.user_id to profiles.id
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
