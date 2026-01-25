import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Plus, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ProgressSteps } from '@/components/ProgressSteps';
import { ClipCard } from '@/components/ClipCard';
import { useAuth } from '@/contexts/AuthContext';
import { useLatestVideo, useGeneratedClips } from '@/hooks/useSupabaseData';

const steps = ['Brand', 'Trends', 'Upload', 'Results'];

export default function Results() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [videoId, setVideoId] = useState<string | null>(null);
  
  const { data: latestVideo, isLoading: videoLoading } = useLatestVideo();
  const { data: clips, isLoading: clipsLoading } = useGeneratedClips(videoId || undefined);

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
    
    return {
      id: clip.id,
      platform,
      duration,
      thumbnail: '/placeholder.svg',
      caption: clip.caption || '',
      hashtags: clip.hashtags || [],
    };
  }) || [];

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
              {mappedClips.map((clip, index) => (
                <div
                  key={clip.id}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <ClipCard clip={clip} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No clips generated yet. Try uploading a video first.
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
