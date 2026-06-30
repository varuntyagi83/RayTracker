ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_stripe_customer_id_idx ON workspaces (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_stripe_subscription_id_idx ON workspaces (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
