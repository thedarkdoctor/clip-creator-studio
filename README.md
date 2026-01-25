# Cliplyst

Transform your long-form videos into engaging short-form clips optimized for TikTok, Instagram Reels, and YouTube Shorts.

## 🚀 Overview

Cliplyst is a SaaS platform that helps content creators repurpose long-form video content into platform-optimized short clips. The app uses AI-powered trend analysis and SEO recommendations to generate clips with optimized captions, hashtags, and durations.

### Key Features

- **Multi-Platform Support:** Generate clips for TikTok, Instagram Reels, and YouTube Shorts
- **AI-Powered Recommendations:** Lynkscope integration for SEO and trend analysis
- **Brand-Aware Content:** Personalized clips based on your brand voice and niche
- **Automated Optimization:** Platform-specific durations, captions, and hashtags
- **Secure & Scalable:** Built on Supabase with Row Level Security

## 📋 Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI Components:** Radix UI + Tailwind CSS
- **State Management:** TanStack Query (React Query)
- **Routing:** React Router v6
- **Authentication:** Supabase Auth

### Backend & Database
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage (planned)
- **Security:** Row Level Security (RLS) policies

### External Integrations
- **Lynkscope API:** Brand audit and SEO recommendations (currently mocked)

## 🏗️ Architecture

```
┌─────────────────┐
│   React Frontend│
│   (Port 3000)   │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌──────────────────┐
│  Supabase       │  │  Lynkscope API   │
│  (PostgreSQL)   │  │  (SEO, Trends)   │
│  + Auth + RLS   │  │  [MOCKED]        │
└─────────────────┘  └──────────────────┘
```

### Data Flow

1. **User Journey:**
   ```
   Landing → Auth → Brand Setup → Trend Selection → Upload → Processing → Results
   ```

2. **Clip Generation Flow:**
   ```
   Upload Video
       ↓
   Create video record (status: uploaded)
       ↓
   Processing page: For each platform
       ├── Call Lynkscope getSEORecommendations()
       ├── Generate 2-3 clips with optimized data
       └── Insert clips into Supabase
       ↓
   Update video status (status: complete)
       ↓
   Display results with all clips
   ```

## 📁 Project Structure

```
/app
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React contexts (Auth)
│   │   ├── hooks/           # Custom hooks (Supabase queries)
│   │   ├── integrations/    # Supabase client & types
│   │   ├── pages/           # Route pages
│   │   ├── services/        # External services (Lynkscope)
│   │   └── lib/             # Utilities
│   ├── supabase/            # Database migrations
│   └── package.json
├── backend/                 # FastAPI (not currently in use)
├── LYNKSCOPE_INTEGRATION.md # Detailed integration docs
└── README.md               # This file
```

## 🗄️ Database Schema

### Core Tables

**users**
- Extended profile for Supabase Auth users
- Stores: brand_name, niche
- TODO: Add brand_audit JSONB column for Lynkscope data

**platforms**
- Seeded with: TikTok, Instagram Reels, YouTube Shorts
- Public read access

**trends**
- Platform-specific trending formats
- Contains: title, description, engagement metrics

**videos**
- User's uploaded videos
- Status: uploaded → processing → complete

**generated_clips**
- Clips generated from videos
- Contains: duration, caption, hashtags (from Lynkscope)

**Join Tables:**
- user_platforms: User's selected platforms
- user_trends: User's selected trends

### Security

All tables use **Row Level Security (RLS)** policies:
- Users can only access their own data
- Public tables (platforms, trends) have read-only access
- No bypass possible - enforced at database level

## 🔧 Setup & Installation

### Prerequisites

- Node.js 18+ and Yarn
- Supabase account and project
- (Optional) Lynkscope API credentials

### Environment Variables

Create `/app/frontend/.env`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key

# Lynkscope Configuration (for future real API)
# VITE_LYNKSCOPE_API_URL=https://api.lynkscope.com/v1
# VITE_LYNKSCOPE_API_KEY=your_lynkscope_key
```

### Installation

```bash
# Install dependencies
cd /app/frontend
yarn install

# Start development server
yarn dev

