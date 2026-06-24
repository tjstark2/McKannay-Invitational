import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicProfile } from "@/lib/supabase/friends";

export type TripRef = {
  id: string;
  name: string;
  joinCode: string;
  ownerId: string | null;
  location: string | null;
  dates: string | null;
  rosterSize: number;
};

export type MembershipState = {
  role: "owner" | "admin" | "member" | null;
  status: "active" | "pending" | null;
  isOwner: boolean;
  canManage: boolean;
  handicap: number | null;
  handicapConfirmed: boolean;
};

export type MemberRow = {
  membershipId: string;
  role: string;
  status: string;
  handicap: number | null;
  handicapConfirmed: boolean;
  profile: PublicProfile;
};

export async function resolveTrip(
  supabase: SupabaseClient,
  code: string
): Promise<TripRef | null> {
  const { data, error } = await supabase.rpc("trip_card", { p_code: code });
  if (error || !data || (data as unknown[]).length === 0) return null;
  const t = (data as Record<string, unknown>[])[0];
  return {
    id: t.id as string,
    name: t.name as string,
    joinCode: t.join_code as string,
    ownerId: (t.owner_id as string) ?? null,
    location: (t.location as string) ?? null,
    dates: (t.dates as string) ?? null,
    rosterSize: (t.roster_size as number) ?? 12,
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
    .select("role,status,handicap,handicap_confirmed")
    .eq("trip_id", trip.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    return {
      role: isOwner ? "owner" : null,
      status: isOwner ? "active" : null,
      isOwner,
      canManage: isOwner,
      handicap: null,
      handicapConfirmed: false,
    };
  }
  const d = data as {
    role: string;
    status: string;
    handicap: number | null;
    handicap_confirmed: boolean;
  };
  const role =
    d.role === "owner" ? "owner" : d.role === "admin" ? "admin" : "member";
  const status = d.status === "pending" ? "pending" : "active";
  return {
    role,
    status,
    isOwner,
    canManage: isOwner || (role === "admin" && status === "active"),
    handicap: d.handicap ?? null,
    handicapConfirmed: Boolean(d.handicap_confirmed),
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
    .select("id,user_id,role,status,handicap,handicap_confirmed")
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
    handicap: (r.handicap as number) ?? null,
    handicapConfirmed: Boolean(r.handicap_confirmed),
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

// Set a member's per-tournament handicap. confirmed=true locks it for the
// player (only the admin can change it afterward).
export async function setMemberHandicap(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
  handicap: number,
  confirmed: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from("trip_members")
    .update({ handicap, handicap_confirmed: confirmed })
    .eq("trip_id", tripId)
    .eq("user_id", userId);
  // Keep their roster player's handicap in sync, if they're on a team.
  await supabase
    .from("players")
    .update({ handicap_index: handicap })
    .eq("trip_id", tripId)
    .eq("account_id", userId);
  return !error;
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

// Promote a member to admin, or demote an admin back to member. Owner only.
export async function setMemberRole(
  supabase: SupabaseClient,
  membershipId: string,
  role: "admin" | "member"
): Promise<boolean> {
  const { error } = await supabase
    .from("trip_members")
    .update({ role })
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
  void userId;
  const { data } = await supabase.rpc("my_member_trips", { p_status: "pending" });
  return ((data ?? []) as Record<string, unknown>[]).map((t) => ({
    id: t.id as string,
    name: t.name as string,
    joinCode: t.join_code as string,
    ownerId: (t.owner_id as string) ?? null,
    location: (t.location as string) ?? null,
    dates: (t.dates as string) ?? null,
    rosterSize: (t.roster_size as number) ?? 12,
  }));
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
  void userId;
  const { data } = await supabase.rpc("my_member_trips", { p_status: "invited" });
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    membershipId: row.membership_id as string,
    trip: {
      id: row.id as string,
      name: row.name as string,
      joinCode: row.join_code as string,
      ownerId: (row.owner_id as string) ?? null,
      location: (row.location as string) ?? null,
      dates: (row.dates as string) ?? null,
      rosterSize: (row.roster_size as number) ?? 12,
    },
  }));
}

// ---- Rosters: turning approved members into players on a team ----------

export type TeamLite = { code: "A" | "B"; dbId: string; name: string };
export type RosterPlayer = {
  id: string;
  accountId: string | null;
  name: string;
  teamId: string | null;
  handicap: number | null;
};

export async function loadTripTeams(
  supabase: SupabaseClient,
  tripId: string
): Promise<TeamLite[]> {
  const { data } = await supabase
    .from("teams")
    .select("id,code,name")
    .eq("trip_id", tripId);
  return ((data ?? []) as Record<string, unknown>[]).map((t) => ({
    code: (t.code as string) === "B" ? "B" : "A",
    dbId: t.id as string,
    name: (t.name as string) ?? (t.code === "B" ? "Team B" : "Team A"),
  }));
}

export async function loadTripPlayers(
  supabase: SupabaseClient,
  tripId: string
): Promise<RosterPlayer[]> {
  const { data } = await supabase
    .from("players")
    .select("id,account_id,display_name,team_id,handicap_index")
    .eq("trip_id", tripId);
  return ((data ?? []) as Record<string, unknown>[]).map((p) => ({
    id: p.id as string,
    accountId: (p.account_id as string) ?? null,
    name: (p.display_name as string) ?? "",
    teamId: (p.team_id as string) ?? null,
    handicap: (p.handicap_index as number) ?? null,
  }));
}

function rosterName(p: PublicProfile): string {
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return name || (p.username ? `@${p.username}` : "Player");
}

// Create a player row for an approved member on the chosen team.
export async function addMemberAsPlayer(
  supabase: SupabaseClient,
  tripId: string,
  member: MemberRow,
  teamDbId: string,
  sortOrder: number
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("players").insert({
    trip_id: tripId,
    team_id: teamDbId,
    display_name: rosterName(member.profile),
    handicap_index: member.handicap ?? 0,
    avatar_emoji: "⛳",
    sort_order: sortOrder,
    account_id: member.profile.id,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function removeRosterPlayer(
  supabase: SupabaseClient,
  playerId: string
): Promise<boolean> {
  const { error } = await supabase.from("players").delete().eq("id", playerId);
  return !error;
}

// Move an existing roster player to a different team.
export async function setPlayerTeam(
  supabase: SupabaseClient,
  playerId: string,
  teamDbId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("players")
    .update({ team_id: teamDbId })
    .eq("id", playerId);
  return !error;
}

// Change how many spots a tournament has.
export async function setTripRosterSize(
  supabase: SupabaseClient,
  tripId: string,
  size: number
): Promise<boolean> {
  const { error } = await supabase
    .from("trips")
    .update({ roster_size: Math.max(1, Math.round(size)) })
    .eq("id", tripId);
  return !error;
}

// Rename a team.
export async function setTeamName(
  supabase: SupabaseClient,
  teamDbId: string,
  name: string
): Promise<boolean> {
  const { error } = await supabase
    .from("teams")
    .update({ name: name.trim() || "Team" })
    .eq("id", teamDbId);
  return !error;
}

// Delete a tournament and all its data (owner only, enforced in the DB function).
export async function deleteTrip(
  supabase: SupabaseClient,
  tripId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc("delete_trip", { p_trip: tripId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
