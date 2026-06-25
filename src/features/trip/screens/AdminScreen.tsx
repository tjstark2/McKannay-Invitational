import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Round, TeamId, Winner } from "@/types";

type AdminTab = "setup" | "rounds" | "scoring";

const ROUND_FORMATS: {
  id: string;
  label: string;
  format: Round["format"];
  groupSize: number | null;
}[] = [
  { id: "casual", label: "Casual", format: "casual", groupSize: null },
  { id: "scramble_2", label: "Scramble · 2 v 2", format: "scramble", groupSize: 2 },
  { id: "scramble_4", label: "Scramble · 4 v 4", format: "scramble", groupSize: 4 },
  { id: "bestball_2", label: "Best Ball · 2 v 2", format: "best_ball", groupSize: 2 },
  { id: "bestball_4", label: "Best Ball · 4 v 4", format: "best_ball", groupSize: 4 },
  { id: "best_ball", label: "Best Ball (classic)", format: "best_ball", groupSize: null },
  { id: "match_play", label: "Singles Match Play", format: "match_play", groupSize: null },
  { id: "net_score", label: "Net Stroke Play", format: "net_score", groupSize: null },
];

function roundFormatPresetId(round: Round): string {
  const gs = round.groupSize ?? null;
  if (gs && round.format === "scramble") return gs === 4 ? "scramble_4" : "scramble_2";
  if (gs && round.format === "best_ball") return gs === 4 ? "bestball_4" : "bestball_2";
  if (round.format === "match_play") return "match_play";
  if (round.format === "net_score") return "net_score";
  if (round.format === "casual") return "casual";
  return "best_ball";
}


