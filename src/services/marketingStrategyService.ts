// src/services/marketingStrategyService.ts
/**
 * Marketing Strategy Service
 * Uses Lynkscope intelligence to guide content creation, trend discovery, and platform targeting
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface MarketingIntelligence {
  id: string;
  user_id: string;
  business_name: string | null;
  niche: string | null;
  total_clicks: number;
  top_platform: string | null;
  underperforming_platforms: string[];
  platform_click_breakdown: {
    youtube: number;
    tiktok: number;
    instagram: number;
    other: number;
  };
  created_at: string;
  updated_at: string;
}

export interface StrategyBoost {
  platformBoost: number;
  nicheBoost: number;
  totalBoost: number;
  reason: string[];
}

export interface ContentStrategy {
  priorityPlatforms: string[];
  maintainPlatforms: string[];
  hookStyle: 'educational' | 'engagement' | 'authority' | 'viral';
  ctaFocus: string;
  contentVolumeMultiplier: number;
}

export interface CaptionStrategy {
  includeNicheKeyword: boolean;
  ctaType: 'value-driven' | 'engagement-driven' | 'action-driven';
  framingStyle: 'problem-solution' | 'benefit-focused' | 'community-building';
  platformSpecificTags: string[];
}

// ============================================================================
// FETCH INTELLIGENCE
// ============================================================================

/**
 * Fetch marketing intelligence for a user
 */
export async function fetchMarketingIntelligence(userId: string): Promise<MarketingIntelligence | null> {
  try {
    console.log('[MarketingStrategy] Fetching intelligence for user:', userId);
    
    const { data, error } = await (supabase as any)
      .from('marketing_intelligence')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[MarketingStrategy] No intelligence found for user');
        return null;
      }
      console.error('[MarketingStrategy] Error fetching intelligence:', error);
      return null;
    }

    return data as MarketingIntelligence;
  } catch (error) {
    console.error('[MarketingStrategy] Exception:', error);
    return null;
  }
}

// ============================================================================
// TREND SCORING
// ============================================================================

/**
 * Calculate strategy boost for a trend based on marketing intelligence
 * 
 * @param trendPlatform - The platform the trend is from
 * @param trendTitle - The trend title/description
 * @param userNiche - The user's business niche
 * @param intelligence - The user's marketing intelligence data
 * @returns StrategyBoost with platform and niche adjustments
 */
export function calculateStrategyBoost(
  trendPlatform: string,
  trendTitle: string,
  userNiche: string | null,
  intelligence: MarketingIntelligence | null
): StrategyBoost {
  const reasons: string[] = [];
  let platformBoost = 0;
  let nicheBoost = 0;

  if (!intelligence) {
    return { platformBoost: 0, nicheBoost: 0, totalBoost: 0, reason: ['No intelligence data available'] };
  }

  const normalizedPlatform = trendPlatform.toLowerCase();
  const underperforming = (intelligence.underperforming_platforms || []).map(p => p.toLowerCase());
  const topPlatform = intelligence.top_platform?.toLowerCase();

  // Platform boost: +0.3 for underperforming platforms
  if (underperforming.includes(normalizedPlatform)) {
    platformBoost = 0.3;
    reasons.push(`+0.3: Trend matches underperforming platform (${normalizedPlatform})`);
  } else if (normalizedPlatform === topPlatform) {
    platformBoost = 0.1;
    reasons.push(`+0.1: Trend matches top-performing platform (${normalizedPlatform})`);
  }

  // Niche boost: +0.2 if trend contains niche keywords
  const nicheKeywords = getNicheKeywords(userNiche || intelligence.niche);
  const titleLower = trendTitle.toLowerCase();
  const matchedKeywords = nicheKeywords.filter(kw => titleLower.includes(kw.toLowerCase()));
  
  if (matchedKeywords.length > 0) {
    nicheBoost = Math.min(0.2, matchedKeywords.length * 0.1); // Up to 0.2 boost
    reasons.push(`+${nicheBoost.toFixed(1)}: Trend contains niche keywords (${matchedKeywords.join(', ')})`);
  }

  const totalBoost = platformBoost + nicheBoost;

  return {
    platformBoost,
    nicheBoost,
    totalBoost,
    reason: reasons.length > 0 ? reasons : ['No strategy boosts applied'],
  };
}

/**
 * Apply strategy boost to a trend score
 */
