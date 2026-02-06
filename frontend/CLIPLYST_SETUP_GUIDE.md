# 🚀 Cliplyst Production Deployment & Lynkscope Integration Checklist

Complete setup guide for deploying Cliplyst and connecting it with Lynkscope.

---

## Quick Start Summary

**What you need:**
- Cliplyst API running (production URL)
- Lynkscope instance (production URL)
- Shared API credentials (3 environment variables)
- Domain whitelisting for CORS

**Time to complete:** ~30 minutes

---

## Phase 1: Generate Credentials (5 minutes)

### Step 1.1: Generate Lynkscope Internal Key

This is the shared secret for API authentication between Lynkscope and Cliplyst.

```bash
# Generate a random 32-character hex string
openssl rand -hex 16

# Example output:
# <save-this-as-VITE_LYNKSCOPE_INTERNAL_KEY>
```

**Store this value as: `VITE_LYNKSCOPE_INTERNAL_KEY`**

### Step 1.2: Generate JWT Secret

For signing session tokens between systems.

```bash
openssl rand -hex 16

# Example output:
# <save-this-as-JWT_SECRET>
```

**Store this value as: `JWT_SECRET`**

### Step 1.3: Get Cliplyst API URL

Determine where Cliplyst is deployed:

- **Production**: `https://cliplyst-content-maker.onrender.com`
- **Custom Domain**: `https://yourdomain.com`
- **Local Development**: `http://localhost:3000`

**Store this value as: `VITE_CLIPLYST_API_URL`**

---

## Phase 2: Configure Cliplyst (10 minutes)

### Step 2.1: Update Cliplyst Environment Variables

Add these to your Cliplyst deployment platform (Render, Vercel, Heroku, etc.):

```env
# Lynkscope Integration
VITE_CLIPLYST_API_URL=<provided-by-cliplyst-team>
VITE_LYNKSCOPE_INTERNAL_KEY=<provided-by-cliplyst-team>
JWT_SECRET=<provided-by-cliplyst-team>

# External APIs (if not already configured)
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
PEXELS_API_KEY=...
JAMENDO_CLIENT_ID=...
JAMENDO_CLIENT_SECRET=...

# Buffer Integration
BUFFER_CLIENT_ID=...
BUFFER_CLIENT_SECRET=...
BUFFER_ENCRYPTION_KEY=...

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

### Step 2.2: Deploy Cliplyst

```bash
git add .env.example
git commit -m "docs: add environment configuration template"
git push origin main

# Redeploy on your platform (automatic for most platforms)
# Or manually trigger deployment
```

### Step 2.3: Verify Cliplyst Health

```bash
curl https://cliplyst-content-maker.onrender.com/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-02-01T...",
  "version": "1.0",
  "services": {
    "api": "operational",
    "supabase": "connected",
    "buffer": "ready",
    "external_apis": "ready"
  }
}
```

---

## Phase 3: Configure Lynkscope (10 minutes)

### Step 3.1: Update Lynkscope Environment Variables

Add these to Lynkscope's deployment platform:

```env
# Cliplyst Integration
VITE_CLIPLYST_API_URL=<provided-by-cliplyst-team>
VITE_LYNKSCOPE_INTERNAL_KEY=<provided-by-cliplyst-team>
JWT_SECRET=<provided-by-cliplyst-team>
```

### Step 3.2: Deploy Lynkscope

```bash
git add .env
git commit -m "feat: configure Cliplyst integration"
git push origin main

# Redeploy on your platform
```

### Step 3.3: Verify Credentials Loaded

From Lynkscope, verify the credentials are loaded:

```bash
# In Lynkscope's API or logs, you should see:
console.log('Cliplyst API URL:', process.env.VITE_CLIPLYST_API_URL);
console.log('Has Lynkscope key:', !!process.env.VITE_LYNKSCOPE_INTERNAL_KEY);
console.log('Has JWT secret:', !!process.env.JWT_SECRET);
```

---

## Phase 4: CORS Configuration (5 minutes)

### Step 4.1: Whitelist Lynkscope Domain

In Cliplyst, whitelist Lynkscope's domain for CORS.

**Location**: Cliplyst API middleware (if using Express-like framework)

```typescript
// src/middleware/cors.ts
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
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Step 4.2: Test CORS from Lynkscope Domain

```bash
# From Lynkscope, test CORS preflight
curl -i -X OPTIONS https://cliplyst-content-maker.onrender.com/api/jobs/create-content \
  -H "Origin: https://lynkscope.com" \
  -H "Access-Control-Request-Method: POST"

# Should return 200 with CORS headers:
# Access-Control-Allow-Origin: https://lynkscope.com
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

---

## Phase 5: Test Integration (5 minutes)

### Test 5.1: Create a Content Job

From Lynkscope, submit a content creation request:

```bash
curl -X POST https://cliplyst-content-maker.onrender.com/api/jobs/create-content \
  -H "Authorization: Bearer <your-lynkscope-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "lynkscope-user-001",
    "company_name": "FitMax Training",
    "niche": "fitness",
    "weak_platforms": ["tiktok", "instagram"],
    "top_opportunities": ["short form tutorials", "fitness challenges"],
    "auto_schedule": true,
    "posting_frequency": "weekly"
  }'

