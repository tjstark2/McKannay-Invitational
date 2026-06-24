import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicProfile = {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  state: string | null;
};

export type FriendEdge = {
  friendshipId: string;
  profile: PublicProfile;
};

export type FriendsData = {
  friends: FriendEdge[];
  incoming: FriendEdge[]; // requests waiting on me
  outgoing: FriendEdge[]; // requests I sent
};

// strip characters that would break PostgREST's or() filter / injection
function clean(q: string): string {
  return q.replace(/[^a-zA-Z0-9 _]/g, "").trim();
}

export async function searchUsers(
  supabase: SupabaseClient,
  query: string,
  myId: string
): Promise<PublicProfile[]> {
  const q = clean(query);
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from("public_profiles")
    .select("id,username,first_name,last_name,city,state")
    .neq("id", myId)
    .or(
      `username.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`
    )
    .limit(20);
  if (error) return [];
  return (data ?? []) as PublicProfile[];
}

export async function loadFriendsData(
  supabase: SupabaseClient,
  myId: string
): Promise<FriendsData> {
  const empty: FriendsData = { friends: [], incoming: [], outgoing: [] };
  const { data: rows, error } = await supabase
    .from("friendships")
    .select("id,requester_id,addressee_id,status")
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);
  if (error || !rows || rows.length === 0) return empty;

  const otherId = (r: Record<string, unknown>) =>
    (r.requester_id as string) === myId
      ? (r.addressee_id as string)
      : (r.requester_id as string);

  const ids = Array.from(new Set(rows.map(otherId)));
  const { data: profs } = await supabase
    .from("public_profiles")
    .select("id,username,first_name,last_name,city,state")
    .in("id", ids);
  const pmap = new Map<string, PublicProfile>();
  for (const p of (profs ?? []) as PublicProfile[]) pmap.set(p.id, p);

  const edge = (r: Record<string, unknown>): FriendEdge => ({
    friendshipId: r.id as string,
    profile:
      pmap.get(otherId(r)) ??
      ({ id: otherId(r), username: null, first_name: null, last_name: null, city: null, state: null } as PublicProfile),
  });

  const out: FriendsData = { friends: [], incoming: [], outgoing: [] };
  for (const r of rows as Record<string, unknown>[]) {
    if (r.status === "accepted") out.friends.push(edge(r));
    else if (r.status === "pending" && (r.addressee_id as string) === myId)
      out.incoming.push(edge(r));
    else if (r.status === "pending" && (r.requester_id as string) === myId)
      out.outgoing.push(edge(r));
  }
  return out;
}

export async function sendFriendRequest(
  supabase: SupabaseClient,
  myId: string,
  otherId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: existing } = await supabase
    .from("friendships")
    .select("id")
    .or(
      `and(requester_id.eq.${myId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${myId})`
    );
  if (existing && existing.length > 0) {
    return { ok: false, error: "You're already connected or have a pending request." };
  }
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: myId, addressee_id: otherId, status: "pending" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function respondToRequest(
  supabase: SupabaseClient,
  friendshipId: string,
  accept: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from("friendships")
    .update({
      status: accept ? "accepted" : "declined",
      updated_at: new Date().toISOString(),
    })
    .eq("id", friendshipId);
  return !error;
}

export async function removeFriendship(
  supabase: SupabaseClient,
  friendshipId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId);
  return !error;
}

export async function pendingIncomingCount(
  supabase: SupabaseClient,
  myId: string
): Promise<number> {
  const { count } = await supabase
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("addressee_id", myId)
    .eq("status", "pending");
  return count ?? 0;
}

export function displayName(p: PublicProfile): string {
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return name || (p.username ? `@${p.username}` : "Unknown");
}

export function handleAndLocation(p: PublicProfile): string {
  const parts: string[] = [];
  if (p.username) parts.push(`@${p.username}`);
  const loc = [p.city, p.state].filter(Boolean).join(", ");
  if (loc) parts.push(loc);
  return parts.join(" · ");
}
