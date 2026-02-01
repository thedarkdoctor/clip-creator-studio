# 🔐 Cliplyst ↔ Lynkscope Integration: Complete Credentials & Setup Summary

**Created**: February 1, 2026  
**Status**: Ready for Deployment  
**Purpose**: Complete checklist for connecting Cliplyst with Lynkscope

---

## 📌 Quick Reference: What You Need

| Item | Description | Status |
|------|-------------|--------|
| **VITE_CLIPLYST_API_URL** | Cliplyst API endpoint | Provided by Cliplyst team |
| **VITE_LYNKSCOPE_INTERNAL_KEY** | Shared authentication key | Generate: `openssl rand -hex 16` |
| **JWT_SECRET** | Token signing secret | Generate: `openssl rand -hex 16` |
| **Domain Whitelisting** | CORS configuration | Request Cliplyst to whitelist your domain |

---

## 🔑 Generating Credentials

### Generate VITE_LYNKSCOPE_INTERNAL_KEY

```bash
openssl rand -hex 16
# Output: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6

# Save this as VITE_LYNKSCOPE_INTERNAL_KEY
```

### Generate JWT_SECRET

```bash
openssl rand -hex 16
# Output: 0123456789abcdef0123456789abcdef

# Save this as JWT_SECRET
```

---

## 📝 Configuration Files Required

### For Cliplyst (.env or environment variables):

```env
# Lynkscope Integration
VITE_CLIPLYST_API_URL=https://cliplyst-content-maker.onrender.com
VITE_LYNKSCOPE_INTERNAL_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
JWT_SECRET=0123456789abcdef0123456789abcdef

# External APIs (Content Generation)
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
PEXELS_API_KEY=...
JAMENDO_CLIENT_ID=...
JAMENDO_CLIENT_SECRET=...

# Buffer Integration (Social Media Publishing)
BUFFER_CLIENT_ID=...
BUFFER_CLIENT_SECRET=...
BUFFER_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef

# Supabase (Database)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### For Lynkscope (.env or environment variables):

```env
# Cliplyst Integration (MUST match Cliplyst values)
VITE_CLIPLYST_API_URL=https://cliplyst-content-maker.onrender.com
VITE_LYNKSCOPE_INTERNAL_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
JWT_SECRET=0123456789abcdef0123456789abcdef
```

---

## 🚀 Deployment Steps

### Step 1: Configure Cliplyst

```bash
# Add environment variables to Cliplyst deployment platform:
# (Render, Vercel, Heroku, etc.)

# Set these values:
VITE_CLIPLYST_API_URL=https://cliplyst-content-maker.onrender.com
VITE_LYNKSCOPE_INTERNAL_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
JWT_SECRET=0123456789abcdef0123456789abcdef

# Redeploy
git push origin main
```

### Step 2: Verify Cliplyst Health

```bash
curl https://cliplyst-content-maker.onrender.com/api/health

# Should return 200 OK with service status
```

### Step 3: Configure Lynkscope

```bash
# Add environment variables to Lynkscope deployment platform

# Set these values (MUST match Cliplyst):
VITE_CLIPLYST_API_URL=https://cliplyst-content-maker.onrender.com
VITE_LYNKSCOPE_INTERNAL_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
JWT_SECRET=0123456789abcdef0123456789abcdef

# Redeploy
git push origin main
```

### Step 4: Whitelist CORS

Contact Cliplyst and request that they whitelist your Lynkscope domain:

```
Lynkscope Domain: https://lynkscope.com
Lynkscope App Domain: https://app.lynkscope.com
Lynkscope Dev Domain: https://dev.lynkscope.com
```

### Step 5: Test Integration

```bash
# Test 1: Health Check
curl https://cliplyst-content-maker.onrender.com/api/health

# Test 2: Create Content Job
curl -X POST https://cliplyst-content-maker.onrender.com/api/jobs/create-content \
  -H "Authorization: Bearer a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" \
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

# Test 3: Poll Job Status
curl -X GET https://cliplyst-content-maker.onrender.com/api/jobs/JOB_ID \
  -H "Authorization: Bearer a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
```

---

## 🔗 API Endpoints

### Health Check (No Auth)
```
GET /api/health
Response: 200 OK with service status
```

### Create Content Job (Requires Auth)
```
POST /api/jobs/create-content
Authorization: Bearer VITE_LYNKSCOPE_INTERNAL_KEY
Content-Type: application/json

{
  "user_id": "string",
  "company_name": "string",
  "niche": "fitness|marketing|beauty|...",
  "weak_platforms": ["string"],
  "top_opportunities": ["string"],
  "auto_schedule": boolean,
  "posting_frequency": "daily|thrice_weekly|weekly|monthly"
}

