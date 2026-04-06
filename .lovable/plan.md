
## Goal
Make the backend connection issue diagnosable in one place and remove the guesswork around which key Render should use.

## What’s happening now
- The FastAPI backend reads:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
- It then calls `create_client(url, key)` in `backend/main.py`.
- The frontend only sees `connected / offline`, so there’s not enough detail to tell whether the failure is:
  - missing env vars
  - wrong URL
  - wrong key type
  - malformed key / whitespace
  - SDK incompatibility

## Important answer: which key?
For the current backend code, the safest key to use is:

- **Supabase Dashboard → API Keys → “Legacy anon, service_role API keys” → `service_role`**
- It should be the **long JWT-style key** starting with `eyJ...`

Do **not** use:
- the **publishable** key
- the new `sb_secret_...` key for this current Python health-check path unless we explicitly refactor/test support for it

## Plan

### 1. Add structured backend diagnostics
Update `backend/main.py` so `/health` returns a safe debug object like:
- whether `SUPABASE_URL` exists
- whether `SUPABASE_SERVICE_KEY` exists
- detected key type:
  - `legacy_jwt`
  - `new_secret`
  - `unknown`
- masked key preview only (example: `eyJ...abcd`, never full secret)
- exact exception class/message when connection fails
- whether the client was created successfully
- whether the DB ping succeeded

This will let the frontend show the real failure reason instead of just “DB offline”.

### 2. Make the health check more explicit
Refine the check so the backend distinguishes:
- `not_configured`
- `invalid_key`
- `client_init_failed`
- `connected`
- `offline`
- `query_failed`

That way you’ll know if the problem is the key itself vs a later query failure.

### 3. Surface the detailed diagnostics in the UI
Update the backend status/log UI so it shows:
- server status
- DB status
- detected key type
- last error message
- env var presence summary

Example log lines:
- `SUPABASE_URL found`
- `SUPABASE_SERVICE_KEY found (type: new_secret)`
- `Supabase client init failed: Invalid API key`
- `Expected key type: legacy service_role JWT`

### 4. Add a dedicated debug section in the panel
Extend `BackendLogPanel` with a compact “Connection Debug” block showing:
- URL configured: yes/no
- key configured: yes/no
- key type: legacy_jwt / new_secret / unknown
- last backend error
- last successful ping time

This gives you a single on-screen source of truth.

### 5. Document the exact Render setup in README
Add a short “Standalone DB connection” note to `README.md`:
- `SUPABASE_URL = https://sbthgkcmbxjgaqvntjja.supabase.co`
- `SUPABASE_SERVICE_KEY = legacy service_role JWT key from API Keys page`
- note that the current backend health check does **not** use the publishable key
- note that the new `sb_secret_...` key may not work with the current Python setup

## Files to change
- `backend/main.py`
  - add safe env/key diagnostics
  - return structured health response
- `src/contexts/BackendContext.tsx`
  - parse new debug fields from `/health`
  - store last error / key type / env presence
- `src/components/BackendLogPanel.tsx`
  - display detailed diagnostics
- `src/components/BackendStatus.tsx`
  - optionally improve tooltip text with DB reason
- `README.md`
  - document the correct key source and current expectation

## Expected result
After this change, the app will no longer just say “DB offline”. It will tell you something like:
- `Key type detected: new_secret`
- `Client init failed: Invalid API key`
- `Expected: legacy service_role JWT from API Keys > Legacy anon, service_role`

That will make the fix immediate and remove the key confusion.
