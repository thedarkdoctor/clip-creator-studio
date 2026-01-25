import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ProgressSteps } from '@/components/ProgressSteps';
import { TrendCard } from '@/components/TrendCard';
import { mockTrends } from '@/data/mockData';

const steps = ['Brand', 'Trends', 'Upload', 'Results'];

export default function TrendSelection() {
  const navigate = useNavigate();
  const [selectedTrends, setSelectedTrends] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>('all');

  const toggleTrend = (id: string) => {
    setSelectedTrends((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const filteredTrends =
    filter === 'all'
      ? mockTrends
      : mockTrends.filter((t) => t.platform === filter);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <Button variant="ghost" size="sm" onClick={() => navigate('/brand-setup')}>
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 container mx-auto px-6 py-12 max-w-6xl">
        <ProgressSteps steps={steps} currentStep={1} />

        <div className="animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Select Trending Formats</h1>
              <p className="text-muted-foreground">
                Choose the formats that match your content style. Select multiple for variety.
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-muted-foreground" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="input-field py-2 w-40"
              >
                <option value="all">All Platforms</option>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
          </div>

          {/* Selected count */}
          {selectedTrends.length > 0 && (
            <div className="mb-6 text-sm text-primary">
              {selectedTrends.length} trend{selectedTrends.length > 1 ? 's' : ''} selected
            </div>
          )}

          {/* Trend Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
            {filteredTrends.map((trend, index) => (
              <div
                key={trend.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <TrendCard
                  trend={trend}
                  selected={selectedTrends.includes(trend.id)}
                  onToggle={() => toggleTrend(trend.id)}
                />
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex justify-between items-center glass-card rounded-xl p-4">
            <span className="text-muted-foreground">
              {selectedTrends.length === 0 
                ? 'Select at least one trend to continue'
                : `Ready with ${selectedTrends.length} format${selectedTrends.length > 1 ? 's' : ''}`
              }
            </span>
            <Button
              variant="gradient"
              size="lg"
              disabled={selectedTrends.length === 0}
              onClick={() => navigate('/upload')}
              className="group"
            >
              Next
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
