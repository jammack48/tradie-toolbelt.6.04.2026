import React, { createContext, useContext, useEffect, useState } from "react";
import { authSupabase } from "@/lib/authSupabase";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  setIsDemo: (v: boolean) => void;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = ((globalThis as any).__authContextSingleton as React.Context<AuthState | undefined>) ?? createContext<AuthState | undefined>(undefined);
if (!(globalThis as any).__authContextSingleton) (globalThis as any).__authContextSingleton = AuthContext;
AuthContext.displayName = "AuthContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!authSupabase) {
      setLoading(false);
      return;
    }

    const { data: { subscription } } = authSupabase.auth.onAuthStateChange(
      (event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        setLoading(false);

        // Redirect to reset-password page on recovery event
        if (event === "PASSWORD_RECOVERY") {
          window.location.href = "/reset-password";
        }
      }
    );

    authSupabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!authSupabase) return { error: "Auth not configured" };
    const { error } = await authSupabase.auth.signInWithPassword({ email, password });
    if (!error) setIsDemo(false);
    return { error: error?.message ?? null };
  };

  const logout = async () => {
    if (!authSupabase) return;
    await authSupabase.auth.signOut();
    setIsDemo(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, isDemo, setIsDemo, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
