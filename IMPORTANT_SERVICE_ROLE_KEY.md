# ⚠️ IMPORTANT: Missing Environment Variable

## Additional Configuration Required

Your application uses a **Supabase Service Role Key** for server-side operations (Lynkscope integration).

### What is Missing

In `src/pages/api/jobs/create-content.ts`, the code references:
```typescript
import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
```

This key is **NOT** currently in your `frontend/.env` file.

---

## What is the Service Role Key?

- **Anonymous Key (already updated):** Used for client-side operations, respects RLS policies
- **Service Role Key (MISSING):** Used for server-side operations, bypasses RLS policies, full database access

⚠️ **SECURITY WARNING:** Service role key has full database access. Never expose it to the client!

---

## How to Get Your Service Role Key

1. Go to https://supabase.com/dashboard
2. Select your project: `zlzbdepkptwgalfdkdpr`
3. Navigate to **Settings** → **API**
4. Find **service_role** key (hidden by default)
5. Click **Reveal** and copy the key

---

## How to Add It

### Option 1: Add to `frontend/.env`
```env
VITE_SUPABASE_URL="https://zlzbdepkptwgalfdkdpr.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_vsau5AK_b_bRasa-dPTIFA_U3TIDcZ8"
VITE_SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_SERVICE_ROLE_KEY_HERE"
```

⚠️ **WARNING:** Using `VITE_` prefix exposes this to the client bundle! This is a **security risk**.

### Option 2: Move to Backend (RECOMMENDED)

The service role key should ideally be in a backend service, not the frontend. Consider:

1. **Move to Backend Server:**
   - Create an API endpoint in your backend
   - Store service role key in `backend/.env` (NOT frontend)
   - Frontend calls your backend, backend calls Supabase with service role

2. **Use Supabase Edge Functions:**
   - Deploy Edge Functions to Supabase
   - Edge Functions automatically have service role access
   - Frontend calls Edge Functions, not directly to Supabase

---

## Current Usage in Your App

The service role key is used in:
- `src/pages/api/jobs/create-content.ts` - Lynkscope content job creation

This endpoint needs elevated permissions to:
- Create content jobs for any user
- Bypass RLS policies
- Perform admin operations

---

## Recommended Approach

### Immediate (Quick Fix):
Add to `frontend/.env` for testing, but understand the security implications.

### Long-term (Secure):
1. Create a backend API route that handles Lynkscope requests
2. Move service role key to backend
3. Frontend → Your Backend → Supabase (with service role)

---

## Updated `.env` File (Complete)

```env
# Supabase Configuration
VITE_SUPABASE_URL="https://zlzbdepkptwgalfdkdpr.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_vsau5AK_b_bRasa-dPTIFA_U3TIDcZ8"

# Service Role Key (⚠️ SECURITY RISK in frontend - consider moving to backend)
VITE_SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Other Configuration
REACT_APP_BACKEND_URL=https://supabase-migration-18.preview.emergentagent.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

---

## Security Best Practices

### ✅ DO:
- Store service role key in backend environment
- Use Supabase Edge Functions for server-side logic
- Rotate keys if exposed
- Use RLS policies for client-side access

### ❌ DON'T:
- Expose service role key in frontend code
- Commit service role key to public repositories
- Use service role key for client-side operations
- Share service role key in documentation or logs

---

## Testing Without Service Role Key

If you don't want to add the service role key right now:

1. The Lynkscope integration (`/api/jobs/create-content`) won't work
2. Everything else will work fine (uses anonymous key)
3. You can add it later when needed

---

## Summary

**Status:** ⚠️ **Action Required**

**What:** Add `VITE_SUPABASE_SERVICE_ROLE_KEY` to `frontend/.env`

**Where to get it:** Supabase Dashboard → Settings → API → service_role key

**Why:** Required for Lynkscope integration (`create-content` endpoint)

**Security note:** Consider moving to backend for production

---

## Updated Git Commit

If you add the service role key, remember to update your `.env` file in Git:

```bash
# Edit frontend/.env and add the service role key
nano frontend/.env

# Stage the updated file
git add frontend/.env

# Amend your commit or create a new one
git commit --amend -m "feat: Migrate to self-hosted Supabase with service role key"

# Or create a new commit
git commit -m "chore: Add Supabase service role key for Lynkscope integration"
```

⚠️ **Remember:** If this is a public repository, DO NOT commit the `.env` file with the service role key!
