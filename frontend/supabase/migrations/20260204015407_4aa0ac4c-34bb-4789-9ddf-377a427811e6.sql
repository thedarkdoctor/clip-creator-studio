-- Create marketing_intelligence table for storing Lynkscope analytics
CREATE TABLE public.marketing_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  business_name TEXT,
  niche TEXT,
  total_clicks INTEGER DEFAULT 0,
  top_platform TEXT,
  underperforming_platforms TEXT[] DEFAULT '{}',
  platform_click_breakdown JSONB DEFAULT '{"youtube": 0, "tiktok": 0, "instagram": 0, "other": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_intelligence ENABLE ROW LEVEL SECURITY;

-- Service role can manage all intelligence data (for edge functions)
CREATE POLICY "Service role can manage marketing intelligence" 
ON public.marketing_intelligence 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Users can view their own intelligence data
CREATE POLICY "Users can view own intelligence" 
ON public.marketing_intelligence 
FOR SELECT 
USING (auth.uid()::text = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_marketing_intelligence_updated_at
BEFORE UPDATE ON public.marketing_intelligence
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for fast lookups
CREATE INDEX idx_marketing_intelligence_user_id ON public.marketing_intelligence(user_id);
CREATE INDEX idx_marketing_intelligence_niche ON public.marketing_intelligence(niche);