Response: 202 Accepted
{
  "status": "accepted",
  "job_id": "uuid",
  "message": "..."
}
```

### Get Job Status (Requires Auth)
```
GET /api/jobs/{jobId}
Authorization: Bearer VITE_LYNKSCOPE_INTERNAL_KEY

Response: 200 OK
{
  "id": "jobId",
  "status": "pending|processing|complete|failed",
  "company_name": "string",
  "progress": {...},
  "result_videos": [{...}]
}
```

---

## 📊 Supported Niches

Use one of these values for the `niche` field:

```
fitness, marketing, beauty, fashion, food, comedy, dance, music,
gaming, lifestyle, education, pets, travel, motivation, relationship
```

---

## ✅ Deployment Checklist

**Before going to production:**

- [ ] Generate VITE_LYNKSCOPE_INTERNAL_KEY (32-char hex)
- [ ] Generate JWT_SECRET (32-char hex)
- [ ] Get VITE_CLIPLYST_API_URL from Cliplyst team
- [ ] Configure Cliplyst environment variables
- [ ] Deploy Cliplyst
- [ ] Verify Cliplyst health endpoint (200 OK)
- [ ] Configure Lynkscope environment variables (SAME credentials)
- [ ] Deploy Lynkscope
- [ ] Request domain whitelisting from Cliplyst
- [ ] Test health check endpoint
- [ ] Test job creation (202 Accepted)
- [ ] Test job status polling (200 OK)
- [ ] Test job completes successfully
- [ ] Verify videos generated
- [ ] Monitor logs for errors
- [ ] Set up error alerting

---

## 🔒 Security Best Practices

1. **Never commit credentials to git**
   - Use environment variables only
   - Use .env.example as template (no actual values)

2. **Use HTTPS for all API calls**
   - Both Cliplyst and Lynkscope must use HTTPS

3. **Rotate credentials periodically**
   - Every 90 days in production
   - Keep old key active for 24h during rotation

4. **Monitor API usage**
   - Log all API calls
   - Alert on unusual patterns
   - Track success/failure rates

5. **Implement rate limiting**
   - Limit to reasonable request rate
   - Example: 100 requests/minute per API key

---

## 🆘 Troubleshooting

### 401 Unauthorized
```
Cause: Invalid API key
Solution: Verify VITE_LYNKSCOPE_INTERNAL_KEY matches on both sides
```

### 400 Bad Request
```
Cause: Missing/invalid fields
Solution: Check all required fields present and correct type
```

### CORS Error
```
Cause: Domain not whitelisted
Solution: Request Cliplyst to whitelist your Lynkscope domain
```

### Job Stuck in "processing"
```
Cause: Error in content generation
Solution: Check Cliplyst logs for detailed error message
```

---

## 📞 Support Contact

For issues or questions about the integration:

**Cliplyst Support**: [support@cliplyst.com]
- Request credentials
- Report bugs
- Ask technical questions

**Documentation**: 
- LYNKSCOPE_INTEGRATION_GUIDE.md (detailed API reference)
- CLIPLYST_SETUP_GUIDE.md (deployment instructions)
- LYNKSCOPE_INTEGRATION_SETUP.md (step-by-step setup)

---

## 📋 Document Reference

| Document | Purpose |
|----------|---------|
| `.env.example` | Environment variable template |
| `LYNKSCOPE_INTEGRATION_GUIDE.md` | Complete API reference for Lynkscope |
| `CLIPLYST_SETUP_GUIDE.md` | Step-by-step deployment guide |
| `LYNKSCOPE_INTEGRATION_SETUP.md` | Detailed integration instructions |
| `src/lib/lynkscope-auth.ts` | Authentication utilities |
| `src/pages/api/health.ts` | Health check endpoint |
| `src/pages/api/jobs/create-content.ts` | Job creation endpoint |

---

## Summary

**Cliplyst and Lynkscope integration requires:**

1. ✅ Three environment variables (VITE_CLIPLYST_API_URL, VITE_LYNKSCOPE_INTERNAL_KEY, JWT_SECRET)
2. ✅ HTTPS endpoints for both systems
3. ✅ Domain whitelisting for CORS
4. ✅ Proper authentication on all API calls

**Once configured:**
- Lynkscope can submit content requests to Cliplyst
- Cliplyst processes requests asynchronously
- Lynkscope polls status and retrieves generated videos
- All videos automatically published to Buffer

**Time to integrate**: ~30-45 minutes once credentials obtained

---

**Version**: 1.0  
**Status**: ✅ Production Ready  
**Last Updated**: February 1, 2026
