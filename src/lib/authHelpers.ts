import { authSupabase } from "@/lib/authSupabase";

/**
 * Returns the current auth session's access token (JWT).
 * Use this to authenticate API calls to the FastAPI backend.
 *
 * Usage:
 *   const token = await getAuthToken();
 *   fetch(`${BACKEND_URL}/api/customers`, {
 *     headers: { Authorization: `Bearer ${token}` }
 *   });
 */
export async function getAuthToken(): Promise<string | null> {
  if (!authSupabase) return null;
  const { data } = await authSupabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Creates an Authorization header object for fetch calls.
 * Returns empty object if no session exists.
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
