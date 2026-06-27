"use client";

import { useEffect, useReducer } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { DEFAULT_FRAME } from "./frames";
import { DEFAULT_PLATE } from "./nameplates";

let state: {
  loaded: boolean;
  userId: string | null;
  frameId: string;
  nameplateId: string;
} = { loaded: false, userId: null, frameId: DEFAULT_FRAME, nameplateId: DEFAULT_PLATE };

const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

async function ensureLoaded(userId: string) {
  if (state.loaded && state.userId === userId) return;
  const supabase = getSupabaseClient();
  if (!supabase) {
    state = { loaded: true, userId, frameId: DEFAULT_FRAME, nameplateId: DEFAULT_PLATE };
    emit();
    return;
  }
  const { data } = await supabase
    .from("profiles")
    .select("frame_id,nameplate_id")
    .eq("id", userId)
    .maybeSingle();
  state = {
    loaded: true,
    userId,
    frameId: data?.frame_id || DEFAULT_FRAME,
    nameplateId: data?.nameplate_id || DEFAULT_PLATE,
  };
  emit();
}

export async function equipFrame(userId: string, frameId: string) {
  state = { ...state, frameId, userId, loaded: true };
  emit();
  const supabase = getSupabaseClient();
  if (supabase) await supabase.from("profiles").update({ frame_id: frameId }).eq("id", userId);
}

export async function equipNameplate(userId: string, nameplateId: string) {
  state = { ...state, nameplateId, userId, loaded: true };
  emit();
  const supabase = getSupabaseClient();
  if (supabase)
    await supabase.from("profiles").update({ nameplate_id: nameplateId }).eq("id", userId);
}

export function useCosmetics() {
  const { user } = useAuth();
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const f = () => force();
    subs.add(f);
    if (user?.id) void ensureLoaded(user.id);
    return () => {
      subs.delete(f);
    };
  }, [user?.id]);

  const mine = state.userId === user?.id && state.loaded;
  return {
    frameId: mine ? state.frameId : DEFAULT_FRAME,
    nameplateId: mine ? state.nameplateId : DEFAULT_PLATE,
    loading: !state.loaded,
    equipFrame: (id: string) => (user?.id ? equipFrame(user.id, id) : Promise.resolve()),
    equipNameplate: (id: string) =>
      user?.id ? equipNameplate(user.id, id) : Promise.resolve(),
  };
}
