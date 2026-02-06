# 🎯 Cliplyst → Lynkscope Integration: Complete Master Guide

**Complete setup and integration guide for connecting Cliplyst with Lynkscope.**

---

## 📚 Documentation Index

This integration consists of multiple guides. Start here and follow the links:

### For Lynkscope Integration Team:
1. **[INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)** ← Start here
   - Quick reference of required credentials
   - Deployment checklist
   - Troubleshooting

2. **[LYNKSCOPE_INTEGRATION_GUIDE.md](LYNKSCOPE_INTEGRATION_GUIDE.md)**
   - Complete API reference
   - How to call Cliplyst endpoints
   - Code examples

3. **[CLIPLYST_SETUP_GUIDE.md](CLIPLYST_SETUP_GUIDE.md)**
   - Step-by-step deployment instructions
   - Environment configuration
   - Testing procedures

### For Cliplyst Deployment Team:
4. **[LYNKSCOPE_INTEGRATION_SETUP.md](LYNKSCOPE_INTEGRATION_SETUP.md)**
   - Detailed integration steps
   - CORS configuration
   - Webhook setup (optional)

5. **[.env.example](.env.example)**
   - Environment variable template
   - Complete list of required variables

---

## ⚡ Quick Start (5 minutes)

### Step 1: Get Credentials from Cliplyst

Request from Cliplyst team:
- ✅ **VITE_CLIPLYST_API_URL** (e.g., `https://cliplyst-content-maker.onrender.com`)
- ✅ **VITE_LYNKSCOPE_INTERNAL_KEY** (random 32-char hex string)
- ✅ **JWT_SECRET** (random 32-char hex string)

### Step 2: Configure Lynkscope

Add to `.env` or deployment platform:

```env
VITE_CLIPLYST_API_URL=<provided-by-cliplyst-team>
VITE_LYNKSCOPE_INTERNAL_KEY=<provided-by-cliplyst-team>
JWT_SECRET=<provided-by-cliplyst-team>
```

### Step 3: Deploy & Test

```bash
# Deploy Lynkscope
git push origin main

# Test health check
curl https://cliplyst-content-maker.onrender.com/api/health

# Test job creation
curl -X POST https://cliplyst-content-maker.onrender.com/api/jobs/create-content \
  -H "Authorization: Bearer <your-lynkscope-key>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","company_name":"Test","niche":"fitness","weak_platforms":["tiktok"],"top_opportunities":["tutorials"],"auto_schedule":true,"posting_frequency":"weekly"}'

# Response: 202 Accepted with job_id
```

---

## 🔌 API Endpoints

### Health Check (No Authentication)
```http
GET /api/health

Response: 200 OK
{
  "status": "ok",
  "services": {
    "api": "operational",
    "supabase": "connected",
    "buffer": "ready"
  }
}
```

### Create Content Job (Requires Bearer Token)
```http
POST /api/jobs/create-content
Authorization: Bearer VITE_LYNKSCOPE_INTERNAL_KEY
Content-Type: application/json

Request:
{
  "user_id": "string",
  "company_name": "string",
  "niche": "fitness|marketing|beauty|...",
  "weak_platforms": ["tiktok", "instagram"],
  "top_opportunities": ["tutorials", "challenges"],
  "auto_schedule": true,
  "posting_frequency": "daily|thrice_weekly|weekly|monthly"
}

Response: 202 Accepted
{
  "status": "accepted",
  "job_id": "uuid",
  "message": "Content generation job queued successfully"
}
```

### Get Job Status (Requires Bearer Token)
```http
GET /api/jobs/{jobId}
Authorization: Bearer VITE_LYNKSCOPE_INTERNAL_KEY

Response: 200 OK
{
  "id": "jobId",
  "status": "pending|processing|complete|failed",
  "company_name": "FitMax Training",
  "niche": "fitness",
  "progress": {
    "trends_discovered": 3,
    "scripts_generated": 2,
    "videos_created": 1,
    "scheduled": 1
  },
  "result_videos": [
    {
      "id": "video-001",
      "url": "https://storage.supabase.io/...",
      "caption": "Transform your fitness...",
      "scheduled_for": "2026-02-08T10:00:00Z"
    }
  ]
}
```

