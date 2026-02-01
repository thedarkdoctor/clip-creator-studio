-- Migration for connected_social_accounts table
CREATE TABLE IF NOT EXISTS connected_social_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    provider text NOT NULL CHECK (provider = 'buffer'),
    buffer_access_token text NOT NULL, -- ENCRYPTED
    buffer_refresh_token text,
    buffer_profile_id text NOT NULL,
    buffer_profile_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, provider)
);

-- Index for quick lookup by user
CREATE INDEX IF NOT EXISTS idx_connected_social_accounts_user_id ON connected_social_accounts(user_id);
