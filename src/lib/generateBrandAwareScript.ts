// src/lib/generateBrandAwareScript.ts
import { generateNicheKeywords } from './generateNicheKeywords';

/**
 * Generate a brand-aware, niche-personalized script for a marketing video.
 * @param user { business_name: string, niche: string }
 * @param trend { format_type: string, hook_style: string, title: string, hashtags: string[] }
 */
export async function generateBrandAwareScript(user: { business_name: string, niche: string }, trend: { format_type: string, hook_style: string, title: string, hashtags: string[] }) {
  // 1. Hook
  let hook = '';
  if (trend.hook_style.toLowerCase().includes('question')) {
    hook = `Did you know? ${trend.title}`;
  } else if (trend.hook_style.toLowerCase().includes('pov')) {
    hook = `POV: You're about to discover how ${user.business_name} does it in ${user.niche}.`;
  } else if (trend.hook_style.toLowerCase().includes('number')) {
    hook = `Top 3 ways to win in ${user.niche}`;
  } else {
    hook = trend.title;
  }

  // 2. Value Point
  const value_point = `Here's a key insight for anyone in ${user.niche}: ${trend.title}`;

  // 3. Authority Line
  const authority_line = `Brought to you by ${user.business_name}, trusted in ${user.niche}.`;

  // 4. CTA
  const CTA = `Ready to level up your ${user.niche}? Connect with ${user.business_name} today!`;

  // 5. Caption
  const emotional_driver = 'Unlock your potential.';
  const benefit = `See how ${user.business_name} helps you succeed in ${user.niche}.`;
  const soft_cta = 'Follow for more insights!';
  // 6. Hashtags
  const nicheTags = generateNicheKeywords(user.niche).map(t => `#${t.replace(/\s+/g, '')}`);
  const trendTags = (trend.hashtags || []).map(t => t.startsWith('#') ? t : `#${t}`);
  const broadTags = ['#marketing', '#growth', '#success'];
  const hashtags = Array.from(new Set([...nicheTags, ...trendTags, ...broadTags])).slice(0, 8);

  const caption = `${emotional_driver} ${benefit} ${soft_cta} ${hashtags.join(' ')}`;

  return {
    hook,
    value_point,
    authority_line,
    CTA,
    caption,
    hashtags,
  };
}
