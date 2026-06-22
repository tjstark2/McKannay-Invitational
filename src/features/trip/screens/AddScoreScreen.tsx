import { useState } from "react";
import { formatPlusMinus } from "@/lib/format";
import { netScore, playerNetToPar } from "@/lib/scoring";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTripState } from "@/features/trip/state/TripStateContext";

export function AddScoreScreen() {
  const { courses, players, rounds, scores, upsertScore } = useTripState();
  const [roundId, setRoundId] = useState(rounds[0].id);
  const [playerId, setPlayerId] = useState(players[0].id);
  const [grossScore, setGrossScore] = useState("");

  const selectedRound = rounds.find((round) => round.id === roundId) ?? rounds[0];
  const selectedPlayer = players.find((player) => player.id === playerId) ?? players[0];
  const parsedScore = Number(grossScore);
  const canCalculate = grossScore !== "" && Number.isFinite(parsedScore);
  const calculatedNet = canCalculate ? netScore(selectedPlayer, selectedRound, parsedScore, courses) : null;
  const calculatedPlusMinus = canCalculate ? playerNetToPar(selectedPlayer, selectedRound, parsedScore, courses) : null;

  function saveScore() {
    if (!canCalculate) return;
    upsertScore({ roundId, playerId, grossScore: parsedScore });
    setGrossScore("");
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Add Score" subtitle="Saved locally and reflected across the whole app." />

      <Card className="p-4">
        <label className="text-xs font-black uppercase text-slate-500">Round</label>
        <select value={roundId} onChange={(event) => setRoundId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold">
          {rounds.map((round) => (
            <option key={round.id} value={round.id}>{round.title}</option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-black uppercase text-slate-500">Player</label>
        <select value={playerId} onChange={(event) => setPlayerId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold">
          {players.map((player) => (
            <option key={player.id} value={player.id}>{player.name}</option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-black uppercase text-slate-500">Gross Score</label>
        <input value={grossScore} onChange={(event) => setGrossScore(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-lg font-black" placeholder="Enter score" inputMode="numeric" />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-xs font-bold text-slate-500">Net Score</p>
            <p className="mt-1 text-xl font-black">{calculatedNet ?? "-"}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-center">
            <p className="text-xs font-bold text-slate-500">Net +/-</p>
            <p className="mt-1 text-xl font-black">{formatPlusMinus(calculatedPlusMinus)}</p>
          </div>
        </div>

        <button onClick={saveScore} className="mt-5 w-full rounded-xl bg-fairway-900 py-3 font-black text-white disabled:bg-slate-300" disabled={!canCalculate}>
          Submit Score
        </button>
      </Card>

      <Card className="p-4">
        <h2 className="font-black">Submitted Scores</h2>
        <div className="mt-3 space-y-2">
          {scores.map((score) => {
            const player = players.find((item) => item.id === score.playerId);
            const round = rounds.find((item) => item.id === score.roundId);
            return (
              <div key={`${score.roundId}-${score.playerId}`} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                <div>
                  <p className="font-bold">{player?.name ?? score.playerId}</p>
                  <p className="text-xs text-slate-500">{round?.title ?? score.roundId}</p>
                </div>
                <p className="font-black">{score.grossScore}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
