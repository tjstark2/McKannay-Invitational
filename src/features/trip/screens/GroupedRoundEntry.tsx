import { useState, type ReactNode } from "react";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useViewer } from "@/features/trip/state/ViewerContext";
import { useAuth } from "@/features/auth/AuthContext";
import type { Match, Round } from "@/types";

export function GroupedRoundEntry({ round }: { round: Round }) {
  const { teams, players, matches, groupScores, upsertGroupScore } = useTripState();
  const { canManage } = useViewer();
  const { user } = useAuth();

  // The player linked to the signed-in account (used to scope who can enter
  // which side's score). Admins/owners can enter any side.
  const myPlayerId = user
    ? players.find((p) => p.accountId === user.id)?.id ?? null
    : null;
  const canEditSide = (match: Match, side: "A" | "B") => {
    if (canManage) return true;
    if (!myPlayerId) return false;
    const sidePlayers = side === "A" ? match.aPlayers : match.bPlayers;
    return sidePlayers.includes(myPlayerId);
  };

  const roundMatches = matches.filter((m) => m.roundId === round.id);
  const teamName = (code: "A" | "B") =>
    teams.find((t) => t.id === code)?.name ?? `Team ${code}`;
  const rosterChips = (ids: string[]): ReactNode => {
    const ps = ids
      .map((id) => players.find((p) => p.id === id))
      .filter(Boolean);
    if (ps.length === 0) return "-";
    return (
      <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
        {ps.map((p) => (
          <span key={p!.id} className="inline-flex items-center gap-1">
            <PlayerAvatar
              avatarId={p!.avatarId}
              emoji={p!.avatarEmoji}
              name={p!.name}
              size={16}
            />
            {p!.name}
          </span>
        ))}
      </span>
    );
  };

  if (roundMatches.length === 0) {
    return (
      <EmptyState
        img="/brand/no-matches.png"
        title="No Matchups Yet"
        message={`This is a ${round.groupSize === 4 ? "4 v 4" : "2 v 2"} group round. An organizer sets up the sides in Admin, then groups log their combined scores here.`}
      />
    );
  }

  return (
    <div className="space-y-3">
      {roundMatches.map((match) => (
        <Card key={match.id} className="p-4">
          <h3 className="font-black text-ink">{match.label || "Matchup"}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            One combined score per side (gross). Only that team&apos;s players
            (or an organizer) can enter it.
          </p>
          <div className="mt-3 space-y-3">
            <SideRow
              round={round}
              match={match}
              side="A"
              heading={teamName("A")}
              sub={rosterChips(match.aPlayers)}
              canManage={canManage}
              canEdit={canEditSide(match, "A")}
              existing={groupScores.find((g) => g.matchId === match.id && g.side === "A")}
              onSave={upsertGroupScore}
            />
            <SideRow
              round={round}
              match={match}
              side="B"
              heading={teamName("B")}
              sub={rosterChips(match.bPlayers)}
              canManage={canManage}
              canEdit={canEditSide(match, "B")}
              existing={groupScores.find((g) => g.matchId === match.id && g.side === "B")}
              onSave={upsertGroupScore}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}

function SideRow({
  round,
  match,
  side,
  heading,
  sub,
  canManage,
  canEdit,
  existing,
  onSave,
}: {
  round: Round;
  match: Match;
  side: "A" | "B";
  heading: string;
  sub: ReactNode;
  canManage: boolean;
  canEdit: boolean;
  existing?: { frontNineScore?: number; grossScore?: number };
  onSave: (input: {
    matchId: string;
    side: "A" | "B";
    roundId: string;
    frontNineScore?: number;
    grossScore?: number;
  }) => void;
}) {
  const [frontInput, setFrontInput] = useState("");
  const [grossInput, setGrossInput] = useState("");
  const [frontDirty, setFrontDirty] = useState(false);
  const [grossDirty, setGrossDirty] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  const existingFront = existing?.frontNineScore;
  const existingGross = existing?.grossScore;
  const isComplete = existingGross != null;
  const memberLocked = !canManage && isComplete;

  const frontValue = frontDirty
    ? frontInput
    : existingFront != null
    ? String(existingFront)
    : "";
  const grossValue = grossDirty
    ? grossInput
    : existingGross != null
    ? String(existingGross)
    : "";

  const parsedFront = Number(frontValue);
  const parsedGross = Number(grossValue);
  const hasFront = frontValue !== "" && Number.isFinite(parsedFront);
  const hasGross = grossValue !== "" && Number.isFinite(parsedGross);
  const missingFrontForGross = hasGross && !hasFront;
  const frontChanged = hasFront && parsedFront !== (existingFront ?? null);
  const grossChanged = hasGross && parsedGross !== (existingGross ?? null);
  const canSave =
    !missingFrontForGross &&
    (frontChanged ||
      grossChanged ||
      (hasFront && existingFront == null) ||
      (hasGross && existingGross == null));

  function commit() {
    onSave({
      matchId: match.id,
      side,
      roundId: round.id,
      frontNineScore: hasFront ? parsedFront : existingFront,
      grossScore: hasGross ? parsedGross : existingGross,
    });
    setFrontDirty(false);
    setGrossDirty(false);
    setFrontInput("");
    setGrossInput("");
    setPendingConfirm(null);
  }

  function attempt() {
    if (!canSave) return;
    if (canManage) return commit();
    const parts: string[] = [];
    if (frontChanged && existingFront != null)
      parts.push(`change the front nine from ${existingFront} to ${parsedFront}`);
    if (grossChanged && existingGross != null)
      parts.push(`change the final score from ${existingGross} to ${parsedGross}`);
    const finalizing = hasGross && existingGross == null;
    let msg = "";
    if (parts.length) msg = `You're about to ${parts.join(" and ")}. `;
    if (finalizing)
      msg +=
        "Submitting the 18-hole score finalizes this group - after this, only an organizer can change it. ";
    msg += "Continue?";
    if (parts.length || finalizing) setPendingConfirm(msg.trim());
    else commit();
  }

  return (
    <div className="rounded-xl border border-sand-200 p-3">
      <div className="flex items-baseline justify-between">
        <p className="font-black text-ink">{heading}</p>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>

      {existing ? (
        <p className="mt-1 text-xs text-slate-500">
          Saved: Front {existingFront ?? "-"} · Final{" "}
          {existingGross ?? "Not submitted"}
        </p>
      ) : null}

      {!canEdit ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-[#f3efe6] p-2.5 text-sm text-slate-500">
          {existingGross != null
            ? "Submitted."
            : "Only this team's players (or an organizer) can enter this score."}
        </div>
      ) : memberLocked ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-900">
          Final score submitted - locked. Contact your organizer to adjust.
        </div>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              className="w-full rounded-lg border-[1.5px] border-sand-200 px-3 py-2.5 text-base font-black outline-none focus:border-fairway-900"
              value={frontValue}
              onChange={(e) => {
                setFrontInput(e.target.value.replace(/[^0-9]/g, ""));
                setFrontDirty(true);
              }}
              inputMode="numeric"
              placeholder="Front 9"
            />
            <input
              className="w-full rounded-lg border-[1.5px] border-sand-200 px-3 py-2.5 text-base font-black outline-none focus:border-fairway-900"
              value={grossValue}
              onChange={(e) => {
                setGrossInput(e.target.value.replace(/[^0-9]/g, ""));
                setGrossDirty(true);
              }}
              inputMode="numeric"
              placeholder="Final gross"
            />
          </div>
          {missingFrontForGross ? (
            <p className="mt-1.5 text-sm font-semibold text-amber-700">
              Enter the front 9 before submitting the final - both are required.
            </p>
          ) : null}
          {pendingConfirm ? (
            <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5">
              <p className="text-sm font-semibold text-amber-900">{pendingConfirm}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPendingConfirm(null)}
                  className="rounded-lg border border-slate-300 bg-white py-2 text-sm font-black text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={commit}
                  className="rounded-lg bg-fairway-900 py-2 text-sm font-black text-white"
                >
                  Yes, Save
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={attempt}
              disabled={!canSave}
              className="mt-2 w-full rounded-lg bg-fairway-900 py-2.5 text-sm font-black text-white disabled:bg-slate-300"
            >
              {hasGross ? "Submit Final" : "Save Front 9"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