export function applyStrategyBoostToScore(
  baseScore: number,
  trendPlatform: string,
  trendTitle: string,
  userNiche: string | null,
  intelligence: MarketingIntelligence | null
): { finalScore: number; boost: StrategyBoost } {
  const boost = calculateStrategyBoost(trendPlatform, trendTitle, userNiche, intelligence);
  
  // Apply boost as a multiplier (e.g., 0.3 boost = 30% increase)
  const multiplier = 1 + boost.totalBoost;
  const finalScore = Math.round(baseScore * multiplier);

  return { finalScore, boost };
}

// ============================================================================
// CONTENT STRATEGY
// ============================================================================

/**
 * Generate content strategy based on marketing intelligence
 */
export function generateContentStrategy(
  platform: string,
  intelligence: MarketingIntelligence | null
): ContentStrategy {
  const normalizedPlatform = platform.toLowerCase();
  
  // Default strategy if no intelligence
  if (!intelligence) {
    return {
      priorityPlatforms: ['tiktok', 'instagram'],
      maintainPlatforms: [],
      hookStyle: 'engagement',
      ctaFocus: 'general engagement',
      contentVolumeMultiplier: 1,
    };
  }

  const underperforming = (intelligence.underperforming_platforms || []).map(p => p.toLowerCase());
  const topPlatform = intelligence.top_platform?.toLowerCase();
  const isUnderperforming = underperforming.includes(normalizedPlatform);
  const isTopPlatform = normalizedPlatform === topPlatform;

  return {
    priorityPlatforms: underperforming.length > 0 ? underperforming : ['tiktok', 'instagram'],
    maintainPlatforms: topPlatform ? [topPlatform] : [],
    hookStyle: isUnderperforming ? 'educational' : isTopPlatform ? 'engagement' : 'viral',
    ctaFocus: isUnderperforming 
      ? 'value and expertise demonstration' 
      : 'community building and interaction',
    contentVolumeMultiplier: isUnderperforming ? 1.5 : 1,
  };
}

/**
 * Generate caption strategy based on platform performance
 */
export function generateCaptionStrategy(
  platform: string,
  niche: string | null,
  intelligence: MarketingIntelligence | null
): CaptionStrategy {
  const normalizedPlatform = platform.toLowerCase();
  const underperforming = (intelligence?.underperforming_platforms || []).map(p => p.toLowerCase());
  const isUnderperforming = underperforming.includes(normalizedPlatform);

  // Get platform-specific hashtags
  const platformTags = getPlatformHashtags(normalizedPlatform, niche);

  if (isUnderperforming) {
    return {
      includeNicheKeyword: true,
      ctaType: 'value-driven',
      framingStyle: 'problem-solution',
      platformSpecificTags: platformTags,
    };
  }

  return {
    includeNicheKeyword: true,
    ctaType: 'engagement-driven',
    framingStyle: 'community-building',
    platformSpecificTags: platformTags,
  };
}

// ============================================================================
// HOOK GENERATION
// ============================================================================

/**
 * Generate strategy-aware hooks based on platform performance
 */
export function generateStrategyAwareHook(
  platform: string,
  niche: string | null,
  trendTitle: string,
  intelligence: MarketingIntelligence | null
): { hook: string; style: string } {
  const normalizedPlatform = platform.toLowerCase();
  const underperforming = (intelligence?.underperforming_platforms || []).map(p => p.toLowerCase());
  const isUnderperforming = underperforming.includes(normalizedPlatform);

  const nicheDisplay = niche || intelligence?.niche || 'your industry';

  if (isUnderperforming) {
    // Educational/Authority hooks for underperforming platforms
    const educationalHooks = [
      `Most ${nicheDisplay} experts don't know this...`,
      `The #1 mistake in ${nicheDisplay} that's costing you results`,
      `Here's what ${nicheDisplay} pros actually do differently`,
      `Stop doing this in ${nicheDisplay} - here's why`,
      `The hidden secret to ${nicheDisplay} success that nobody talks about`,
    ];
    const hook = educationalHooks[Math.floor(Math.random() * educationalHooks.length)];
    return { hook, style: 'educational-authority' };
  }

  // Engagement/Community hooks for top-performing platforms
  const engagementHooks = [
    `POV: You're about to level up your ${nicheDisplay} game`,
    `This is your sign to finally master ${nicheDisplay}`,
    `${nicheDisplay} community, we need to talk about this...`,
    `Drop a 🔥 if you relate to this ${nicheDisplay} moment`,
    `Only true ${nicheDisplay} enthusiasts will understand this`,
  ];
  const hook = engagementHooks[Math.floor(Math.random() * engagementHooks.length)];
  return { hook, style: 'engagement-community' };
}

// ============================================================================
// CTA GENERATION
// ============================================================================

