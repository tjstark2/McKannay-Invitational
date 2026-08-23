"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import type { Player } from "@/types";
import { notify } from "@/lib/notify";
import type { CourseHole } from "@/lib/supabase/courseHoles";

type HoleScore = { playerId: string; hole: number; strokes: number };

/** Light-hearted read on the round. Only shows what the card actually supports. */
export function deriveFunStats(
  players: Player[],
  holes: CourseHole[],
  scores: HoleScore[]
): { title: string; line: string }[] {
  const parOf = new Map(holes.map((h) => [h.hole, h.par]));
  const out: { title: string; line: string }[] = [];
  const byPlayer = (pid: string) => scores.filter((s) => s.playerId === pid);
  const nameOf = (pid: string) => players.find((p) => p.id === pid)?.name ?? "Someone";

  const count = (pid: string, test: (over: number, par: number, strokes: number) => boolean) =>
    byPlayer(pid).filter((s) => {
      const par = parOf.get(s.hole);
      if (!par) return false;
      return test(s.strokes - par, par, s.strokes);
    }).length;

  const top = (
    scorer: (pid: string) => number
  ): { id: string; value: number } | null => {
    let best: { id: string; value: number } | null = null;
    players.forEach((p) => {
      const v = scorer(p.id);
      if (v > 0 && (!best || v > best.value)) best = { id: p.id, value: v };
    });
    return best;
  };

  const snow = top((pid) => count(pid, (_o, _p, strokes) => strokes >= 8));
  if (snow)
    out.push({
      title: "Snowman King",
      line: `${nameOf(snow.id)} put up ${snow.value} eight${snow.value === 1 ? "" : "s"} or worse.`,
    });

  const trips = top((pid) => count(pid, (over) => over >= 3));
  if (trips)
    out.push({
      title: "Triple Club",
      line: `${nameOf(trips.id)} carded ${trips.value} triple${trips.value === 1 ? "" : "s"} or worse.`,
    });

  const par3s = top((pid) => count(pid, (over, par) => par === 3 && over >= 2));
  if (par3s)
    out.push({
      title: "Avoids Par 3s To Save Their Life",
      line: `${nameOf(par3s.id)} lost ${par3s.value} shot${par3s.value === 1 ? "" : "s"} or more on the short ones.`,
    });

  const birds = top((pid) => count(pid, (over) => over <= -1));
  if (birds)
    out.push({
      title: "Birdie Machine",
      line: `${nameOf(birds.id)} made ${birds.value} birdie${birds.value === 1 ? "" : "s"} or better.`,
    });

  const pars = top((pid) => count(pid, (over) => over === 0));
  if (pars)
    out.push({
      title: "Mr Steady",
      line: `${nameOf(pars.id)} made ${pars.value} par${pars.value === 1 ? "" : "s"}.`,
    });

  return out;
}

