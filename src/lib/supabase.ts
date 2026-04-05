/**
 * Supabase client used for both auth and data so JWT session is shared for RLS.
 *
 * Env priority:
 * 1) External overrides: VITE_EXT_SUPABASE_URL / VITE_EXT_SUPABASE_ANON_KEY
 * 2) Default Vite vars:   VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY
 * 3) Legacy fallback for older deployments.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// !! DO NOT USE LOVABLE CLOUD !! — Always connect to external Supabase
const SUPABASE_URL =
  import.meta.env.VITE_EXT_SUPABASE_URL ||
  'https://qrkojbfayjrtrlrmgzry.supabase.co';

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_EXT_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya29qYmZheWpydHJscm1nenJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTcxNTQsImV4cCI6MjA4ODU3MzE1NH0.xVKR6dILRdUkdUmUCANysKqlviWxfATrSKo-SvyT4oA';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