/**
 * Generate platform-specific CTAs based on strategy
 */
export function generateStrategyCTA(
  platform: string,
  businessName: string | null,
  intelligence: MarketingIntelligence | null
): string {
  const normalizedPlatform = platform.toLowerCase();
  const underperforming = (intelligence?.underperforming_platforms || []).map(p => p.toLowerCase());
  const isUnderperforming = underperforming.includes(normalizedPlatform);
  const brand = businessName || intelligence?.business_name || 'us';

  if (isUnderperforming) {
    // Value-driven CTAs for underperforming platforms
    const valueCTAs = [
      `Learn more with ${brand} - link in bio`,
      `Get expert tips from ${brand}`,
      `${brand} helps you succeed - see how`,
      `Ready to transform your results? Connect with ${brand}`,
    ];
    return valueCTAs[Math.floor(Math.random() * valueCTAs.length)];
  }

  // Engagement CTAs for performing platforms
  const engagementCTAs = [
    `Follow ${brand} for more!`,
    `Tag someone who needs to see this!`,
    `Join the ${brand} community 🔥`,
    `What do you think? Comment below!`,
  ];
  return engagementCTAs[Math.floor(Math.random() * engagementCTAs.length)];
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get keywords for a niche
 */
function getNicheKeywords(niche: string | null): string[] {
  if (!niche) return [];
  
  const nicheKeywordMap: Record<string, string[]> = {
    fitness: ['workout', 'gym', 'exercise', 'muscle', 'cardio', 'training', 'fit', 'health', 'strength'],
    marketing: ['brand', 'growth', 'strategy', 'content', 'social', 'digital', 'business', 'leads'],
    beauty: ['makeup', 'skincare', 'beauty', 'cosmetics', 'glow', 'routine', 'look', 'style'],
    fashion: ['outfit', 'style', 'fashion', 'trend', 'wear', 'look', 'clothes', 'aesthetic'],
    food: ['recipe', 'cook', 'food', 'meal', 'eat', 'kitchen', 'delicious', 'taste'],
    comedy: ['funny', 'humor', 'joke', 'laugh', 'comedy', 'hilarious', 'prank'],
    dance: ['dance', 'choreography', 'moves', 'dancing', 'routine', 'music'],
    music: ['music', 'song', 'beat', 'sound', 'artist', 'track', 'audio'],
    gaming: ['game', 'gaming', 'play', 'gamer', 'stream', 'esports', 'console'],
    lifestyle: ['life', 'daily', 'routine', 'living', 'wellness', 'balance'],
    education: ['learn', 'teach', 'education', 'study', 'knowledge', 'tips', 'how to'],
    pets: ['pet', 'dog', 'cat', 'animal', 'puppy', 'cute', 'furry'],
    travel: ['travel', 'destination', 'trip', 'adventure', 'explore', 'vacation'],
    motivation: ['motivation', 'inspire', 'success', 'mindset', 'goals', 'hustle'],
    relationship: ['relationship', 'love', 'couple', 'dating', 'partner'],
  };

  return nicheKeywordMap[niche.toLowerCase()] || [];
}

/**
 * Get platform-specific hashtags
 */
function getPlatformHashtags(platform: string, niche: string | null): string[] {
  const platformTags: Record<string, string[]> = {
    tiktok: ['#fyp', '#foryou', '#viral', '#trending'],
    instagram: ['#reels', '#explore', '#instagood', '#instadaily'],
    youtube: ['#shorts', '#youtube', '#subscribe'],
    twitter: ['#trending', '#viral'],
    facebook: ['#facebook', '#viral'],
  };

  const nicheTags = niche ? [`#${niche.replace(/\s+/g, '')}`, `#${niche.replace(/\s+/g, '')}tips`] : [];
  
  return [...(platformTags[platform] || []), ...nicheTags];
}

/**
 * Determine if a platform should be prioritized for content creation
 */
export function shouldPrioritizePlatform(
  platform: string,
  intelligence: MarketingIntelligence | null
): { prioritize: boolean; reason: string } {
  if (!intelligence) {
    return { prioritize: false, reason: 'No intelligence data available' };
  }

  const normalizedPlatform = platform.toLowerCase();
  const underperforming = (intelligence.underperforming_platforms || []).map(p => p.toLowerCase());

  if (underperforming.includes(normalizedPlatform)) {
    return { 
      prioritize: true, 
      reason: `${platform} is underperforming - prioritizing for content boost` 
    };
  }

  return { prioritize: false, reason: `${platform} is performing well` };
}
