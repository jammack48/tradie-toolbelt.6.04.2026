import { createClient } from '@supabase/supabase-js';

type FrontendEnv = ImportMetaEnv & {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

const env = import.meta.env as FrontendEnv;

const SUPABASE_URL = env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = (
  env.VITE_SUPABASE_ANON_KEY ??
  env.VITE_SUPABASE_PUBLISHABLE_KEY
)?.trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase environment variables. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for your personal Supabase project."
  );
}

let projectRef = "";
try {
  projectRef = new URL(SUPABASE_URL).hostname.split(".")[0] ?? "";
} catch {
  throw new Error("Invalid VITE_SUPABASE_URL. Expected a full Supabase project URL.");
}

// Prevent accidental fallback to Lovable Cloud project.
if (projectRef === "ttpndqaghjuoqnngdwlh") {
  throw new Error("Blocked Supabase project ref. Configure your personal Supabase URL and key.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
