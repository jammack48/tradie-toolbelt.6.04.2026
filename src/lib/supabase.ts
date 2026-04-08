import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type FrontendEnv = ImportMetaEnv & {
  readonly VITE_EXT_SUPABASE_URL?: string;
  readonly VITE_EXT_SUPABASE_ANON_KEY?: string;
};

const env = import.meta.env as FrontendEnv;

// !! DO NOT USE LOVABLE CLOUD !! — hardcoded fallbacks for external Supabase
const SUPABASE_URL = env.VITE_EXT_SUPABASE_URL?.trim()
  || "https://qrkojbfayjrtrlrmgzry.supabase.co";
const SUPABASE_ANON_KEY = env.VITE_EXT_SUPABASE_ANON_KEY?.trim()
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFya29qYmZheWpydHJscm1nenJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTcxNTQsImV4cCI6MjA4ODU3MzE1NH0.xVKR6dILRdUkdUmUCANysKqlviWxfATrSKo-SvyT4oA";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
