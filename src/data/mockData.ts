export interface Trend {
  id: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  title: string;
  description: string;
  engagement: string;
  thumbnail: string;
  embedUrl?: string;
  mediaType?: 'video' | 'image';
}

export interface GeneratedClip {
  id: string;
  platform: 'tiktok' | 'instagram' | 'youtube';
  duration: string;
  thumbnail: string;
  caption: string;
  hashtags: string[];
}

export const mockTrends: Trend[] = [
  {
    id: '1',
    platform: 'tiktok',
    title: 'Quick Tutorial Format',
    description: 'Fast-paced how-to content with text overlays and trending sounds',
    engagement: '2.3M avg views',
    thumbnail: '/placeholder.svg',
  },
  {
    id: '2',
    platform: 'instagram',
    title: 'Before & After Reveal',
    description: 'Transformation content with satisfying transitions',
    engagement: '1.8M avg views',
    thumbnail: '/placeholder.svg',
  },
  {
    id: '3',
    platform: 'youtube',
    title: 'Hook & Story Arc',
    description: 'Strong opening hook with narrative storytelling structure',
    engagement: '890K avg views',
    thumbnail: '/placeholder.svg',
  },
  {
    id: '4',
    platform: 'tiktok',
    title: 'POV Storytelling',
    description: 'First-person perspective narratives with emotional hooks',
    engagement: '3.1M avg views',
    thumbnail: '/placeholder.svg',
  },
  {
    id: '5',
    platform: 'instagram',
    title: 'Carousel Breakdown',
    description: 'Educational slides with key takeaways and actionable tips',
    engagement: '1.2M avg views',
    thumbnail: '/placeholder.svg',
  },
  {
    id: '6',
    platform: 'youtube',
    title: 'Challenge Format',
    description: 'Engaging challenge content with community participation',
    engagement: '2.5M avg views',
    thumbnail: '/placeholder.svg',
  },
  {
    id: '7',
    platform: 'tiktok',
    title: 'Duet Response',
    description: 'React and respond to trending content in your niche',
    engagement: '1.9M avg views',
    thumbnail: '/placeholder.svg',
  },
  {
    id: '8',
    platform: 'instagram',
    title: 'Behind The Scenes',
    description: 'Authentic glimpses into your process or daily routine',
    engagement: '980K avg views',
    thumbnail: '/placeholder.svg',
  },
];

export const mockGeneratedClips: GeneratedClip[] = [
  {
    id: '1',
    platform: 'tiktok',
    duration: '0:32',
    thumbnail: '/placeholder.svg',
    caption: '🚀 3 game-changing tips you NEED to know! Watch till the end for the secret sauce 🔥',
    hashtags: ['#viral', '#tips', '#fyp', '#trending', '#lifehack'],
  },
  {
    id: '2',
    platform: 'instagram',
    duration: '0:45',
    thumbnail: '/placeholder.svg',
    caption: 'The transformation nobody expected 😱 Save this for later! 💡',
    hashtags: ['#reels', '#transformation', '#beforeandafter', '#motivation', '#inspo'],
  },
  {
    id: '3',
    platform: 'youtube',
    duration: '0:58',
    thumbnail: '/placeholder.svg',
    caption: 'This ONE trick changed everything for me... here\'s how you can do it too 👇',
    hashtags: ['#shorts', '#tutorial', '#howto', '#learn', '#tips'],
  },
];

export const niches = [
  'Tech & Software',
  'Fitness & Health',
  'Business & Finance',
  'Lifestyle & Vlogging',
  'Gaming',
  'Education',
  'Food & Cooking',
  'Fashion & Beauty',
  'Travel',
  'Entertainment',
  'Music',
  'Other',
];

export const processingSteps = [
  { text: 'Analyzing video content...', duration: 1500 },
  { text: 'Identifying key moments...', duration: 1200 },
  { text: 'Matching trending formats...', duration: 1800 },
  { text: 'Clipping optimal segments...', duration: 2000 },
  { text: 'Generating captions...', duration: 1500 },
  { text: 'Optimizing for platforms...', duration: 1000 },
  { text: 'Finalizing content...', duration: 800 },
];
