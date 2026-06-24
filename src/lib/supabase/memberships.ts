import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicProfile } from "@/lib/supabase/friends";

export type TripRef = {
  id: string;
  name: string;
  joinCode: string;
  ownerId: string | null;
  location: string | null;
  dates: string | null;
};

export type MembershipState = {
  role: "owner" | "member" | null;
  status: "active" | "pending" | null;
  isOwner: boolean;
};

export type MemberRow = {
  membershipId: string;
  role: string;
  status: string;
  profile: PublicProfile;
};

export async function resolveTrip(
  supabase: SupabaseClient,
  code: string
): Promise<TripRef | null> {
  const { data } = await supabase
    .from("trips")
    .select("id,name,join_code,owner_id,location,dates")
    .eq("join_code", code)
    .maybeSingle();
  if (!data) return null;
  const t = data as Record<string, unknown>;
  return {
    id: t.id as string,
    name: t.name as string,
    joinCode: t.join_code as string,
    ownerId: (t.owner_id as string) ?? null,
    location: (t.location as string) ?? null,
    dates: (t.dates as string) ?? null,
  };
}

// What is this user's relationship to this trip?
export async function getMembership(
  supabase: SupabaseClient,
  trip: TripRef,
  userId: string
): Promise<MembershipState> {
  const isOwner = trip.ownerId === userId;
  const { data } = await supabase
    .from("trip_members")
    .select("role,status")
    .eq("trip_id", trip.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    return {
      role: isOwner ? "owner" : null,
      status: isOwner ? "active" : null,
      isOwner,
    };
  }
  const d = data as { role: string; status: string };
  return {
    role: d.role === "owner" ? "owner" : "member",
    status: d.status === "pending" ? "pending" : "active",
    isOwner,
  };
}

export function canViewTrip(m: MembershipState): boolean {
  return m.isOwner || m.status === "active";
}

// Ask to join. Returns the resulting status (or existing one).
export async function requestToJoin(
  supabase: SupabaseClient,
  tripId: string,
  userId: string
): Promise<{ status: "active" | "pending"; error?: string }> {
  const { data: existing } = await supabase
    .from("trip_members")
    .select("status")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    return {
      status: (existing as { status: string }).status === "active" ? "active" : "pending",
    };
  }
  const { error } = await supabase
    .from("trip_members")
    .insert({ trip_id: tripId, user_id: userId, role: "member", status: "pending" });
  if (error) return { status: "pending", error: error.message };
  return { status: "pending" };
}

async function membersWithProfiles(
  supabase: SupabaseClient,
  tripId: string,
  status: string
): Promise<MemberRow[]> {
  const { data: rows } = await supabase
    .from("trip_members")
    .select("id,user_id,role,status")
    .eq("trip_id", tripId)
    .eq("status", status);
  if (!rows || rows.length === 0) return [];
  const ids = (rows as Record<string, unknown>[]).map((r) => r.user_id as string);
  const { data: profs } = await supabase
    .from("public_profiles")
    .select("id,username,first_name,last_name,city,state")
    .in("id", ids);
  const pmap = new Map<string, PublicProfile>();
  for (const p of (profs ?? []) as PublicProfile[]) pmap.set(p.id, p);
  return (rows as Record<string, unknown>[]).map((r) => ({
    membershipId: r.id as string,
    role: r.role as string,
    status: r.status as string,
    profile:
      pmap.get(r.user_id as string) ??
      ({
        id: r.user_id as string,
        username: null,
        first_name: null,
        last_name: null,
        city: null,
        state: null,
      } as PublicProfile),
  }));
}

export async function listJoinRequests(
  supabase: SupabaseClient,
  tripId: string
): Promise<MemberRow[]> {
  return membersWithProfiles(supabase, tripId, "pending");
}

export async function listActiveMembers(
  supabase: SupabaseClient,
  tripId: string
): Promise<MemberRow[]> {
  return membersWithProfiles(supabase, tripId, "active");
}

export async function approveMember(
  supabase: SupabaseClient,
  membershipId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("trip_members")
    .update({ status: "active" })
    .eq("id", membershipId);
  return !error;
}

