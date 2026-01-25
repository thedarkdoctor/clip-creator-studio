import { Zap } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const iconSizes = {
    sm: 20,
    md: 28,
    lg: 40,
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full animate-pulse-glow" />
        <div className="relative p-2 rounded-xl bg-gradient-to-br from-primary to-primary/60">
          <Zap size={iconSizes[size]} className="text-primary-foreground" fill="currentColor" />
        </div>
      </div>
      <span className={`font-bold ${sizeClasses[size]} gradient-text`}>
        Content Engine
      </span>
    </div>
  );
}
