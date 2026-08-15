"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadRoster,
  setCaptain,
  assignTeamsRandomly,
  assignTeamsBalanced,
  type RosterPlayerLite,
} from "@/lib/supabase/roundsAdmin";

type Row = RosterPlayerLite & { isCaptain: boolean; teamId: string; handicap: number };

export function TeamsPanel({ tripId }: { tripId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [teams, setTeams] = useState<{ id: string; code: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmPick, setConfirmPick] = useState<"random" | "balanced" | null>(null);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: t } = await supabase.from("teams").select("id,code,name").eq("trip_id", tripId).order("code");
    setTeams(((t ?? []) as { id: string; code: string; name: string }[]) ?? []);
    const { data: p } = await supabase
      .from("players")
      .select("id,display_name,team_id,handicap_index,is_captain")
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
        accountId: null,
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
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmPick("random")}
            className="flex-1 rounded-xl border-[1.5px] border-fairway-900 px-3 py-2 text-sm font-black text-fairway-900 disabled:opacity-50"
          >
            🎲 Random
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmPick("balanced")}
            className="flex-1 rounded-xl border-[1.5px] border-fairway-900 px-3 py-2 text-sm font-black text-fairway-900 disabled:opacity-50"
          >
            ⚖️ Balanced
          </button>
        </div>
      </div>

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
