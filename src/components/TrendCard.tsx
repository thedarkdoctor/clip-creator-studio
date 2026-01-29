import { Check, TrendingUp, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlatformBadge } from './PlatformBadge';
import { useState } from 'react';

interface Trend {
  id: string;
  title: string;
  description: string | null;
  platform: string;
  engagement?: string | null;
  thumbnail?: string;
  embedUrl?: string;
  mediaType?: string;
}

interface TrendCardProps {
  trend: Trend;
  selected: boolean;
  onToggle: () => void;
}

export function TrendCard({ trend, selected, onToggle }: TrendCardProps) {
  const [imageError, setImageError] = useState(false);
  const hasMedia = trend.thumbnail && trend.thumbnail !== '/placeholder.svg';
  const hasEmbed = trend.embedUrl && trend.mediaType === 'video';
  const shouldShowMedia = hasMedia || hasEmbed;

  return (
    <div
      onClick={onToggle}
      className={cn(
        'card-interactive relative group overflow-hidden',
        selected && 'border-primary/50 glow-primary'
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'absolute top-4 right-4 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300',
          selected
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-muted-foreground/50 bg-background/80 backdrop-blur-sm'
        )}
      >
        {selected && <Check size={14} />}
      </div>

      {/* Media Preview - Playable Video */}
      {shouldShowMedia && !imageError && (
        <div className="relative w-full aspect-video mb-4 overflow-hidden bg-secondary rounded-t-lg">
          {hasEmbed ? (
            <iframe
              src={trend.embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={trend.title}
              style={{ border: 'none' }}
            />
          ) : (
            <>
              <img
                src={trend.thumbnail}
                alt={trend.title}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              {trend.mediaType === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-12 h-12 rounded-full bg-primary/80 flex items-center justify-center cursor-pointer hover:bg-primary transition-colors">
                    <Play size={24} className="text-primary-foreground ml-1" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Platform badge */}
      <div className="mb-4 px-4">
        <PlatformBadge platform={trend.platform as 'tiktok' | 'instagram' | 'youtube'} />
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
          {trend.title}
        </h3>
        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
          {trend.description}
        </p>

        {/* Engagement */}
        {trend.engagement && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <TrendingUp size={16} />
            <span>{trend.engagement}</span>
          </div>
        )}
      </div>
    </div>
  );
}