# Build for production
yarn build
```

### Database Setup

1. Create a Supabase project
2. Run the migration in `/app/frontend/supabase/migrations/`
3. Verify RLS policies are enabled
4. Test authentication flow

## 🔌 Lynkscope Integration

### Current State: MOCKED

All Lynkscope API calls currently return **deterministic mock data** based on input parameters. This allows development without requiring real API credentials.

**Mock Behavior:**
- Same brand name → Same results (deterministic)
- Different platforms → Different optimized content
- Simulated network delay: 200-700ms

### Integration Points

1. **Brand Audit:** `getBrandAudit(brandName, niche)`
   - Returns: brand voice, target audience, content themes
   - Currently: In-memory only (not persisted)
   - Future: Store in users.brand_audit JSONB column

2. **SEO Recommendations:** `getSEORecommendations(platform, brandName, niche)`
   - Returns: captions, hashtags, optimal durations, keywords
   - Used in: Clip generation (Processing.tsx)
   - Maps to: generated_clips table

### Migration to Real API

See detailed instructions in `/app/LYNKSCOPE_INTEGRATION.md`

**Quick Summary:**
1. Add API credentials to .env
2. Update BASE_URL in lynkscopeClient.ts
3. Replace mock functions with real fetch calls
4. Keep same response structure (zero changes elsewhere)

## 🧪 Testing

### Manual Testing Flow

1. **Authentication:**
   - Sign up with email
   - Verify email (check Supabase)
   - Sign in

2. **Brand Setup:**
   - Enter brand name and niche
   - Select platforms (TikTok, Instagram, YouTube)

3. **Trend Selection:**
   - Browse platform-specific trends
   - Select 1-3 trends

4. **Upload & Generate:**
   - Upload video file (metadata only - no processing)
   - Wait for processing animation
   - Verify Lynkscope calls in console

5. **Results:**
   - View generated clips
   - Check captions are platform-specific
   - Verify hashtags and durations

### Testing Checklist

- [ ] Authentication works (sign up, sign in, sign out)
- [ ] Brand setup saves to database
- [ ] Platforms saved correctly
- [ ] Trends displayed and selectable
- [ ] Video upload creates database record
- [ ] Processing shows progress animation
- [ ] Lynkscope logs appear in console
- [ ] Clips generated with correct data
- [ ] Results page displays all clips
- [ ] Different brands produce different content
- [ ] Same brand produces same content (deterministic)

## 📝 Logging & Debugging

### Log Formats

All logs use structured format for easy filtering:

```javascript
// Lynkscope logs
[Lynkscope] Request START | endpoint: /seo/recommendations | params: {...}
[Lynkscope] Request END | endpoint: /seo/recommendations | success: true | duration: 345ms

// Clip generation logs
[ClipGeneration] Starting clip generation { videoId: "...", platformCount: 3 }
[ClipGeneration] Successfully created clips { count: 9, clipIds: [...] }

// Processing logs
[Processing] Generating clips with Lynkscope integration {...}
```

### Debugging Tips

1. **Open browser console** - All operations are logged
2. **Check Supabase dashboard** - Verify data writes
3. **Inspect Network tab** - See Supabase API calls
4. **Check RLS policies** - If operations fail, verify permissions

## 🚀 Deployment

### Frontend Deployment

The app is configured for deployment on Emergent platform:

```bash
# Build optimized production bundle
cd /app/frontend
yarn build

# Output directory: /app/frontend/build
```

### Configuration Files

- **vite.config.ts:** Build output to 'build/', server on port 3000
- **package.json:** Start script available
- **.emergent/emergent.yml:** Source marked as "lovable"

### Environment Variables (Production)

Set these in your deployment platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- (Future) `VITE_LYNKSCOPE_API_KEY`

## 🛣️ Roadmap

### Phase 1: Core Functionality ✅
- [x] Authentication with Supabase
- [x] Brand setup and profile
- [x] Platform and trend selection
- [x] Video upload (metadata only)
- [x] Lynkscope integration (mocked)
- [x] Clip generation with SEO data
- [x] Results display

### Phase 2: Real Video Processing (Future)
- [ ] Actual video upload to Supabase Storage
- [ ] Real Lynkscope API integration
- [ ] Video trimming and processing
- [ ] Thumbnail generation
- [ ] Download functionality

### Phase 3: Enhanced Features (Future)
- [ ] Brand audit data persistence
- [ ] Analytics dashboard
- [ ] Bulk video processing
- [ ] Custom caption editing
- [ ] Direct social media posting
- [ ] Team collaboration

### Phase 4: Scale & Optimize (Future)
- [ ] Background job processing
- [ ] CDN integration
- [ ] Advanced caching
- [ ] Performance monitoring
- [ ] A/B testing framework

## 📚 Documentation

- **[LYNKSCOPE_INTEGRATION.md](./LYNKSCOPE_INTEGRATION.md):** Detailed Lynkscope integration docs
- **[Supabase Migrations](./frontend/supabase/migrations/):** Database schema
- **Code Comments:** Extensive inline documentation

## 🤝 Contributing

This is an early-stage SaaS project. The codebase is designed for:
- **Clean separation of concerns**
- **Easy testing and debugging**
- **Future extensibility**
- **Real API integration readiness**

### Key Principles

1. **No premature optimization** - Build features, optimize later
2. **Data first** - Focus on correct data flow, not heavy processing
3. **Safety first** - RLS policies, validation, error handling
4. **Log everything** - Structured logging for debugging

## 📄 License

Proprietary - All rights reserved

## 📞 Support

For issues or questions:
1. Check browser console logs
2. Review `/app/LYNKSCOPE_INTEGRATION.md`
3. Inspect Supabase dashboard
4. Check RLS policies

---

**Built with** ⚡ **Cliplyst** - Transform your content, amplify your reach.
