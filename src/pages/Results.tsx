import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ProgressSteps } from '@/components/ProgressSteps';
import { ClipCard } from '@/components/ClipCard';
import { mockGeneratedClips } from '@/data/mockData';

const steps = ['Brand', 'Trends', 'Upload', 'Results'];

export default function Results() {
  const navigate = useNavigate();

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
                We've created {mockGeneratedClips.length} optimized clips from your video. 
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
              {mockGeneratedClips.length} clips ready
            </span>
          </div>

          {/* Clips Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {mockGeneratedClips.map((clip, index) => (
              <div
                key={clip.id}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <ClipCard clip={clip} />
              </div>
            ))}
          </div>

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
