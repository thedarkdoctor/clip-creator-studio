-- Migration for content jobs from Lynkscope
CREATE TABLE IF NOT EXISTS content_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    company_name text NOT NULL,
    niche text NOT NULL,
    weak_platforms text[] DEFAULT '{}',
    opportunities text[] DEFAULT '{}',
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
    auto_schedule boolean DEFAULT false,
    posting_frequency text DEFAULT 'weekly',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_jobs_user_id ON content_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_content_jobs_status ON content_jobs(status);
CREATE INDEX IF NOT EXISTS idx_content_jobs_created_at ON content_jobs(created_at);
