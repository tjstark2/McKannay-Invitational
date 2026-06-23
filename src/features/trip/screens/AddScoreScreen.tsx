import { useState } from "react";
import { formatPlusMinus } from "@/lib/format";
import { frontNineNetScore, netScore, playerNetToPar } from "@/lib/scoring";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTripState } from "@/features/trip/state/TripStateContext";

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

  const [roundId, setRoundId] = useState(currentRoundId || rounds[0].id);
  const [playerId, setPlayerId] = useState(players[0].id);
  const [frontNineScore, setFrontNineScore] = useState("");
  const [grossScore, setGrossScore] = useState("");
  const [lastSavedScore, setLastSavedScore] = useState<LastSavedScore | null>(
    null
  );

  const selectedRound = rounds.find((round) => round.id === roundId) ?? rounds[0];
  const selectedPlayer =
    players.find((player) => player.id === playerId) ?? players[0];

  const existingScore = scores.find(
    (score) => score.roundId === roundId && score.playerId === playerId
  );

  const parsedFrontNineScore = Number(frontNineScore);
  const parsedGrossScore = Number(grossScore);

  const hasFrontNineInput =
    frontNineScore !== "" && Number.isFinite(parsedFrontNineScore);

  const hasGrossInput = grossScore !== "" && Number.isFinite(parsedGrossScore);

  const canSave = hasFrontNineInput || hasGrossInput;

  const calculatedFrontNet = hasFrontNineInput
    ? frontNineNetScore(
        selectedPlayer,
        selectedRound,
        parsedFrontNineScore,
        courses,
        scoringSettings
      )
    : null;

  const calculatedNet = hasGrossInput
    ? netScore(
        selectedPlayer,
        selectedRound,
        parsedGrossScore,
        courses,
        scoringSettings
      )
    : null;

  const calculatedPlusMinus = hasGrossInput
    ? playerNetToPar(
        selectedPlayer,
        selectedRound,
        parsedGrossScore,
        courses,
        scoringSettings
      )
    : null;

  function saveScore() {
    if (!canSave) return;

    const savedGrossScore = hasGrossInput ? parsedGrossScore : undefined;
    const savedFrontNineScore = hasFrontNineInput
      ? parsedFrontNineScore
      : undefined;

    upsertScore({
      roundId,
      playerId,
      frontNineScore: savedFrontNineScore,
      grossScore: savedGrossScore,
    });

    setLastSavedScore({
      playerName: selectedPlayer.name,
      roundTitle: selectedRound.title,
      frontNineScore: savedFrontNineScore,
      grossScore: savedGrossScore,
      savedType: hasGrossInput ? "final" : "front",
    });

    setFrontNineScore("");
    setGrossScore("");
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Log Round"
        subtitle="Enter front 9 progress first, then final gross score after 18."
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
          value={roundId}
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
        <select
          value={playerId}
          onChange={(event) => setPlayerId(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>

        {existingScore ? (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            Existing entry: Front {existingScore.frontNineScore ?? "-"} · Final{" "}
            {existingScore.grossScore ?? "Not submitted"}
          </div>
        ) : null}

        <label className="mt-4 block text-xs font-black uppercase text-slate-500">
          Front 9 Score
        </label>
        <input
          value={frontNineScore}
          onChange={(event) => setFrontNineScore(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-lg font-black"
          placeholder="Example: 42"
          inputMode="numeric"
        />

        <label className="mt-4 block text-xs font-black uppercase text-slate-500">
          Final Gross Score
        </label>
        <input
          value={grossScore}
          onChange={(event) => setGrossScore(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-lg font-black"
          placeholder="Optional until round is complete"
          inputMode="numeric"
        />

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-xs font-bold text-slate-500">Front Net</p>
            <p className="mt-1 text-lg font-black">
              {calculatedFrontNet === null ? "-" : calculatedFrontNet.toFixed(1)}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-xs font-bold text-slate-500">Final Net</p>
            <p className="mt-1 text-lg font-black">{calculatedNet ?? "-"}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-xs font-bold text-slate-500">Net +/-</p>
            <p className="mt-1 text-lg font-black">
              {formatPlusMinus(calculatedPlusMinus)}
            </p>
          </div>
        </div>

        <button
          onClick={saveScore}
          className="mt-5 w-full rounded-xl bg-fairway-900 py-3 font-black text-white disabled:bg-slate-300"
          disabled={!canSave}
        >
          {hasGrossInput ? "Submit Final Round" : "Save Front 9 Progress"}
        </button>
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
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"
              >
                <div>
                  <p className="font-bold">{player?.name ?? score.playerId}</p>
                  <p className="text-xs text-slate-500">
                    {round?.title ?? score.roundId}
                  </p>
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
    </div>
  );
}