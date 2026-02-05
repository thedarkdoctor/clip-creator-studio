 // src/services/contentGenerationPipeline.ts
 /**
  * Master Content Generation Pipeline
  * Orchestrates the full automated content creation workflow
  * from trend selection through final video render job
  */
 
 import { supabase } from '@/integrations/supabase/client';
 import { fetchMarketingIntelligence, generateContentStrategy, type MarketingIntelligence } from './marketingStrategyService';
 import { generateBrandAwareScript } from '@/lib/generateBrandAwareScript';
 
 // ============================================================================
 // TYPES
 // ============================================================================
 
 export interface UserContext {
   id: string;
   business_name: string;
   niche: string;
 }
 
 export interface ContentGenerationResult {
   success: boolean;
   trendId: string;
   platform: string;
   script?: GeneratedScript;
   assets?: ContentAssets;
   jobId?: string;
   error?: string;
 }
 
 export interface GeneratedScript {
   hook: string;
   hookStyle: string;
   value_point: string;
   authority_line: string;
   CTA: string;
   caption: string;
   hashtags: string[];
   fullScript: string;
   estimatedDuration: number;
 }
 
 export interface ContentAssets {
   voiceover_url?: string;
   video_clips: string[];
   music_url?: string;
   thumbnail_url?: string;
 }
 
 export interface VideoJob {
   id: string;
   user_id: string;
   trend_id: string;
   platform: string;
   script: GeneratedScript;
   assets: ContentAssets;
   caption: string;
   hashtags: string[];
   status: 'queued' | 'processing' | 'complete' | 'failed';
   created_at: string;
 }
 
 export interface PipelineProgress {
   stage: string;
   current: number;
   total: number;
   message: string;
 }
 
 // ============================================================================
 // VALIDATION
 // ============================================================================
 
 /**
  * Validate user context before generation
  * Ensures business_name, niche, and id exist
  */
 export function validateUserContext(user: Partial<UserContext>): { valid: boolean; error?: string } {
   if (!user.id) {
     return { valid: false, error: 'User ID is required. Please ensure you are logged in.' };
   }
   
   if (!user.business_name || user.business_name.trim() === '') {
     return { valid: false, error: 'Business profile incomplete. Please update your business name in Lynkscope.' };
   }
   
   if (!user.niche || user.niche.trim() === '') {
     return { valid: false, error: 'Business profile incomplete. Please update your niche in Lynkscope.' };
   }
   
   return { valid: true };
 }
 
 // ============================================================================
 // TREND SELECTION (Strategy-Aware)
 // ============================================================================
 
 /**
  * Select optimal trends based on user niche and marketing intelligence
  */
 export async function selectOptimalTrends(
   userId: string,
   niche: string,
   intelligence: MarketingIntelligence | null,
   maxTrends: number = 5
 ): Promise<any[]> {
   console.log('[Pipeline] Selecting optimal trends for niche:', niche);
   
   // Get trends with strategy awareness
   const { data: trends, error } = await (supabase as any)
     .from('trends_v2')
     .select(`
       *,
       trend_metrics (views, likes, engagement_rate),
       trend_hashtags (hashtag)
     `)
     .eq('is_active', true)
     .order('trend_score', { ascending: false })
     .limit(20);
   
   if (error || !trends) {
     console.error('[Pipeline] Failed to fetch trends:', error);
     return [];
   }
   
   // Apply strategy boost if intelligence available
   const scoredTrends = trends.map((trend: any) => {
     let boost = 0;
     
     // Boost for underperforming platforms
     if (intelligence?.underperforming_platforms?.includes(trend.platform.toLowerCase())) {
       boost += 0.3;
     }
     
     // Boost for niche relevance
     const nicheKeywords = getNicheKeywords(niche);
     const titleLower = trend.title.toLowerCase();
     const nicheMatches = nicheKeywords.filter(kw => titleLower.includes(kw.toLowerCase()));
     if (nicheMatches.length > 0) {
       boost += Math.min(0.2, nicheMatches.length * 0.1);
     }
     
     return {
       ...trend,
       adjustedScore: trend.trend_score * (1 + boost),
       strategyBoost: boost,
     };
   });
   
   // Sort by adjusted score and return top trends
   scoredTrends.sort((a: any, b: any) => b.adjustedScore - a.adjustedScore);
   
   console.log('[Pipeline] Selected', Math.min(maxTrends, scoredTrends.length), 'trends');
   return scoredTrends.slice(0, maxTrends);
 }
 
 // ============================================================================
 // SCRIPT GENERATION (OpenAI)
 // ============================================================================
 
 /**
  * Generate a full video script using OpenAI via Edge Function
  */
 export async function generateVideoScript(
   userContext: UserContext,
   trend: any,
   intelligence: MarketingIntelligence | null
 ): Promise<GeneratedScript> {
   console.log('[Pipeline] Generating script for trend:', trend.title);
   
   // Use brand-aware script generator
   const baseScript = await generateBrandAwareScript(
     { business_name: userContext.business_name, niche: userContext.niche },
     {
       format_type: trend.format_type || 'other',
       hook_style: trend.hook_style || 'question',
       title: trend.title,
       hashtags: (trend.trend_hashtags || []).map((h: any) => h.hashtag),
       platform: trend.platform,
     },
     { intelligence, platform: trend.platform }
   );
   
   // Build full script narrative (30-45 seconds)
   const fullScript = buildFullScriptNarrative(
     baseScript,
     userContext,
     trend
   );
   
   return {
     hook: baseScript.hook,
     hookStyle: baseScript.hookStyle,
     value_point: baseScript.value_point,
     authority_line: baseScript.authority_line,
     CTA: baseScript.CTA,
     caption: baseScript.caption,
     hashtags: baseScript.hashtags,
     fullScript,
     estimatedDuration: estimateScriptDuration(fullScript),
   };
 }
 
 /**
  * Build a complete 30-45 second script narrative
  */
 function buildFullScriptNarrative(
   baseScript: any,
   userContext: UserContext,
   trend: any
 ): string {
   const parts = [
     // Hook (0-5 seconds)
     baseScript.hook,
     '',
     // Value point (5-25 seconds)
     baseScript.value_point,
     '',
     // Authority line (25-35 seconds)
     baseScript.authority_line,
     '',
     // CTA (35-45 seconds)
     baseScript.CTA,
   ];
   
   return parts.join('\n');
 }
 
 /**
  * Estimate script duration based on word count
  * Average speaking rate: ~150 words per minute
  */
 function estimateScriptDuration(script: string): number {
   const wordCount = script.split(/\s+/).length;
   const durationSeconds = (wordCount / 150) * 60;
   return Math.round(Math.max(15, Math.min(60, durationSeconds)));
 }
 
 // ============================================================================
 // STOCK FOOTAGE (Pexels)
 // ============================================================================
 
 /**
  * Fetch niche-relevant stock video clips from Pexels
  */
 export async function fetchStockFootage(
   niche: string,
   scriptDuration: number,
   clipCount: number = 8
 ): Promise<string[]> {
   console.log('[Pipeline] Fetching stock footage for niche:', niche);
   
   const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY;
   
   // If no API key, return empty (will be handled in edge function)
   if (!PEXELS_API_KEY) {
     console.log('[Pipeline] No Pexels API key, footage will be fetched server-side');
     return [];
   }
   
   const searchQueries = [
     `${niche} lifestyle`,
     `${niche} work`,
     `${niche} tools`,
     `${niche} people`,
     `${niche} professional`,
     `modern ${niche}`,
     `${niche} success`,
     niche,
   ];
   
   const clips: string[] = [];
   
   for (const query of searchQueries) {
     if (clips.length >= clipCount) break;
     
     try {
       const response = await fetch(
         `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait`,
         {
           headers: { Authorization: PEXELS_API_KEY },
         }
       );
       
       if (response.ok) {
         const data = await response.json();
         if (data.videos?.[0]?.video_files?.[0]?.link) {
           clips.push(data.videos[0].video_files[0].link);
         }
       }
     } catch (error) {
       console.warn('[Pipeline] Pexels fetch failed for query:', query);
     }
   }
   
   console.log('[Pipeline] Fetched', clips.length, 'video clips');
   return clips;
 }
 
 // ============================================================================
 // VOICEOVER (ElevenLabs - via Edge Function)
 // ============================================================================
 
 /**
  * Generate voiceover using ElevenLabs via Edge Function
  */
 export async function generateVoiceover(
   script: string,
   niche: string
 ): Promise<string | null> {
   console.log('[Pipeline] Generating voiceover for script');
   
   // Select voice based on niche
   const voiceId = selectVoiceForNiche(niche);
   
   try {
     const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
       body: {
         text: script,
         voiceId,
         model_id: 'eleven_multilingual_v2',
       },
     });
     
     if (error) {
       console.error('[Pipeline] Voiceover generation failed:', error);
       return null;
     }
     
     return data?.audio_url || null;
   } catch (error) {
     console.error('[Pipeline] Voiceover error:', error);
     return null;
   }
 }
 
 /**
  * Select appropriate voice based on niche
  */
 function selectVoiceForNiche(niche: string): string {
   const nicheVoiceMap: Record<string, string> = {
     fitness: 'TX3LPaxmHKxFdv7VOQHJ', // Liam - energetic
     beauty: 'FGY2WhTYpPnrIDTdsKH5', // Laura - warm
     marketing: 'JBFqnCBsd6RMkjVDRZzb', // George - professional
     finance: 'JBFqnCBsd6RMkjVDRZzb', // George - professional
     tech: 'IKne3meq5aSn9XLyUdCD', // Charlie - clear
     lifestyle: 'EXAVITQu4vr4xnSDxMaL', // Sarah - friendly
     default: 'EXAVITQu4vr4xnSDxMaL', // Sarah - friendly
   };
   
   return nicheVoiceMap[niche.toLowerCase()] || nicheVoiceMap.default;
 }
 
 // ============================================================================
 // BACKGROUND MUSIC (Jamendo)
 // ============================================================================
 
 /**
  * Fetch royalty-free background music based on niche mood
  */
 export async function fetchBackgroundMusic(niche: string): Promise<string | null> {
   console.log('[Pipeline] Fetching background music for niche:', niche);
   
   const JAMENDO_CLIENT_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID;
   
   if (!JAMENDO_CLIENT_ID) {
     console.log('[Pipeline] No Jamendo client ID, music will be fetched server-side');
     return null;
   }
   
   const moodMap: Record<string, string> = {
     fitness: 'motivational',
     beauty: 'relaxed',
     marketing: 'corporate',
     finance: 'corporate',
     tech: 'electronic',
     lifestyle: 'upbeat',
     default: 'upbeat',
   };
   
   const mood = moodMap[niche.toLowerCase()] || moodMap.default;
   
   try {
     const response = await fetch(
       `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=1&tags=${mood},instrumental`
     );
     
     if (response.ok) {
       const data = await response.json();
       return data.results?.[0]?.audio || null;
     }
   } catch (error) {
     console.warn('[Pipeline] Jamendo fetch failed:', error);
   }
   
   return null;
 }
 
 // ============================================================================
 // VIDEO JOB CREATION
 // ============================================================================
 
 /**
  * Create a video render job entry
  */
 export async function createVideoJob(
   userId: string,
   trendId: string,
   platform: string,
   script: GeneratedScript,
   assets: ContentAssets
 ): Promise<string | null> {
   console.log('[Pipeline] Creating video job for trend:', trendId);
   
   // Store job in content_jobs table
   const { data, error } = await (supabase as any)
     .from('content_jobs')
     .insert({
       user_id: userId,
       status: 'queued',
       progress: {
         trends_discovered: 1,
         scripts_generated: 1,
         videos_created: 0,
         scheduled: 0,
         script: script,
         assets: assets,
         trend_id: trendId,
         platform: platform,
       },
       company_name: script.caption,
       niche: platform,
       posting_frequency: 'once',
     })
     .select('id')
     .single();
   
   if (error) {
     console.error('[Pipeline] Failed to create video job:', error);
     return null;
   }
   
   return data?.id || null;
 }
 
 // ============================================================================
 // MASTER PIPELINE
 // ============================================================================
 
 /**
  * Generate full content batch for a user
  * Main orchestration function
  */
 export async function generateFullContentBatch(
   userId: string,
   businessName: string,
   niche: string,
   options?: {
     maxTrends?: number;
     platforms?: string[];
     onProgress?: (progress: PipelineProgress) => void;
   }
 ): Promise<ContentGenerationResult[]> {
   const results: ContentGenerationResult[] = [];
   const onProgress = options?.onProgress || (() => {});
   
   console.log('[Pipeline] Starting full content batch generation');
   console.log('[Pipeline] User:', { userId, businessName, niche });
   
   // Validate user context
   const validation = validateUserContext({ id: userId, business_name: businessName, niche });
   if (!validation.valid) {
     console.error('[Pipeline] Validation failed:', validation.error);
     return [{
       success: false,
       trendId: '',
       platform: '',
       error: validation.error,
     }];
   }
   
   const userContext: UserContext = {
     id: userId,
     business_name: businessName,
     niche,
   };
   
   try {
     // Step 1: Fetch marketing intelligence
     onProgress({ stage: 'intelligence', current: 0, total: 1, message: 'Loading marketing intelligence...' });
     const intelligence = await fetchMarketingIntelligence(userId);
     console.log('[Pipeline] Marketing intelligence loaded:', !!intelligence);
     
     // Step 2: Select optimal trends
     onProgress({ stage: 'trends', current: 0, total: 1, message: 'Selecting optimal trends...' });
     const trends = await selectOptimalTrends(userId, niche, intelligence, options?.maxTrends || 5);
     
     if (trends.length === 0) {
       return [{
         success: false,
         trendId: '',
         platform: '',
         error: 'No trends available. Please run trend discovery first.',
       }];
     }
     
     console.log('[Pipeline] Selected', trends.length, 'trends for content generation');
     
     // Step 3: Generate content for each trend
     for (let i = 0; i < trends.length; i++) {
       const trend = trends[i];
       
       onProgress({
         stage: 'generation',
         current: i + 1,
         total: trends.length,
         message: `Generating content ${i + 1}/${trends.length}: ${trend.title.substring(0, 30)}...`,
       });
       
       try {
         // Generate script
         const script = await generateVideoScript(userContext, trend, intelligence);
         console.log('[Pipeline] Script generated for trend:', trend.id);
         
         // Fetch assets (in parallel)
         const [videoClips, musicUrl] = await Promise.all([
           fetchStockFootage(niche, script.estimatedDuration),
           fetchBackgroundMusic(niche),
         ]);
         
         const assets: ContentAssets = {
           video_clips: videoClips,
           music_url: musicUrl || undefined,
         };
         
         // Create video job
         const jobId = await createVideoJob(
           userId,
           trend.id,
           trend.platform,
           script,
           assets
         );
         
         results.push({
           success: true,
           trendId: trend.id,
           platform: trend.platform,
           script,
           assets,
           jobId: jobId || undefined,
         });
         
         console.log('[Pipeline] Content generated for trend:', trend.id);
       } catch (error) {
         console.error('[Pipeline] Failed to generate content for trend:', trend.id, error);
         results.push({
           success: false,
           trendId: trend.id,
           platform: trend.platform,
           error: error instanceof Error ? error.message : 'Unknown error',
         });
       }
     }
     
     onProgress({
       stage: 'complete',
       current: trends.length,
       total: trends.length,
       message: `Generated ${results.filter(r => r.success).length} videos successfully!`,
     });
     
     console.log('[Pipeline] Batch generation complete:', {
       total: results.length,
       successful: results.filter(r => r.success).length,
       failed: results.filter(r => !r.success).length,
     });
     
     return results;
   } catch (error) {
     console.error('[Pipeline] Pipeline failed:', error);
     return [{
       success: false,
       trendId: '',
       platform: '',
       error: error instanceof Error ? error.message : 'Pipeline failed unexpectedly',
     }];
   }
 }
 
 /**
  * Check if automation should trigger based on conditions
  */
 export async function checkAutomationTrigger(userId: string): Promise<{
   shouldTrigger: boolean;
   reason: string;
 }> {
   // Check for new trends
   const { data: recentTrends } = await (supabase as any)
     .from('trends_v2')
     .select('id, created_at')
     .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // Last 6 hours
     .limit(1);
   
   if (recentTrends?.length > 0) {
     return { shouldTrigger: true, reason: 'New trends detected' };
   }
   
   // Check for updated marketing intelligence
   const { data: recentIntel } = await (supabase as any)
     .from('marketing_intelligence')
     .select('updated_at')
     .eq('user_id', userId)
     .gte('updated_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
     .single();
   
   if (recentIntel) {
     return { shouldTrigger: true, reason: 'Marketing intelligence updated' };
   }
   
   return { shouldTrigger: false, reason: 'No automation triggers detected' };
 }
 
 // ============================================================================
 // HELPERS
 // ============================================================================
 
 function getNicheKeywords(niche: string | null): string[] {
   if (!niche) return [];
   
   const nicheKeywordMap: Record<string, string[]> = {
     fitness: ['workout', 'gym', 'exercise', 'muscle', 'training', 'fit', 'health'],
     marketing: ['brand', 'growth', 'strategy', 'content', 'social', 'business'],
     beauty: ['makeup', 'skincare', 'beauty', 'cosmetics', 'glow', 'routine'],
     fashion: ['outfit', 'style', 'fashion', 'trend', 'wear', 'look'],
     food: ['recipe', 'cook', 'food', 'meal', 'kitchen', 'delicious'],
     comedy: ['funny', 'humor', 'joke', 'laugh', 'comedy'],
     dance: ['dance', 'choreography', 'moves', 'music'],
     gaming: ['game', 'gaming', 'play', 'gamer', 'stream'],
     lifestyle: ['life', 'daily', 'routine', 'living', 'wellness'],
     education: ['learn', 'teach', 'study', 'knowledge', 'tips'],
     tech: ['technology', 'software', 'app', 'digital', 'innovation'],
     finance: ['money', 'investing', 'wealth', 'financial', 'budget'],
   };
   
   return nicheKeywordMap[niche.toLowerCase()] || [];
 }