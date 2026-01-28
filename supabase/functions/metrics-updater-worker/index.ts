// Metrics Updater Worker
// Runs daily to refresh engagement metrics for active trends

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Recalculate viral score
function calculateViralScore(
  views: number = 0,
  likes: number = 0,
  shares: number = 0,
  comments: number = 0,
  platform: string
): number {
  const platformMultiplier: Record<string, number> = {
    tiktok: 1.0,
    instagram: 1.2,
    youtube: 1.5,
    twitter: 0.8,
    facebook: 0.7,
  };
  
  const multiplier = platformMultiplier[platform] || 1.0;
  const score = (
    (views / 10000) +
    (likes / 100) * 2 +
    (shares * 5) +
    (comments * 3)
  ) * multiplier;
  
  return Math.min(Math.round(score), 100);
}

// Age-based score decay
function applyScoreDecay(score: number, createdAt: string): number {
  const ageInDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  
  // Decay factor: loses 2% per day after 3 days, capped at 50% reduction
  if (ageInDays <= 3) return score;
  
  const decayDays = ageInDays - 3;
  const decayFactor = Math.max(0.5, 1 - (decayDays * 0.02));
  
  return Math.round(score * decayFactor);
}

// Deactivate stale trends
async function deactivateStaleTrends(supabase: any): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 14); // 14 days old

  const { data, error } = await supabase
    .from('trends_v2')
    .update({ is_active: false })
    .eq('is_active', true)
    .lt('created_at', cutoffDate.toISOString())
    .lt('trend_score', 20)
    .select('id');

  if (error) {
    console.error('[Metrics Worker] Failed to deactivate stale trends:', error);
    return 0;
  }

  return data?.length || 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[Metrics Worker] Starting metrics update cycle...');
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active trends with their latest metrics
    const { data: trends, error: fetchError } = await supabase
      .from('trends_v2')
      .select(`
        id,
        platform,
        trend_score,
        created_at,
        trend_metrics (
          views,
          likes,
          shares,
          comments
        )
      `)
      .eq('is_active', true)
      .limit(500);

    if (fetchError) {
      throw new Error(`Failed to fetch trends: ${fetchError.message}`);
    }

    console.log(`[Metrics Worker] Processing ${trends?.length || 0} active trends`);
    
    let updatedCount = 0;

    for (const trend of trends || []) {
      try {
        const latestMetrics = trend.trend_metrics?.[0];
        
        if (latestMetrics) {
          // Recalculate score with current metrics
          const baseScore = calculateViralScore(
            latestMetrics.views,
            latestMetrics.likes,
            latestMetrics.shares,
            latestMetrics.comments,
            trend.platform
          );
          
          // Apply age decay
          const newScore = applyScoreDecay(baseScore, trend.created_at);
          
          // Only update if score changed significantly
          if (Math.abs(newScore - trend.trend_score) >= 2) {
            await supabase
              .from('trends_v2')
              .update({ 
                trend_score: newScore,
                updated_at: new Date().toISOString()
              })
              .eq('id', trend.id);
            
            updatedCount++;
            console.log(`[Metrics Worker] Updated trend ${trend.id}: ${trend.trend_score} -> ${newScore}`);
          }
        }
      } catch (error: any) {
        console.error(`[Metrics Worker] Failed to update trend ${trend.id}:`, error);
      }
    }

    // Deactivate stale trends
    const deactivatedCount = await deactivateStaleTrends(supabase);
    console.log(`[Metrics Worker] Deactivated ${deactivatedCount} stale trends`);

    const duration = Date.now() - startTime;
    console.log(`[Metrics Worker] Complete in ${duration}ms. Updated: ${updatedCount}, Deactivated: ${deactivatedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalTrends: trends?.length || 0,
        updated: updatedCount,
        deactivated: deactivatedCount,
        duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Metrics Worker] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
