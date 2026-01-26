import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Plus, CheckCircle2, Loader2, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ProgressSteps } from '@/components/ProgressSteps';
import { ClipCard } from '@/components/ClipCard';
import { useAuth } from '@/contexts/AuthContext';
import { useLatestVideo, useGeneratedClips, useScheduleToBuffer, useBufferPosts } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
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

const steps = ['Brand', 'Trends', 'Upload', 'Results'];

export default function Results() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [videoId, setVideoId] = useState<string | null>(null);
  const [selectedClips, setSelectedClips] = useState<string[]>([]);
  const [postingFrequency, setPostingFrequency] = useState<'once_week' | 'twice_week' | 'daily' | 'every_other_day' | 'custom'>('daily');
  const [customSchedule, setCustomSchedule] = useState<string[]>([]);
  const [isSchedulingOpen, setIsSchedulingOpen] = useState(false);
  
  const { data: latestVideo, isLoading: videoLoading } = useLatestVideo();
  const { data: clips, isLoading: clipsLoading } = useGeneratedClips(videoId || undefined);
  const scheduleToBuffer = useScheduleToBuffer();
  const { data: bufferPosts } = useBufferPosts(selectedClips.length > 0 ? selectedClips : undefined);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Get video ID from session or latest video
  useEffect(() => {
    const sessionVideoId = sessionStorage.getItem('currentVideoId');
    if (sessionVideoId) {
      setVideoId(sessionVideoId);
    } else if (latestVideo) {
      setVideoId(latestVideo.id);
    }
  }, [latestVideo]);

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
    
    const bufferPost = bufferPosts?.find((bp) => bp.clip_id === clip.id);
    
    return {
      id: clip.id,
      platform,
      duration,
      thumbnail: '/placeholder.svg',
      caption: clip.caption || '',
      hashtags: clip.hashtags || [],
      bufferPost,
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
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
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
                Edit captions and hashtags before downloading.
              </p>
            </div>
            <Button variant="gradient" className="shrink-0 hidden md:flex">
              <Download size={18} />
              Download All
            </Button>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Your Generated Clips</h1>
            <span className="text-muted-foreground">
              {mappedClips.length} clips ready
            </span>
          </div>

          {/* Clips Grid */}
          {mappedClips.length > 0 ? (
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
                      } rounded-full p-2 cursor-pointer`}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedClips((prev) => prev.filter((id) => id !== clip.id));
                        } else {
                          setSelectedClips((prev) => [...prev, clip.id]);
                        }
                      }}
                    >
                      {isSelected ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                    </div>
                    {clip.bufferPost && (
                      <div className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs px-2 py-1 rounded">
                        Scheduled
                      </div>
                    )}
                    <ClipCard clip={clip} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No clips generated yet. Try uploading a video first.
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

          {/* Actions Footer */}
          <div className="glass-card rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Want more content?</h3>
              <p className="text-muted-foreground text-sm">
                Upload another video or try different trending formats.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/trends')}>
                Change Trends
              </Button>
              <Button variant="gradient" onClick={() => navigate('/upload')}>
                <Plus size={18} />
                New Video
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
