/**
 * !! DO NOT USE LOVABLE CLOUD !!
 * Auth uses the same external Supabase client so the JWT session is shared
 * across auth and data queries (required for RLS).
 */
export { supabase as authSupabase } from "@/lib/supabase";
