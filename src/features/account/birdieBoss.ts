"use client";

import { useEffect, useReducer } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

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

export async function upgradeToBoss(userId: string) {
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase
      .from("profiles")
      .update({
        is_birdie_boss: true,
        birdie_boss_since: new Date().toISOString(),
      })
      .eq("id", userId);
  }
  state = { loaded: true, isBoss: true, userId };
  emit();
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
    upgrade: async () => {
      if (user?.id) await upgradeToBoss(user.id);
    },
  };
}
