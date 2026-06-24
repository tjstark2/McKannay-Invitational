"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import type { Screen } from "@/types";

export function MoreScreen({
  setActiveScreen,
}: {
  setActiveScreen: (screen: Screen) => void;
}) {
  const { trip } = useTripState();
  const { signOut } = useAuth();
  const router = useRouter();

  const links: { label: string; screen: Screen; description: string }[] = [
    {
      label: "Add Score",
      screen: "addScore",
      description: "Enter round scores",
    },
    {
      label: "Rules",
      screen: "rules",
      description: "Tournament format, handicaps, and local rules",
    },
    {
      label: "Courses & Schedule",
      screen: "courseDetail",
      description: "View course information and trip schedule",
    },
    {
      label: "Admin Setup",
      screen: "admin",
      description: "Teams, players, rounds, matches, and scoring",
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="More"
        subtitle="Trip details, rules, setup, and utilities."
      />

      <Card className="p-5">
        <h2 className="font-black">Trip Details</h2>

        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <p>
            <span className="font-bold">Location:</span> {trip.location}
          </p>

          <p>
            <span className="font-bold">Dates:</span> {trip.dates}
          </p>

          <p>
            <span className="font-bold">Lodging:</span> {trip.lodgingName}
          </p>

          <p>
            <span className="font-bold">Address:</span>{" "}
            {trip.lodgingAddress}
          </p>

          <p>
            <span className="font-bold">Join Code:</span> {trip.joinCode}
          </p>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-black">Quick Links</h2>

        <div className="mt-4 space-y-2">
          {links.map((link) => (
            <button
              key={link.label}
              onClick={() => setActiveScreen(link.screen)}
              className="block w-full rounded-xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black">{link.label}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {link.description}
                  </p>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-black">McKannay Invitational</h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Tournament scoring, schedules, standings, and player stats are
          managed through the app. Use Tournament for live competition
          tracking and Admin Setup for commissioner controls.
        </p>
      </Card>

      <div className="space-y-2">
        <button
          onClick={() => router.push("/home")}
          className="flex w-full items-center justify-between rounded-2xl border border-sand-100 bg-white px-4 py-3.5 text-left font-black text-fairway-900"
        >
          ← My Tournaments
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
        <button
          onClick={async () => {
            await signOut();
            router.replace("/");
          }}
          className="w-full rounded-2xl border border-sand-100 bg-white px-4 py-3.5 text-left font-black text-red-600"
        >
          Sign out
        </button>
      </div>

      <div className="flex flex-col items-center py-2 text-center">
        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
          <img
            src="/logo-icon.png"
            alt="TourneyBirdie"
            className="h-[82%] w-[82%] object-contain"
          />
        </span>
        <p className="mt-2 text-sm font-black">
          Powered by{" "}
          <span className="font-display font-extrabold">
            <span className="text-ink">TOURNEY</span>
            <span className="text-green">BIRDIE</span>
          </span>
        </p>
        <p className="text-xs text-slate-500">Tournaments made easy</p>
      </div>
    </div>
  );
}