"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

export type SignUpInput = {
  firstName: string;
  lastName: string;
  username: string;
  city: string;
  state: string;
  email: string;
  phone: string;
  password: string;
  marketingOptIn: boolean;
  smsOptIn: boolean;
};

type AuthResult = {
  ok: boolean;
  error?: string;
  needsConfirmation?: boolean;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => getSupabaseClient(), []);
  const configured = Boolean(supabase);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Current session on mount, then keep it in sync.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }
    );

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const signUp = useCallback(
    async (input: SignUpInput): Promise<AuthResult> => {
      if (!supabase) return { ok: false, error: "Accounts aren't available yet." };
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/signin`
          : undefined;

      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            first_name: input.firstName.trim(),
            last_name: input.lastName.trim(),
            username: input.username.trim().toLowerCase(),
            city: input.city.trim(),
            state: input.state.trim().toUpperCase(),
            phone: input.phone.trim(),
            marketing_opt_in: input.marketingOptIn,
            sms_opt_in: input.smsOptIn,
          },
        },
      });

      if (error) return { ok: false, error: error.message };
      // With "Confirm email" ON, no session is returned until they confirm.
      return { ok: true, needsConfirmation: !data.session };
    },
    [supabase]
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!supabase) return { ok: false, error: "Accounts aren't available yet." };
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, loading, configured, signUp, signIn, signOut }),
    [user, session, loading, configured, signUp, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
