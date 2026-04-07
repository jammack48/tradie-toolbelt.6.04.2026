
## Supabase: single project (`qrkojbfayjrtrlrmgzry`)

All browser Supabase usage goes through `@/lib/supabase`, which reads **`VITE_EXT_SUPABASE_URL`** and **`VITE_EXT_SUPABASE_ANON_KEY`** only. `@/integrations/supabase/client` re-exports that client.

In Lovable’s project settings, set the same `VITE_EXT_*` variables so the hosted build does not fall back to Lovable’s default Supabase.
