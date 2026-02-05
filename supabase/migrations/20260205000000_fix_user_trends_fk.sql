-- Fix foreign key constraint on user_trends to reference trends_v2 instead of trends
-- This resolves the mismatch between TrendSelectionV2 (which selects from trends_v2)
-- and the user_trends table (which was constrained to trends table)

-- Drop the old foreign key constraint
ALTER TABLE user_trends 
  DROP CONSTRAINT user_trends_trend_id_fkey;

-- Add the new foreign key constraint to trends_v2
ALTER TABLE user_trends 
  ADD CONSTRAINT user_trends_trend_id_fkey 
  FOREIGN KEY (trend_id) 
  REFERENCES trends_v2(id) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;
