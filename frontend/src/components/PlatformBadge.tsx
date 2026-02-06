import { cn } from '@/lib/utils';

interface PlatformBadgeProps {
  platform: 'tiktok' | 'instagram' | 'youtube';
  size?: 'sm' | 'md';
}

export function PlatformBadge({ platform, size = 'md' }: PlatformBadgeProps) {
  const labels = {
    tiktok: 'TikTok',
    instagram: 'Instagram',
    youtube: 'YouTube',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'font-medium rounded-full',
        sizeClasses[size],
        platform === 'tiktok' && 'platform-tiktok',
        platform === 'instagram' && 'platform-instagram',
        platform === 'youtube' && 'platform-youtube'
      )}
    >
      {labels[platform]}
    </span>
  );
}
