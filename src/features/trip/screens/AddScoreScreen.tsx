import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { useEffect, useState } from "react";
import { formatPlusMinus } from "@/lib/format";
import { frontNineNetScore, netScore, playerNetToPar } from "@/lib/scoring";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { FlairCard } from "@/components/ui/FlairCard";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useViewer } from "@/features/trip/state/ViewerContext";
import { useAuth } from "@/features/auth/AuthContext";
import { GroupedRoundEntry } from "@/features/trip/screens/GroupedRoundEntry";

type LastSavedScore = {
  playerName: string;
  roundTitle: string;
  frontNineScore?: number;
  grossScore?: number;
  savedType: "front" | "final";
};

export function AddScoreScreen() {
  const {
    courses,
    players,
    rounds,
    scores,
    scoringSettings,
    currentRoundId,
    upsertScore,
  } = useTripState();
  const { canManage } = useViewer();
  const { user } = useAuth();

  // Members may only log for the player linked to their own account.
  const myPlayers = players.filter(
    (player) => player.accountId && player.accountId === user?.id
  );
  const selectablePlayers = canManage ? players : myPlayers;

  const [roundId, setRoundId] = useState(currentRoundId || rounds[0]?.id || "");
  const [playerId, setPlayerId] = useState(selectablePlayers[0]?.id || "");
  // Inputs are "dirty" only once the user types. Until then we show whatever
  // is already saved, so the front nine appears automatically when you return.
  const [frontInput, setFrontInput] = useState("");
  const [grossInput, setGrossInput] = useState("");
  const [frontDirty, setFrontDirty] = useState(false);
  const [grossDirty, setGrossDirty] = useState(false);
  const [lastSavedScore, setLastSavedScore] = useState<LastSavedScore | null>(
    null
  );
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  // Keep the selected player valid if the list changes.
  useEffect(() => {
    if (
      selectablePlayers.length > 0 &&
      !selectablePlayers.some((player) => player.id === playerId)
    ) {
      setPlayerId(selectablePlayers[0].id);
    }
  }, [selectablePlayers, playerId]);

  // When the round or player changes, drop any typed-over state so the fields
  // fall back to showing the saved values for the new selection.
  useEffect(() => {
    setFrontInput("");
    setGrossInput("");
    setFrontDirty(false);
    setGrossDirty(false);
    setPendingConfirm(null);
  }, [roundId, playerId]);

  if (rounds.length === 0) {
    return (
      <Card className="p-4">
        <h2 className="font-black">Log Round</h2>
        <p className="mt-2 text-sm text-slate-600">
          No rounds have been set up yet. An organizer can add rounds in Admin
          Setup.
        </p>
      </Card>
    );
  }

  const selectedRound =
    rounds.find((round) => round.id === roundId) ?? rounds[0];
  if (!selectedRound) return null;

  // Grouped formats (scramble / best ball 2v2 & 4v4): one combined score per
  // side, entered against the round's matchups.
  if (selectedRound.groupSize != null) {
    return (
      <div className="space-y-4">
        <SectionHeader
          title="Log Round"
          subtitle="Group round — one combined score per side, gross only."
        />
        <Card className="p-4">
          <label className="text-xs font-black uppercase text-slate-500">
            Round
          </label>
          <select
            value={selectedRound.id}
            onChange={(event) => setRoundId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
          >
            {rounds.map((round) => (
              <option key={round.id} value={round.id}>
                {round.title}
              </option>
            ))}
          </select>
        </Card>
        <GroupedRoundEntry round={selectedRound} />
      </div>
    );
  }

  if (!canManage && selectablePlayers.length === 0) {
    return (
      <Card className="p-4">
        <h2 className="font-black">Log Round</h2>
        <p className="mt-2 text-sm text-slate-600">
          You&apos;re not on a team yet, so there&apos;s no scorecard to fill in.
          Ask your organizer to add you to a team and you&apos;ll be able to log
          your rounds here.
        </p>
      </Card>
    );
  }

  const selectedPlayer =
    selectablePlayers.find((player) => player.id === playerId) ??
    selectablePlayers[0];
  if (!selectedPlayer) return null;

  const existingScore = scores.find(
    (score) =>
      score.roundId === selectedRound.id && score.playerId === selectedPlayer.id
  );
  const existingFront = existingScore?.frontNineScore;
  const existingGross = existingScore?.grossScore;

  // Displayed value = what the user typed, otherwise the saved value.
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

  const isComplete = existingGross != null;
  const memberLocked = !canManage && isComplete;

  const parsedFront = Number(frontValue);
  const parsedGross = Number(grossValue);
  const hasFront = frontValue !== "" && Number.isFinite(parsedFront);
  const hasGross = grossValue !== "" && Number.isFinite(parsedGross);

  // A gross score can never be submitted without a front nine.
  const missingFrontForGross = hasGross && !hasFront;
  // Allow saving only if there's something new to save.
  const frontChanged = hasFront && parsedFront !== (existingFront ?? null);
  const grossChanged = hasGross && parsedGross !== (existingGross ?? null);
  const hasSomethingToSave =
    frontChanged ||
    grossChanged ||
    (hasFront && existingFront == null) ||
    (hasGross && existingGross == null);
  const canSave = hasSomethingToSave && !missingFrontForGross;

  const calculatedFrontNet = hasFront
    ? frontNineNetScore(
        selectedPlayer,
        selectedRound,
        parsedFront,
        courses,
        scoringSettings
      )
    : null;
  const calculatedNet = hasGross
    ? netScore(selectedPlayer, selectedRound, parsedGross, courses, scoringSettings)
    : null;
  const calculatedPlusMinus = hasGross
    ? playerNetToPar(
        selectedPlayer,
        selectedRound,
        parsedGross,
        courses,
        scoringSettings
      )
    : null;

  function commitSave() {
    const finalFront = hasFront ? parsedFront : existingFront;
    const finalGross = hasGross ? parsedGross : existingGross;

    upsertScore({
      roundId: selectedRound.id,
      playerId: selectedPlayer.id,
      frontNineScore: finalFront,
      grossScore: finalGross,
    });

    setLastSavedScore({
      playerName: selectedPlayer.name,
      roundTitle: selectedRound.title,
      frontNineScore: finalFront,
      grossScore: finalGross,
      savedType: finalGross != null ? "final" : "front",
    });

    // Fall back to showing the freshly saved values.
    setFrontInput("");
    setGrossInput("");
    setFrontDirty(false);
    setGrossDirty(false);
    setPendingConfirm(null);
  }

  function attemptSave() {
    if (!canSave) return;

    if (canManage) {
      commitSave();
      return;
    }

    const parts: string[] = [];
    if (frontChanged && existingFront != null) {
      parts.push(`change your front nine from ${existingFront} to ${parsedFront}`);
    }
    if (grossChanged && existingGross != null) {
      parts.push(`change your final score from ${existingGross} to ${parsedGross}`);
    }
    const finalizing = hasGross && existingGross == null;

    let message = "";
    if (parts.length > 0) message = `You're about to ${parts.join(" and ")}. `;
    if (finalizing) {
      message +=
        "Submitting your 18-hole score finalizes this round — after this, only an organizer can change it. ";
    }
    message += "Continue?";

    if (parts.length > 0 || finalizing) {
      setPendingConfirm(message.trim());
    } else {
      commitSave();
    }
  }

  return (
    <div className="space-y-4">
      <ScreenHeader
        img="/brand/tee-it-up.png"
        title="Tee It Up"
        subtitle={
          canManage
            ? "Enter front 9 progress first, then final gross score after 18."
            : "Log your own round — front 9 after the turn, final gross after 18."
        }
      />

      {lastSavedScore ? (
        <Card className="border border-green-200 bg-green-50 p-4">
          <p className="font-black text-green-900">
            {lastSavedScore.savedType === "final"
              ? "✅ Final round submitted"
              : "✅ Front 9 progress saved"}
          </p>
          <p className="mt-2 text-sm font-semibold text-green-900">
            {lastSavedScore.playerName} · {lastSavedScore.roundTitle}
          </p>
          <p className="mt-1 text-sm text-green-800">
            Front {lastSavedScore.frontNineScore ?? "-"} · Final{" "}
            {lastSavedScore.grossScore ?? "Not submitted"}
          </p>
        </Card>
      ) : null}

      <Card className="p-4">
        <label className="text-xs font-black uppercase text-slate-500">
          Round
        </label>
        <select
          value={selectedRound.id}
          onChange={(event) => setRoundId(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
        >
          {rounds.map((round) => (
            <option key={round.id} value={round.id}>
              {round.title}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-black uppercase text-slate-500">
          Player
        </label>
        {canManage ? (
          <select
            value={selectedPlayer.id}
            onChange={(event) => setPlayerId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
          >
            {selectablePlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="mt-2 flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-[#f3efe6] p-3 font-bold">
            <PlayerAvatar
              avatarId={selectedPlayer.avatarId}
              emoji={selectedPlayer.avatarEmoji}
              name={selectedPlayer.name}
              size={28}
            />
            {selectedPlayer.name}
          </div>
        )}

        {existingScore ? (
          <div className="mt-4 rounded-xl bg-[#f3efe6] p-3 text-sm text-slate-600">
            Existing entry: Front {existingScore.frontNineScore ?? "-"} · Final{" "}
            {existingScore.grossScore ?? "Not submitted"}
          </div>
        ) : null}

        {memberLocked ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-black">Final score submitted</p>
            <p className="mt-1">
              This round is complete and locked. Contact your organizer if
              something needs to be adjusted.
            </p>
          </div>
        ) : (
          <>
            <label className="mt-4 block text-xs font-black uppercase text-slate-500">
              Front 9 Score
            </label>
            <input
              value={frontValue}
              onChange={(event) => {
                setFrontInput(event.target.value);
                setFrontDirty(true);
              }}
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-lg font-black"
              placeholder="Example: 42"
              inputMode="numeric"
            />

            <label className="mt-4 block text-xs font-black uppercase text-slate-500">
              Final Gross Score
            </label>
            <input
              value={grossValue}
              onChange={(event) => {
                setGrossInput(event.target.value);
                setGrossDirty(true);
              }}
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-lg font-black"
              placeholder="Enter front 9 first"
              inputMode="numeric"
            />

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-[#f3efe6] p-3 text-center">
                <p className="text-xs font-bold text-slate-500">Front Net</p>
                <p className="mt-1 text-lg font-black">
                  {calculatedFrontNet === null
                    ? "-"
                    : calculatedFrontNet.toFixed(1)}
                </p>
              </div>
              <div className="rounded-xl bg-[#f3efe6] p-3 text-center">
                <p className="text-xs font-bold text-slate-500">Final Net</p>
                <p className="mt-1 text-lg font-black">{calculatedNet ?? "-"}</p>
              </div>
              <div className="rounded-xl bg-[#f3efe6] p-3 text-center">
                <p className="text-xs font-bold text-slate-500">Net +/-</p>
                <p className="mt-1 text-lg font-black">
                  {formatPlusMinus(calculatedPlusMinus)}
                </p>
              </div>
            </div>

            {missingFrontForGross ? (
              <p className="mt-3 text-sm font-semibold text-amber-700">
                Enter the front 9 score before submitting the final round — both
                are required.
              </p>
            ) : null}

            {pendingConfirm ? (
              <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  {pendingConfirm}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPendingConfirm(null)}
                    className="rounded-xl border border-slate-300 bg-white py-3 font-black text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={commitSave}
                    className="rounded-xl bg-fairway-900 py-3 font-black text-white"
                  >
                    Yes, Save
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={attemptSave}
                className="mt-5 w-full rounded-xl bg-fairway-900 py-3 font-black text-white disabled:bg-slate-300"
                disabled={!canSave}
              >
                {hasGross ? "Submit Final Round" : "Save Front 9 Progress"}
              </button>
            )}
          </>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-black">Submitted Scores</h2>
        <div className="mt-3 space-y-2">
          {scores.map((score) => {
            const player = players.find((item) => item.id === score.playerId);
            const round = rounds.find((item) => item.id === score.roundId);
            return (
              <div
                key={`${score.roundId}-${score.playerId}`}
                className="flex items-center justify-between rounded-xl bg-[#f3efe6] p-3 text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <PlayerAvatar
                    avatarId={player?.avatarId}
                    emoji={player?.avatarEmoji}
                    name={player?.name ?? score.playerId}
                    size={32}
                  />
                  <div>
                    <p className="font-bold">{player?.name ?? score.playerId}</p>
                    <p className="text-xs text-slate-500">
                      {round?.title ?? score.roundId}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black">Final {score.grossScore ?? "-"}</p>
                  <p className="text-xs text-slate-500">
                    Front {score.frontNineScore ?? "-"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <FlairCard img="/brand/tee-it-up-birdy.png" />
    </div>
  );
}