// decline a request / remove a member
export async function removeMember(
  supabase: SupabaseClient,
  membershipId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("trip_members")
    .delete()
    .eq("id", membershipId);
  return !error;
}

// Trips the user has requested but isn't approved for yet.
export async function loadPendingTrips(
  supabase: SupabaseClient,
  userId: string
): Promise<TripRef[]> {
  const { data } = await supabase
    .from("trip_members")
    .select("trips(id,name,join_code,owner_id,location,dates)")
    .eq("user_id", userId)
    .eq("status", "pending");
  const out: TripRef[] = [];
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const raw = row.trips;
    const t = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | undefined;
    if (!t) continue;
    out.push({
      id: t.id as string,
      name: t.name as string,
      joinCode: t.join_code as string,
      ownerId: (t.owner_id as string) ?? null,
      location: (t.location as string) ?? null,
      dates: (t.dates as string) ?? null,
    });
  }
  return out;
}

export type InvitationItem = { membershipId: string; trip: TripRef };

// Owner invites someone by username. They get an 'invited' row to accept.
export async function inviteByUsername(
  supabase: SupabaseClient,
  tripId: string,
  username: string
): Promise<{ ok: boolean; error?: string; name?: string; note?: string }> {
  const handle = username.trim().toLowerCase().replace(/^@/, "");
  if (!handle) return { ok: false, error: "Enter a username." };

  const { data: prof } = await supabase
    .from("public_profiles")
    .select("id,username")
    .ilike("username", handle)
    .maybeSingle();
  if (!prof) return { ok: false, error: `No user found with @${handle}.` };
  const otherId = (prof as { id: string }).id;
  const shown = `@${(prof as { username: string }).username ?? handle}`;

  const { data: existing } = await supabase
    .from("trip_members")
    .select("status")
    .eq("trip_id", tripId)
    .eq("user_id", otherId)
    .maybeSingle();
  if (existing) {
    const s = (existing as { status: string }).status;
    if (s === "active") return { ok: false, error: `${shown} is already a member.` };
    if (s === "invited") return { ok: false, error: `${shown} has already been invited.` };
    if (s === "pending") {
      // they'd requested — inviting is the same as approving them
      await supabase
        .from("trip_members")
        .update({ status: "active" })
        .eq("trip_id", tripId)
        .eq("user_id", otherId);
      return { ok: true, name: shown, note: "They had requested — now approved." };
    }
  }

  const { error } = await supabase
    .from("trip_members")
    .insert({ trip_id: tripId, user_id: otherId, role: "member", status: "invited" });
  if (error) return { ok: false, error: error.message };
  return { ok: true, name: shown };
}

export async function listInvited(
  supabase: SupabaseClient,
  tripId: string
): Promise<MemberRow[]> {
  return membersWithProfiles(supabase, tripId, "invited");
}

// Tournaments this user has been invited to (awaiting their acceptance).
export async function loadInvitations(
  supabase: SupabaseClient,
  userId: string
): Promise<InvitationItem[]> {
  const { data } = await supabase
    .from("trip_members")
    .select("id, trips(id,name,join_code,owner_id,location,dates)")
    .eq("user_id", userId)
    .eq("status", "invited");
  const out: InvitationItem[] = [];
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const raw = row.trips;
    const t = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | undefined;
    if (!t) continue;
    out.push({
      membershipId: row.id as string,
      trip: {
        id: t.id as string,
        name: t.name as string,
        joinCode: t.join_code as string,
        ownerId: (t.owner_id as string) ?? null,
        location: (t.location as string) ?? null,
        dates: (t.dates as string) ?? null,
      },
    });
  }
  return out;
}

export function memberName(p: PublicProfile): string {
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
  if (name && p.username) return `${name} (@${p.username})`;
  if (p.username) return `@${p.username}`;
  return name || "Unknown";
}

// How many pending requests each of these trips has (for owner badges).
export async function pendingCountsForTrips(
  supabase: SupabaseClient,
  tripIds: string[]
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  if (tripIds.length === 0) return result;
  const { data } = await supabase
    .from("trip_members")
    .select("trip_id")
    .eq("status", "pending")
    .in("trip_id", tripIds);
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const id = r.trip_id as string;
    result[id] = (result[id] ?? 0) + 1;
  }
  return result;
}
