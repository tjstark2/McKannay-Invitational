"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useViewer } from "@/features/trip/state/ViewerContext";
import { useAuth } from "@/features/auth/AuthContext";
import type { Screen } from "@/types";

export function MoreScreen({
  setActiveScreen,
}: {
  setActiveScreen: (screen: Screen) => void;
}) {
  const { trip, activeJoinCode } = useTripState();
  const { canManage } = useViewer();
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
    ...(canManage
      ? [
          {
            label: "Admin Setup",
            screen: "admin" as Screen,
            description: "Rounds, courses, and scoring",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-white shadow-[0_8px_18px_-12px_rgba(14,76,48,0.5)]">
          <img src="/brand/locker.png" alt="Locker" className="h-full w-full object-contain" />
        </span>
        <div>
          <h1 className="font-anton text-3xl leading-none tracking-tight text-ink">Locker</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">Trip details, rules, setup, and utilities.</p>
        </div>
      </div>

      {canManage ? (
        <button
          onClick={() =>
            activeJoinCode && router.push(`/manage/${activeJoinCode}`)
          }
          className="flex w-full items-center justify-between rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3.5 text-left"
        >
          <span>
            <span className="block font-black text-ink">
              Manage Members &amp; Teams
            </span>
            <span className="block text-xs text-slate-600">
              Approve players, set handicaps, assign teams, admins
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-accent-dark" />
        </button>
      ) : null}

      <Card className="p-5">
        <h2 className="font-anton text-xl tracking-tight text-ink">Trip Details</h2>

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
        <h2 className="font-anton text-xl tracking-tight text-ink">Quick Links</h2>

        <div className="mt-4 space-y-2">
          {links.map((link) => (
            <button
              key={link.label}
              onClick={() => setActiveScreen(link.screen)}
              className="block w-full rounded-xl bg-[#f3efe6] p-4 text-left transition hover:bg-[#ece7db]"
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
        <h2 className="font-anton text-xl tracking-tight text-ink">{trip.name}</h2>

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
          onClick={() => router.push("/friends")}
          className="flex w-full items-center justify-between rounded-2xl border border-sand-100 bg-white px-4 py-3.5 text-left font-black text-fairway-900"
        >
          Friends
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
        <button
          onClick={() => router.push("/profile")}
          className="flex w-full items-center justify-between rounded-2xl border border-sand-100 bg-white px-4 py-3.5 text-left font-black text-fairway-900"
        >
          Profile
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
        <button
          onClick={async () => {
            await signOut();
            router.replace("/");
          }}
          className="w-full rounded-2xl border border-sand-100 bg-white px-4 py-3.5 text-left font-black text-red-600"
        >
          Sign Out
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