"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { TeamDraftScreen } from "@/features/trip/manage/TeamDraftScreen";
import { setPlayerTeam } from "@/lib/supabase/memberships";
import {
  loadRoster,
  setCaptain,
  assignTeamsRandomly,
  assignTeamsBalanced,
  type RosterPlayerLite,
} from "@/lib/supabase/roundsAdmin";

type Row = RosterPlayerLite & { isCaptain: boolean; teamId: string; handicap: number };

export function TeamsPanel({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [teams, setTeams] = useState<{ id: string; code: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmPick, setConfirmPick] = useState<"random" | "balanced" | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [roundLive, setRoundLive] = useState(false);
  const [tripName, setTripName] = useState("TourneyBirdie");
  const [joinCode, setJoinCode] = useState<string | undefined>(undefined);

  // A blank handicap arrives as 0 (older rows) or null, and either way
  // balancing would quietly treat that player as scratch.
  const missingHandicaps = rows
    .filter((r) => r.handicap == null || Number(r.handicap) === 0)
    .map((r) => r.name);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: t } = await supabase.from("teams").select("id,code,name").eq("trip_id", tripId).order("code");
    setTeams(((t ?? []) as { id: string; code: string; name: string }[]) ?? []);
    const { data: trip } = await supabase
      .from("trips")
      .select("name,join_code")
      .eq("id", tripId)
      .maybeSingle();
    if (trip) {
      setTripName((trip as { name?: string }).name ?? "TourneyBirdie");
      setJoinCode((trip as { join_code?: string }).join_code);
    }
    // Once a round is under way, moving people between teams would rewrite
    // matchups and points that are already being played for.
    const { count: liveRounds } = await supabase
      .from("rounds")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", tripId)
      .not("started_at", "is", null);
    setRoundLive((liveRounds ?? 0) > 0);

    const { data: p } = await supabase
      .from("players")
      .select("id,display_name,team_id,handicap_index,is_captain,account_id")
      .eq("trip_id", tripId)
      .order("sort_order");
    const codeById = new Map(((t ?? []) as { id: string; code: string }[]).map((x) => [x.id, x.code]));
    setRows(
      ((p ?? []) as Record<string, unknown>[]).map((x) => ({
        id: x.id as string,
        name: (x.display_name as string) ?? "Player",
        team: ((codeById.get(x.team_id as string) as "A" | "B") ?? "A"),
        teamId: (x.team_id as string) ?? "",
        handicap: Number(x.handicap_index ?? 0),
        isCaptain: Boolean(x.is_captain),
        accountId: (x.account_id as string) ?? null,
      }))
    );
  }, [tripId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const note = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  async function runAssign(kind: "random" | "balanced") {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const res = kind === "random" ? await assignTeamsRandomly(supabase, tripId) : await assignTeamsBalanced(supabase, tripId);
    setBusy(false);
    setConfirmPick(null);
    if (!res.ok) return setError(res.error || "Couldn't set the teams.");
    note(kind === "random" ? "Teams drawn at random" : "Teams balanced by handicap");
    refresh();
  }

  const side = (code: "A" | "B") => rows.filter((r) => r.team === code);
  const teamName = (code: "A" | "B") => teams.find((t) => t.code === code)?.name ?? `Team ${code}`;
  const teamIdOf = (code: "A" | "B") => teams.find((t) => t.code === code)?.id ?? "";
  const sumHcp = (code: "A" | "B") => side(code).reduce((s, r) => s + r.handicap, 0);

  return (
    <div className="space-y-3">
      <p className="text-[13px] leading-5 text-slate-600">
        Who is on each side, and who speaks for them. The captain is the one who picks in a Captain&apos;s Draft.
      </p>

      <div className="rounded-2xl border border-sand-200 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Draw the teams</p>
        <p className="mt-1 text-[12px] leading-5 text-slate-500">
          Replaces everyone&apos;s current side. Do this before matchups are drawn.
        </p>
        {missingHandicaps.length > 0 ? (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
            <p className="text-[13px] font-black text-amber-900">
              Set a handicap first
            </p>
            <p className="mt-0.5 text-[13px] leading-5 text-amber-900">
              {missingHandicaps.slice(0, 3).join(", ")}
              {missingHandicaps.length > 3 ? ` and ${missingHandicaps.length - 3} more` : ""}{" "}
              {missingHandicaps.length === 1 ? "has" : "have"} no handicap, so
              Balanced would treat {missingHandicaps.length === 1 ? "them" : "them"} as
              scratch. You can set it on the Players tab.
            </p>
          </div>
        ) : null}

        {roundLive ? (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
            <p className="text-[13px] font-black text-amber-900">
              A round is under way
            </p>
            <p className="mt-0.5 text-[13px] leading-5 text-amber-900">
              Teams are locked while a round is live - changing sides now would
              rewrite matchups and points people are already playing for. Finish
              the round first, or move one player by hand below.
            </p>
          </div>
        ) : null}

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy || roundLive}
            onClick={() => setConfirmPick("random")}
            className="flex-1 rounded-xl border-[1.5px] border-fairway-900 px-3 py-2 text-sm font-black text-fairway-900 disabled:opacity-50"
          >
            🎲 Random
          </button>
          <button
            type="button"
            disabled={busy || roundLive || missingHandicaps.length > 0}
            onClick={() => setConfirmPick("balanced")}
            className="flex-1 rounded-xl border-[1.5px] border-fairway-900 px-3 py-2 text-sm font-black text-fairway-900 disabled:opacity-50"
          >
            ⚖️ Balanced
          </button>
        </div>
        <button
          type="button"
          disabled={busy || roundLive}
          onClick={() => setDrafting(true)}
          className="mt-2 w-full rounded-xl bg-fairway-900 px-3 py-2 text-sm font-black text-white disabled:opacity-50"
        >
          🪙 Captain&apos;s Draft
        </button>
        <p className="mt-1 text-[12px] leading-5 text-slate-500">
          Coin toss, then the captains take turns picking the roster.
        </p>
      </div>

      {drafting ? (
        <TeamDraftScreen
          tripId={tripId}
          tripName={tripName}
          joinCode={joinCode}
          userId={user?.id}
          players={rows.map((r) => ({
            id: r.id,
            name: r.name,
            handicap: r.handicap,
            isCaptain: r.isCaptain,
            team: r.team,
            accountId: r.accountId,
          }))}
          teamName={teamName}
          teamIdOf={teamIdOf}
          onClose={() => {
            setDrafting(false);
            refresh();
          }}
          onSaved={refresh}
        />
      ) : null}

      {(["A", "B"] as const).map((code) => (
        <div key={code} className="rounded-2xl border border-sand-200 p-3">
          <div className="flex items-baseline gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: code === "A" ? "#e5484d" : "#3b82f6" }}
            />
            <p className="font-black text-ink">{teamName(code)}</p>
            <span className="ml-auto text-[12px] text-slate-500">
              {side(code).length} players · {sumHcp(code).toFixed(1)} combined
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {side(code).map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-lg bg-[#f7f6f1] px-2.5 py-1.5">
                <span className="flex-1 text-[13px] font-bold text-ink">
                  {r.name} <span className="font-normal text-slate-400">({r.handicap})</span>
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const supabase = getSupabaseClient();
                    if (!supabase) return;
                    await setCaptain(supabase, tripId, teamIdOf(code), r.isCaptain ? null : r.id);
                    note(r.isCaptain ? "Captain cleared" : `${r.name} is captain`);
                    refresh();
                  }}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                    r.isCaptain ? "bg-accent text-ink" : "bg-white text-slate-400"
                  }`}
                >
                  {r.isCaptain ? "⭐ Captain" : "Make captain"}
                </button>
                <button
                  type="button"
                  disabled={busy || roundLive}
                  aria-label={`Move ${r.name} to the other team`}
                  onClick={async () => {
                    const supabase = getSupabaseClient();
                    if (!supabase) return;
                    const other = code === "A" ? "B" : "A";
                    setBusy(true);
                    const ok = await setPlayerTeam(supabase, r.id, teamIdOf(other));
                    setBusy(false);
                    if (!ok) {
                      setError(`Couldn't move ${r.name}.`);
                      return;
                    }
                    note(
                      r.isCaptain
                        ? `${r.name} moved to ${teamName(other)} - pick a new captain for ${teamName(code)}`
                        : `${r.name} moved to ${teamName(other)}`
                    );
                    refresh();
                  }}
                  className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-fairway-900 disabled:opacity-40"
                >
                  Move →
                </button>
              </div>
            ))}
            {side(code).length === 0 ? <p className="text-[13px] text-slate-400">Nobody on this side yet.</p> : null}
          </div>
        </div>
      ))}

      {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}
      {toast ? <p className="text-sm font-bold text-emerald-700">{toast}</p> : null}

      {confirmPick ? (
        <div className="fixed inset-0 z-[165] flex items-center justify-center bg-black/70 p-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5">
            <h3 className="font-anton text-2xl tracking-tight text-ink">Redraw both teams?</h3>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              {confirmPick === "random"
                ? "Everyone gets shuffled into two even sides at random."
                : "Players are snaked by handicap so the two sides come out close."}{" "}
              This replaces the current teams. Matchups already drawn will need redrawing.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmPick(null)}
                className="flex-1 rounded-2xl border-[1.5px] border-slate-300 px-4 py-3 font-black text-slate-600"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={() => runAssign(confirmPick)}
                disabled={busy}
                className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white disabled:opacity-50"
              >
                {busy ? "Drawing…" : "Redraw teams"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
