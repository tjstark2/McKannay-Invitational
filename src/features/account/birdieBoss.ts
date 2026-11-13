"use client";

import { useEffect, useReducer } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { upgradeOrCheckout } from "@/lib/billing";

// Tiny shared store so the user's Birdie Boss status is consistent across the
// profile, the in-tournament badge, and the reaction picker - and flips
// everywhere the moment they upgrade.
let state: { loaded: boolean; isBoss: boolean; userId: string | null } = {
  loaded: false,
  isBoss: false,
  userId: null,
};
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export async function ensureBossLoaded(userId: string) {
  if (state.loaded && state.userId === userId) return;
  const supabase = getSupabaseClient();
  if (!supabase) {
    state = { loaded: true, isBoss: false, userId };
    emit();
    return;
  }
  const { data } = await supabase
    .from("profiles")
    .select("is_birdie_boss")
    .eq("id", userId)
    .maybeSingle();
  state = { loaded: true, isBoss: Boolean(data?.is_birdie_boss), userId };
  emit();
}

/** What happened when someone tapped upgrade. */
export type BossUpgrade = {
  /** They are a Boss now. */
  granted: boolean;
  /** The page is leaving for checkout - don't act as if they've paid. */
  leaving: boolean;
  error: string | null;
};

/** The perks, written once - shown wherever Boss is pitched. */
export const BOSS_FEATURES = [
  "Every avatar unlocked (except the Founder)",
  "Frames and nameplates for your avatar",
  "Boss reaction stickers in the Clubhouse",
];

/**
 * Become a Birdie Boss. Goes through the server: free in preview, a Stripe
 * checkout once billing is live (the page leaves for checkout and comes back).
 */
export async function upgradeToBoss(userId: string): Promise<BossUpgrade> {
  const r = await upgradeOrCheckout("boss", {
    returnPath: typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined,
  });
  if (r.status === "error") return { granted: false, leaving: false, error: r.error };
  if (r.status === "checkout") return { granted: false, leaving: true, error: null };
  state = { loaded: true, isBoss: true, userId };
  emit();
  return { granted: true, leaving: false, error: null };
}

export function useBirdieBoss() {
  const { user } = useAuth();
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const f = () => force();
    subs.add(f);
    if (user?.id) void ensureBossLoaded(user.id);
    return () => {
      subs.delete(f);
    };
  }, [user?.id]);

  return {
    isBoss: state.isBoss && state.userId === user?.id && state.loaded,
    loading: !state.loaded,
    /** Leaves for checkout when billing is live - check `granted` before using a perk. */
    upgrade: async (): Promise<BossUpgrade> => {
      if (!user?.id) return { granted: false, leaving: false, error: "Sign in first." };
      return upgradeToBoss(user.id);
    },
  };
}
