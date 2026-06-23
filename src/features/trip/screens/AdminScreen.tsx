import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Round, TeamId, Winner } from "@/types";

type AdminTab =
  | "trip"
  | "teams"
  | "players"
  | "rounds"
  | "courses"
  | "scoring"
  | "matches";

export function AdminScreen() {
  const {
    trip,
    teams,
    players,
    courses,
    rounds,
    matches,
    scoringSettings,
    currentRoundId,
    updateTrip,
    updateTeam,
    updatePlayer,
    updateRound,
    updateRoundFormat,
    updateCurrentRound,
    updateTeeTime,
    updateMatch,
    updateMatchPlayer,
    updateManualMatchResult,
    updateScoringSettings,
    addPlayer,
    removePlayer,
    addCourse,
    addRound,
    deleteRound,
    addTeeTime,
    deleteTeeTime,
    setTeeTimePlayers,
    saving,
    saveError,
    saveTick,
    resetState,
  } = useTripState();

  const [activeTab, setActiveTab] = useState<AdminTab>("trip");
  const [savedMessage, setSavedMessage] = useState("");

  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerHandicap, setNewPlayerHandicap] = useState("");
  const [newPlayerTeam, setNewPlayerTeam] = useState<TeamId>("A");

  const [newCourseName, setNewCourseName] = useState("");
  const [newCoursePar, setNewCoursePar] = useState("72");
  const [newCourseRating, setNewCourseRating] = useState("72");
  const [newCourseSlope, setNewCourseSlope] = useState("113");

  const [toast, setToast] = useState<string | null>(null);

  // Flash a confirmation when a save completes, and surface save errors.
  useEffect(() => {
    if (saveTick === 0) return;
    setToast("✓ Saved");
    const timer = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timer);
  }, [saveTick]);

  useEffect(() => {
    if (saveError) setToast(`⚠️ ${saveError}`);
  }, [saveError]);

  const teamAName = teams.find((team) => team.id === "A")?.name ?? "Team A";
  const teamBName = teams.find((team) => team.id === "B")?.name ?? "Team B";

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "trip", label: "Trip" },
    { id: "teams", label: "Teams" },
    { id: "players", label: "Players" },
    { id: "rounds", label: "Rounds" },
    { id: "courses", label: "Courses" },
    { id: "scoring", label: "Scoring" },
    { id: "matches", label: "Matches" },
  ];

  function getPlayerOptions(teamId: TeamId) {
    return players.filter((player) => player.team === teamId);
  }

  const teamACount = players.filter((p) => p.team === "A").length;
  const teamBCount = players.filter((p) => p.team === "B").length;
  const teamsUneven = teamACount !== teamBCount;

  function handleAddPlayer() {
    if (newPlayerName.trim() === "") return;
    addPlayer({
      name: newPlayerName.trim(),
      handicapIndex: Number(newPlayerHandicap) || 0,
      team: newPlayerTeam,
    });
    setNewPlayerName("");
    setNewPlayerHandicap("");
  }

  function handleAddRound() {
    addRound({
      title: `Round ${rounds.length + 1}`,
      dateLabel: "",
      courseId: courses[0]?.id ?? "",
      format: "net_score",
      pointsAvailable: Math.floor(players.length / 2),
      arrivalTime: "",
    });
  }

  function handleAddCourse() {
    if (newCourseName.trim() === "") return;
    addCourse({
      name: newCourseName.trim(),
      par: Number(newCoursePar) || 72,
      rating: Number(newCourseRating) || 72,
      slope: Number(newCourseSlope) || 113,
    });
    setNewCourseName("");
    setNewCoursePar("72");
    setNewCourseRating("72");
    setNewCourseSlope("113");
  }

  function toManualResult(value: string): Winner {
    if (value === "A" || value === "B" || value === "T") return value;
    return null;
  }

  function saveAdminChanges() {
    setSavedMessage("Saved locally. Changes now update the whole app immediately.");
  }

  return (
    <div className="space-y-4">
      {toast ? (
        <div className="sticky top-2 z-20 rounded-xl bg-fairway-900 px-4 py-2 text-center text-sm font-black text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      {saving ? (
        <div className="sticky top-2 z-10 rounded-xl bg-slate-700 px-4 py-2 text-center text-sm font-black text-white">
          Saving…
        </div>
      ) : null}

      <SectionHeader
        title="Admin Setup"
        subtitle="Edit trip setup, scoring, players, teams, rounds, and matches."
      />

      <div className="grid grid-cols-3 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-3 py-2 text-sm font-black ${
              activeTab === tab.id
                ? "bg-fairway-900 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "trip" ? (
        <>
          <Card className="p-4">
            <h2 className="font-black">Active Round</h2>
            <p className="mt-1 text-sm text-slate-500">
              Controls the default round for Log Round and live tournament views.
            </p>

            <div className="mt-4 grid gap-2">
              {rounds.map((round) => (
                <button
                  key={round.id}
                  onClick={() => updateCurrentRound(round.id)}
                  className={`rounded-xl p-3 text-left ${
                    currentRoundId === round.id
                      ? "bg-fairway-900 text-white"
                      : "bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className="font-black">
                    Round {round.roundNumber}: {round.title}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      currentRoundId === round.id ? "text-white/80" : "text-slate-500"
                    }`}
                  >
                    {round.dateLabel} · {round.format.replace("_", " ")}
                  </p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Trip Setup</h2>

            <label className="mt-4 block text-xs font-black uppercase text-slate-500">
              Trip Name
            </label>
            <input
              value={trip.name}
              onChange={(event) => updateTrip({ name: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500">
                  Dates
                </label>
                <input
                  value={trip.dates}
                  onChange={(event) => updateTrip({ dates: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500">
                  Location
                </label>
                <input
                  value={trip.location}
                  onChange={(event) => updateTrip({ location: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500">
                  Join Code
                </label>
                <input
                  value={trip.joinCode}
                  onChange={(event) => updateTrip({ joinCode: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500">
                  Win
                </label>
                <input
                  value={trip.winningNumber}
                  onChange={(event) =>
                    updateTrip({ winningNumber: Number(event.target.value) || 0 })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
                  inputMode="decimal"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-500">
                  Retain
                </label>
                <input
                  value={trip.retainNumber}
                  onChange={(event) =>
                    updateTrip({ retainNumber: Number(event.target.value) || 0 })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
                  inputMode="decimal"
                />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Lodging</h2>

            <label className="mt-4 block text-xs font-black uppercase text-slate-500">
              Lodging Name
            </label>
            <input
              value={trip.lodgingName}
              onChange={(event) => updateTrip({ lodgingName: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
            />

            <label className="mt-4 block text-xs font-black uppercase text-slate-500">
              Lodging Address
            </label>
            <input
              value={trip.lodgingAddress}
              onChange={(event) => updateTrip({ lodgingAddress: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
              placeholder="Add house or resort address"
            />
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Setup Overview</h2>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-bold">Players</p>
                <p className="text-slate-500">{players.length} configured</p>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-bold">Teams</p>
                <p className="text-slate-500">{teams.length} configured</p>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-bold">Courses</p>
                <p className="text-slate-500">{courses.length} configured</p>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-bold">Rounds</p>
                <p className="text-slate-500">{rounds.length} configured</p>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-bold">Matches</p>
                <p className="text-slate-500">{matches.length} configured</p>
              </div>
            </div>
          </Card>
        </>
      ) : null}

      {activeTab === "teams" ? (
        <Card className="p-4">
          <h2 className="font-black">Team Names</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {teams.map((team) => (
              <div key={team.id}>
                <label className="block text-xs font-black uppercase text-slate-500">
                  Team {team.id} Name
                </label>
                <input
                  value={team.name}
                  onChange={(event) =>
                    updateTeam(team.id, { name: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
                />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {activeTab === "players" ? (
        <Card className="p-4">
          <h2 className="font-black">Players + Handicaps</h2>

          {teamsUneven ? (
            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
              ⚠️ Teams are uneven ({teamACount} vs {teamBCount}). Even teams are
              expected — add or reassign a player to balance them.
            </div>
          ) : null}

          <div className="mt-3 space-y-3">
            {players.map((player) => (
              <div key={player.id} className="rounded-xl bg-slate-50 p-3">
                <label className="text-xs font-black uppercase text-slate-500">
                  Player Name
                </label>
                <input
                  value={player.name}
                  onChange={(event) =>
                    updatePlayer(player.id, { name: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                />

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500">
                      Handicap
                    </label>
                    <input
                      value={player.handicapIndex}
                      onChange={(event) =>
                        updatePlayer(player.id, {
                          handicapIndex: Number(event.target.value) || 0,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                      inputMode="decimal"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-500">
                      Team
                    </label>
                    <select
                      value={player.team}
                      onChange={(event) =>
                        updatePlayer(player.id, {
                          team: event.target.value as TeamId,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                    >
                      <option value="A">{teamAName}</option>
                      <option value="B">{teamBName}</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete ${player.name}? This removes them from all tee times, matches, and scores. This cannot be undone.`
                      )
                    ) {
                      removePlayer(player.id);
                    }
                  }}
                  className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-black text-red-700"
                >
                  Delete Player
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-3">
            <h3 className="font-black">Add Player</h3>
            <label className="mt-3 block text-xs font-black uppercase text-slate-500">
              Name
            </label>
            <input
              value={newPlayerName}
              onChange={(event) => setNewPlayerName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
              placeholder="Player name"
            />

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase text-slate-500">
                  Handicap
                </label>
                <input
                  value={newPlayerHandicap}
                  onChange={(event) => setNewPlayerHandicap(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-500">
                  Team
                </label>
                <select
                  value={newPlayerTeam}
                  onChange={(event) =>
                    setNewPlayerTeam(event.target.value as TeamId)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                >
                  <option value="A">{teamAName}</option>
                  <option value="B">{teamBName}</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleAddPlayer}
              disabled={newPlayerName.trim() === ""}
              className="mt-4 w-full rounded-xl bg-fairway-900 py-3 font-black text-white disabled:bg-slate-300"
            >
              Add Player
            </button>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Tip: add players two at a time (one per team) to keep the teams
              even.
            </p>
          </div>
        </Card>
      ) : null}

      {activeTab === "rounds" ? (
        <Card className="p-4">
          <h2 className="font-black">Rounds + Tee Times</h2>

          <div className="mt-3 space-y-4">
            {rounds.map((round) => (
              <div key={round.id} className="rounded-xl bg-slate-50 p-3">
                <label className="block text-xs font-black uppercase text-slate-500">
                  Round Title
                </label>
                <input
                  value={round.title}
                  onChange={(event) =>
                    updateRound(round.id, { title: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                  placeholder="Example: Match 1"
                />

                <label className="mt-3 block text-xs font-black uppercase text-slate-500">
                  Course
                </label>
                <select
                  value={round.courseId}
                  onChange={(event) =>
                    updateRound(round.id, { courseId: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500">
                      Date Label
                    </label>
                    <input
                      value={round.dateLabel}
                      onChange={(event) =>
                        updateRound(round.id, { dateLabel: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                      placeholder="Example: Sept 10"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-500">
                      Points
                    </label>
                    <input
                      value={round.pointsAvailable}
                      onChange={(event) =>
                        updateRound(round.id, {
                          pointsAvailable: Number(event.target.value) || 0,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-black uppercase text-slate-500">
                    Format
                  </label>

                  <select
                    value={round.format}
                    onChange={(event) =>
                      updateRoundFormat(
                        round.id,
                        event.target.value as Round["format"]
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                  >
                    <option value="best_ball">Best Ball</option>
                    <option value="match_play">Singles</option>
                    <option value="net_score">Net Score</option>
                  </select>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Changing format will rebuild match pairings for this round.
                  </p>
                </div>

                <label className="mt-3 block text-xs font-black uppercase text-slate-500">
                  Arrival Time
                </label>
                <input
                  value={round.arrivalTime}
                  onChange={(event) =>
                    updateRound(round.id, { arrivalTime: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                  placeholder="Example: 7:15 AM"
                />

                <div className="mt-3 space-y-3">
                  {round.teeTimes.map((tee, index) => (
                    <div
                      key={tee.id}
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <label className="text-xs font-black uppercase text-slate-500">
                        Tee Time {index + 1}
                      </label>
                      <input
                        value={tee.time}
                        onChange={(event) =>
                          updateTeeTime(round.id, tee.id, event.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                        placeholder="Example: 8:10 AM"
                      />

                      <p className="mt-3 text-xs font-black uppercase text-slate-500">
                        Players in this group
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {players.map((player) => {
                          const checked = tee.players.includes(player.id);
                          return (
                            <label
                              key={player.id}
                              className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-2 text-sm font-bold"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? tee.players.filter(
                                        (id) => id !== player.id
                                      )
                                    : [...tee.players, player.id];
                                  setTeeTimePlayers(round.id, tee.id, next);
                                }}
                              />
                              <span className="truncate">{player.name}</span>
                            </label>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => deleteTeeTime(round.id, tee.id)}
                        className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 py-1.5 text-xs font-black text-red-700"
                      >
                        Remove Tee Time
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => addTeeTime(round.id, "")}
                    className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-sm font-black text-slate-600"
                  >
                    + Add Tee Time
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete "${round.title}"? This removes its matches, tee times, and scores. This cannot be undone.`
                      )
                    ) {
                      deleteRound(round.id);
                    }
                  }}
                  className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-black text-red-700"
                >
                  Delete Round
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddRound}
            className="mt-4 w-full rounded-xl bg-fairway-900 py-3 font-black text-white"
          >
            Add Round
          </button>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            New rounds default to Net Score on the first course — set the format,
            course, and points above after adding.
          </p>
        </Card>
      ) : null}

      {activeTab === "courses" ? (
        <Card className="p-4">
          <h2 className="font-black">Courses</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add any course here, then assign it to a round on the Rounds tab.
            Rating and slope drive the net-score handicap math.
          </p>

          <div className="mt-3 space-y-2">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-xl bg-slate-50 p-3 text-sm"
              >
                <p className="font-black">{course.name}</p>
                <p className="text-xs text-slate-500">
                  Par {course.par} · Rating {course.rating} · Slope{" "}
                  {course.slope}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-3">
            <h3 className="font-black">Add Course</h3>
            <label className="mt-3 block text-xs font-black uppercase text-slate-500">
              Course Name
            </label>
            <input
              value={newCourseName}
              onChange={(event) => setNewCourseName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
              placeholder="Course name"
            />

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-black uppercase text-slate-500">
                  Par
                </label>
                <input
                  value={newCoursePar}
                  onChange={(event) => setNewCoursePar(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-slate-500">
                  Rating
                </label>
                <input
                  value={newCourseRating}
                  onChange={(event) => setNewCourseRating(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-slate-500">
                  Slope
                </label>
                <input
                  value={newCourseSlope}
                  onChange={(event) => setNewCourseSlope(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                  inputMode="numeric"
                />
              </div>
            </div>

            <button
              onClick={handleAddCourse}
              disabled={newCourseName.trim() === ""}
              className="mt-4 w-full rounded-xl bg-fairway-900 py-3 font-black text-white disabled:bg-slate-300"
            >
              Add Course
            </button>
          </div>
        </Card>
      ) : null}

      {activeTab === "scoring" ? (
        <Card className="p-4">
          <h2 className="font-black">Scoring Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Adjust handicap allowances by format. Best Ball is currently manual result entry.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-slate-500">
                Best Ball Handicap %
              </label>
              <input
                value={scoringSettings.bestBallHandicapAllowance}
                onChange={(event) =>
                  updateScoringSettings({
                    bestBallHandicapAllowance: Number(event.target.value) || 0,
                  })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-500">
                Singles Handicap %
              </label>
              <input
                value={scoringSettings.singlesHandicapAllowance}
                onChange={(event) =>
                  updateScoringSettings({
                    singlesHandicapAllowance: Number(event.target.value) || 0,
                  })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-500">
                Net Score Handicap %
              </label>
              <input
                value={scoringSettings.netScoreHandicapAllowance}
                onChange={(event) =>
                  updateScoringSettings({
                    netScoreHandicapAllowance: Number(event.target.value) || 0,
                  })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
                inputMode="decimal"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-500">
                Net Score Points (lowest N earn a point)
              </label>
              <input
                value={scoringSettings.netScorePointsOverride ?? ""}
                onChange={(event) =>
                  updateScoringSettings({
                    netScorePointsOverride:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value) || 0,
                  })
                }
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-bold"
                inputMode="numeric"
                placeholder={`Default: ${Math.floor(players.length / 2)} (half the field)`}
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Leave blank to use the top half of the field automatically.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {activeTab === "matches" ? (
        <Card className="p-4">
          <h2 className="font-black">Match Pairings + Results</h2>
          <p className="mt-1 text-sm text-slate-500">
            Edit pairings and enter manual Best Ball results.
          </p>

          <div className="mt-4 space-y-4">
            {matches.map((match) => {
              const round = rounds.find((item) => item.id === match.roundId);
              const isBestBall = round?.format === "best_ball";

              return (
                <div key={match.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {round?.title ?? "Round"}
                  </p>

                  <label className="mt-3 block text-xs font-black uppercase text-slate-500">
                    Match Label
                  </label>
                  <input
                    value={match.label}
                    onChange={(event) =>
                      updateMatch(match.id, { label: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                  />

                  <label className="mt-3 block text-xs font-black uppercase text-slate-500">
                    Points
                  </label>
                  <input
                    value={match.points}
                    onChange={(event) =>
                      updateMatch(match.id, {
                        points: Number(event.target.value) || 0,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                    inputMode="decimal"
                  />

                  {isBestBall ? (
                    <div className="mt-3">
                      <label className="block text-xs font-black uppercase text-slate-500">
                        Best Ball Result
                      </label>

                      <select
                        value={match.manualResult ?? ""}
                        onChange={(event) =>
                          updateManualMatchResult(
                            match.id,
                            toManualResult(event.target.value)
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold"
                      >
                        <option value="">Not Played</option>
                        <option value="A">{teamAName} Wins</option>
                        <option value="B">{teamBName} Wins</option>
                        <option value="T">Tie</option>
                      </select>
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-2 text-xs font-black uppercase text-red-800">
                        {teamAName}
                      </p>

                      {match.aPlayers.map((playerId, index) => (
                        <select
                          key={`${match.id}-A-${index}`}
                          value={playerId}
                          onChange={(event) =>
                            updateMatchPlayer(
                              match.id,
                              "A",
                              index,
                              event.target.value
                            )
                          }
                          className="mb-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold"
                        >
                          {getPlayerOptions("A").map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                            </option>
                          ))}
                        </select>
                      ))}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-black uppercase text-blue-800">
                        {teamBName}
                      </p>

                      {match.bPlayers.map((playerId, index) => (
                        <select
                          key={`${match.id}-B-${index}`}
                          value={playerId}
                          onChange={(event) =>
                            updateMatchPlayer(
                              match.id,
                              "B",
                              index,
                              event.target.value
                            )
                          }
                          className="mb-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold"
                        >
                          {getPlayerOptions("B").map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                            </option>
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
      ) : null}

      <button
        onClick={saveAdminChanges}
        className="w-full rounded-xl bg-fairway-900 py-3 font-black text-white shadow-sm"
      >
        Save Admin Changes
      </button>

      <button
        onClick={resetState}
        className="w-full rounded-xl bg-slate-200 py-3 font-black text-slate-700"
      >
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