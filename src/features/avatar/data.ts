// Supabase calls for the avatar feature.
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Avatar, AvatarTier } from "./catalog";

export async function fetchAvatars(): Promise<Avatar[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("avatars")
    .select("id,name,class,tier,event,sort_order")
    .order("sort_order");
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    klass: r.class as string,
    tier: r.tier as AvatarTier,
    event: (r.event as string) ?? null,
    sortOrder: (r.sort_order as number) ?? 0,
  }));
}

export interface MyAvatarState {
  avatarId: string | null;
  selectedAt: string | null;
}

export async function fetchMyAvatar(): Promise<MyAvatarState | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("my_avatar");
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { avatarId: null, selectedAt: null };
  return {
    avatarId: (row.avatar_id as string) ?? null,
    selectedAt: (row.selected_at as string) ?? null,
  };
}

export async function fetchMyGrants(): Promise<string[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("avatar_grants")
    .select("avatar_id");
  if (error || !data) return [];
  return data.map((r) => r.avatar_id as string);
}

export async function setMyAvatar(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "No connection" };
  const { error } = await supabase.rpc("set_my_avatar", { p_avatar_id: id });
  return error ? { ok: false, error: error.message } : { ok: true };
}
