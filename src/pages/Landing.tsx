import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, Sparkles, Zap, Target, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Trends',
      description: 'Automatically match your content with viral formats',
    },
    {
      icon: Zap,
      title: 'Instant Clips',
      description: 'Transform long videos into optimized short-form content',
    },
    {
      icon: Target,
      title: 'Multi-Platform',
      description: 'Tailored for TikTok, Instagram Reels, and YouTube Shorts',
    },
  ];

  const handleGetStarted = () => {
    if (user) {
      navigate('/brand-setup');
    } else {
      navigate('/auth');
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-0 border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="sm" />
          {user ? (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate('/brand-setup')}>
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut size={16} />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 pt-24 pb-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 animate-fade-in">
            <Sparkles size={16} />
            AI-Powered Content Creation
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Turn Long Videos into{' '}
            <span className="gradient-text">Viral Short-Form</span>{' '}
            Content
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Leverage trending formats across TikTok, Instagram Reels, and YouTube Shorts. 
            AI generates clips, captions, and hashtags automatically.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button
              variant="gradient"
              size="xl"
              onClick={handleGetStarted}
              className="group"
            >
              {user ? 'Go to Dashboard' : 'Get Started Free'}
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="xl">
              <Play size={20} />
              Watch Demo
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card rounded-xl p-6 text-left group hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="text-primary" size={24} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>
    </div>
  );
}