export function AdminScreen() {
  const {
    trip,
    teams,
    players,
    courses,
    rounds,
    matches,
    groupScores,
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
    activeJoinCode,
  } = useTripState();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>("setup");

  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerHandicap, setNewPlayerHandicap] = useState("");
  const [newPlayerTeam, setNewPlayerTeam] = useState<TeamId>("A");

  const [newCourseName, setNewCourseName] = useState("");
  const [newCoursePar, setNewCoursePar] = useState("72");
  const [newCourseRating, setNewCourseRating] = useState("72");
  const [newCourseSlope, setNewCourseSlope] = useState("113");
  const [newCourseTee, setNewCourseTee] = useState("Blue");

  const [roundDraft, setRoundDraft] = useState<null | {
    title: string;
    courseId: string;
    presetId: string;
  }>(null);
  const [newCourseYardage, setNewCourseYardage] = useState("");

  const [toast, setToast] = useState<string | null>(null);

  // Accordion: one round open at a time; tee-times/matches collapse within it.
  const [expandedRound, setExpandedRound] = useState<string | null>(null);
  const [collapsedSubs, setCollapsedSubs] = useState<Set<string>>(new Set());

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
    { id: "setup", label: "Setup" },
    { id: "rounds", label: "Rounds" },
    { id: "scoring", label: "Scoring" },
  ];

  function getPlayerOptions(teamId: TeamId) {
    return players.filter((player) => player.team === teamId);
  }

  const teamACount = players.filter((p) => p.team === "A").length;
  const teamBCount = players.filter((p) => p.team === "B").length;
  const teamsUneven = teamACount !== teamBCount;

  // Grouped formats (2v2 / 4v4) are offered only when the EXPECTED roster
  // divides evenly into them (2v2 -> multiple of 4, 4v4 -> multiple of 8) —
  // same rule as the create wizard. Falls back to assigned players for older
  // trips created before a roster size was recorded.
  const groupedFits = (gs: number) => {
    const expected =
      trip.rosterSize > 0 ? trip.rosterSize : teamACount + teamBCount;
    return expected >= 2 * gs && expected % (2 * gs) === 0;
  };
  const formatIsAvailable = (presetId: string) => {
    const f = ROUND_FORMATS.find((x) => x.id === presetId);
    if (!f) return false;
    return f.groupSize == null || groupedFits(f.groupSize);
  };

  // How many combined group scores already exist for a round (so we can warn
  // before a format change rebuilds its matches and discards them).
  const roundGroupScoreCount = (roundId: string) => {
    const ids = new Set(
      matches.filter((m) => m.roundId === roundId).map((m) => m.id)
    );
    return groupScores.filter((g) => ids.has(g.matchId)).length;
  };

  function toggleRound(id: string) {
    setExpandedRound((cur) => (cur === id ? null : id));
  }

  function toggleSub(key: string) {
    setCollapsedSubs((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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

  function openRoundDraft() {
    setRoundDraft({
      title: `Round ${rounds.length + 1}`,
      courseId: courses[0]?.id ?? "",
      presetId: "net_score",
    });
  }

  function createRoundFromDraft() {
    if (!roundDraft) return;
    const preset =
      ROUND_FORMATS.find((f) => f.id === roundDraft.presetId) ?? ROUND_FORMATS[0];
    addRound({
      title: roundDraft.title.trim() || `Round ${rounds.length + 1}`,
      dateLabel: "",
      courseId: roundDraft.courseId || courses[0]?.id || "",
      format: preset.format,
      groupSize: preset.groupSize,
      pointsAvailable: Math.floor(players.length / 2),
      arrivalTime: "",
    });
    setRoundDraft(null);
  }

  function handleAddCourse() {
    if (newCourseName.trim() === "") return;
    addCourse({
      name: newCourseName.trim(),
      par: Number(newCoursePar) || 72,
      rating: Number(newCourseRating) || 72,
      slope: Number(newCourseSlope) || 113,
      teeName: newCourseTee.trim() || "Blue",
      yardage: newCourseYardage.trim() === "" ? null : Number(newCourseYardage),
    });
    setNewCourseName("");
    setNewCoursePar("72");
    setNewCourseRating("72");
    setNewCourseSlope("113");
    setNewCourseTee("Blue");
    setNewCourseYardage("");
  }

  function toManualResult(value: string): Winner {
    if (value === "A" || value === "B" || value === "T") return value;
    return null;
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-bold";
  const labelClass = "block text-xs font-black uppercase text-slate-500";

  return (
    <div className="space-y-4">
      {saving || toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-fairway-900 px-5 py-2 text-sm font-black text-white shadow-lg">
          {saving ? (
            "Saving…"
          ) : (
            <>
              <span className="text-accent">✓</span> Saved
            </>
          )}
        </div>
      ) : null}

      <SectionHeader
        title="Admin Setup"
        subtitle="Rounds, courses, and scoring. Changes save automatically."
      />

      <button
        onClick={() =>
          activeJoinCode && router.push(`/manage/${activeJoinCode}`)
        }
        className="flex w-full items-center justify-between rounded-2xl border border-sand-100 bg-white px-4 py-3 text-left"
      >
        <span>
          <span className="block font-black text-fairway-900">
            Manage members &amp; teams
          </span>
          <span className="block text-xs text-slate-500">
            Approve players, set handicaps, assign teams, admins
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
      </button>


      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-black ${
              activeTab === tab.id
                ? "bg-fairway-900 text-white"
                : "bg-sand-100 text-fairway-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===================== SETUP ===================== */}
      {activeTab === "setup" ? (
        <>
          <Card className="p-4">
            <h2 className="font-black">Trip Setup</h2>

            <label className={`mt-4 ${labelClass}`}>Trip Name</label>
            <input
              value={trip.name}
              onChange={(event) => updateTrip({ name: event.target.value })}
              className={inputClass}
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Dates</label>
                <input
                  value={trip.dates}
                  onChange={(event) => updateTrip({ dates: event.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Location</label>
                <input
                  value={trip.location}
                  onChange={(event) =>
                    updateTrip({ location: event.target.value })
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Join Code</label>
                <input
                  value={trip.joinCode}
                  onChange={(event) =>
                    updateTrip({ joinCode: event.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Win</label>
                <input
                  value={trip.winningNumber}
                  onChange={(event) =>
                    updateTrip({
                      winningNumber: Number(event.target.value) || 0,
                    })
                  }
                  className={inputClass}
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className={labelClass}>Retain</label>
                <input
                  value={trip.retainNumber}
                  onChange={(event) =>
                    updateTrip({
                      retainNumber: Number(event.target.value) || 0,
                    })
                  }
                  className={inputClass}
                  inputMode="decimal"
                />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Lodging</h2>
            <label className={`mt-4 ${labelClass}`}>Lodging Name</label>
            <input
              value={trip.lodgingName}
              onChange={(event) =>
                updateTrip({ lodgingName: event.target.value })
              }
              className={inputClass}
            />
            <label className={`mt-4 ${labelClass}`}>Lodging Address</label>
            <input
              value={trip.lodgingAddress}
              onChange={(event) =>
                updateTrip({ lodgingAddress: event.target.value })
              }
              className={inputClass}
              placeholder="Add house or resort address"
            />
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Courses</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add any course, then assign it to a round. Rating and slope drive
              the net-score handicap math.
            </p>

            <div className="mt-3 space-y-2">
              {courses.map((course) => (
                <div key={course.id} className="rounded-xl bg-[#f3efe6] p-3 text-sm">
                  <p className="font-black">{course.name}</p>
                  <p className="text-xs text-slate-500">
                    {course.teeName} ·{" "}
                    {course.yardage !== null
                      ? `${course.yardage.toLocaleString()} yds · `
                      : ""}
                    {course.rating}/{course.slope} · Par {course.par}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-3">
              <h3 className="font-black">Add Course</h3>
              <label className={`mt-3 ${labelClass}`}>Course Name</label>
              <input
                value={newCourseName}
                onChange={(event) => setNewCourseName(event.target.value)}
                className={inputClass}
                placeholder="Course name"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Tee</label>
                  <input
                    value={newCourseTee}
                    onChange={(event) => setNewCourseTee(event.target.value)}
                    className={inputClass}
                    placeholder="Blue"
                  />
                </div>
                <div>
                  <label className={labelClass}>Yardage</label>
                  <input
                    value={newCourseYardage}
                    onChange={(event) => setNewCourseYardage(event.target.value)}
                    className={inputClass}
                    inputMode="numeric"
                    placeholder="6,800"
                  />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClass}>Par</label>
                  <input
                    value={newCoursePar}
                    onChange={(event) => setNewCoursePar(event.target.value)}
                    className={inputClass}
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className={labelClass}>Rating</label>
                  <input
                    value={newCourseRating}
                    onChange={(event) => setNewCourseRating(event.target.value)}
                    className={inputClass}
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className={labelClass}>Slope</label>
                  <input
                    value={newCourseSlope}
                    onChange={(event) => setNewCourseSlope(event.target.value)}
                    className={inputClass}
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
        </>
      ) : null}


      {/* ===================== ROUNDS ===================== */}
      {activeTab === "rounds" ? (
        <>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-black">Active Round</h2>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">
                Manual override
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Tap a round to set which one is <strong>current</strong>. This
              controls what Log Round and the live standings open to, and which
              round shows as active across the app. Use it to move on to the
              next round even when the current round&apos;s scores aren&apos;t
              all in yet.
            </p>
            <div className="mt-3 grid gap-2">
              {rounds.map((round) => {
                const isActive = currentRoundId === round.id;
                return (
                  <button
                    key={round.id}
                    onClick={() => updateCurrentRound(round.id)}
                    aria-pressed={isActive}
                    className={`rounded-xl p-3 text-left ${
                      isActive
                        ? "bg-fairway-900 text-white ring-2 ring-fairway-900 ring-offset-2"
                        : "bg-[#f3efe6] text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-black">
                        Round {round.roundNumber}: {round.title}
                      </p>
                      {isActive ? (
                        <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                          ● Active
                        </span>
                      ) : (
                        <span className="shrink-0 text-[11px] font-bold text-slate-400">
                          Set active
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-1 text-xs ${
                        isActive ? "text-white/80" : "text-slate-500"
                      }`}
                    >
                      {round.dateLabel} · {round.format.replace("_", " ")}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-3">
            {rounds.map((round) => {
              const isOpen = expandedRound === round.id;
              const teesKey = `${round.id}:tees`;
              const matchesKey = `${round.id}:matches`;
              const teesOpen = !collapsedSubs.has(teesKey);
              const matchesOpen = !collapsedSubs.has(matchesKey);
              const roundMatches = matches.filter(
                (m) => m.roundId === round.id
              );
              const courseName =
                courses.find((c) => c.id === round.courseId)?.name ?? "No course";

              return (
                <Card key={round.id} className="overflow-hidden p-0">
                  <button
                    onClick={() => toggleRound(round.id)}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  >
                    <div>
                      <p className="font-black">
                        Round {round.roundNumber}: {round.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {courseName} · {round.format.replace("_", " ")}
                        {round.dateLabel ? ` · ${round.dateLabel}` : ""}
                      </p>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                    )}
                  </button>

                  {isOpen ? (
                    <div className="space-y-4 border-t border-slate-100 p-4">
                      {/* details */}
                      <div>
                        <label className={labelClass}>Round Title</label>
                        <input
                          value={round.title}
                          onChange={(event) =>
                            updateRound(round.id, { title: event.target.value })
                          }
                          className={inputClass}
                          placeholder="Example: Match 1"
                        />

                        <label className={`mt-3 ${labelClass}`}>Course</label>
                        <select
                          value={round.courseId}
                          onChange={(event) =>
                            updateRound(round.id, {
                              courseId: event.target.value,
                            })
                          }
                          className={inputClass}
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
                                updateRound(round.id, {
                                  dateLabel: event.target.value,
                                })
                              }
                              className={inputClass}
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
                                  pointsAvailable:
                                    Number(event.target.value) || 0,
                                })
                              }
                              className={inputClass}
                              inputMode="decimal"
                            />
                          </div>
                        </div>

                        <label className={`mt-3 ${labelClass}`}>Format</label>
                        <select
                          value={roundFormatPresetId(round)}
                          onChange={(event) => {
                            const preset = ROUND_FORMATS.find(
                              (f) => f.id === event.target.value
                            );
                            if (!preset) return;
                            const existing = roundGroupScoreCount(round.id);
                            if (
                              existing > 0 &&
                              !window.confirm(
                                `This round already has ${existing} group score${
                                  existing === 1 ? "" : "s"
                                } entered. Changing the format rebuilds its matchups and will delete those scores. Continue?`
                              )
                            ) {
                              return;
                            }
                            updateRoundFormat(
                              round.id,
                              preset.format,
                              preset.groupSize
                            );
                          }}
                          className={inputClass}
                        >
                          {ROUND_FORMATS.filter(
                            (f) =>
                              formatIsAvailable(f.id) ||
                              f.id === roundFormatPresetId(round)
                          ).map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Changing format rebuilds this round&apos;s match
                          pairings. Group formats (2v2 / 4v4) only appear when
                          your {trip.rosterSize}-player roster divides evenly
                          into them; assign players in Matches below.
                        </p>

                        <label className={`mt-3 ${labelClass}`}>
                          Arrival Time
                        </label>
                        <input
                          value={round.arrivalTime}
                          onChange={(event) =>
                            updateRound(round.id, {
                              arrivalTime: event.target.value,
                            })
                          }
                          className={inputClass}
                          placeholder="Example: 7:15 AM"
                        />
                      </div>

                      {/* tee times sub-section */}
                      <div className="rounded-xl bg-[#f3efe6] p-3">
                        <button
                          onClick={() => toggleSub(teesKey)}
                          className="flex w-full items-center justify-between text-left"
                        >
                          <span className="text-sm font-black">
                            Tee Times ({round.teeTimes.length})
                          </span>
                          {teesOpen ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </button>

                        {teesOpen ? (
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
                                    updateTeeTime(
                                      round.id,
                                      tee.id,
                                      event.target.value
                                    )
                                  }
                                  className={inputClass}
                                  placeholder="Example: 8:10 AM"
                                />
                                <p className="mt-3 text-xs font-black uppercase text-slate-500">
                                  Players in this group
                                </p>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  {players.map((player) => {
                                    const checked = tee.players.includes(
                                      player.id
                                    );
                                    return (
                                      <label
                                        key={player.id}
                                        className="flex items-center gap-2 rounded-lg bg-[#f3efe6] px-2 py-2 text-sm font-bold"
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
                                            setTeeTimePlayers(
                                              round.id,
                                              tee.id,
                                              next
                                            );
                                          }}
                                        />
                                        <span className="truncate">
                                          {player.name}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                                <button
                                  onClick={() =>
                                    deleteTeeTime(round.id, tee.id)
                                  }
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
                        ) : null}
                      </div>

                      {/* matches sub-section */}
                      <div className="rounded-xl bg-[#f3efe6] p-3">
                        <button
                          onClick={() => toggleSub(matchesKey)}
                          className="flex w-full items-center justify-between text-left"
                        >
                          <span className="text-sm font-black">
                            Matches ({roundMatches.length})
                          </span>
                          {matchesOpen ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </button>

                        {matchesOpen ? (
                          <div className="mt-3 space-y-3">
                            {roundMatches.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                No matches. Net Score rounds score the whole
                                field and don&apos;t use pairings.
                              </p>
                            ) : null}

                            {roundMatches.map((match) => {
                              const isBestBall =
                                round.format === "best_ball" &&
                                round.groupSize == null;
                              return (
                                <div
                                  key={match.id}
                                  className="rounded-xl border border-slate-200 bg-white p-3"
                                >
                                  <label className="block text-xs font-black uppercase text-slate-500">
                                    Match Label
                                  </label>
                                  <input
                                    value={match.label}
                                    onChange={(event) =>
                                      updateMatch(match.id, {
                                        label: event.target.value,
                                      })
                                    }
                                    className={inputClass}
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
                                    className={inputClass}
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
                                        className={inputClass}
                                      >
                                        <option value="">Not Played</option>
                                        <option value="A">
                                          {teamAName} Wins
                                        </option>
                                        <option value="B">
                                          {teamBName} Wins
                                        </option>
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
                                          {getPlayerOptions("A").map((p) => (
                                            <option key={p.id} value={p.id}>
                                              {p.name}
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
                                          {getPlayerOptions("B").map((p) => (
                                            <option key={p.id} value={p.id}>
                                              {p.name}
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
                        ) : null}
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
                        className="w-full rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-black text-red-700"
                      >
                        Delete Round
                      </button>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>

          {roundDraft ? (
            <Card className="p-4">
              <h3 className="font-black text-ink">New round</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Set the basics, then create it. You can fine-tune tee times and
                matches after.
              </p>
              <label className={`mt-3 ${labelClass}`}>Round title</label>
              <input
                value={roundDraft.title}
                onChange={(event) =>
                  setRoundDraft((d) =>
                    d ? { ...d, title: event.target.value } : d
                  )
                }
                className={inputClass}
                placeholder={`Round ${rounds.length + 1}`}
              />
              <label className={`mt-3 ${labelClass}`}>Course</label>
              <select
                value={roundDraft.courseId}
                onChange={(event) =>
                  setRoundDraft((d) =>
                    d ? { ...d, courseId: event.target.value } : d
                  )
                }
                className={inputClass}
              >
                {courses.length === 0 ? (
                  <option value="">No courses yet — add one first</option>
                ) : (
                  courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))
                )}
              </select>
              <label className={`mt-3 ${labelClass}`}>Format</label>
              <select
                value={roundDraft.presetId}
                onChange={(event) =>
                  setRoundDraft((d) =>
                    d ? { ...d, presetId: event.target.value } : d
                  )
                }
                className={inputClass}
              >
                {ROUND_FORMATS.filter(
                  (f) => formatIsAvailable(f.id) || f.id === roundDraft.presetId
                ).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setRoundDraft(null)}
                  className="rounded-xl border-[1.5px] border-sand-200 py-3 font-black text-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={createRoundFromDraft}
                  disabled={courses.length === 0}
                  className="rounded-xl bg-fairway-900 py-3 font-black text-white disabled:opacity-50"
                >
                  Create Round
                </button>
              </div>
            </Card>
          ) : (
            <>
              <button
                onClick={openRoundDraft}
                className="w-full rounded-xl bg-fairway-900 py-3 font-black text-white"
              >
                Add Round
              </button>
              <p className="text-xs leading-5 text-slate-500">
                You&apos;ll pick the title, course, and format before it&apos;s
                created — then set tee times and matches inside the round.
              </p>
            </>
          )}
        </>
      ) : null}

      {/* ===================== SCORING ===================== */}
      {activeTab === "scoring" ? (
        <Card className="p-4">
          <h2 className="font-black">Scoring Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Handicap allowances by format. Best Ball uses manual result entry.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div>
              <label className={labelClass}>Best Ball Handicap %</label>
              <input
                value={scoringSettings.bestBallHandicapAllowance}
                onChange={(event) =>
                  updateScoringSettings({
                    bestBallHandicapAllowance: Number(event.target.value) || 0,
                  })
                }
                className={inputClass}
                inputMode="decimal"
              />
            </div>
            <div>
              <label className={labelClass}>Singles Handicap %</label>
              <input
                value={scoringSettings.singlesHandicapAllowance}
                onChange={(event) =>
                  updateScoringSettings({
                    singlesHandicapAllowance: Number(event.target.value) || 0,
                  })
                }
                className={inputClass}
                inputMode="decimal"
              />
            </div>
            <div>
              <label className={labelClass}>Net Score Handicap %</label>
              <input
                value={scoringSettings.netScoreHandicapAllowance}
                onChange={(event) =>
                  updateScoringSettings({
                    netScoreHandicapAllowance: Number(event.target.value) || 0,
                  })
                }
                className={inputClass}
                inputMode="decimal"
              />
            </div>
            <div>
              <label className={labelClass}>
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
                className={inputClass}
                inputMode="numeric"
                placeholder={`Default: ${Math.floor(
                  players.length / 2
                )} (half the field)`}
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Leave blank to use the top half of the field automatically.
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <p className="px-1 text-center text-xs text-slate-400">
        Changes save automatically — look for the “Saved” confirmation.
      </p>
    </div>
  );
}
