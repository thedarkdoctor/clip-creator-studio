"/**
 * Trend Intelligence Card Component
 * Displays trend analysis data (NOT video player)
 */

import { ExternalLink, TrendingUp, Clock, Hash, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { EnhancedTrend } from '@/types/trendIntelligence';

interface TrendIntelligenceCardProps {
  trend: EnhancedTrend;
  onSelect?: (trend: EnhancedTrend) => void;
  isSelected?: boolean;
}

export function TrendIntelligenceCard({ trend, onSelect, isSelected }: TrendIntelligenceCardProps) {
  const formatNumber = (num: number | null | undefined): string => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      tiktok: 'bg-pink-500',
      instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
      youtube: 'bg-red-500',
      twitter: 'bg-blue-400',
      facebook: 'bg-blue-600',
    };
    return colors[platform] || 'bg-gray-500';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getFormatEmoji = (format: string | null) => {
    const emojis: Record<string, string> = {
      pov: '👁️',
      transformation: '✨',
      tutorial: '📚',
      meme: '😂',
      storytime: '📖',
      relatable: '🤝',
      aesthetic: '🎨',
      challenge: '🏆',
      other: '📱',
    };
    return emojis[format || 'other'] || '📱';
  };

  return (
    <div
      className={`glass-card rounded-xl p-6 transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-primary' : ''
      } ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={() => onSelect?.(trend)}
    >
      {/* Header */}
      <div className=\"flex items-start justify-between gap-4 mb-4\">
        <div className=\"flex-1\">
          <h3 className=\"font-semibold text-lg mb-2 line-clamp-2\">
            {trend.title}
          </h3>
          
          <div className=\"flex items-center gap-2 flex-wrap\">
            {/* Platform Badge */}
            <Badge className={`${getPlatformColor(trend.platform)} text-white`}>
              {trend.platform}
            </Badge>
            
            {/* Format Badge */}
            {trend.format_type && (
              <Badge variant=\"secondary\">
                {getFormatEmoji(trend.format_type)} {trend.format_type}
              </Badge>
            )}
          </div>
        </div>

        {/* Viral Score */}
        <div className=\"flex flex-col items-center\">
          <div className={`text-3xl font-bold ${getScoreColor(trend.trend_score)}`}>
            {trend.trend_score}
          </div>
          <div className=\"text-xs text-muted-foreground flex items-center gap-1\">
            <TrendingUp size={12} />
            Score
          </div>
        </div>
      </div>

      {/* Hook Style */}
      {trend.hook_style && (
        <div className=\"mb-3 p-2 rounded-lg bg-primary/5 border border-primary/20\">
          <div className=\"flex items-center gap-2 text-sm\">
            <Zap size={14} className=\"text-primary\" />
            <span className=\"font-medium\">Hook:</span>
            <span className=\"text-muted-foreground\">{trend.hook_style}</span>
          </div>
        </div>
      )}

      {/* Engagement Metrics */}
      {trend.metrics && (
        <div className=\"grid grid-cols-3 gap-2 mb-4\">
          <div className=\"text-center p-2 rounded bg-secondary/50\">
            <div className=\"text-sm font-bold\">{formatNumber(trend.metrics.views)}</div>
            <div className=\"text-xs text-muted-foreground\">Views</div>
          </div>
          <div className=\"text-center p-2 rounded bg-secondary/50\">
            <div className=\"text-sm font-bold\">{formatNumber(trend.metrics.likes)}</div>
            <div className=\"text-xs text-muted-foreground\">Likes</div>
          </div>
          <div className=\"text-center p-2 rounded bg-secondary/50\">
            <div className=\"text-sm font-bold\">{formatNumber(trend.metrics.shares)}</div>
            <div className=\"text-xs text-muted-foreground\">Shares</div>
          </div>
        </div>
      )}

      {/* Pattern Info */}
      {trend.pattern && (
        <div className=\"space-y-2 mb-4 text-sm\">
          {trend.pattern.pacing_pattern && (
            <div className=\"flex items-center gap-2\">
              <Clock size={14} className=\"text-primary\" />
              <span className=\"text-muted-foreground\">{trend.pattern.pacing_pattern}</span>
            </div>
          )}
          
          {trend.avg_duration && (
            <div className=\"flex items-center gap-2\">
              <Clock size={14} className=\"text-primary\" />
              <span className=\"text-muted-foreground\">
                Duration: {trend.avg_duration}s
                {trend.duration_range_min && trend.duration_range_max && (
                  <span className=\"text-xs ml-1\">
                    ({trend.duration_range_min}-{trend.duration_range_max}s)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Hashtags */}
      {trend.hashtags && trend.hashtags.length > 0 && (
        <div className=\"flex items-start gap-2 mb-4\">
          <Hash size={14} className=\"text-primary mt-1\" />
          <div className=\"flex flex-wrap gap-1\">
            {trend.hashtags.slice(0, 5).map((tag: any, idx: number) => (
              <span key={idx} className=\"text-xs text-primary\">
                {typeof tag === 'string' ? tag : tag.hashtag}
              </span>
            ))}
            {trend.hashtags.length > 5 && (
              <span className=\"text-xs text-muted-foreground\">
                +{trend.hashtags.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className=\"flex gap-2\">
        <Button
          variant=\"outline\"
          size=\"sm\"
          className=\"flex-1\"
          onClick={(e) => {
            e.stopPropagation();
            window.open(trend.source_url, '_blank');
          }}
        >
          <ExternalLink size={14} />
          Watch Original
        </Button>
        
        {onSelect && (
          <Button
            variant={isSelected ? 'default' : 'secondary'}
            size=\"sm\"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(trend);
            }}
          >
            {isSelected ? 'Selected' : 'Use Template'}
          </Button>
        )}
      </div>
    </div>
  );
}
"
