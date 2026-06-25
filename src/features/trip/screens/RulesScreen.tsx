import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTripState } from "@/features/trip/state/TripStateContext";

type RuleTab = "overview" | "formats" | "handicaps" | "local" | "admin";

export function RulesScreen() {
  const [activeTab, setActiveTab] = useState<RuleTab>("overview");
  const { trip, players, scoringSettings } = useTripState();

  const netCount =
    typeof scoringSettings.netScorePointsOverride === "number" &&
    scoringSettings.netScorePointsOverride > 0
      ? scoringSettings.netScorePointsOverride
      : Math.floor(players.length / 2);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "formats", label: "Formats" },
    { id: "handicaps", label: "Handicaps" },
    { id: "local", label: "Local Rules" },
    { id: "admin", label: "Admin" },
  ] as const;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Rules"
        subtitle="Official format and tournament guidelines."
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

      {activeTab === "overview" && (
        <>
          <Card className="p-4">
            <h2 className="font-black">Tournament Overview</h2>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-[#f3efe6] p-3">
                <p className="font-black">
                  {trip.totalPoints} Total Points Available
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Points are split across all rounds in the schedule.
                </p>
              </div>

              <div className="rounded-xl bg-[#f3efe6] p-3">
                <p className="font-black">{trip.winningNumber} Points Wins</p>
                <p className="mt-1 text-sm text-slate-600">
                  A team needs {trip.winningNumber} or more points to win
                  outright.
                </p>
              </div>

              <div className="rounded-xl bg-[#f3efe6] p-3">
                <p className="font-black">9–9 Tie</p>
                <p className="mt-1 text-sm text-slate-600">
                  If the tournament ends tied 9–9, the defending champion
                  retains the cup.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}

      {activeTab === "formats" && (
        <>
          <Card className="p-4">
            <h2 className="font-black">Round 1: 2v2 Best Ball</h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Three 2v2 matches. Each match is worth 2 points.
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Winning side receives 2 points.</li>
              <li>Tied match awards 1 point to each side.</li>
              <li>
                Individual gross scores should still be entered for record
                keeping, player history, and leaderboard context.
              </li>
              <li>
                Best Ball points are awarded by admin result entry, not by
                automatic score calculation.
              </li>
              <li>
                Current Best Ball handicap allowance:{" "}
                <strong>{scoringSettings.bestBallHandicapAllowance}%</strong>
              </li>
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Round 2: 1v1 Singles</h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Six individual matches worth 1 point each.
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Winner receives 1 point.</li>
              <li>Ties receive 0.5 points each.</li>
              <li>Gross scores are entered and net scores are calculated.</li>
              <li>
                Current Singles handicap allowance:{" "}
                <strong>{scoringSettings.singlesHandicapAllowance}%</strong>
              </li>
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Round 3: Individual Net Score</h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              All {players.length} players submit scores. The top half of the
              field earns team points.
            </p>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Lowest {netCount} net scores earn points.</li>
              <li>Each qualifying player earns 1 point for their team.</li>
              <li>Maximum {netCount} points available.</li>
              <li>
                Current Net Score handicap allowance:{" "}
                <strong>{scoringSettings.netScoreHandicapAllowance}%</strong>
              </li>
            </ul>
          </Card>
        </>
      )}

      {activeTab === "handicaps" && (
        <>
          <Card className="p-4">
            <h2 className="font-black">Course Handicap Formula</h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              The app calculates course handicap using:
            </p>

            <div className="mt-3 rounded-xl bg-[#f3efe6] p-3 text-center text-sm font-black">
              Handicap Index × (Slope ÷ 113) + (Rating − Par)
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              The result is rounded, then multiplied by the handicap allowance
              for that format.
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Real Example</h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Example: Alex has a 6.0 handicap index at Harbour Town.
            </p>

            <div className="mt-3 space-y-2 rounded-xl bg-[#f3efe6] p-3 text-sm text-slate-700">
              <p>Harbour Town: Par 71, Rating 71.4, Slope 136</p>
              <p>6 × (136 ÷ 113) + (71.4 − 71) = 7.62</p>
              <p>Rounded Course Handicap = 8</p>
              <p>At 100% allowance: 8 strokes</p>
              <p>At 50% allowance: 4 strokes</p>
              <p>At 0% allowance: 0 strokes</p>
            </div>
          </Card>
        </>
      )}

      {activeTab === "local" && (
        <>
          <Card className="p-4">
            <h2 className="font-black">Divots & Bad Lies</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ball may be moved within one club length in the fairway when
              sitting in a divot or clearly damaged lie.
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Gimmes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              No gimmes unless both sides explicitly agree before the round.
              Default rule is that every putt must be holed.
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Lost Ball / Out of Bounds</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Standard stroke-and-distance unless modified by local course
              rules or agreed tournament house rules.
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Re-Tees / Provisionals</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Players should hit a provisional ball whenever there is reasonable
              doubt that a ball may be lost or out of bounds.
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Cart Paths & Obstructions</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Free relief may be taken from cart paths, sprinkler heads, and
              immovable obstructions.
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Rules Disputes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Any dispute should be discussed immediately. If unresolved, the
              tournament commissioner makes the final ruling.
            </p>
          </Card>
        </>
      )}

      {activeTab === "admin" && (
        <>
          <Card className="p-4">
            <h2 className="font-black">Score Entry</h2>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Players may enter gross scores for all rounds.</li>
              <li>Net scores are calculated automatically when applicable.</li>
              <li>Singles results are calculated from net scores.</li>
              <li>
                Best Ball player scores are informational unless hole-by-hole
                scoring is added later.
              </li>
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Best Ball Results</h2>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Best Ball winners are entered by tournament admin.</li>
              <li>Points are awarded based on the selected winner.</li>
              <li>Individual scores remain available for history and context.</li>
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="font-black">Format Flexibility</h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              The app is built around round formats, so the scoring engine can
              support Best Ball, Singles, and Individual Net Score. However,
              changing a round from one format to another should also update the
              match structure. For example, switching Best Ball to Singles would
              require changing three 2v2 matches into six 1v1 matches.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}