import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Plus, CheckCircle2, Loader2, Calendar, Clock, Video, Link as LinkIcon, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ProgressSteps } from '@/components/ProgressSteps';
import { ClipCard } from '@/components/ClipCard';
import { useAuth } from '@/contexts/AuthContext';
import { useLatestVideo, useGeneratedClips, useScheduleToBuffer } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ContentGenerationButton } from '@/components/ContentGenerationButton';
import { renderMultipleClips, type RenderProgress } from '@/services/contentRenderingService';
import { isFFmpegSupported } from '@/services/contentRenderingService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

const steps = ['Brand', 'Trends', 'Upload', 'Results'];

export default function Results() {
  const navigate = useNavigate();
  const { user, loading: authLoading, lynkscopeUser, businessName, niche } = useAuth();
  const { toast } = useToast();
  
  const [videoId, setVideoId] = useState<string | null>(null);
  const [sourceVideoUrl, setSourceVideoUrl] = useState<string | null>(null);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [postingFrequency, setPostingFrequency] = useState<'once_week' | 'twice_week' | 'daily' | 'every_other_day' | 'custom'>('daily');
  const [customSchedule, setCustomSchedule] = useState<string[]>([]);
  const [isSchedulingOpen, setIsSchedulingOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<Record<string, RenderProgress>>({});
  const [hasRendered, setHasRendered] = useState(false);
  const [ffmpegSupported, setFfmpegSupported] = useState(true);
  
  const { data: latestVideo, isLoading: videoLoading } = useLatestVideo();
  const { data: clips, isLoading: clipsLoading, refetch: refetchClips } = useGeneratedClips(videoId || undefined);
  const scheduleToBuffer = useScheduleToBuffer();

  // Check FFmpeg support
  useEffect(() => {
    setFfmpegSupported(isFFmpegSupported());
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user && !lynkscopeUser) {
      navigate('/auth');
    }
  }, [user, lynkscopeUser, authLoading, navigate]);

  // Get video ID and source video URL
  useEffect(() => {
    const sessionVideoId = sessionStorage.getItem('currentVideoId');
    if (sessionVideoId) {
      setVideoId(sessionVideoId);
    } else if (latestVideo) {
      setVideoId(latestVideo.id);
    }
  }, [latestVideo]);

  // Fetch source video URL
  useEffect(() => {
    if (!videoId) return;
    
    const fetchVideoUrl = async () => {
      try {
        const { data: video } = await supabase
          .from('videos')
          .select('storage_path')
          .eq('id', videoId)
          .single();
        
        if (video?.storage_path) {
          const { data } = supabase.storage
            .from('videos')
            .getPublicUrl(video.storage_path);
          setSourceVideoUrl(data.publicUrl);
        }
      } catch (error) {
        console.error('[Results] Error fetching video URL:', error);
      }
    };
    
    fetchVideoUrl();
  }, [videoId]);

  // Note: Auto-render is disabled since the generated_clips table 
  // doesn't have storage_path column. Clips are metadata-only for manual editing.


  const isLoading = authLoading || videoLoading || clipsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Map clips to the format expected by ClipCard
  const mappedClips = clips?.map((clip) => {
    const platformName = (clip.platforms as any)?.name || '';
    let platform: 'tiktok' | 'instagram' | 'youtube' = 'tiktok';
    if (platformName.includes('Instagram')) platform = 'instagram';
    if (platformName.includes('YouTube')) platform = 'youtube';
    
    const minutes = Math.floor(clip.duration_seconds / 60);
    const seconds = clip.duration_seconds % 60;
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    return {
      id: clip.id,
      platform,
      duration,
      thumbnail: '/placeholder.svg',
      caption: clip.caption || '',
      hashtags: clip.hashtags || [],
      // Default values since these columns don't exist in DB yet
      startTime: 0,
      endTime: clip.duration_seconds,
      fontStyle: { family: 'Arial', size: 24, weight: 'bold', color: '#FFFFFF' },
      backgroundMusic: undefined,
    };
  }) || [];

  const handleScheduleToBuffer = async () => {
    if (selectedClips.length === 0) {
      toast({
        title: 'No clips selected',
        description: 'Please select at least one clip to schedule',
        variant: 'destructive',
      });
      return;
    }

    try {
      const platforms = [...new Set(mappedClips
        .filter((c) => selectedClips.includes(c.id))
        .map((c) => {
          if (c.platform === 'tiktok') return 'TikTok';
          if (c.platform === 'instagram') return 'Instagram Reels';
          if (c.platform === 'youtube') return 'YouTube Shorts';
          return 'TikTok';
        }))];

      await scheduleToBuffer.mutateAsync({
        clip_ids: selectedClips,
        platforms,
        posting_frequency: postingFrequency,
        custom_schedule: postingFrequency === 'custom' ? customSchedule : undefined,
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      toast({
        title: 'Scheduled successfully',
        description: `Scheduled ${selectedClips.length} clips to Buffer`,
      });

      setIsSchedulingOpen(false);
      setSelectedClips([]);
    } catch (error: any) {
      toast({
        title: 'Scheduling failed',
        description: error.message || 'Failed to schedule posts to Buffer',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <Button variant="ghost" size="sm" onClick={() => navigate('/upload')}>
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto px-6 py-12 max-w-6xl">
        <ProgressSteps steps={steps} currentStep={3} />

        <div className="animate-fade-in">
          {/* Success banner */}
          <div className="glass-card rounded-xl p-6 mb-8 flex items-center gap-4 border-primary/30">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="text-primary" size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">Content Generated Successfully!</h2>
              <p className="text-muted-foreground">
                We've created {mappedClips.length} optimized clips from your video. 
                Download the source video and edit captions before publishing.
              </p>
            </div>
            <Button variant="gradient" className="shrink-0 hidden md:flex" onClick={() => sourceVideoUrl && window.open(sourceVideoUrl, '_blank')}>
              <Download size={18} />
              Source Video
            </Button>
          </div>

          {/* Source Video Card */}
          {sourceVideoUrl && (
            <div className="glass-card rounded-xl p-6 mb-8">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Video className="text-primary" size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Source Video Ready</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Download and edit your original video. Your clip specifications are below.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => window.open(sourceVideoUrl, '_blank')}>
                        <LinkIcon size={16} className="mr-1" />
                        Open Video
                      </Button>
                      <a href={sourceVideoUrl} download="source-video.mp4">
                        <Button size="sm" variant="gradient">
                          <Download size={16} className="mr-1" />
                          Download Video
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Your Generated Clips</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {mappedClips.length} optimized clips ready for editing and publishing
              </p>
            </div>
            <span className="text-muted-foreground">
              {mappedClips.length} clips
            </span>
          </div>

          {/* Clips Grid */}
          {mappedClips.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {mappedClips.map((clip, index) => {
                  const isSelected = selectedClips.includes(clip.id);
                  return (
                    <div
                      key={clip.id}
                      style={{ animationDelay: `${index * 0.1}s` }}
                      className="relative"
                    >
                      <div
                        className={`absolute top-2 right-2 z-10 ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-background/80'
                        } rounded-full p-2 cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelected) {
                            setSelectedClips((prev) => prev.filter((id) => id !== clip.id));
                          } else {
                            setSelectedClips((prev) => [...prev, clip.id]);
                          }
                        }}
                      >
                        {isSelected ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3 mb-3 text-xs text-muted-foreground space-y-2 border border-border/50">
                        <div className="flex justify-between">
                          <span>Start: {Math.floor(clip.startTime)}s</span>
                          <span>End: {Math.floor(clip.endTime)}s</span>
                        </div>
                        {clip.fontStyle && (
                          <div className="text-xs">
                            Font: {clip.fontStyle.family || 'Arial'} ({clip.fontStyle.size || 24}px)
                          </div>
                        )}
                      </div>
                      <ClipCard clip={clip} />
                    </div>
                  );
                })}
              </div>

              {/* Clip Info Note */}
              <div className="glass-card rounded-xl p-4 mb-6 border-primary/20">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Clip Information:</span> Each clip includes timing data, suggested caption, hashtags, and font styling. Download the source video and use the clip specifications to edit and render your final clips with a video editor or rendering service.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No clips generated yet. Try uploading a video first.</p>
            </div>
          )}

          {/* Buffer Scheduling */}
          {mappedClips.length > 0 && (
            <div className="glass-card rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Calendar size={18} />
                    Schedule to Buffer
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Select clips and schedule them to post automatically via Buffer
                  </p>
                </div>
                <Dialog open={isSchedulingOpen} onOpenChange={setIsSchedulingOpen}>
                  <DialogTrigger asChild>
                    <Button variant="gradient">
                      <Clock size={18} className="mr-2" />
                      Schedule Posts
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Schedule to Buffer</DialogTitle>
                      <DialogDescription>
                        Select clips and choose posting frequency. Posts will be scheduled starting tomorrow.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Posting Frequency</label>
                        <Select value={postingFrequency} onValueChange={(v: any) => setPostingFrequency(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Every Day</SelectItem>
                            <SelectItem value="twice_week">Twice a Week</SelectItem>
                            <SelectItem value="once_week">Once a Week</SelectItem>
                            <SelectItem value="every_other_day">Every Other Day</SelectItem>
                            <SelectItem value="custom">Custom Schedule</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {postingFrequency === 'custom' && (
                        <div>
                          <label className="text-sm font-medium mb-2 block">Custom Schedule Dates</label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Enter ISO date strings (e.g., 2026-02-01T09:00:00Z), one per line
                          </p>
                          <textarea
                            className="w-full min-h-[100px] p-2 border rounded-md text-sm"
                            placeholder="2026-02-01T09:00:00Z&#10;2026-02-03T09:00:00Z&#10;2026-02-05T09:00:00Z"
                            value={customSchedule.join('\n')}
                            onChange={(e) => {
                              const dates = e.target.value
                                .split('\n')
                                .map((line) => line.trim())
                                .filter((line) => line.length > 0);
                              setCustomSchedule(dates);
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium mb-2 block">Selected Clips</label>
                        <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                          {selectedClips.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No clips selected</p>
                          ) : (
                            <div className="space-y-2">
                              {mappedClips
                                .filter((c) => selectedClips.includes(c.id))
                                .map((clip) => (
                                  <div key={clip.id} className="flex items-center justify-between text-sm">
                                    <span>{clip.caption.substring(0, 50)}...</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedClips((prev) => prev.filter((id) => id !== clip.id))}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsSchedulingOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="gradient"
                        onClick={handleScheduleToBuffer}
                        disabled={selectedClips.length === 0 || scheduleToBuffer.isPending}
                      >
                        {scheduleToBuffer.isPending ? (
                          <>
                            <Loader2 className="animate-spin mr-2" size={16} />
                            Scheduling...
                          </>
                        ) : (
                          'Schedule Posts'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedClips.length === 0
                  ? 'Click on clips below to select them for scheduling'
                  : `${selectedClips.length} clip${selectedClips.length > 1 ? 's' : ''} selected`}
              </div>
            </div>
          )}

          <div className="glass-card rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Want more content?</h3>
              <p className="text-muted-foreground text-sm">
                Generate more AI-powered content or upload another video.
              </p>
            </div>
            <div className="flex gap-3">
              {businessName && niche && (
                <ContentGenerationButton
                  maxTrends={3}
                  variant="outline"
                  size="default"
                  showProgress={false}
                />
              )}
              <Button variant="outline" onClick={() => navigate('/trends')}>
                Change Trends
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile download button */}
      <div className="fixed bottom-6 left-6 right-6 md:hidden">
        <Button variant="gradient" className="w-full" size="lg">
          <Download size={18} />
          Download All Clips
        </Button>
      </div>
    </div>
  );
}