# Expected response (202 Accepted):
{
  "status": "accepted",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Content generation job queued successfully"
}
```

### Test 5.2: Poll Job Status

```bash
curl -X GET https://cliplyst-content-maker.onrender.com/api/jobs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your-lynkscope-key>"

# Expected response:
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

Job status values:
- `pending` - Queued, waiting to start
- `processing` - Currently creating content
- `complete` - Finished, videos ready
- `failed` - Error occurred

### Test 5.3: Monitor Logs

Watch Cliplyst logs for job processing:

```bash
# Render.com
render logs cliplyst-app

# Vercel
vercel logs

# Heroku
heroku logs --tail
```

Look for:
```
[Pipeline] Starting for job: 550e8400...
[Pipeline] Status updated to processing
[Pipeline] Discovering trends for niche: fitness
[Pipeline] Creating videos...
[Pipeline] Job completed successfully
```

---

## Troubleshooting

### Issue: 401 Unauthorized

```
{
  "error": "Unauthorized",
  "message": "Invalid or missing Authorization header"
}
```

**Solutions**:
1. Verify token format: `Authorization: Bearer YOUR_KEY`
2. Verify the key matches `VITE_LYNKSCOPE_INTERNAL_KEY` exactly
3. Check environment variables loaded correctly

```bash
# Test with correct token
curl -X POST https://cliplyst-content-maker.onrender.com/api/jobs/create-content \
  -H "Authorization: Bearer <your-lynkscope-key>" \
  ...
```

### Issue: 400 Bad Request

```
{
  "error": "Bad Request",
  "message": "Missing required fields: company_name"
}
```

**Solutions**:
1. Verify all required fields present: `user_id`, `company_name`, `niche`
2. Verify niche is in supported list (fitness, marketing, beauty, etc.)
3. Verify arrays are JSON arrays, not strings

```bash
# Correct payload
{
  "user_id": "uuid-string",
  "company_name": "Company Name",
  "niche": "fitness",
  "weak_platforms": ["tiktok"],
  "top_opportunities": ["tutorials"],
  "auto_schedule": true,
  "posting_frequency": "weekly"
}
```

### Issue: CORS Error

```
Access to XMLHttpRequest at 'https://cliplyst.../api/jobs/create-content'
from origin 'https://lynkscope.com' has been blocked by CORS policy
```

**Solutions**:
1. Add Lynkscope domain to `CORS_ALLOWED_ORIGINS` in Cliplyst
2. Redeploy Cliplyst with updated CORS config
3. Test CORS preflight succeeds

```bash
curl -i -X OPTIONS https://cliplyst-content-maker.onrender.com/api/jobs/create-content \
  -H "Origin: https://lynkscope.com" \
  -H "Access-Control-Request-Method: POST"

# Should include:
# HTTP/1.1 200 OK
# Access-Control-Allow-Origin: https://lynkscope.com
```

### Issue: Job Status Always "pending"

**Solutions**:
1. Check Cliplyst logs for errors
2. Verify Supabase connection
3. Verify all external APIs accessible
4. Wait longer (initial job may take 2-5 minutes)

```bash
# Check job in Supabase directly
supabase db shell

SELECT id, status, error_message FROM content_jobs WHERE id = 'job-id';
```

---

## Security Checklist

- [ ] `VITE_LYNKSCOPE_INTERNAL_KEY` is random and unique
- [ ] `JWT_SECRET` is random and unique  
- [ ] Never commit credentials to git
- [ ] Use environment variables for all secrets
- [ ] HTTPS enforced for all API calls
- [ ] CORS whitelist includes only trusted domains
- [ ] API key validation uses constant-time comparison
- [ ] Rate limiting configured (if needed)
- [ ] Logging enabled for audit trail
- [ ] Key rotation scheduled (every 90 days)

---

## Deployment Checklist

**Before going to production:**

- [ ] All environment variables configured in deployment platform
- [ ] Cliplyst deployed and running
- [ ] Lynkscope deployed with Cliplyst credentials
- [ ] Health check endpoint responding (200 OK)
- [ ] Test job creation succeeds (202 Accepted)
- [ ] Test job status polling works (200 OK)
- [ ] Job processing completes (status = "complete")
- [ ] Videos generated and accessible
- [ ] Logs monitored for errors
- [ ] CORS working from Lynkscope domain
- [ ] Credentials rotated and secured

---

## Monitoring & Support

### Health Monitoring

```bash
# Monitor Cliplyst health every minute
watch -n 60 'curl -s https://cliplyst-content-maker.onrender.com/api/health | jq'
```

### Log Monitoring

```bash
# Stream logs from deployment platform
render logs cliplyst-app --tail
```

### Job Monitoring

```bash
# Check job queue in Supabase
supabase db shell

-- Running jobs
SELECT COUNT(*) as running_jobs FROM content_jobs WHERE status = 'processing';

-- Failed jobs
SELECT id, company_name, error_message FROM content_jobs WHERE status = 'failed' LIMIT 10;
```

### API Metrics

```bash
# Success rate
SELECT 
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN status = 'complete' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  ROUND(100.0 * COUNT(CASE WHEN status = 'complete' THEN 1 END) / COUNT(*), 2) as success_rate
FROM content_jobs
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

**Integration Complete!** 🎉

Cliplyst and Lynkscope are now connected and ready for production.
