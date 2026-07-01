"use client";

import { useEffect, useState } from "react";
import type { Player, Team, Round, Trip } from "@/types";

export type TourStep = {
  title: string;
  body: string;
  go?: () => void; // navigate the real app to the relevant screen
  upgrade?: boolean; // show an "Upgrade to Pro" button (owner + non-pro only)
};

export type TourNavigate = (screen: string, subtab?: string) => void;

// Build the walkthrough from LIVE tournament data so it reads like the real thing.
export function buildTourSteps(ctx: {
  isOwner: boolean;
  isPro: boolean;
  trip: Trip;
  players: Player[];
  teams: Team[];
  rounds: Round[];
  navigate: TourNavigate;
  onUpgrade: () => void;
}): TourStep[] {
  const { isOwner, isPro, trip, players, teams, rounds, navigate } = ctx;
  const teamA = teams.find((t) => t.id === "A")?.name ?? "Team A";
  const teamB = teams.find((t) => t.id === "B")?.name ?? "Team B";
  const someone = players[0]?.name ?? "a player";
  const roundTitle = rounds[0]?.title ?? "Round 1";

  const proStep: TourStep = isPro
    ? {
        title: "✨ Pro is on",
        body: `Awards & voting, Trip Wrapped, custom round backgrounds, and the Clubhouse are all unlocked. Toggle post-round awards anytime in Admin → Scoring.`,
        go: () => navigate("admin"),
      }
    : {
        title: "Unlock more with Pro",
        body: `Upgrade to Pro to add post-round awards & voting, a shareable Trip Wrapped, custom round backgrounds, and Clubhouse chat & photos.`,
        go: () => navigate("admin"),
        upgrade: isOwner, // only the owner can upgrade
      };

  if (isOwner) {
    return [
      {
        title: `Welcome, organizer!`,
        body: `You're running "${trip.name}". Here's a 60-second tour of your controls. Everything you set up now can be changed later.`,
        go: () => navigate("overview"),
      },
      {
        title: "Your command center: Admin",
        body: `This Admin area is where you manage everything. You've got ${players.length} player${players.length === 1 ? "" : "s"} so far${players[0] ? ` (like ${someone})` : ""}. As people join with your code, you approve them here.`,
        go: () => navigate("admin"),
      },
      {
        title: "Assign players to teams",
        body: `Tap a player to set their handicap and put them on ${teamA} or ${teamB}. Even teams keep scoring fair.`,
        go: () => navigate("admin"),
      },
      {
        title: "Share control: make an Admin",
        body: `Promote a trusted player to Admin and they can edit rounds, enter scores, and manage settings with you. Only you - the owner - can delete the tournament.`,
        go: () => navigate("admin"),
      },
      {
        title: "Rounds, courses & tee times",
        body: `Add each round, pick its course and format, and set tee times. "${roundTitle}" is ready to go - start it when you're on the course.`,
        go: () => navigate("admin"),
      },
      {
        title: "Delete tournament",
        body: `At the very bottom of Admin is Delete Tournament. It permanently removes the tournament, scores and all - so it's owner-only and asks you to confirm.`,
        go: () => navigate("admin"),
      },
      proStep,
      {
        title: "You're set!",
        body: `Invite players with your join code ${trip.joinCode}, assign teams as they join, and start ${roundTitle} on the course. You can reopen this tour anytime from Admin.`,
        go: () => navigate("overview"),
      },
    ];
  }

  // Member / player flow
  return [
    {
      title: `Welcome to ${trip.name}!`,
      body: `Quick tour so you know where everything is. Let's start with the schedule.`,
      go: () => navigate("overview"),
    },
    {
      title: "Check the Schedule",
      body: `The Schedule shows each round, its course, your tee time, and when to arrive. Check here before every round.`,
      go: () => navigate("tournament", "schedule"),
    },
    {
      title: "Entering your scores",
      body: `Tap "Log Round" to enter scores. Submit after the front 9, then again after 18 - so your net and the leaderboard update as you play.`,
      go: () => navigate("addScore"),
    },
    {
      title: "2v2 best ball: one submits",
      body: `In a 2v2 best ball round, only ONE person in each pair needs to submit the group's score - not both. One entry covers your team.`,
      go: () => navigate("addScore"),
    },
    proStep,
    {
      title: "That's it!",
      body: `Head to the Scoreboard and Leaderboard anytime to see where you stand. Have fun out there. 🏌️`,
      go: () => navigate("overview"),
    },
  ];
}

export function GuidedTour({
  steps,
  onClose,
  onUpgrade,
}: {
  steps: TourStep[];
  onClose: () => void;
  onUpgrade: () => void;
}) {
  const [i, setI] = useState(0);

  // Drive the real app to the right screen for this step.
  useEffect(() => {
    steps[i]?.go?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  if (steps.length === 0) return null;
  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/35">
      {/* tap outside the card advances (feels like a walkthrough) */}
      <button
        className="flex-1"
        aria-label="Next"
        onClick={() => (last ? onClose() : setI((n) => n + 1))}
      />
      <div className="rounded-t-3xl bg-white p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.25)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, k) => (
              <span
                key={k}
                className={`h-1.5 w-5 rounded-full ${k <= i ? "bg-fairway-900" : "bg-sand-200"}`}
              />
            ))}
          </div>
          <button onClick={onClose} className="text-sm font-bold text-slate-400">
            Skip
          </button>
        </div>

        <h3 className="text-xl font-black text-fairway-900">{step.title}</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{step.body}</p>

        {step.upgrade ? (
          <button
            onClick={onUpgrade}
            className="mt-3 w-full rounded-2xl bg-accent px-4 py-3 font-black text-ink"
          >
            Upgrade to Pro ✨
          </button>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          {i > 0 ? (
            <button
              onClick={() => setI((n) => n - 1)}
              className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-500"
            >
              Back
            </button>
          ) : null}
          <button
            onClick={() => (last ? onClose() : setI((n) => n + 1))}
            className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white"
          >
            {last ? "Got it - let's go" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
