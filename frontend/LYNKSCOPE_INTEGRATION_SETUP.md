# 🔗 Cliplyst - Lynkscope Integration Setup Guide

Complete step-by-step guide to connect Cliplyst with Lynkscope.

---

## Overview

Cliplyst provides a backend-to-backend API that Lynkscope uses to:
1. Submit content creation requests
2. Receive real-time job status updates
3. Retrieve generated videos and scheduling information

---

## Prerequisites

Before starting, you need:

- ✅ Cliplyst deployed and running (production URL)
- ✅ Lynkscope instance with API access
- ✅ HTTPS endpoint for both services
- ✅ Supabase project connected to Cliplyst
- ✅ Buffer OAuth credentials (for social publishing)

---

## Step 1: Generate API Credentials

### 1.1 Create Cliplyst Integration Key

Generate a secure random key for Lynkscope authentication:

```bash
# Generate 32-byte hex string
openssl rand -hex 16
# Output: <save-this-as-VITE_LYNKSCOPE_INTERNAL_KEY>
```

Store this key as `VITE_LYNKSCOPE_INTERNAL_KEY` in Cliplyst's environment.

### 1.2 Create JWT Secret

Generate a 32-byte hex string for JWT signing (HS256):

```bash
openssl rand -hex 16
# Output: <save-this-as-JWT_SECRET>
```

Store this key as `JWT_SECRET` in Cliplyst's environment.

---

## Step 2: Configure Cliplyst Environment

Update Cliplyst's `.env` with these variables:

```env
# Lynkscope Integration
VITE_CLIPLYST_API_URL=<provided-by-cliplyst-team>
VITE_LYNKSCOPE_INTERNAL_KEY=<provided-by-cliplyst-team>
JWT_SECRET=<provided-by-cliplyst-team>

# CORS Configuration (allow Lynkscope domain)
CORS_ALLOWED_ORIGINS=https://lynkscope.com,https://app.lynkscope.com,http://localhost:3001

# Other required keys (from earlier setup)
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
PEXELS_API_KEY=...
JAMENDO_CLIENT_ID=...
JAMENDO_CLIENT_SECRET=...
BUFFER_CLIENT_ID=...
BUFFER_CLIENT_SECRET=...
BUFFER_ENCRYPTION_KEY=...
```

---

## Step 3: Configure Lynkscope Environment

Update Lynkscope's `.env` with Cliplyst credentials:

```env
# Cliplyst Integration
VITE_CLIPLYST_API_URL=<provided-by-cliplyst-team>
VITE_LYNKSCOPE_INTERNAL_KEY=<provided-by-cliplyst-team>
JWT_SECRET=<provided-by-cliplyst-team>
```

---

## Step 4: Deploy Changes

### On Cliplyst:

```bash
# Add environment variables to deployment platform
# (Vercel, Render, Heroku, etc.)

# Redeploy
git push origin main

# Verify deployment
curl https://cliplyst-content-maker.onrender.com/api/health
# Expected: 200 OK
```

### On Lynkscope:

```bash
# Add environment variables to deployment platform

# Redeploy
git push origin main
```

---

## Step 5: Test Integration

### 5.1 Test Cliplyst Health Check

```bash
curl https://cliplyst-content-maker.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0",
  "services": {
    "supabase": "connected",
    "buffer": "ready",
    "external_apis": "ready"
  }
}
```

### 5.2 Test Lynkscope → Cliplyst Job Creation

From Lynkscope, create a content job:

```bash
curl -X POST https://cliplyst-content-maker.onrender.com/api/jobs/create-content \
  -H "Authorization: Bearer <your-lynkscope-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "lynkscope-user-123",
    "company_name": "FitMax Training",
    "niche": "fitness",
    "weak_platforms": ["tiktok", "instagram"],
    "top_opportunities": ["short form tutorials", "fitness challenges"],
    "auto_schedule": true,
    "posting_frequency": "weekly"
  }'
```

Expected response (202 Accepted):
```json
{
  "status": "accepted",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Content job queued for processing"
}
```

### 5.3 Test Job Status Polling

```bash
curl -X GET https://cliplyst-content-maker.onrender.com/api/jobs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your-lynkscope-key>"
```

