// Supabase Edge Function: script-generation
// Generates video scripts using OpenAI GPT-4 with intelligent fallback

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScriptRequest {
  trend_title: string;
  trend_description?: string;
  trend_hashtags?: string[];
  platform: string;
  business_name?: string;
  niche?: string;
  format_type?: string;
  hook_style?: string;
}

interface ScriptResponse {
  hook: string;
  hookStyle: string;
  valuePoint: string;
  authorityLine: string;
  cta: string;
  caption: string;
  hashtags: string[];
  fullScript: string;
  estimatedDuration: number;
  _fallbackUsed?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const {
      trend_title,
      trend_description,
      trend_hashtags,
      platform,
      business_name,
      niche,
      format_type,
      hook_style,
    }: ScriptRequest = await req.json();

    /**
 * Build intelligent fallback script using trend metadata
 * Activates when OpenAI fails to ensure pipeline continues
 */
function buildFallbackScript(data: ScriptRequest): ScriptResponse {
  console.warn('[ScriptGen] ⚠️ FALLBACK MODE ACTIVATED - Using trend-based script generation');

  const {
    trend_title,
    trend_description,
    trend_hashtags,
    platform,
    business_name,
    niche,
    format_type,
    hook_style,
  } = data;

  // Extract keywords from title and description
  const keywords = extractKeywords(trend_title, trend_description);
  
  // Generate engaging hook based on hook style
  const hook = generateHook(trend_title, hook_style, keywords);
  
  // Generate talking points from trend data
  const talkingPoints = generateTalkingPoints(trend_title, trend_description, keywords, niche);
  
  // Generate niche-appropriate CTA
  const cta = generateCallToAction(niche, business_name, platform);
  
  // Generate authority line
  const authorityLine = generateAuthorityLine(business_name, niche);
  
  // Build caption
  const caption = generateCaption(trend_title, trend_description, business_name);
  
  // Generate hashtags
  const hashtags = generateHashtags(keywords, niche, platform, trend_hashtags);
  
  // Build full script
  const fullScript = buildFullScriptText(hook, talkingPoints, authorityLine, cta);
  
  // Estimate duration (3-4 words per second)
  const wordCount = fullScript.split(/\s+/).length;
  const estimatedDuration = Math.round(Math.max(15, Math.min(60, (wordCount / 3.5))));

  return {
    hook,
    hookStyle: hook_style || 'trending',
    valuePoint: talkingPoints.join(' '),
    authorityLine,
    cta,
    caption,
    hashtags,
    fullScript,
    estimatedDuration,
    _fallbackUsed: true,
  };
}

/**
 * Extract relevant keywords from text
 */
function extractKeywords(title: string, description?: string): string[] {
  const text = `${title} ${description || ''}`.toLowerCase();
  const words = text.split(/\s+/).filter(word => word.length > 3);
  
  // Remove common words
  const stopWords = ['this', 'that', 'with', 'from', 'have', 'been', 'will', 'your', 'more', 'about'];
  const keywords = words.filter(word => !stopWords.includes(word));
  
  // Return unique keywords, max 5
  return [...new Set(keywords)].slice(0, 5);
}

/**
 * Generate engaging hook based on trend and style
 */
function generateHook(title: string, style?: string, keywords: string[] = []): string {
  const hookTemplates = {
    question: [
      `Did you know about ${title.toLowerCase()}?`,
      `Want to know the secret behind ${title.toLowerCase()}?`,
      `Have you tried this yet?`,
    ],
    statement: [
      `Everyone is talking about ${title.toLowerCase()}`,
      `This is what you need to know about ${title.toLowerCase()}`,
      `${title} is changing everything`,
    ],
    trending: [
      `🔥 ${title} is going viral for a reason`,
      `This ${title.toLowerCase()} trend is everywhere right now`,
      `You need to see this ${title.toLowerCase()}`,
    ],
    curiosity: [
      `The truth about ${title.toLowerCase()} that nobody talks about`,
      `What they don't tell you about ${title.toLowerCase()}`,
      `Here's what you're missing about ${title.toLowerCase()}`,
    ],
  };

  const templates = hookTemplates[style as keyof typeof hookTemplates] || hookTemplates.trending;
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate talking points from trend data
 */
function generateTalkingPoints(
  title: string,
  description?: string,
  keywords: string[] = [],
  niche?: string
): string[] {
  const points: string[] = [];

  // Point 1: Main topic intro
  points.push(`Let me break down ${title.toLowerCase()} for you.`);

  // Point 2: Value proposition
  if (description && description.length > 20) {
    const summary = description.substring(0, 100);
    points.push(summary.endsWith('.') ? summary : summary + '...');
  } else if (keywords.length > 0) {
    points.push(`It's all about ${keywords.slice(0, 3).join(', ')}.`);
  } else {
    points.push(`This is exactly what you need to know.`);
  }

  // Point 3: Niche-specific insight
  if (niche) {
    const nicheInsights: Record<string, string> = {
      fitness: 'This can transform your workout routine completely.',
      business: 'Smart businesses are already using this strategy.',
      tech: 'The technology behind this is absolutely game-changing.',
      marketing: 'This is what top marketers are doing right now.',
      beauty: 'Your skincare routine needs this upgrade.',
      finance: 'This could change how you manage your money.',
      food: 'Food lovers are obsessed with this for good reason.',
      lifestyle: 'This will upgrade your daily routine.',
      education: 'Students everywhere are benefiting from this.',
      fashion: 'Fashion experts are all talking about this trend.',
    };
    
    points.push(nicheInsights[niche.toLowerCase()] || 'This is a game-changer in your space.');
  }

  return points;
}

/**
 * Generate niche-appropriate call to action
 */
function generateCallToAction(niche?: string, businessName?: string, platform?: string): string {
  const ctaMap: Record<string, string[]> = {
    fitness: [
      'Save this for your next workout!',
      'Follow for daily fitness tips!',
      'Try this and tag me in your results!',
    ],
    business: [
      'Follow for smarter business strategies!',
      'Save this for your next team meeting!',
      'Share this with your entrepreneur friends!',
    ],
    tech: [
      'Follow for daily tech insights!',
      'Save this for later reference!',
      'Share this with fellow tech enthusiasts!',
    ],
    marketing: [
      'Follow for proven marketing strategies!',
      'Save this for your next campaign!',
      'Try this in your business today!',
    ],
    beauty: [
      'Follow for more beauty secrets!',
      'Save this for your next routine!',
      'Tag a friend who needs this!',
    ],
    default: [
      'Follow for more content like this!',
      'Save this and share with friends!',
      'Drop a ❤️ if this helped you!',
    ],
  };

  const businessSuffix = businessName ? ` Follow ${businessName} for more!` : '';
  const ctas = ctaMap[niche?.toLowerCase() || 'default'] || ctaMap.default;
  const selectedCta = ctas[Math.floor(Math.random() * ctas.length)];

  return selectedCta + businessSuffix;
}

/**
 * Generate authority line
 */
function generateAuthorityLine(businessName?: string, niche?: string): string {
  if (businessName) {
    return `${businessName} has helped thousands succeed in ${niche || 'their journey'}.`;
  }

  const authorityLines = [
    'Thousands have already transformed their approach using this.',
    'This strategy has proven results across the industry.',
    'Top performers are already implementing this.',
    'The results speak for themselves.',
  ];

  return authorityLines[Math.floor(Math.random() * authorityLines.length)];
}

/**
 * Generate caption for social media post
 */
function generateCaption(title: string, description?: string, businessName?: string): string {
  const emoji = ['🔥', '✨', '💡', '🚀', '⚡'][Math.floor(Math.random() * 5)];
  
  let caption = `${emoji} ${title}`;
  
  if (description && description.length > 0) {
    const shortDesc = description.substring(0, 80);
    caption += `

${shortDesc}${description.length > 80 ? '...' : ''}`;
  }
  
  if (businessName) {
    caption += `

📍 ${businessName}`;
  }

  return caption;
}

/**
 * Generate relevant hashtags
 */
function generateHashtags(
  keywords: string[] = [],
  niche?: string,
  platform?: string,
  trendHashtags?: string[]
): string[] {
  const hashtags: string[] = [];

  // Add trend hashtags if provided
  if (trendHashtags && trendHashtags.length > 0) {
    hashtags.push(...trendHashtags.slice(0, 3));
  }

  // Add keyword-based hashtags
  keywords.slice(0, 2).forEach(keyword => {
    const clean = keyword.replace(/[^a-z0-9]/gi, '');
    if (clean.length > 2) {
      hashtags.push(`#${clean}`);
    }
  });

  // Add niche hashtag
  if (niche) {
    hashtags.push(`#${niche.replace(/\s+/g, '')}`);
  }

  // Add platform-specific hashtags
  const platformHashtags: Record<string, string[]> = {
    'TikTok': ['#fyp', '#foryou', '#viral'],
    'Instagram': ['#reels', '#instagram', '#viral'],
    'YouTube': ['#shorts', '#youtube', '#viral'],
  };

  if (platform && platformHashtags[platform]) {
    hashtags.push(...platformHashtags[platform]);
  } else {
    hashtags.push('#trending', '#viral', '#fyp');
  }

  // Remove duplicates and limit to 7 hashtags
  return [...new Set(hashtags)].slice(0, 7);
}

/**
 * Build full script text from components
 */
function buildFullScriptText(
  hook: string,
  talkingPoints: string[],
  authorityLine: string,
  cta: string
): string {
  return [
    hook,
    '',
    ...talkingPoints,
    '',
    authorityLine,
    '',
    cta,
  ].join('
');
}

/**
 * Attempt OpenAI generation with automatic fallback
 */
async function generateScriptWithFallback(data: ScriptRequest): Promise<ScriptResponse> {
  // If no API key, use fallback immediately
  if (!OPENAI_API_KEY) {
    console.warn('[ScriptGen] No OpenAI API key - using fallback');
    return buildFallbackScript(data);
  }

  try {
    const {
      trend_title,
      trend_description,
      trend_hashtags,
      platform,
      business_name,
      niche,
      format_type,
      hook_style,
    } = data;

    console.log('[ScriptGen] Attempting OpenAI generation for:', trend_title);
    
    // Create prompt for OpenAI
    const prompt = `Create a viral short-form video script for ${platform} based on this trend:

Title: ${trend_title}
${trend_description ? `Description: ${trend_description}` : ''}
${trend_hashtags ? `Hashtags: ${trend_hashtags.join(', ')}` : ''}

Business: ${business_name || 'A business'}
Niche: ${niche || 'general'}
Format: ${format_type || 'standard'}
Hook Style: ${hook_style || 'engaging'}

Generate a script with these components:
1. Hook (3-5 seconds) - Grab attention immediately
2. Value Point (15-20 seconds) - Deliver main message
3. Authority Line (5-10 seconds) - Build credibility
4. Call-to-Action (3-5 seconds) - Direct next steps
5. Caption - Social media post caption
6. Hashtags - 5-7 relevant hashtags

Make it conversational, engaging, and optimized for ${platform}.

Return as JSON with these fields:
{
  "hook": "...",
  "hookStyle": "...",
  "valuePoint": "...",
  "authorityLine": "...",
  "cta": "...",
  "caption": "...",
  "hashtags": ["...", "..."],
  "fullScript": "...",
  "estimatedDuration": 30
}`;

    // Call OpenAI API - use gpt-3.5-turbo for wider compatibility with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert social media content creator specializing in viral short-form video scripts. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      console.error('[ScriptGen] OpenAI API error:', error);
      throw new Error(`OpenAI API returned ${response.status}: ${error}`);
    }

    const responseData = await response.json();
    const scriptContent = responseData.choices[0]?.message?.content;

    if (!scriptContent) {
       throw new Error('No script content in OpenAI response');
    }

    // Parse JSON response
    let script: ScriptResponse;
    try {
      script = JSON.parse(scriptContent);
    console.log('[ScriptGen] ✅ OpenAI script generated successfully');
      return script;
    } catch (parseError) {
      console.warn('[ScriptGen] Failed to parse OpenAI JSON, using content as-is');
      // If not valid JSON, create structured response from text
      script = {
        hook: scriptContent.split('\n')[0] || trend_title,
        hookStyle: hook_style || 'trending',
        valuePoint: scriptContent,
        authorityLine: `Follow ${business_name || 'us'} for more!`,
        cta: 'Like and subscribe!',
        caption: trend_title,
        hashtags: trend_hashtags || ['#trending', '#viral', '#fyp'],
        fullScript: scriptContent,
        estimatedDuration: 30,
      };
   return script;
    }

  } catch (error: any) {
    // Log the error but don't fail
    console.error('[ScriptGen] OpenAI generation failed:', error.message);
    console.warn('[ScriptGen] Falling back to trend-based generation');
    
    // Use fallback script generation
    return buildFallbackScript(data);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const data: ScriptRequest = await req.json();

    console.log('[ScriptGen] Script generation request:', data.trend_title);

    // Generate script with automatic fallback
    const script = await generateScriptWithFallback(data);

    // Log if fallback was used
    if (script._fallbackUsed) {
      console.warn('[ScriptGen] ⚠️ Fallback script used - pipeline continues normally');
    }

    // Always return 200 with valid script
    return new Response(JSON.stringify(script), {
       status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
   // This should rarely happen as we have fallback, but just in case
    console.error('[ScriptGen] Fatal error:', error);
    
    // Return a minimal valid script to keep pipeline alive
    const emergencyScript: ScriptResponse = {
      hook: '🔥 Check this out!',
      hookStyle: 'trending',
      valuePoint: 'Amazing content coming your way.',
      authorityLine: 'Follow for more great content!',
      cta: 'Like and subscribe for more!',
      caption: 'New content alert! 🎬',
      hashtags: ['#trending', '#viral', '#fyp', '#content'],
      fullScript: '🔥 Check this out!

Amazing content coming your way.

Follow for more great content!

Like and subscribe for more!',
      estimatedDuration: 20,
      _fallbackUsed: true,
    };

    return new Response(JSON.stringify(emergencyScript), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
