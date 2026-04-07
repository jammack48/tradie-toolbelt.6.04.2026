// Re-export single app client (env: VITE_EXT_SUPABASE_URL, VITE_EXT_SUPABASE_ANON_KEY).
// Do not duplicate createClient with VITE_SUPABASE_* — that was Lovable Cloud.
export { supabase } from '@/lib/supabase';
