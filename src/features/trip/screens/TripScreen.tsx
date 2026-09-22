"use client";

// The Trip tab: everything you'd want to look up, in one place.
//
// The first redesign cut too much - it optimised for standing on a tee and
// deleted the browsing people do at dinner or the morning of: everyone's
// groups, the rosters, the field, the rules. That all lives here now instead
// of being spread across Pecking Order sub-tabs and a Locker nobody opened.

import { useState } from "react";
import { ScheduleScreen } from "@/features/trip/screens/ScheduleScreen";
import { TeamsScreen } from "@/features/trip/screens/TeamsScreen";
import { PlayersScreen } from "@/features/trip/screens/PlayersScreen";
import { RulesScreen } from "@/features/trip/screens/RulesScreen";
import type { Screen, TeamId } from "@/types";

type Section = "schedule" | "teams" | "players" | "rules";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "schedule", label: "Schedule" },
  { id: "teams", label: "Teams" },
  { id: "players", label: "Players" },
  { id: "rules", label: "Rules" },
];

export function TripScreen({
  initial = "schedule",
  setActiveScreen,
  setSelectedCourseId,
  setSelectedTeamId,
  setSelectedPlayerId,
}: {
  initial?: Section;
  setActiveScreen: (screen: Screen) => void;
  setSelectedCourseId: (id: string) => void;
  setSelectedTeamId: (id: TeamId) => void;
  setSelectedPlayerId: (id: string) => void;
}) {
  const [section, setSection] = useState<Section>(initial);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-line bg-white p-1" role="tablist">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            onClick={() => setSection(s.id)}
            className={`rounded-xl px-2 py-2 text-[13px] font-extrabold transition ${
              section === s.id ? "bg-fairway-900 text-white" : "text-slate-500"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "schedule" ? (
        <ScheduleScreen setActiveScreen={setActiveScreen} setSelectedCourseId={setSelectedCourseId} />
      ) : null}
      {section === "teams" ? (
        <TeamsScreen setActiveScreen={setActiveScreen} setSelectedTeamId={setSelectedTeamId} />
      ) : null}
      {section === "players" ? (
        <PlayersScreen setActiveScreen={setActiveScreen} setSelectedPlayerId={setSelectedPlayerId} />
      ) : null}
      {section === "rules" ? <RulesScreen /> : null}
    </div>
  );
}
