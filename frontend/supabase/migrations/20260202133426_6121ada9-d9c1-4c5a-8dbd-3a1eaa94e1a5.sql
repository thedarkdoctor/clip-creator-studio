-- Create content_jobs table for Lynkscope integration
CREATE TABLE public.content_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  niche TEXT NOT NULL,
  weak_platforms TEXT[] DEFAULT '{}',
  top_opportunities TEXT[] DEFAULT '{}',
  auto_schedule BOOLEAN DEFAULT false,
  posting_frequency TEXT DEFAULT 'weekly',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  error_message TEXT,
  progress JSONB DEFAULT '{"trends_discovered": 0, "scripts_generated": 0, "videos_created": 0, "scheduled": 0}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_jobs ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (edge functions use service role)
CREATE POLICY "Service role can manage all jobs"
ON public.content_jobs
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_content_jobs_updated_at
BEFORE UPDATE ON public.content_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_content_jobs_status ON public.content_jobs(status);
CREATE INDEX idx_content_jobs_user_id ON public.content_jobs(user_id);