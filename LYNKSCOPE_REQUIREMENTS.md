# 📋 LYNKSCOPE - Required Cliplyst Integration Variables

**This file lists exactly what Lynkscope needs to integrate with Cliplyst.**

---

## Required Environment Variables (3 Total)

Add these to Lynkscope's environment configuration:

### 1. VITE_CLIPLYST_API_URL
**Type**: String (URL)  
**Required**: Yes  
**Description**: The Cliplyst API endpoint URL  
**Example**: `https://cliplyst-content-maker.onrender.com`  
**Where to get**: Request from Cliplyst team

### 2. VITE_LYNKSCOPE_INTERNAL_KEY
**Type**: String (Bearer Token)  
**Required**: Yes  
**Description**: Shared authentication key for Lynkscope↔Cliplyst communication  
**Format**: 32-character hexadecimal string  
**Example**: `<provided-by-cliplyst-team>`  
**How to get**: Cliplyst team will generate and provide this

### 3. JWT_SECRET
**Type**: String (Secret Key)  
**Required**: Yes  
**Description**: Secret for JWT token signing (HS256)  
**Format**: 32-character hexadecimal string  
**Example**: `<provided-by-cliplyst-team>`  
**How to get**: Cliplyst team will generate and provide this

---

## Configuration Template

Copy this to your `.env` or environment configuration:

```env
# Cliplyst Integration
VITE_CLIPLYST_API_URL=<provided-by-cliplyst-team>
VITE_LYNKSCOPE_INTERNAL_KEY=<provided-by-cliplyst-team>
JWT_SECRET=<provided-by-cliplyst-team>
```

---

## Implementation Requirements

### 1. HTTP Client Setup
```typescript
const API_URL = import.meta.env.VITE_CLIPLYST_API_URL;
const API_KEY = import.meta.env.VITE_LYNKSCOPE_INTERNAL_KEY;

// All API calls use Bearer token authentication
const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};
```

### 2. API Endpoints Available

**Health Check** (no auth required)
```
GET /api/health
Returns: 200 OK with system status
```

**Create Content Job** (requires auth)
```
POST /api/jobs/create-content
Headers: Authorization: Bearer YOUR_KEY
Body: JSON with content request
Returns: 202 Accepted with job_id
```

**Get Job Status** (requires auth)
```
GET /api/jobs/{jobId}
Headers: Authorization: Bearer YOUR_KEY
Returns: 200 OK with job status and results
```

---

## Implementation Example

```typescript
// src/services/cliplystService.ts

async function createContentJob(payload: {
  user_id: string;
  company_name: string;
  niche: string;
  weak_platforms: string[];
  top_opportunities: string[];
  auto_schedule: boolean;
  posting_frequency: string;
}) {
  const response = await fetch(
    `${import.meta.env.VITE_CLIPLYST_API_URL}/api/jobs/create-content`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_LYNKSCOPE_INTERNAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Job creation failed: ${error.message}`);
  }

  const data = await response.json();
  return data; // { status: "accepted", job_id: "uuid", message: "..." }
}

async function getJobStatus(jobId: string) {
  const response = await fetch(
    `${import.meta.env.VITE_CLIPLYST_API_URL}/api/jobs/${jobId}`,
    {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_LYNKSCOPE_INTERNAL_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get job status');
  }

  return await response.json();
}
```

---

## API Request/Response Examples

### Create Content Job Request
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

### Response (202 Accepted)
```json
{
  "status": "accepted",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Content generation job queued successfully"
}
```

### Get Job Status Request
```bash
curl https://cliplyst-content-maker.onrender.com/api/jobs/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <your-lynkscope-key>"
```

### Response (200 OK)
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

---

## Supported Niches

Use one of these values for the `niche` field:

```
fitness, marketing, beauty, fashion, food, comedy, dance, music,
gaming, lifestyle, education, pets, travel, motivation, relationship
```

---

## Deployment Checklist

- [ ] VITE_CLIPLYST_API_URL obtained from Cliplyst team
- [ ] VITE_LYNKSCOPE_INTERNAL_KEY obtained from Cliplyst team
- [ ] JWT_SECRET obtained from Cliplyst team
- [ ] Environment variables added to .env
- [ ] HTTP client configured with Bearer token
- [ ] createContentJob() function implemented
- [ ] getJobStatus() function implemented
- [ ] Error handling for failed requests
- [ ] Retry logic for transient failures
- [ ] Job polling logic (every 10-30 seconds)
- [ ] Status change handlers (pending → processing → complete/failed)
- [ ] Video result handling
- [ ] Logging configured (no sensitive data)
- [ ] Test with health endpoint first
- [ ] Test job creation with real data
- [ ] Test status polling
- [ ] Test error scenarios
- [ ] Deploy to production

---

## Testing

### Test 1: Verify Credentials Loaded
```typescript
console.log('API URL:', import.meta.env.VITE_CLIPLYST_API_URL);
console.log('Has Key:', !!import.meta.env.VITE_LYNKSCOPE_INTERNAL_KEY);
console.log('Has Secret:', !!import.meta.env.VITE_JWT_SECRET);
```

### Test 2: Health Check
```bash
curl https://cliplyst-content-maker.onrender.com/api/health
# Should return 200 OK
```

### Test 3: Create Job
```bash
curl -X POST https://cliplyst-content-maker.onrender.com/api/jobs/create-content \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","company_name":"Test","niche":"fitness","weak_platforms":["tiktok"],"top_opportunities":["tutorials"],"auto_schedule":true,"posting_frequency":"weekly"}'
# Should return 202 Accepted with job_id
```

### Test 4: Get Status
```bash
curl https://cliplyst-content-maker.onrender.com/api/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_KEY"
# Should return 200 OK with status
```

---

## Error Handling

| Status | Error | Solution |
|--------|-------|----------|
| 401 | Unauthorized | Verify VITE_LYNKSCOPE_INTERNAL_KEY is correct |
| 400 | Bad Request | Check all required fields present |
| 404 | Not Found | Verify job_id is correct |
| 500 | Server Error | Retry after 30 seconds |

---

## Contact Information

**For questions or issues:**
- Contact: Cliplyst Support
- Email: support@cliplyst.com
- Reference Documentation: README_INTEGRATION.md

---

**Prepared**: February 1, 2026  
**Version**: 1.0  
**Status**: Ready for Integration
