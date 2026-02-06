// src/lib/generateBrandAwareScript.ts
import { generateNicheKeywords } from './generateNicheKeywords';
import { 
  generateStrategyAwareHook, 
  generateStrategyCTA, 
  generateCaptionStrategy,
  type MarketingIntelligence 
} from '@/services/marketingStrategyService';

interface UserContext {
  business_name: string;
  niche: string;
}

interface TrendContext {
  format_type: string;
  hook_style: string;
  title: string;
  hashtags: string[];
  platform?: string;
}

interface ScriptOptions {
  intelligence?: MarketingIntelligence | null;
  platform?: string;
}

/**
 * Generate a brand-aware, niche-personalized, strategy-optimized script for a marketing video.
 * @param user { business_name: string, niche: string }
 * @param trend { format_type: string, hook_style: string, title: string, hashtags: string[], platform?: string }
 * @param options { intelligence?: MarketingIntelligence, platform?: string }
 */
export async function generateBrandAwareScript(
  user: UserContext, 
  trend: TrendContext,
  options?: ScriptOptions
) {
  const { intelligence } = options || {};
  const platform = trend.platform || options?.platform || 'tiktok';
  
  // 1. Hook - Strategy-aware if intelligence available
  let hook = '';
  let hookStyle = 'default';
  
  if (intelligence) {
    // Use strategy-aware hook generation
    const strategyHook = generateStrategyAwareHook(
      platform,
      user.niche,
      trend.title,
      intelligence
    );
    hook = strategyHook.hook;
    hookStyle = strategyHook.style;
  } else {
    // Fallback to original logic
    if (trend.hook_style?.toLowerCase().includes('question')) {
      hook = `Did you know? ${trend.title}`;
    } else if (trend.hook_style?.toLowerCase().includes('pov')) {
      hook = `POV: You're about to discover how ${user.business_name} does it in ${user.niche}.`;
    } else if (trend.hook_style?.toLowerCase().includes('number')) {
      hook = `Top 3 ways to win in ${user.niche}`;
    } else {
      hook = trend.title;
    }
  }

  // 2. Value Point - Enhanced with problem-solution framing for underperforming platforms
  let value_point = '';
  const captionStrategy = generateCaptionStrategy(platform, user.niche, intelligence);
  
  if (captionStrategy.framingStyle === 'problem-solution') {
    value_point = `Struggling with ${user.niche}? Here's the solution: ${trend.title}`;
  } else if (captionStrategy.framingStyle === 'community-building') {
    value_point = `Join thousands of ${user.niche} enthusiasts who've discovered: ${trend.title}`;
  } else {
    value_point = `Here's a key insight for anyone in ${user.niche}: ${trend.title}`;
  }

  // 3. Authority Line - Enhanced based on hook style
  let authority_line = '';
  if (hookStyle === 'educational-authority') {
    authority_line = `Expert insights from ${user.business_name}, leaders in ${user.niche}.`;
  } else {
    authority_line = `Brought to you by ${user.business_name}, trusted in ${user.niche}.`;
  }

  // 4. CTA - Strategy-aware
  const CTA = intelligence 
    ? generateStrategyCTA(platform, user.business_name, intelligence)
    : `Ready to level up your ${user.niche}? Connect with ${user.business_name} today!`;

  // 5. Caption - Enhanced with strategy
  let emotional_driver = '';
  let benefit = '';
  let soft_cta = '';

  if (captionStrategy.ctaType === 'value-driven') {
    emotional_driver = 'Transform your results.';
    benefit = `${user.business_name} shows you proven ${user.niche} strategies.`;
    soft_cta = 'Save this for later!';
  } else if (captionStrategy.ctaType === 'engagement-driven') {
    emotional_driver = 'Join the movement.';
    benefit = `See why ${user.business_name} is the go-to for ${user.niche}.`;
    soft_cta = 'Follow for more!';
  } else {
    emotional_driver = 'Unlock your potential.';
    benefit = `See how ${user.business_name} helps you succeed in ${user.niche}.`;
    soft_cta = 'Follow for more insights!';
  }

  // 6. Hashtags - Include niche, trend, platform-specific, and broad tags
  const nicheTags = generateNicheKeywords(user.niche).map(t => `#${t.replace(/\s+/g, '')}`);
  const trendTags = (trend.hashtags || []).map(t => t.startsWith('#') ? t : `#${t}`);
  const platformTags = captionStrategy.platformSpecificTags || [];
  const broadTags = ['#marketing', '#growth', '#success'];
  
  const hashtags = Array.from(new Set([
    ...nicheTags.slice(0, 2),
    ...platformTags.slice(0, 2),
    ...trendTags.slice(0, 2),
    ...broadTags.slice(0, 2),
  ])).slice(0, 8);

  const caption = `${emotional_driver} ${benefit} ${soft_cta} ${hashtags.join(' ')}`;

  return {
    hook,
    hookStyle,
    value_point,
    authority_line,
    CTA,
    caption,
    hashtags,
    strategyApplied: !!intelligence,
    platform,
  };
}
