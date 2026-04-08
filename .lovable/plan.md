

## Plan: Fix broken login — missing environment variables

### Problem
The `.env` file is missing. `src/lib/supabase.ts` throws an error on line 14-17 when `VITE_EXT_SUPABASE_URL` or `VITE_EXT_SUPABASE_ANON_KEY` are undefined, crashing the app before any UI renders.

### Fix (1 file)

**`src/lib/supabase.ts`** — Hardcode your external Supabase credentials as fallback

Since the anon key is a publishable key (safe for client-side code), we hardcode your external Supabase project (`qrkojbfayjrtrlrmgzry`) as the default values when the env vars are missing:

```typescript
const SUPABASE_URL = env.VITE_EXT_SUPABASE_URL?.trim() 
  || "https://qrkojbfayjrtrlrmgzry.supabase.co";
const SUPABASE_ANON_KEY = env.VITE_EXT_SUPABASE_ANON_KEY?.trim() 
  || "<your-anon-key>";
```

Remove the `throw new Error(...)` block entirely — it's what's killing the app.

No other files change. This does not touch Lovable Cloud at all.

### What this does NOT change
- No Lovable Cloud usage — your external Supabase only
- No changes to `src/integrations/supabase/client.ts` (just re-exports your client)
- No changes to login flow, RLS, or table names

