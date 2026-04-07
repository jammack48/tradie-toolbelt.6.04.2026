import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type FrontendEnv = ImportMetaEnv & {
  readonly VITE_EXT_SUPABASE_URL?: string;
  readonly VITE_EXT_SUPABASE_ANON_KEY?: string;
};

const env = import.meta.env as FrontendEnv;

const SUPABASE_URL = env.VITE_EXT_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = env.VITE_EXT_SUPABASE_ANON_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing external Supabase environment variables. This app is configured to use VITE_EXT_SUPABASE_URL and VITE_EXT_SUPABASE_ANON_KEY only."
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
