import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ProgressSteps } from '@/components/ProgressSteps';
import { useAuth } from '@/contexts/AuthContext';
import { usePlatforms, useUserProfile, useUpdateProfile, useSaveUserPlatforms, useUserPlatforms } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { niches } from '@/data/mockData';

const steps = ['Brand', 'Trends', 'Upload', 'Results'];

export default function BrandSetup() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const { data: platforms, isLoading: platformsLoading } = usePlatforms();
  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const { data: userPlatforms } = useUserPlatforms();
  const updateProfile = useUpdateProfile();
  const saveUserPlatforms = useSaveUserPlatforms();
  
  const [brandName, setBrandName] = useState('');
  const [niche, setNiche] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Populate form with existing data
  useEffect(() => {
    if (userProfile) {
      setBrandName(userProfile.brand_name || '');
      setNiche(userProfile.niche || '');
    }
  }, [userProfile]);

  useEffect(() => {
    if (userPlatforms) {
      setSelectedPlatforms(userPlatforms.map((up) => up.platform_id));
    }
  }, [userPlatforms]);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const isValid = brandName.trim() && niche && selectedPlatforms.length > 0;

  const handleContinue = async () => {
    if (!isValid) return;
    
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({ brand_name: brandName.trim(), niche });
      await saveUserPlatforms.mutateAsync(selectedPlatforms);
      navigate('/trends');
    } catch (error) {
      toast({
        title: 'Error saving',
        description: 'Failed to save your brand setup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || profileLoading || platformsLoading) {
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
        <div className="container mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto px-6 py-12 max-w-2xl">
        <ProgressSteps steps={steps} currentStep={0} />

        <div className="glass-card rounded-2xl p-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">Set Up Your Brand</h1>
          <p className="text-muted-foreground mb-8">
            Tell us about your content so we can find the best trends for you.
          </p>

          <div className="space-y-6">
            {/* Brand Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Brand / Creator Name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., TechWithTom, FitLife Studio"
                className="input-field"
              />
            </div>

            {/* Niche */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Content Niche
              </label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="input-field appearance-none cursor-pointer"
              >
                <option value="">Select your niche...</option>
                {niches.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {/* Platforms */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Target Platforms
              </label>
              <div className="flex flex-wrap gap-3">
                {platforms?.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`px-5 py-3 rounded-lg border-2 font-medium transition-all duration-300 ${
                      selectedPlatforms.includes(platform.id)
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-secondary text-muted-foreground hover:border-muted-foreground'
                    }`}
                  >
                    {platform.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 flex justify-end">
            <Button
              variant="gradient"
              size="lg"
              disabled={!isValid || isSaving}
              onClick={handleContinue}
              className="group"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Continue
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
