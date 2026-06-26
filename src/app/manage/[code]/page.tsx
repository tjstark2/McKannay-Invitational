"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useParams, useRouter } from "next/navigation";
import { Check, X, UserPlus, Pencil } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { BrandHeaderMark } from "@/features/trip/components/Brand";
import { AccountMenu } from "@/features/account/AccountMenu";
import {
  resolveTrip,
  getMembership,
  listJoinRequests,
  listActiveMembers,
  listInvited,
  inviteByUsername,
  approveMember,
  removeMember,
  setMemberRole,
  setMemberHandicap,
  loadTripTeams,
  loadTripPlayers,
  addMemberAsPlayer,
  removeRosterPlayer,
  setPlayerTeam,
  setTripRosterSize,
  setTeamName,
  deleteTrip,
  memberName,
  type TripRef,
  type MemberRow,
  type TeamLite,
  type RosterPlayer,
} from "@/lib/supabase/memberships";
import { handleAndLocation, searchUsers, type PublicProfile } from "@/lib/supabase/friends";

export default function ManagePage() {
  const params = useParams();
  const code = String(params.code ?? "");
  const { user, loading } = useAuth();
  const router = useRouter();

  const [trip, setTrip] = useState<TripRef | null>(null);
  const [requests, setRequests] = useState<MemberRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invited, setInvited] = useState<MemberRow[]>([]);
  const [teams, setTeams] = useState<TeamLite[]>([]);
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [inviteHandle, setInviteHandle] = useState("");
  const [inviteResults, setInviteResults] = useState<PublicProfile[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(true);
  const [isOwnerViewer, setIsOwnerViewer] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editingSize, setEditingSize] = useState(false);
  const [sizeDraft, setSizeDraft] = useState("12");

  const refresh = useCallback(async (t: TripRef) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setRequests(await listJoinRequests(supabase, t.id));
    setMembers(await listActiveMembers(supabase, t.id));
    setInvited(await listInvited(supabase, t.id));
    setTeams(await loadTripTeams(supabase, t.id));
    setPlayers(await loadTripPlayers(supabase, t.id));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/signin?next=/manage/${encodeURIComponent(code)}`);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;
    (async () => {
      const t = await resolveTrip(supabase, code);
      if (!active) return;
      if (!t) {
        setReady(true);
        setTrip(null);
        return;
      }
      const m = await getMembership(supabase, t, user.id);
      if (!active) return;
      if (!m.canManage) {
        setAuthorized(false);
        setReady(true);
        return;
      }
      setIsOwnerViewer(t.ownerId === user.id);
      setTrip(t);
      await refresh(t);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [user, loading, code, router, refresh]);

  // live search for the invite autocomplete (hook must run every render)
  useEffect(() => {
    if (!user) return;
    const q = inviteHandle.trim();
    if (q.length < 2) {
      setInviteResults([]);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;
    const t = setTimeout(async () => {
      const r = await searchUsers(supabase, q, user.id);
      if (active) {
        setInviteResults(r);
        setInviteOpen(true);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [inviteHandle, user]);

  if (loading || !ready) {
    return (
      <LoadingScreen />
    );
  }

  if (!authorized) {
    return (
      <Shell>
        <h1 className="font-anton text-3xl tracking-tight text-ink">Not Your Tournament</h1>
        <p className="mt-2 text-slate-500">
          Only the organizer can manage members for this tournament.
        </p>
        <button
          onClick={() => router.push("/home")}
          className="mt-6 rounded-2xl bg-fairway-900 px-5 py-3 font-black text-white"
        >
          Back to My Tournaments
        </button>
      </Shell>
    );
  }

  if (!trip) {
    return (
      <Shell>
        <h1 className="font-anton text-3xl tracking-tight text-ink">Tournament Not Found</h1>
        <button
          onClick={() => router.push("/home")}
          className="mt-6 rounded-2xl bg-fairway-900 px-5 py-3 font-black text-white"
        >
          Back to My Tournaments
        </button>
      </Shell>
    );
  }

  async function decide(membershipId: string, approve: boolean) {
    const supabase = getSupabaseClient();
    if (!supabase || !trip) return;
    if (approve) await approveMember(supabase, membershipId);
    else await removeMember(supabase, membershipId);
    await refresh(trip);
  }

  async function kick(membershipId: string, accountId?: string) {
    const supabase = getSupabaseClient();
    if (!supabase || !trip) return;
    await removeMember(supabase, membershipId);
    if (accountId) {
      const p = players.find((pl) => pl.accountId === accountId);
      if (p) await removeRosterPlayer(supabase, p.id);
    }
    await refresh(trip);
  }

  async function setRole(membershipId: string, role: "admin" | "member") {
    const supabase = getSupabaseClient();
    if (!supabase || !trip) return;
    await setMemberRole(supabase, membershipId, role);
    await refresh(trip);
  }

  async function addToRoster(member: MemberRow, teamDbId: string) {
    const supabase = getSupabaseClient();
    if (!supabase || !trip) return;
    await addMemberAsPlayer(supabase, trip.id, member, teamDbId, players.length);
    await refresh(trip);
  }

  async function switchTeam(playerId: string, teamDbId: string) {
    const supabase = getSupabaseClient();
    if (!supabase || !trip) return;
    await setPlayerTeam(supabase, playerId, teamDbId);
    await refresh(trip);
  }

  async function removeFromRoster(playerId: string) {
    const supabase = getSupabaseClient();
    if (!supabase || !trip) return;
    await removeRosterPlayer(supabase, playerId);
    await refresh(trip);
  }

  async function renameTeam(teamDbId: string, name: string) {
    const supabase = getSupabaseClient();
    if (!supabase || !trip) return;
    await setTeamName(supabase, teamDbId, name);
    await refresh(trip);
  }

  async function saveSize() {
    const supabase = getSupabaseClient();
    if (!supabase || !trip) return;
    const n = Number(sizeDraft);
    if (!Number.isFinite(n) || n < 1) return;
    await setTripRosterSize(supabase, trip.id, n);
    setEditingSize(false);
    setTrip({ ...trip, rosterSize: Math.round(n) });
    await refresh(trip);
  }

  async function invite(handle?: string) {
    const target = (handle ?? inviteHandle).trim();
    if (!trip || inviteBusy || !target) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setInviteBusy(true);
    setInviteMsg(null);
    setInviteOpen(false);
    const res = await inviteByUsername(supabase, trip.id, target);
    setInviteBusy(false);
    if (!res.ok) {
      setInviteMsg({ ok: false, text: res.error ?? "Couldn't invite." });
      return;
    }
    setInviteHandle("");
    setInviteResults([]);
    setInviteMsg({
      ok: true,
      text: res.note
        ? `${res.name} ${res.note}`
        : `Invited ${res.name} - they'll see it on their dashboard.`,
    });
    await refresh(trip);
  }

  function memberCard(m: MemberRow, isOwner: boolean) {
    const player = players.find((p) => p.accountId === m.profile.id);
    const initial = (m.profile.username || m.profile.first_name || "?")
      .charAt(0)
      .toUpperCase();
    return (
      <div
        key={m.membershipId}
        className="rounded-2xl border border-sand-100 bg-white p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fairway-900 font-black text-white">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate font-black text-ink">
                {memberName(m.profile)}
              </p>
              <p className="truncate text-sm text-slate-500">
                {handleAndLocation(m.profile)}
              </p>
            </div>
          </div>
          {isOwner ? (
            <span className="shrink-0 rounded-full bg-sand-50 px-3 py-1.5 text-xs font-black uppercase text-slate-500">
              Organizer
            </span>
          ) : m.role === "admin" ? (
            <span className="shrink-0 rounded-full bg-accent/20 px-3 py-1.5 text-xs font-black uppercase text-accent-dark">
              Admin
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sand-100 pt-3">
          <HandicapEditor member={m} tripId={trip!.id} onSaved={() => refresh(trip!)} />

          {/* team assignment */}
          <span className="inline-flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400">Team:</span>
            {teams.map((t) => {
              const active = !!player && player.teamId === t.dbId;
              return (
                <button
                  key={t.dbId}
                  onClick={() =>
                    active
                      ? undefined
                      : player
                        ? switchTeam(player.id, t.dbId)
                        : addToRoster(m, t.dbId)
                  }
                  className={
                    active
                      ? `rounded-full px-3 py-1.5 text-xs font-extrabold text-white ${
                          t.code === "A" ? "bg-fairway-900" : "bg-green"
                        }`
                      : "rounded-full border border-sand-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-600"
                  }
                >
                  {t.name}
                </button>
              );
            })}
            {player ? (
              <button
                onClick={() => removeFromRoster(player.id)}
                title="Remove from team"
                className="px-1 text-xs font-bold text-slate-400 hover:text-red-600"
              >
                ✕
              </button>
            ) : (
              <span className="text-xs font-bold text-slate-400">
                no team yet
              </span>
            )}
          </span>

          {!isOwner ? (
            <span className="ml-auto flex items-center gap-2">
              {isOwnerViewer ? (
                m.role === "admin" ? (
                  <button
                    onClick={() => setRole(m.membershipId, "member")}
                    className="rounded-full border border-sand-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-500"
                  >
                    Remove admin
                  </button>
                ) : (
                  <button
                    onClick={() => setRole(m.membershipId, "admin")}
                    className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-extrabold text-accent-dark"
                  >
                    Make admin
                  </button>
                )
              ) : null}

              {isOwnerViewer || m.role !== "admin" ? (
                confirmId === m.membershipId ? (
                  <span className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        kick(m.membershipId, m.profile.id);
                        setConfirmId(null);
                      }}
                      className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-extrabold text-white"
                    >
                      Yes, remove
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="rounded-full border border-sand-200 px-3 py-1.5 text-xs font-bold text-slate-500"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmId(m.membershipId)}
                    className="text-xs font-bold text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )
              ) : null}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  const owner = members.find((m) => m.role === "owner") ?? null;
  const admitted = members.filter((m) => m.role !== "owner");
  const ownerPlaying = owner
    ? players.some((p) => p.accountId === owner.profile.id)
    : false;
  const filledSpots = admitted.length + (ownerPlaying ? 1 : 0);
  const openSpots = Math.max(0, trip.rosterSize - filledSpots);

  return (
    <Shell>
      <p className="text-xs font-extrabold uppercase tracking-wide text-accent-dark">
        Manage tournament
      </p>
      <h1 className="mt-1 font-anton text-4xl tracking-tight text-ink">{trip.name}</h1>
      <p className="mt-1 text-slate-500">
        Share code <b className="text-fairway-900">{trip.joinCode}</b> · approve
        who gets in.
      </p>

      {/* invite by username */}
      <section className="mt-7">
        <h2 className="font-anton text-2xl tracking-tight text-ink">Invite a Player</h2>
        <div className="relative mt-3">
          <div className="flex items-center gap-2 rounded-2xl border border-sand-100 bg-white px-3 py-2">
            <span className="pl-1 text-slate-400">@</span>
            <input
              value={inviteHandle}
              onChange={(e) => {
                setInviteHandle(
                  e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
                );
                setInviteMsg(null);
              }}
              onFocus={() => inviteResults.length > 0 && setInviteOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") invite();
              }}
              placeholder="search by username or name"
              className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none"
            />
            <button
              onClick={() => invite()}
              disabled={inviteBusy || !inviteHandle.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-fairway-900 px-4 py-2.5 font-black text-white disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" /> Invite
            </button>
          </div>
          {inviteOpen && inviteResults.length > 0 ? (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setInviteOpen(false)}
              />
              <div className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-2xl border border-sand-100 bg-white shadow-xl">
                {inviteResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => invite(p.username ?? "")}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-sand-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-black text-ink">
                        {memberName(p)}
                      </span>
                      <span className="block truncate text-sm text-slate-500">
                        {handleAndLocation(p)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-extrabold text-fairway-900">
                      Invite
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
        {inviteMsg ? (
          <p
            className={`mt-2 text-sm font-bold ${
              inviteMsg.ok ? "text-green" : "text-red-600"
            }`}
          >
            {inviteMsg.text}
          </p>
        ) : null}
        {invited.length > 0 ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
              Invited · Awaiting Response
            </p>
            {invited.map((m) => (
              <Row key={m.membershipId} r={m}>
                <button
                  onClick={() => kick(m.membershipId)}
                  className="rounded-full border border-sand-200 bg-white px-3 py-2 text-sm font-bold text-slate-400 hover:text-red-600"
                >
                  Cancel
                </button>
              </Row>
            ))}
          </div>
        ) : null}
      </section>

      {/* requests */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-anton text-2xl tracking-tight text-ink">
          Join Requests
          {requests.length > 0 ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-black text-ink">
              {requests.length}
            </span>
          ) : null}
        </h2>
        {requests.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No pending requests.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {requests.map((r) => (
              <Row key={r.membershipId} r={r}>
                <div className="flex gap-2">
                  <button
                    onClick={() => decide(r.membershipId, true)}
                    className="inline-flex items-center gap-1 rounded-full bg-fairway-900 px-3 py-2 text-sm font-extrabold text-white"
                  >
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button
                    onClick={() => decide(r.membershipId, false)}
                    className="inline-flex items-center gap-1 rounded-full border border-sand-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </Row>
            ))}
          </div>
        )}
      </section>

      {/* roster */}
      <section className="mt-9">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-anton text-2xl tracking-tight text-ink">Roster</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filledSpots} of {trip.rosterSize} spots filled · assign each
              player to a team.
            </p>
          </div>
          {editingSize ? (
            <span className="flex items-center gap-1">
              <input
                inputMode="numeric"
                value={sizeDraft}
                onChange={(e) =>
                  setSizeDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))
                }
                className="w-16 rounded-lg border border-sand-200 px-2 py-1.5 text-sm outline-none focus:border-fairway-900"
                autoFocus
              />
              <button
                onClick={saveSize}
                className="rounded-lg bg-fairway-900 px-2.5 py-1.5 text-xs font-black text-white"
              >
                Save
              </button>
              <button
                onClick={() => setEditingSize(false)}
                className="px-1 text-xs font-bold text-slate-400"
              >
                ✕
              </button>
            </span>
          ) : (
            <button
              onClick={() => {
                setSizeDraft(String(trip.rosterSize));
                setEditingSize(true);
              }}
              className="shrink-0 rounded-full bg-sand-50 px-3 py-1.5 text-xs font-black text-fairway-900"
            >
              Spots: {trip.rosterSize}
            </button>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {admitted.map((m) => memberCard(m, false))}

          {Array.from({ length: openSpots }).map((_, i) => (
            <div
              key={`open-${i}`}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-sand-200 bg-white/50 px-4 py-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-sand-200 text-slate-300">
                +
              </span>
              <span className="text-sm font-bold text-slate-400">
                Open Spot
              </span>
            </div>
          ))}
        </div>

        {owner ? (
          <>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-wide text-slate-400">
              Organizer
            </p>
            <div className="mt-2">{memberCard(owner, true)}</div>
            <p className="mt-1 text-xs text-slate-400">
              You only take a spot if you put yourself on a team - leave
              yourself off if you&apos;re not playing.
            </p>
          </>
        ) : null}
      </section>

      {/* team names */}
      <section className="mt-9">
        <h2 className="font-anton text-2xl tracking-tight text-ink">Team Names</h2>
        <div className="mt-3 space-y-2">
          {teams.map((t) => (
            <TeamNameRow key={t.dbId} team={t} onSave={renameTeam} />
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-2">
        <button
          onClick={() => router.push(`/t/${trip.joinCode}`)}
          className="w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white"
        >
          Open Tournament
        </button>
        <button
          onClick={() => router.push("/home")}
          className="w-full rounded-2xl border border-sand-100 bg-white px-4 py-3.5 font-black text-fairway-900"
        >
          ← My Tournaments
        </button>
      </div>

      {/* danger zone - owner only */}
      {isOwnerViewer ? (
        <DangerZone trip={trip} onDeleted={() => router.replace("/home")} />
      ) : null}
    </Shell>
  );
}

function TeamNameRow({
  team,
  onSave,
}: {
  team: TeamLite;
  onSave: (dbId: string, name: string) => void;
}) {
  const [value, setValue] = useState(team.name);
  const dirty = value.trim() !== team.name && value.trim() !== "";
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-sand-100 bg-white px-4 py-3">
      <span
        className={`h-3 w-3 shrink-0 rounded-full ${
          team.code === "A" ? "bg-fairway-900" : "bg-green"
        }`}
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-w-0 flex-1 bg-transparent font-black text-ink outline-none"
      />
      <button
        onClick={() => onSave(team.dbId, value)}
        disabled={!dirty}
        className="shrink-0 rounded-lg bg-fairway-900 px-3 py-1.5 text-xs font-black text-white disabled:opacity-40"
      >
        Save
      </button>
    </div>
  );
}

function DangerZone({
  trip,
  onDeleted,
}: {
  trip: TripRef;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = confirmText.trim().toUpperCase() === trip.joinCode.toUpperCase();

  async function doDelete() {
    if (!matches || busy) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const res = await deleteTrip(supabase, trip.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Couldn't delete the tournament.");
      return;
    }
    onDeleted();
  }

  return (
    <section className="mt-12 rounded-2xl border border-red-200 bg-red-50/50 p-5">
      <h2 className="text-lg font-black text-red-700">Danger Zone</h2>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 rounded-2xl border border-red-300 bg-white px-4 py-2.5 font-black text-red-600"
        >
          Delete tournament
        </button>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-slate-600">
            This permanently deletes <b className="text-ink">{trip.name}</b> and
            all of its rounds, scores, teams, and members. This can&apos;t be
            undone. Type the join code{" "}
            <b className="text-ink">{trip.joinCode}</b> to confirm.
          </p>
          <input
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              setError(null);
            }}
            placeholder={trip.joinCode}
            className="mt-3 w-full rounded-2xl border-[1.5px] border-red-200 bg-white px-4 py-3 outline-none focus:border-red-500"
          />
          {error ? (
            <p className="mt-2 text-sm font-bold text-red-600">{error}</p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              onClick={doDelete}
              disabled={!matches || busy}
              className="rounded-2xl bg-red-600 px-4 py-2.5 font-black text-white disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setError(null);
              }}
              className="rounded-2xl border border-sand-200 bg-white px-4 py-2.5 font-bold text-slate-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f6f1]">
      <header className="relative z-50 border-b border-sand-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <BrandHeaderMark />
          <AccountMenu />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">{children}</main>
    </div>
  );
}

function Row({ r, children }: { r: MemberRow; children: React.ReactNode }) {
  const initial = (r.profile.username || r.profile.first_name || "?")
    .charAt(0)
    .toUpperCase();
  return (
    <div className="flex items-center justify-between rounded-2xl border border-sand-100 bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fairway-900 font-black text-white">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate font-black text-ink">{memberName(r.profile)}</p>
          <p className="truncate text-sm text-slate-500">
            {handleAndLocation(r.profile)}
          </p>
        </div>
      </div>
      <div className="shrink-0 pl-3">{children}</div>
    </div>
  );
}

function HandicapEditor({
  member,
  tripId,
  onSaved,
}: {
  member: MemberRow;
  tripId: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    member.handicap != null ? String(member.handicap) : ""
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    const num = Number(value);
    if (value.trim() === "" || Number.isNaN(num) || busy) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    await setMemberHandicap(supabase, tripId, member.profile.id, num, true);
    setBusy(false);
    setEditing(false);
    onSaved();
  }

  if (editing) {
    return (
      <span className="flex items-center gap-1">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9.\-]/g, ""))}
          className="w-16 rounded-lg border border-sand-200 px-2 py-1.5 text-sm outline-none focus:border-fairway-900"
          placeholder="HCP"
          autoFocus
        />
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-fairway-900 px-2.5 py-1.5 text-xs font-black text-white"
        >
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-1 text-xs font-bold text-slate-400"
        >
          ✕
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Set handicap (admin only)"
      className="inline-flex items-center gap-1 rounded-full bg-sand-50 px-2.5 py-1.5 text-xs font-black text-fairway-900"
    >
      HCP {member.handicap != null ? member.handicap : "-"}
      <Pencil className="h-3 w-3 text-slate-400" />
    </button>
  );
}
