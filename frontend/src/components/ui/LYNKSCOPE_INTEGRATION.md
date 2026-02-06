# Lynkscope Integration Documentation

## Overview

This document describes the Lynkscope integration layer in Cliplyst. The integration provides a clean abstraction for communicating with Lynkscope's brand audit and SEO recommendation APIs.

**Current State:** All Lynkscope responses are **MOCKED** for development. The mock data is deterministic based on input parameters.

**Future State:** When Lynkscope APIs are ready, the mock functions can be swapped with real HTTP calls without changing the rest of the application.

---

## Architecture

### File Structure

```
/app/frontend/src/
├── services/
│   └── lynkscopeClient.ts          # Lynkscope API client (MOCKED)
├── hooks/
│   └── useSupabaseData.ts          # Clip generation with Lynkscope integration
└── pages/
    └── Processing.tsx              # Orchestrates clip generation flow
```

---

## Lynkscope Client API

### Location
`/app/frontend/src/services/lynkscopeClient.ts`

### Functions

#### 1. `getBrandAudit(brandName, niche?)`

**Purpose:** Fetch brand audit analysis from Lynkscope.

**Parameters:**
- `brandName` (string, required): The brand name to audit
- `niche` (string, optional): Brand niche/industry

**Returns:** `BrandAuditResponse`
```typescript
{
  success: boolean;
  data?: {
    brandName: string;
    brandVoice: string;              // e.g., "Professional and authoritative"
    targetAudience: string[];        // e.g., ["Young professionals", "Entrepreneurs"]
    contentThemes: string[];         // e.g., ["Innovation", "Growth strategies"]
    recommendedTone: string;         // e.g., "informative"
    keyMessages: string[];           // e.g., ["Drive results through innovation"]
  };
  error?: string;
  timestamp: string;
}
```

**Current Behavior:**
- Returns deterministic mock data based on brand name hash
- Same brand name always produces same results
- 3 different variations based on hash modulo

**Future Integration:**
- Replace mock with real HTTP POST to Lynkscope API
- Keep same response structure
- Add authentication headers

**Example Usage:**
```typescript
import { getBrandAudit } from '@/services/lynkscopeClient';

const response = await getBrandAudit('MyBrand', 'Marketing');
if (response.success) {
  console.log('Brand voice:', response.data.brandVoice);
  console.log('Target audience:', response.data.targetAudience);
}
```

---

#### 2. `getSEORecommendations(platform, brandName?, niche?)`

**Purpose:** Fetch SEO and content recommendations for a specific platform.

**Parameters:**
- `platform` (string, required): Platform name (e.g., 'TikTok', 'Instagram Reels', 'YouTube Shorts')
- `brandName` (string, optional): Brand name for personalization
- `niche` (string, optional): Brand niche/industry

**Returns:** `SEORecommendationsResponse`
```typescript
{
  success: boolean;
  data?: {
    platform: string;
    captions: string[];              // Array of optimized captions
    hashtags: string[][];            // Array of hashtag sets
    optimalDurations: number[];      // Duration recommendations in seconds
    keywords: string[];              // Relevant keywords
    contentTips: string[];           // Platform-specific tips
  };
  error?: string;
  timestamp: string;
}
```

**Current Behavior:**
- Returns platform-specific mock data
- Personalized based on brand name (deterministic)
- Different content for TikTok, Instagram, and YouTube

**Platform-Specific Characteristics:**

| Platform | Optimal Durations | Caption Style | Hashtag Strategy |
|----------|------------------|---------------|------------------|
| TikTok | 15s, 21s, 30s | POV, hooks, viral language | #fyp, #viral, niche tags |
| Instagram Reels | 18s, 25s, 35s | Transformation, BTS, aesthetic | #reels, #explore, niche tags |
| YouTube Shorts | 25s, 35s, 45s | Tutorial, explained, guides | #shorts, #howto, niche tags |

**Future Integration:**
- Replace mock with real HTTP POST to Lynkscope API
- Keep same response structure
- Add authentication headers

**Example Usage:**
```typescript
import { getSEORecommendations } from '@/services/lynkscopeClient';

const response = await getSEORecommendations(
  'TikTok',
  'MyBrand',
  'Fitness'
);

if (response.success) {
  console.log('Captions:', response.data.captions);
  console.log('Hashtags:', response.data.hashtags);
  console.log('Optimal durations:', response.data.optimalDurations);
}
```

---

## Clip Generation Flow

### High-Level Flow