---

## 🛠️ Implementation Checklist

### Lynkscope Side:

- [ ] Receive credentials from Cliplyst team
- [ ] Add VITE_CLIPLYST_API_URL to .env
- [ ] Add VITE_LYNKSCOPE_INTERNAL_KEY to .env
- [ ] Add JWT_SECRET to .env
- [ ] Implement `createContentJob()` function
- [ ] Implement `getJobStatus()` function
- [ ] Test health check endpoint (should return 200)
- [ ] Test job creation (should return 202 with job_id)
- [ ] Test status polling (should return job status)
- [ ] Handle job completion (status = "complete")
- [ ] Handle job failure (status = "failed")
- [ ] Deploy to production

### Cliplyst Side:

- [ ] Confirm VITE_CLIPLYST_API_URL set in environment
- [ ] Confirm VITE_LYNKSCOPE_INTERNAL_KEY set in environment
- [ ] Confirm JWT_SECRET set in environment
- [ ] Whitelist Lynkscope domain in CORS config
- [ ] Verify all external APIs configured
- [ ] Test health endpoint responds
- [ ] Test job creation endpoint
- [ ] Test job status endpoint
- [ ] Monitor job processing logs
- [ ] Set up error alerting

---

## 🔐 Required Credentials

### Generate VITE_LYNKSCOPE_INTERNAL_KEY

```bash
# Generates random 32-char hex string
openssl rand -hex 16

# Example: <provided-by-cliplyst-team>
# Save this value
```

### Generate JWT_SECRET

```bash
# Generates random 32-char hex string  
openssl rand -hex 16

# Example: <provided-by-cliplyst-team>
# Save this value
```

### Get VITE_CLIPLYST_API_URL

Contact Cliplyst team and request production URL:
- Example: `https://cliplyst-content-maker.onrender.com`
- Or custom domain if applicable

---

## 📊 Integration Flow

```
Lynkscope                          Cliplyst
┌──────────────────┐              ┌─────────────────────┐
│ Lynkscope User   │              │ Content Pipeline    │
│ Submits Request  │              │                     │
└────────┬─────────┘              │ 1. Trend Discovery  │
         │                        │ 2. Script Gen       │
         │ POST /api/jobs/        │ 3. Video Creation   │
         │ create-content         │ 4. Scheduling       │
         │                        │ 5. Buffer Publish   │
         │ Auth: Bearer Token     │                     │
         ├───────────────────────→│ Queue Job           │
         │                        │                     │
         │                        │ Processing...       │
         │ GET /api/jobs/{id}     │                     │
         │ Poll Status            │                     │
         │                        │ Status: processing  │
         │←───────────────────────┤                     │
         │                        │                     │
         │ GET /api/jobs/{id}     │                     │
         │ Poll Status            │ Status: complete    │
         │←───────────────────────┤ Videos ready        │
         │                        │ Auto-scheduled      │
         │ Retrieve Videos        │                     │
         │ Show in Dashboard      │                     │
         │                        │                     │
         │                        │ Videos Published    │
         │                        │ to Buffer/Social    │
         └──────────────────┬─────┘ └─────────────────────┘
                            │
                    Buffer (Social Media)
                    │
                    ├── TikTok
                    ├── Instagram
                    └── YouTube
```

---

## 🚀 Deployment Checklist

**Pre-Deployment:**

- [ ] All credentials generated and secured
- [ ] Environment variables set in both systems
- [ ] CORS domain whitelisting configured
- [ ] SSL/HTTPS enabled on all endpoints
- [ ] Error logging configured

**Deployment:**

- [ ] Deploy Cliplyst with credentials
- [ ] Deploy Lynkscope with credentials
- [ ] Verify health check endpoint (200 OK)
- [ ] Test job creation (202 Accepted)
- [ ] Test status polling (200 OK)
- [ ] Monitor logs for issues