Expected response (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "company_name": "FitMax Training",
  "niche": "fitness",
  "progress": {
    "trends_discovered": 3,
    "scripts_generated": 2,
    "videos_created": 1,
    "scheduled": 1
  },
  "created_at": "2026-02-01T12:00:00Z",
  "updated_at": "2026-02-01T12:15:30Z"
}
```

Status values:
- `pending` - Job created, waiting to start
- `processing` - Actively creating content
- `complete` - Finished successfully, videos available
- `failed` - Error occurred, check error message

---

## Step 6: CORS Configuration

Lynkscope domain must be whitelisted in Cliplyst's CORS settings:

### Option 1: Environment Variable (Recommended)

Update `CORS_ALLOWED_ORIGINS` in `.env`:

```env
CORS_ALLOWED_ORIGINS=https://lynkscope.com,https://app.lynkscope.com,https://dev.lynkscope.com
```

### Option 2: Hardcoded in Code

If using hardcoded CORS, update in Cliplyst's Express middleware:

```typescript
const CORS_ALLOWED_ORIGINS = [
  'https://lynkscope.com',
  'https://app.lynkscope.com',
  'https://dev.lynkscope.com',
  'http://localhost:3001', // local development
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || CORS_ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Step 7: API Documentation for Lynkscope Integration

### Endpoint 1: Create Content Job

**POST** `/api/jobs/create-content`

**Authentication**: Bearer token (VITE_LYNKSCOPE_INTERNAL_KEY)

**Request Body**:
```typescript
{
  user_id: string;           // UUID of Lynkscope user (if applicable)
  company_name: string;      // Brand/business name
  niche: string;             // Content niche (fitness, marketing, beauty, etc.)
  weak_platforms: string[];  // Platforms needing content (tiktok, instagram, youtube)
  top_opportunities: string[]; // Marketing opportunities to address
  auto_schedule: boolean;    // Enable automatic scheduling
  posting_frequency: string; // 'daily' | 'thrice_weekly' | 'weekly' | 'monthly'
}
```

**Response** (202 Accepted):
```typescript
{
  status: 'accepted';
  job_id: string;           // UUID for polling status
  message: string;
}
```

**Error Responses**:
```
401 Unauthorized - Invalid/missing VITE_LYNKSCOPE_INTERNAL_KEY
400 Bad Request - Missing required fields
500 Internal Server Error - Processing error
```

---

### Endpoint 2: Get Job Status

**GET** `/api/jobs/{jobId}`

**Authentication**: Bearer token (VITE_LYNKSCOPE_INTERNAL_KEY)

**Response** (200 OK):
```typescript
{
  id: string;                    // Job UUID
  status: 'pending' | 'processing' | 'complete' | 'failed';
  company_name: string;
  niche: string;
  weak_platforms: string[];
  opportunities: string[];
  progress: {
    trends_discovered: number;
    scripts_generated: number;
    videos_created: number;
    scheduled: number;
  };
  result_videos?: {               // Only if status === 'complete'
    id: string;
    url: string;
    caption: string;
    hashtags: string[];
    scheduled_for: string;        // ISO timestamp
  }[];
  error_message?: string;         // Only if status === 'failed'
  created_at: string;             // ISO timestamp
  updated_at: string;             // ISO timestamp
}
```

---

## Step 8: Webhook Notifications (Optional)

To receive real-time updates instead of polling, configure webhooks:

### Register Webhook Endpoint

```bash
curl -X POST https://cliplyst-content-maker.onrender.com/api/webhooks/register \
  -H "Authorization: Bearer VITE_LYNKSCOPE_INTERNAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://lynkscope.com/api/cliplyst/webhooks/jobs",
    "events": ["job.complete", "job.failed"]
  }'
```

### Webhook Payload (POST to your URL)

```json
{
  "event": "job.complete",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-02-01T12:30:00Z",
  "data": {
    "status": "complete",
    "videos": [
      {
        "id": "video-1",
        "url": "https://storage.supabase.io/v1/object/public/videos/...",
        "caption": "Transform your fitness journey",
        "hashtags": ["#fitness", "#motivation"],
        "scheduled_for": "2026-02-08T10:00:00Z"
      }
    ]
  }
}
```

---

## Step 9: Monitoring & Logging

### View Job Processing Logs

```bash
# On Cliplyst deployment platform
# (e.g., Render.com, Vercel, Heroku logs)

# Render
render logs cliplyst-app

# Vercel
vercel logs

# Heroku
heroku logs --tail
```

### Monitor Job Queue

Query Supabase directly:

```sql
-- Active jobs
SELECT id, status, company_name, created_at, updated_at
FROM content_jobs
WHERE status IN ('pending', 'processing')
ORDER BY created_at DESC
LIMIT 10;

-- Recently completed jobs
SELECT id, status, company_name, result_videos, completed_at
FROM content_jobs
WHERE status = 'complete'
ORDER BY completed_at DESC
LIMIT 10;

-- Failed jobs
SELECT id, status, company_name, error_message, created_at
FROM content_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Step 10: Troubleshooting

### Issue: 401 Unauthorized

**Cause**: Invalid or missing VITE_LYNKSCOPE_INTERNAL_KEY

**Solution**: 
1. Verify the key is identical on both Cliplyst and Lynkscope
2. Check environment variables are loaded correctly
3. Ensure Bearer token is in Authorization header

```bash
# Test with correct token
curl -X POST https://cliplyst-content-maker.onrender.com/api/jobs/create-content \
  -H "Authorization: Bearer YOUR_ACTUAL_KEY" \
  ...
```

### Issue: 400 Bad Request

**Cause**: Missing or invalid fields

**Solution**: Verify all required fields are present:
```json
{
  "user_id": "non-empty-string",
  "company_name": "non-empty-string",
  "niche": "fitness",  // Must be supported niche
  "weak_platforms": ["tiktok"],  // Non-empty array
  "top_opportunities": ["tutorials"],
  "auto_schedule": true,
  "posting_frequency": "weekly"
}
```

### Issue: 500 Internal Server Error

**Cause**: Processing error (API failure, Supabase issue, etc.)

**Solution**:
1. Check Cliplyst logs for error details
2. Verify all external APIs are accessible (OpenAI, ElevenLabs, Pexels, etc.)
3. Check Supabase connection
4. Retry the job after 30 seconds

### Issue: Job Status Always "pending"

**Cause**: Worker not running or job stuck in queue

**Solution**:
1. Check if Edge Function `buffer-publish-worker` is deployed
2. Verify job doesn't have error_message
3. Check Supabase logs for processing errors
4. Try smaller job (fewer platforms/videos)

### Issue: CORS Errors from Lynkscope

**Cause**: Lynkscope domain not whitelisted

**Solution**: Add Lynkscope domain to `CORS_ALLOWED_ORIGINS`:
```env
CORS_ALLOWED_ORIGINS=https://lynkscope.com,https://app.lynkscope.com
```

---

## Security Best Practices

1. **Never expose VITE_LYNKSCOPE_INTERNAL_KEY**: Keep it secret, only share with Lynkscope
2. **Use HTTPS only**: All API calls must be over HTTPS
3. **Rotate credentials regularly**: Change keys every 90 days in production
4. **Log all requests**: Monitor API usage for suspicious activity
5. **Validate all inputs**: Cliplyst validates all incoming requests
6. **Rate limiting**: Implement rate limits (e.g., 100 requests/minute per API key)

---

## Integration Checklist

- [ ] Generated VITE_LYNKSCOPE_INTERNAL_KEY
- [ ] Generated JWT_SECRET
- [ ] Updated Cliplyst .env variables
- [ ] Updated Lynkscope .env variables
- [ ] Deployed Cliplyst with new environment variables
- [ ] Deployed Lynkscope with new environment variables
- [ ] Tested health check endpoint
- [ ] Tested job creation endpoint
- [ ] Tested job status polling
- [ ] Whitelisted Lynkscope domain in CORS
- [ ] Set up error logging/monitoring
- [ ] Documented credentials securely
- [ ] Planned credential rotation schedule

---

## Support & Questions

If you encounter issues:

1. Check the troubleshooting section above
2. Review Cliplyst logs: `render logs cliplyst-app` (or your deployment platform)
3. Verify all environment variables are set correctly
4. Test individual endpoints with curl
5. Contact Cliplyst support with job IDs for failed jobs

---

**Last Updated**: February 1, 2026  
**Version**: 1.0
