import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

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

// Create video record
export function useCreateVideo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (fileName: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          file_name: fileName,
          status: 'uploaded',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Video;
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

// Create generated clips (mock)
export function useCreateGeneratedClips() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ videoId, platforms }: { videoId: string; platforms: Platform[] }) => {
      // Generate mock clips for each platform
      const clips = platforms.map((platform) => ({
        video_id: videoId,
        platform_id: platform.id,
        duration_seconds: Math.floor(Math.random() * 30) + 15,
        caption: getRandomCaption(platform.name),
        hashtags: getRandomHashtags(platform.name),
      }));
      
      const { data, error } = await supabase
        .from('generated_clips')
        .insert(clips)
        .select();
      
      if (error) throw error;
      return data as GeneratedClip[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-clips'] });
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

// Helper functions for mock data
function getRandomCaption(platform: string): string {
  const captions: Record<string, string[]> = {
    'TikTok': [
      '🚀 3 game-changing tips you NEED to know! Watch till the end for the secret sauce 🔥',
      'POV: When you finally discover this hack 😱 #mindblown',
      'Reply to @viewer - here\'s how I do it! 🎯',
    ],
    'Instagram Reels': [
      'The transformation nobody expected 😱 Save this for later! 💡',
      'Behind the scenes of how we create magic ✨',
      'Before vs After - the results speak for themselves 🙌',
    ],
    'YouTube Shorts': [
      'This ONE trick changed everything for me... here\'s how you can do it too 👇',
      'I tried this for 30 days and here\'s what happened...',
      'The secret that experts don\'t want you to know 🤫',
    ],
  };
  
  const platformCaptions = captions[platform] || captions['TikTok'];
  return platformCaptions[Math.floor(Math.random() * platformCaptions.length)];
}

function getRandomHashtags(platform: string): string[] {
  const hashtags: Record<string, string[][]> = {
    'TikTok': [
      ['#viral', '#tips', '#fyp', '#trending', '#lifehack'],
      ['#pov', '#relatable', '#foryou', '#trend', '#viral'],
    ],
    'Instagram Reels': [
      ['#reels', '#transformation', '#beforeandafter', '#motivation', '#inspo'],
      ['#behindthescenes', '#process', '#creative', '#reelsviral', '#explore'],
    ],
    'YouTube Shorts': [
      ['#shorts', '#tutorial', '#howto', '#learn', '#tips'],
      ['#challenge', '#trending', '#viral', '#youtube', '#subscribe'],
    ],
  };
  
  const platformHashtags = hashtags[platform] || hashtags['TikTok'];
  return platformHashtags[Math.floor(Math.random() * platformHashtags.length)];
}
