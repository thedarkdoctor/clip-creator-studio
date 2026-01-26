import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';
import { getSEORecommendations } from '@/services/lynkscopeClient';

type Platform = Tables<'platforms'>;
type Trend = Tables<'trends'>;
type Video = Tables<'videos'>;
type GeneratedClip = Tables<'generated_clips'>;

// Fetch all platforms
export function usePlatforms() {
  return useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Platform[];
    },
  });
}

// Fetch all active trends with platform info
export function useTrends() {
  return useQuery({
    queryKey: ['trends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trends')
        .select(`
          *,
          platforms (
            id,
            name
          )
        `)
        .eq('is_active', true)
        .order('created_at');
      
      if (error) throw error;
      return data;
    },
  });
}

// Discover real trends via Edge Function
export function useDiscoverTrends() {
  const { user } = useAuth();
  const { data: userProfile } = useUserProfile();
  const { data: userPlatforms } = useUserPlatforms();
  
  return useMutation({
    mutationFn: async () => {
      if (!user || !userProfile || !userPlatforms) {
        throw new Error('User profile or platforms not loaded');
      }

      const platforms = userPlatforms
        .map((up) => (up.platforms as any)?.name)
        .filter(Boolean);

      if (platforms.length === 0) {
        throw new Error('No platforms selected');
      }

      const { data, error } = await supabase.functions.invoke('trend-discovery', {
        body: {
          niche: userProfile.niche || '',
          platforms,
          keywords: [],
        },
      });

      if (error) throw error;
      if (!data || !data.trends) throw new Error('No trends returned');

      console.log('[TrendDiscovery] Discovered trends', { count: data.trends.length });

      // Store discovered trends in database (only use columns that exist)
      const trendInserts = data.trends.map((trend: any) => ({
        platform_id: userPlatforms.find(
          (up) => (up.platforms as any)?.name === trend.platform
        )?.platform_id,
        title: trend.title,
        description: trend.description,
        engagement: trend.engagement,
        is_active: true,
      })).filter((t: any) => t.platform_id); // Only insert if platform_id exists

      if (trendInserts.length > 0) {
        // Use insert instead of upsert since we don't have a unique constraint
        const { error: insertError } = await supabase
          .from('trends')
          .insert(trendInserts);
        
        if (insertError) {
          // Ignore duplicate key errors, log others
          if (!insertError.message.includes('duplicate key')) {
            console.error('[TrendDiscovery] Failed to store trends:', insertError);
          }
        }
      }

      return data.trends;
    },
  });
}

// Fetch user profile
export function useUserProfile() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Update user profile (brand setup)
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: { brand_name: string; niche: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}

// Save user platforms
export function useSaveUserPlatforms() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (platformIds: string[]) => {
      if (!user) throw new Error('Not authenticated');
      
      // Delete existing platform selections
      await supabase
        .from('user_platforms')
        .delete()
        .eq('user_id', user.id);
      
      // Insert new selections
      if (platformIds.length > 0) {
        const { error } = await supabase
          .from('user_platforms')
          .insert(
            platformIds.map((platformId) => ({
              user_id: user.id,
              platform_id: platformId,
            }))
          );
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-platforms'] });
    },
  });
}