```
User uploads video
    ↓
Processing page loads
    ↓
For each selected platform:
    1. Call Lynkscope getSEORecommendations()
    2. Generate 2-3 clips with Lynkscope data
    3. Insert clips into Supabase
    ↓
Mark video as complete
    ↓
Navigate to Results page
```

### Implementation

**File:** `/app/frontend/src/hooks/useSupabaseData.ts`

**Function:** `useCreateGeneratedClips()`

**Process:**
1. **Validate user owns video** (RLS policies enforce this)
2. **Validate platforms exist** (check array not empty)
3. **For each platform:**
   - Call `getSEORecommendations(platform.name, brandName, niche)`
   - Generate 2-3 clips using returned data:
     - Use `optimalDurations` for clip durations
     - Use `captions` for clip captions
     - Use `hashtags` for clip hashtags
4. **Insert all clips atomically** (no partial writes)
5. **Log success/failure** at each step

**Error Handling:**
- Validates ownership before processing
- Fails gracefully if Lynkscope call fails
- Logs all errors with structured format
- Returns structured error messages
- No partial data writes

**Example Logs:**
```
[ClipGeneration] Starting clip generation { videoId: '...', platformCount: 3 }
[Lynkscope] Request START | endpoint: /seo/recommendations | params: {...}
[Lynkscope] Request END | endpoint: /seo/recommendations | success: true | duration: 345ms
[ClipGeneration] Generated clip 1/3 for TikTok { duration: 21, hashtagCount: 5 }
[ClipGeneration] Writing 9 clips to Supabase
[ClipGeneration] Successfully created clips { count: 9, clipIds: [...] }
```

---

## Data Flow & Mapping

### Lynkscope → Supabase Mapping

| Lynkscope Field | Supabase Table | Supabase Column | Notes |
|-----------------|----------------|-----------------|-------|
| `captions[i]` | `generated_clips` | `caption` | One caption per clip |
| `hashtags[i]` | `generated_clips` | `hashtags` | Array of strings |
| `optimalDurations[i]` | `generated_clips` | `duration_seconds` | Integer (seconds) |
| `brandVoice` | *(in-memory)* | N/A | TODO: Store in JSONB column |
| `targetAudience` | *(in-memory)* | N/A | TODO: Store in JSONB column |
| `contentThemes` | *(in-memory)* | N/A | TODO: Store in JSONB column |

### Brand Audit Data Storage (Future)

**Current:** Brand audit data is fetched but NOT persisted (in-memory only).

**Future Schema Change (when needed):**
```sql
-- Add JSONB column to users table for brand audit data
ALTER TABLE users ADD COLUMN brand_audit JSONB;

-- Example structure:
{
  "brandVoice": "Professional and authoritative",
  "targetAudience": ["Young professionals", "Entrepreneurs"],
  "contentThemes": ["Innovation", "Growth strategies"],
  "recommendedTone": "informative",
  "keyMessages": ["Drive results through innovation"],
  "lastUpdated": "2025-01-25T12:00:00Z"
}
```

**Usage locations where brand audit could be used:**
1. **BrandSetup.tsx:** Display brand recommendations after setup
2. **TrendSelection.tsx:** Filter trends based on brand themes
3. **Processing.tsx:** Pass brand voice to Lynkscope for better recommendations
4. **Results.tsx:** Show brand alignment score for generated clips

---

## Security & Data Safety

### Row Level Security (RLS)

All clip generation operations respect Supabase RLS policies:

- **Users can only generate clips for their own videos**
- **Users can only view their own clips**
- **Platform IDs are validated against public platforms table**

### Validation Checks

1. ✅ User authentication required
2. ✅ Video ownership verified
3. ✅ Platform IDs validated (not empty)
4. ✅ Lynkscope responses validated
5. ✅ No partial writes (atomic inserts)

### Error Handling

All errors are structured and logged:

```typescript
// Example error response
{
  success: false,
  error: "Failed to get recommendations for TikTok: Network timeout",
  timestamp: "2025-01-25T12:00:00Z"
}
```

---

## Logging & Debugging

### Log Formats

**Lynkscope Requests:**
```
[Lynkscope] Request START | endpoint: /brand/audit | params: { brandName: "MyBrand" }
[Lynkscope] Request END | endpoint: /brand/audit | success: true | duration: 234ms
[Lynkscope] Request ERROR | endpoint: /brand/audit | error: Error(...)
```

**Clip Generation:**
```
[ClipGeneration] Starting clip generation { videoId: "...", platformCount: 3 }
[ClipGeneration] Fetching Lynkscope recommendations for TikTok
[ClipGeneration] Generated clip 1/3 for TikTok { duration: 21, hashtagCount: 5 }
[ClipGeneration] Writing 9 clips to Supabase
[ClipGeneration] Successfully created clips { count: 9, clipIds: [...] }
```