export function RoundConfirm({
  roundId,
  groupPlayers,
  holes,
  scores,
  strokesOn,
  onLocked,
}: {
  roundId: string;
  groupPlayers: Player[];
  holes: CourseHole[];
  scores: HoleScore[];
  strokesOn: (playerId: string, hole: number) => number;
  onLocked?: () => void;
}) {
  const { user } = useAuth();
  const { upsertScore } = useTripState();
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const me = groupPlayers.find((p) => p.accountId && p.accountId === user?.id);

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("round_confirmations")
      .select("player_id")
      .eq("round_id", roundId);
    setConfirmed(((data ?? []) as { player_id: string }[]).map((r) => r.player_id));
  }, [roundId]);

  useEffect(() => {
    load();
  }, [load]);

  const fun = useMemo(() => deriveFunStats(groupPlayers, holes, scores), [groupPlayers, holes, scores]);

  const totals = groupPlayers.map((p) => {
    const mine = scores.filter((s) => s.playerId === p.id);
    const gross = mine.reduce((sum, s) => sum + s.strokes, 0);
    const strokes = mine.reduce((sum, s) => sum + strokesOn(p.id, s.hole), 0);
    return { player: p, gross, net: gross - strokes };
  });

  const allConfirmed = groupPlayers.every((p) => confirmed.includes(p.id));

  // The database requires a front nine whenever a gross is set, so derive it
  // from the card rather than leaving it null.
  const frontNineOf = (pid: string) => {
    const front = scores.filter((s) => s.playerId === pid && s.hole <= 9);
    if (front.length === 0) return null;
    return front.reduce((sum, s) => sum + s.strokes, 0);
  };

  async function signCard() {
    if (!me) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    // Publish the final gross BEFORE recording the signature. The database
    // locks a card once it is signed, so doing it the other way round would
    // lock this player out of their own total.
    const myGross = totals.find((t) => t.player.id === me.id)?.gross;
    const myFront = frontNineOf(me.id);
    if (myGross != null && myGross > 0) {
      const { error: se } = await supabase.from("score_entries").upsert(
        {
          round_id: roundId,
          player_id: me.id,
          gross_score: myGross,
          front_nine_score: myFront,
          entered_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "round_id,player_id" }
      );
      if (se) {
        setBusy(false);
        return setError(se.message);
      }
      // Tell the app about it too. Writing only to the database left the
      // in-memory state stale, so the awards vote never opened and the
      // leaderboard showed nothing - the score existed but nothing knew.
      upsertScore({
        roundId,
        playerId: me.id,
        grossScore: myGross,
        frontNineScore: myFront ?? undefined,
        enteredBy: user?.id ?? null,
      });
    }

    const { error: e } = await supabase.from("round_confirmations").upsert(
      { round_id: roundId, player_id: me.id, confirmed_by: user?.id ?? null },
      { onConflict: "round_id,player_id" }
    );
    setBusy(false);
    if (e) return setError(e.message);
    setShowPreview(false);
    // If exactly one player is still to sign, that is now blocking the round.
    const after = [...confirmed, me.id];
    const waiting = groupPlayers.filter((p) => !after.includes(p.id));
    if (waiting.length === 1) {
      await notify({
        userIds: [waiting[0].accountId],
        title: "Your card is waiting",
        message: `Everyone else in your group has signed. Sign the card to lock the round.`,
        category: "essential",
      });
    } else if (waiting.length > 1) {
      await notify({
        userIds: waiting.map((p) => p.accountId),
        title: "Card ready to sign",
        message: "All the holes are in. Check it over and sign your card.",
        category: "my_card",
      });
    }
    await load();
    onLocked?.();
  }

  return (
    <div className="rounded-2xl border-2 border-fairway-900 bg-white p-4">
      <p className="font-anton text-2xl tracking-tight text-ink">Sign the card</p>
      <p className="mt-1 text-[13px] leading-5 text-slate-600">
        Every player in the group signs off. Once everyone has, the round locks and the awards vote opens.
      </p>

      <div className="mt-3 space-y-1.5">
        {groupPlayers.map((p) => {
          const done = confirmed.includes(p.id);
          const t = totals.find((x) => x.player.id === p.id);
          return (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-[#f7f6f1] px-3 py-2">
              <PlayerAvatar avatarId={p.avatarId} emoji={p.avatarEmoji} name={p.name} size={26} playerId={p.id} />
              <span className="flex-1 text-[14px] font-black text-ink">{p.name}</span>
              <span className="text-[12px] font-bold text-slate-500">
                {t?.gross} gross · {t?.net} net
              </span>
              <span className={`text-[12px] font-black ${done ? "text-emerald-700" : "text-slate-300"}`}>
                {done ? "signed" : "waiting"}
              </span>
            </div>
          );
        })}
      </div>

      {error ? <p className="mt-2 text-sm font-bold text-red-600">{error}</p> : null}

      {allConfirmed ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[13px] font-bold text-emerald-800">
          Card signed by everyone. This round is locked.
        </div>
      ) : me && !confirmed.includes(me.id) ? (
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="mt-3 w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white"
        >
          Review and sign
        </button>
      ) : me ? (
        <p className="mt-3 text-[13px] font-bold text-slate-500">
          You have signed. Waiting on the rest of the group.
        </p>
      ) : (
        <p className="mt-3 text-[13px] text-slate-500">Only players in this group can sign the card.</p>
      )}

      {showPreview ? (
        <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/70 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            <p className="font-anton text-2xl tracking-tight text-ink">How it went</p>

            <div className="mt-3 space-y-1">
              {totals.map((t) => (
                <div key={t.player.id} className="flex items-center gap-2 text-[14px]">
                  <span className="flex-1 font-black text-ink">{t.player.name}</span>
                  <span className="text-slate-500">{t.gross} gross</span>
                  <span className="font-black text-fairway-900">{t.net} net</span>
                </div>
              ))}
            </div>

            {fun.length > 0 ? (
              <div className="mt-4 space-y-2">
                {fun.map((f) => (
                  <div key={f.title} className="rounded-xl bg-[#f7f6f1] p-2.5">
                    <p className="text-[11px] font-black uppercase tracking-wide text-accent-dark">{f.title}</p>
                    <p className="text-[13px] text-slate-600">{f.line}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] leading-5 text-amber-900">
              Signing locks your scores for this round. Only an admin can change them after.
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="flex-1 rounded-2xl border-[1.5px] border-slate-300 px-4 py-3 font-black text-slate-600"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={signCard}
                disabled={busy}
                className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white disabled:opacity-50"
              >
                {busy ? "Signing…" : "Sign the card"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