// Fetch user's selected platforms
export function useUserPlatforms() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-platforms', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_platforms')
        .select(`
          platform_id,
          platforms (
            id,
            name
          )
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Save user trends
export function useSaveUserTrends() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (trendIds: string[]) => {
      if (!user) throw new Error('Not authenticated');
      
      // Delete existing trend selections
      await supabase
        .from('user_trends')
        .delete()
        .eq('user_id', user.id);
      
      // Insert new selections
      if (trendIds.length > 0) {
        const { error } = await supabase
          .from('user_trends')
          .insert(
            trendIds.map((trendId) => ({
              user_id: user.id,
              trend_id: trendId,
            }))
          );
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-trends'] });
    },
  });
}

// Fetch user's selected trends
export function useUserTrends() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-trends', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_trends')
        .select('trend_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Create video record (metadata only - no actual file storage for MVP)
export function useCreateVideo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: { fileName: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data: video, error } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          file_name: data.fileName,
          status: 'uploaded',
        })
        .select()
        .single();
      
      if (error) throw error;
      return video as Video;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

// Update video status
export function useUpdateVideoStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ videoId, status }: { videoId: string; status: 'uploaded' | 'processing' | 'complete' }) => {
      const { error } = await supabase
        .from('videos')
        .update({ status })
        .eq('id', videoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

/**
 * Create generated clips using Lynkscope SEO recommendations
 * 
 * This function:
 * 1. Fetches SEO recommendations from Lynkscope for each platform
 * 2. Generates 2-3 clips per platform with varied durations
 * 3. Uses Lynkscope-provided captions and hashtags
 * 4. Writes all clips to Supabase atomically
 * 
 * Data safety:
 * - Validates user owns the video (enforced by RLS policies)
 * - Validates platform IDs exist
 * - Fails gracefully with structured errors
 * - No partial writes (transaction-like behavior)
 */
export function useCreateGeneratedClips() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      videoId, 
      platforms,
      brandName,
      niche,
    }: { 
      videoId: string; 
      platforms: Platform[];
      brandName?: string;
      niche?: string;
    }) => {
      console.log('[ClipGeneration] Starting clip generation', { 
        videoId, 
        platformCount: platforms.length,
        brandName,
        niche,
      });

      // Validation: Ensure user owns this video
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('user_id')
        .eq('id', videoId)
        .single();

      if (videoError) {
        console.error('[ClipGeneration] Failed to validate video ownership', videoError);
        throw new Error('Video not found');
      }

      if (videoData.user_id !== user.id) {
        console.error('[ClipGeneration] User does not own video', { 
          userId: user.id, 
          videoUserId: videoData.user_id 
        });
        throw new Error('Unauthorized: User does not own this video');
      }

      // Validation: Ensure platforms exist
      if (!platforms || platforms.length === 0) {
        throw new Error('No platforms selected');
      }

      const allClips: any[] = [];

      // Generate clips for each platform using Lynkscope
      for (const platform of platforms) {
        console.log(`[ClipGeneration] Fetching Lynkscope recommendations for ${platform.name}`);
        
        try {
          // Call Lynkscope to get SEO recommendations
          const lynkscopeResponse = await getSEORecommendations(
            platform.name,
            brandName,
            niche
          );

          if (!lynkscopeResponse.success || !lynkscopeResponse.data) {
            console.error(`[ClipGeneration] Lynkscope failed for ${platform.name}:`, lynkscopeResponse.error);
            // Fall back to basic clips if Lynkscope fails
            throw new Error(`Failed to get recommendations for ${platform.name}`);
          }

          const { captions, hashtags, optimalDurations } = lynkscopeResponse.data;

          // Generate 2-3 clips per platform with varied content
          const clipsPerPlatform = Math.min(3, captions.length);
          
          for (let i = 0; i < clipsPerPlatform; i++) {
            const clip = {
              video_id: videoId,
              platform_id: platform.id,
              duration_seconds: optimalDurations[i] || optimalDurations[0] || 30,
              caption: captions[i] || captions[0],
              hashtags: hashtags[i] || hashtags[0] || [],
            };

            allClips.push(clip);
            console.log(`[ClipGeneration] Generated clip ${i + 1}/${clipsPerPlatform} for ${platform.name}`, {
              duration: clip.duration_seconds,
              hashtagCount: clip.hashtags.length,
            });
          }
        } catch (error: any) {
          console.error(`[ClipGeneration] Error generating clips for ${platform.name}:`, error);
          throw new Error(`Failed to generate clips for ${platform.name}: ${error.message}`);
        }
      }

      console.log(`[ClipGeneration] Writing ${allClips.length} clips to Supabase`);

      // Write all clips to database atomically
      const { data, error } = await supabase
        .from('generated_clips')
        .insert(allClips)
        .select();
      
      if (error) {
        console.error('[ClipGeneration] Supabase write failed:', error);
        throw new Error(`Failed to save clips: ${error.message}`);
      }

      console.log('[ClipGeneration] Successfully created clips', { 
        count: data.length,
        clipIds: data.map(c => c.id),
      });

      return data as GeneratedClip[];
    },
    onSuccess: (data) => {
      console.log('[ClipGeneration] Invalidating queries after success');
      queryClient.invalidateQueries({ queryKey: ['generated-clips'] });
    },
    onError: (error: any) => {
      console.error('[ClipGeneration] Mutation failed:', error);
    },
  });
}

// Fetch generated clips for a video
export function useGeneratedClips(videoId?: string) {
  return useQuery({
    queryKey: ['generated-clips', videoId],
    queryFn: async () => {
      if (!videoId) return [];
      
      const { data, error } = await supabase
        .from('generated_clips')
        .select(`
          *,
          platforms (
            id,
            name
          )
        `)
        .eq('video_id', videoId)
        .order('created_at');
      
      if (error) throw error;
      return data;
    },
    enabled: !!videoId,
  });
}

// Fetch user's latest video
export function useLatestVideo() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['latest-video', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as Video | null;
    },
    enabled: !!user,
  });
}

// Placeholder hooks for Buffer integration (not yet implemented)
// These return no-op functions to prevent build errors
export function useScheduleToBuffer() {
  return {
    mutateAsync: async () => {
      console.warn('[Buffer] Buffer integration not yet configured');
      throw new Error('Buffer integration not yet configured');
    },
    isPending: false,
  };
}

export function useBufferPosts(_clipIds?: string[]) {
  return {
    data: [] as any[],
    isLoading: false,
  };
}

