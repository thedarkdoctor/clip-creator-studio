import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { processingSteps } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateVideoStatus, useCreateGeneratedClips, useUserPlatforms, useUserProfile } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';

export default function Processing() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const updateVideoStatus = useUpdateVideoStatus();
  const createGeneratedClips = useCreateGeneratedClips();
  const { data: userPlatforms } = useUserPlatforms();
  const { data: userProfile } = useUserProfile();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (hasStarted || authLoading || !user || !userPlatforms) return;
    
    const videoId = sessionStorage.getItem('currentVideoId');
    if (!videoId) {
      navigate('/upload');
      return;
    }
    
    setHasStarted(true);
    
    let stepIndex = 0;

    const runSteps = async () => {
      if (stepIndex >= processingSteps.length) {
        // Update video status and create clips using Lynkscope
        try {
          console.log('[Processing] Updating video status to processing');
          await updateVideoStatus.mutateAsync({ videoId, status: 'processing' });
          
          // Get platforms from user selections
          const platforms = userPlatforms
            .map((up) => (up.platforms as any))
            .filter(Boolean);
          
          if (platforms.length > 0) {
            console.log('[Processing] Generating clips with Lynkscope integration', {
              platformCount: platforms.length,
              brandName: userProfile?.brand_name,
              niche: userProfile?.niche,
            });
            
            // Generate clips with Lynkscope recommendations
            await createGeneratedClips.mutateAsync({ 
              videoId, 
              platforms,
              brandName: userProfile?.brand_name || undefined,
              niche: userProfile?.niche || undefined,
            });
          }
          
          console.log('[Processing] Updating video status to complete');
          await updateVideoStatus.mutateAsync({ videoId, status: 'complete' });
        } catch (error) {
          console.error('[Processing] Error during clip generation:', error);
          // TODO: Show error UI to user instead of just console logging
          // Consider adding error state and displaying friendly message
        }
        
        // Navigate to results after all steps complete
        setTimeout(() => navigate('/results'), 500);
        return;
      }

      setCurrentStep(stepIndex);
      const stepDuration = processingSteps[stepIndex].duration;
      
      // Animate progress during this step
      const startProgress = (stepIndex / processingSteps.length) * 100;
      const endProgress = ((stepIndex + 1) / processingSteps.length) * 100;
      const progressIncrement = (endProgress - startProgress) / (stepDuration / 50);
      
      let currentProgress = startProgress;
      const progressInterval = setInterval(() => {
        currentProgress += progressIncrement;
        if (currentProgress >= endProgress) {
          clearInterval(progressInterval);
          setProgress(endProgress);
        } else {
          setProgress(currentProgress);
        }
      }, 50);

      setTimeout(() => {
        clearInterval(progressInterval);
        stepIndex++;
        runSteps();
      }, stepDuration);
    };

    runSteps();
  }, [navigate, user, authLoading, userPlatforms, userProfile, hasStarted]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="container mx-auto">
          <Logo size="sm" />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-lg animate-fade-in">
          {/* Animated spinner */}
          <div className="relative w-32 h-32 mx-auto mb-10">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-secondary" />
            
            {/* Progress ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="60"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 60}`}
                strokeDashoffset={`${2 * Math.PI * 60 * (1 - progress / 100)}`}
                className="transition-all duration-300"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(174, 72%, 56%)" />
                  <stop offset="100%" stopColor="hsl(200, 80%, 50%)" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={40} className="text-primary animate-spin" />
            </div>
          </div>

          {/* Current step text */}
          <h2 className="text-2xl font-bold mb-4 h-8">
            {processingSteps[currentStep]?.text || 'Finalizing...'}
          </h2>

          {/* Progress percentage */}
          <p className="text-4xl font-bold gradient-text mb-6">
            {Math.round(progress)}%
          </p>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 mb-8">
            {processingSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index <= currentStep
                    ? 'bg-primary scale-100'
                    : 'bg-secondary scale-75'
                }`}
              />
            ))}
          </div>

          {/* Info text */}
          <p className="text-muted-foreground text-sm">
            This usually takes less than a minute. We're creating optimized clips for all your selected platforms.
          </p>
        </div>
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
      </div>
    </div>
  );
}