**Processing:**
```
[Processing] Updating video status to processing
[Processing] Generating clips with Lynkscope integration { platformCount: 3, brandName: "MyBrand" }
[Processing] Updating video status to complete
```

### Debugging Tips

1. **Check browser console** for all Lynkscope and clip generation logs
2. **Verify Supabase data** using Supabase dashboard
3. **Check network delay** in mock (200-700ms simulated)
4. **Validate deterministic behavior** - same inputs = same outputs

---

## Migration to Real Lynkscope API

### Step-by-Step Migration

#### 1. Update Configuration
```typescript
// In lynkscopeClient.ts
const BASE_URL = 'https://api.lynkscope.com/v1'; // Real endpoint
const API_KEY = import.meta.env.VITE_LYNKSCOPE_API_KEY;
```

#### 2. Add Environment Variables
```bash
# .env
VITE_LYNKSCOPE_API_KEY=your_api_key_here
VITE_LYNKSCOPE_API_URL=https://api.lynkscope.com/v1
```

#### 3. Replace Mock Functions

**Before (Mock):**
```typescript
// Simulate network delay
await simulateNetworkDelay();

// Generate mock response
const mockData = generateBrandAuditMock(brandName, niche);
```

**After (Real API):**
```typescript
const response = await fetch(`${BASE_URL}/brand/audit`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  },
  body: JSON.stringify({ brandName, niche }),
  signal: AbortSignal.timeout(REQUEST_TIMEOUT),
});

if (!response.ok) {
  throw new Error(`API error: ${response.status}`);
}

const data = await response.json();
```

#### 4. Keep Response Structure

**Important:** The real API should return the same response structure as mocks:
- Same field names
- Same data types
- Same nesting

This ensures zero changes needed in the rest of the application.

#### 5. Remove Mock Generators

Once real API is working, delete:
- `generateBrandAuditMock()`
- `generateSEORecommendationsMock()`
- `simulateNetworkDelay()`

#### 6. Update Comments

Remove all "MOCKED" comments and "TODO: Replace with real API" notes.

---

## Testing

### Manual Testing Checklist

- [ ] Upload video with brand name set
- [ ] Verify Lynkscope logs appear in console
- [ ] Check clips generated with correct data
- [ ] Verify captions are platform-specific
- [ ] Verify hashtags are relevant
- [ ] Verify durations match platform norms
- [ ] Test with different brand names (should produce different results)
- [ ] Test with same brand name twice (should produce identical results)
- [ ] Test error handling (network timeout, etc.)

### Test Data

**Test Brand Names:**
```
"TechStartup" → Professional tone, young professionals
"FitnessGuru" → Energetic tone, fitness enthusiasts
"FoodBlog" → Casual tone, food lovers
```

---

## Troubleshooting

### Common Issues

#### Issue: Clips not generating

**Solution:**
1. Check browser console for error logs
2. Verify user has selected platforms
3. Verify user profile has brand_name set
4. Check Supabase RLS policies

#### Issue: Same captions for all platforms

**Solution:**
1. Verify `getSEORecommendations` is called for each platform
2. Check platform names match exactly (case-sensitive)
3. Verify mock data generator uses platform parameter

#### Issue: Lynkscope timeout errors

**Solution:**
1. Current timeout is 5 seconds (adjust in `lynkscopeClient.ts`)
2. Check network delays in mock (200-700ms)
3. For real API, verify endpoint is reachable

---

## Future Enhancements

### Phase 1: Brand Audit Persistence
- Add JSONB column to users table
- Store brand audit results
- Display in UI (BrandSetup page)
- Cache for 24 hours, refresh daily

### Phase 2: Advanced Personalization
- Use brand voice in caption generation
- Filter trends by content themes
- Match hashtags to target audience
- A/B test different tones

### Phase 3: Analytics Integration
- Track clip performance by platform
- Learn from successful clips
- Adjust recommendations based on analytics
- Provide performance insights

### Phase 4: Real-Time Updates
- WebSocket connection for long processing
- Progress updates during clip generation
- Cancel in-progress generation
- Resume failed generations

---

## Contact & Support

For questions about Lynkscope integration:
- Review this documentation
- Check browser console logs
- Inspect `/app/frontend/src/services/lynkscopeClient.ts`
- Verify data flow in `/app/frontend/src/hooks/useSupabaseData.ts`

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Status:** Mocked (Ready for Real API Integration)
