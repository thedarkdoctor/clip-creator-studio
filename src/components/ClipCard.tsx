import { useState } from 'react';
import { Download, Copy, RefreshCw, Play, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlatformBadge } from './PlatformBadge';
import type { GeneratedClip } from '@/data/mockData';

interface ClipCardProps {
  clip: GeneratedClip;
}

export function ClipCard({ clip }: ClipCardProps) {
  const [caption, setCaption] = useState(clip.caption);
  const [hashtags, setHashtags] = useState(clip.hashtags.join(' '));
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${caption}\n\n${hashtags}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden animate-fade-in">
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] bg-secondary group">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play size={32} className="text-primary ml-1" fill="currentColor" />
          </div>
        </div>
        
        {/* Duration badge */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md text-sm">
          <Clock size={14} />
          {clip.duration}
        </div>

        {/* Platform badge */}
        <div className="absolute top-3 left-3">
          <PlatformBadge platform={clip.platform} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Caption */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Caption
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="input-field min-h-[100px] resize-none text-sm"
          />
        </div>

        {/* Hashtags */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            Hashtags
          </label>
          <input
            type="text"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            className="input-field text-sm text-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="gradient" className="flex-1" size="sm">
            <Download size={16} />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0">
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