**Post-Deployment:**

- [ ] Run smoke tests
- [ ] Test with real data
- [ ] Monitor for errors
- [ ] Set up alerting
- [ ] Document any issues

---

## 🔍 Testing

### Test 1: Health Check

```bash
curl https://cliplyst-content-maker.onrender.com/api/health

# Expected: 200 OK
```

### Test 2: Job Creation

```bash
curl -X POST https://cliplyst-content-maker.onrender.com/api/jobs/create-content \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "company_name": "Test Company",
    "niche": "fitness",
    "weak_platforms": ["tiktok"],
    "top_opportunities": ["tutorials"],
    "auto_schedule": true,
    "posting_frequency": "weekly"
  }'

# Expected: 202 Accepted with job_id
```

### Test 3: Status Polling

```bash
curl -X GET https://cliplyst-content-maker.onrender.com/api/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_KEY"

# Expected: 200 OK with status
```

### Test 4: Full Pipeline

1. Create content job
2. Poll status every 10 seconds
3. Wait for status = "complete"
4. Verify videos in response
5. Confirm auto-scheduled

---

## ⚠️ Common Issues & Solutions

### Issue: 401 Unauthorized

**Cause**: Invalid or missing API key

**Solution**:
```bash
# Verify token format
-H "Authorization: Bearer YOUR_EXACT_KEY"

# Verify key matches on both systems
echo $VITE_LYNKSCOPE_INTERNAL_KEY
```

### Issue: CORS Error

**Cause**: Domain not whitelisted

**Solution**:
```
Contact Cliplyst team and request:
- Add https://lynkscope.com to CORS whitelist
- Verify with preflight request
```

### Issue: Job Stuck in "processing"

**Cause**: Error in pipeline

**Solution**:
```
1. Check Cliplyst logs for error message
2. Verify external APIs configured
3. Check Supabase connection
4. Retry after 30 seconds
```

### Issue: VITE Variables Not Loading

**Cause**: Environment variables not set

**Solution**:
```bash
# Verify variables exist
echo $VITE_CLIPLYST_API_URL
echo $VITE_LYNKSCOPE_INTERNAL_KEY

# Check .env file exists and is loaded
cat .env | grep VITE_

# Restart dev server if needed
npm run dev
```

---

## 📞 Support

**For integration issues:**

1. Check [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md) troubleshooting
2. Review [LYNKSCOPE_INTEGRATION_GUIDE.md](LYNKSCOPE_INTEGRATION_GUIDE.md)
3. Check Cliplyst logs for error details
4. Contact Cliplyst support with job ID

**Contact**: [support@cliplyst.com]

---

## 📋 Related Files

- [.env.example](.env.example) - Environment variable template
- [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md) - Quick reference
- [LYNKSCOPE_INTEGRATION_GUIDE.md](LYNKSCOPE_INTEGRATION_GUIDE.md) - API reference
- [CLIPLYST_SETUP_GUIDE.md](CLIPLYST_SETUP_GUIDE.md) - Deployment guide
- [LYNKSCOPE_INTEGRATION_SETUP.md](LYNKSCOPE_INTEGRATION_SETUP.md) - Detailed setup
- [src/lib/lynkscope-auth.ts](src/lib/lynkscope-auth.ts) - Auth utilities
- [src/pages/api/health.ts](src/pages/api/health.ts) - Health endpoint
- [src/pages/api/jobs/create-content.ts](src/pages/api/jobs/create-content.ts) - Job endpoint

---

## ✅ Integration Status

**System**: ✅ Production Ready  
**API Endpoints**: ✅ Deployed  
**Authentication**: ✅ Implemented  
**Documentation**: ✅ Complete  
**Testing**: ✅ Ready  

---

**Version**: 1.0  
**Last Updated**: February 1, 2026  
**Status**: Ready for Integration with Lynkscope
