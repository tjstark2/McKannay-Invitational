import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { TeamId } from "@/types";

export function AdminScreen() {
  const {
    trip,
    teams,
    players,
    courses,
    rounds,
    matches,
    updateTrip,
    updateTeam,
    updatePlayer,
    updateRound,
    updateTeeTime,
    updateMatch,
    updateMatchPlayer,
    resetState
  } = useTripState();

  const [savedMessage, setSavedMessage] = useState("");

  const teamAName = teams.find((team) => team.id === "A")?.name ?? "Team A";
  const teamBName = teams.find((team) => team.id === "B")?.name ?? "Team B";

  function getPlayerOptions(teamId: TeamId) {
    return players.filter((player) => player.team === teamId);
  }

  function saveAdminChanges() {
    setSavedMessage("Saved locally. Changes now update the whole app immediately.");
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Admin Setup" subtitle="Local admin controls now. Supabase-backed editing later." />

      <Card className="p-4">
        <h2 className="font-black">Trip Setup</h2>

        <label className="mt-4 block text-xs font-black uppercase text-slate-500">Trip Name</label>
        <input value={trip.name} onChange={(event) => updateTrip({ name: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold" />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-black uppercase text-slate-500">Dates</label>
            <input value={trip.dates} onChange={(event) => updateTrip({ dates: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold" />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-500">Location</label>
            <input value={trip.location} onChange={(event) => updateTrip({ location: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-black uppercase text-slate-500">Join Code</label>
            <input value={trip.joinCode} onChange={(event) => updateTrip({ joinCode: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold" />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-500">Win</label>
            <input value={trip.winningNumber} onChange={(event) => updateTrip({ winningNumber: Number(event.target.value) || 0 })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold" inputMode="decimal" />
          </div>
          <div>
            <label className="block text-xs font-black uppercase text-slate-500">Retain</label>
            <input value={trip.retainNumber} onChange={(event) => updateTrip({ retainNumber: Number(event.target.value) || 0 })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold" inputMode="decimal" />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-black">Team Names</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {teams.map((team) => (
            <div key={team.id}>
              <label className="block text-xs font-black uppercase text-slate-500">Team {team.id} Name</label>
              <input value={team.name} onChange={(event) => updateTeam(team.id, { name: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-black">Lodging</h2>
        <label className="mt-4 block text-xs font-black uppercase text-slate-500">Lodging Name</label>
        <input value={trip.lodgingName} onChange={(event) => updateTrip({ lodgingName: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold" />

        <label className="mt-4 block text-xs font-black uppercase text-slate-500">Lodging Address</label>
        <input value={trip.lodgingAddress} onChange={(event) => updateTrip({ lodgingAddress: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold" placeholder="Add house or resort address" />
      </Card>

      <Card className="p-4">
        <h2 className="font-black">Setup Overview</h2>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><p className="font-bold">Players</p><p className="text-slate-500">{players.length} configured</p></div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><p className="font-bold">Teams</p><p className="text-slate-500">{teams.length} configured</p></div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><p className="font-bold">Courses</p><p className="text-slate-500">{courses.length} configured</p></div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><p className="font-bold">Rounds</p><p className="text-slate-500">{rounds.length} configured</p></div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><p className="font-bold">Matches</p><p className="text-slate-500">{matches.length} configured</p></div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-black">Players + Handicaps</h2>
        <div className="mt-3 space-y-3">
          {players.map((player) => (
            <div key={player.id} className="rounded-xl bg-slate-50 p-3">
              <label className="text-xs font-black uppercase text-slate-500">Player Name</label>
              <input value={player.name} onChange={(event) => updatePlayer(player.id, { name: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold" />

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase text-slate-500">Handicap</label>
                  <input value={player.handicapIndex} onChange={(event) => updatePlayer(player.id, { handicapIndex: Number(event.target.value) || 0 })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold" inputMode="decimal" />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-slate-500">Team</label>
                  <select value={player.team} onChange={(event) => updatePlayer(player.id, { team: event.target.value as TeamId })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold">
                    <option value="A">{teamAName}</option>
                    <option value="B">{teamBName}</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-black">Rounds + Tee Times</h2>
        <div className="mt-3 space-y-4">
          {rounds.map((round) => (
            <div key={round.id} className="rounded-xl bg-slate-50 p-3">
              <h3 className="font-black">{round.title}</h3>
              <label className="mt-3 block text-xs font-black uppercase text-slate-500">Arrival Time</label>
              <input value={round.arrivalTime} onChange={(event) => updateRound(round.id, { arrivalTime: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold" placeholder="Example: 7:15 AM" />

              <div className="mt-3 space-y-2">
                {round.teeTimes.map((tee, index) => (
                  <div key={tee.id}>
                    <label className="text-xs font-black uppercase text-slate-500">Tee Time {index + 1}</label>
                    <input value={tee.time} onChange={(event) => updateTeeTime(round.id, tee.id, event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold" placeholder="Example: 8:10 AM" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-black">Match Pairings</h2>
        <p className="mt-1 text-sm text-slate-500">Edit pairings and watch Match Center update immediately.</p>

        <div className="mt-4 space-y-4">
          {matches.map((match) => {
            const round = rounds.find((item) => item.id === match.roundId);

            return (
              <div key={match.id} className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{round?.title ?? "Round"}</p>

                <label className="mt-3 block text-xs font-black uppercase text-slate-500">Match Label</label>
                <input value={match.label} onChange={(event) => updateMatch(match.id, { label: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold" />

                <label className="mt-3 block text-xs font-black uppercase text-slate-500">Points</label>
                <input value={match.points} onChange={(event) => updateMatch(match.id, { points: Number(event.target.value) || 0 })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold" inputMode="decimal" />

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-2 text-xs font-black uppercase text-red-800">{teamAName}</p>
                    {match.aPlayers.map((playerId, index) => (
                      <select key={`${match.id}-A-${index}`} value={playerId} onChange={(event) => updateMatchPlayer(match.id, "A", index, event.target.value)} className="mb-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold">
                        {getPlayerOptions("A").map((player) => (
                          <option key={player.id} value={player.id}>{player.name}</option>
                        ))}
                      </select>
                    ))}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-black uppercase text-blue-800">{teamBName}</p>
                    {match.bPlayers.map((playerId, index) => (
                      <select key={`${match.id}-B-${index}`} value={playerId} onChange={(event) => updateMatchPlayer(match.id, "B", index, event.target.value)} className="mb-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold">
                        {getPlayerOptions("B").map((player) => (
                          <option key={player.id} value={player.id}>{player.name}</option>
                        ))}
                      </select>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <button onClick={saveAdminChanges} className="w-full rounded-xl bg-fairway-900 py-3 font-black text-white shadow-sm">
        Save Admin Changes
      </button>

      <button onClick={resetState} className="w-full rounded-xl bg-slate-200 py-3 font-black text-slate-700">
        Reset Local Data
      </button>

      {savedMessage ? (
        <Card className="p-4">
          <p className="text-sm font-semibold text-fairway-900">{savedMessage}</p>
        </Card>
      ) : null}
    </div>
  );
}
