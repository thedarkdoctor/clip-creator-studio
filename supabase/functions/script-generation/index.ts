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

    console.log('[ScriptGen] Generating script for:', trend_title);

    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

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

    // Call OpenAI API - use gpt-3.5-turbo for wider compatibility
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
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[ScriptGen] OpenAI API error:', error);
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const scriptContent = data.choices[0]?.message?.content;

    if (!scriptContent) {
      throw new Error('No script generated');
    }

    // Parse JSON response
    let script;
    try {
      script = JSON.parse(scriptContent);
    } catch {
      // If not valid JSON, create structured response from text
      script = {
        hook: scriptContent.split('\n')[0],
        hookStyle: hook_style || 'trending',
        valuePoint: scriptContent,
        authorityLine: `Follow ${business_name || 'us'} for more!`,
        cta: 'Like and subscribe!',
        caption: trend_title,
        hashtags: trend_hashtags || ['#trending', '#viral', '#fyp'],
        fullScript: scriptContent,
        estimatedDuration: 30,
      };
    }

    console.log('[ScriptGen] Script generated successfully');

    return new Response(JSON.stringify(script), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[ScriptGen] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Script generation failed' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
