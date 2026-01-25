import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ProgressSteps } from '@/components/ProgressSteps';
import { niches } from '@/data/mockData';

const steps = ['Brand', 'Trends', 'Upload', 'Results'];

export default function BrandSetup() {
  const navigate = useNavigate();
  const [brandName, setBrandName] = useState('');
  const [niche, setNiche] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const isValid = brandName.trim() && niche && platforms.length > 0;

  const platformOptions = [
    { id: 'tiktok', label: 'TikTok', color: 'platform-tiktok' },
    { id: 'instagram', label: 'Instagram Reels', color: 'platform-instagram' },
    { id: 'youtube', label: 'YouTube Shorts', color: 'platform-youtube' },
  ];

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
                {platformOptions.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`px-5 py-3 rounded-lg border-2 font-medium transition-all duration-300 ${
                      platforms.includes(platform.id)
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-secondary text-muted-foreground hover:border-muted-foreground'
                    }`}
                  >
                    {platform.label}
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
              disabled={!isValid}
              onClick={() => navigate('/trends')}
              className="group"
            >
              Continue
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
