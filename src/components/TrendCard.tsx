import { Check, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlatformBadge } from './PlatformBadge';
import type { Trend } from '@/data/mockData';

interface TrendCardProps {
  trend: Trend;
  selected: boolean;
  onToggle: () => void;
}

export function TrendCard({ trend, selected, onToggle }: TrendCardProps) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        'card-interactive relative group',
        selected && 'border-primary/50 glow-primary'
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300',
          selected
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-muted-foreground/50'
        )}
      >
        {selected && <Check size={14} />}
      </div>

      {/* Platform badge */}
      <div className="mb-4">
        <PlatformBadge platform={trend.platform} />
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
        {trend.title}
      </h3>
      <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
        {trend.description}
      </p>

      {/* Engagement */}
      <div className="flex items-center gap-2 text-sm text-primary">
        <TrendingUp size={16} />
        <span>{trend.engagement}</span>
      </div>
    </div>
  );
}
