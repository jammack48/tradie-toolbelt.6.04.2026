import { createClient } from '@supabase/supabase-js';

type FrontendEnv = ImportMetaEnv & {
  readonly VITE_EXT_SUPABASE_URL?: string;
  readonly VITE_EXT_SUPABASE_ANON_KEY?: string;
};

const env = import.meta.env as FrontendEnv;

const SUPABASE_URL = env.VITE_EXT_SUPABASE_URL?.trim() || env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = env.VITE_EXT_SUPABASE_ANON_KEY?.trim() || env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables. Set VITE_EXT_SUPABASE_URL and VITE_EXT_SUPABASE_ANON_KEY (or the default VITE_SUPABASE_* values)."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
