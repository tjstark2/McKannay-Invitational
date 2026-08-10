"use client";

import { useState } from "react";
import { useTripState } from "@/features/trip/state/TripStateContext";

/**
 * Trip details players actually need on the ground: where everyone is staying
 * and the organizer's itinerary notes (flights, rides, dinners). Collapsed by
 * default so it never crowds the scoreboard, expands to the full write-up.
 */
export function TripItineraryCard() {
  const { trip, rounds, courses } = useTripState();
  const [open, setOpen] = useState(false);

  const notes = (trip.logisticsNotes ?? "").trim();
  const hasLodging = Boolean(trip.lodgingName || trip.lodgingAddress);
  if (!notes && !hasLodging) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="text-2xl">🧳</span>
        <span className="flex-1">
          <span className="block font-black text-ink">Trip details</span>
          <span className="block text-[13px] text-slate-500">
            {trip.dates || "Where to be"}
            {trip.lodgingName ? ` · ${trip.lodgingName}` : ""}
          </span>
        </span>
        <span className="font-black text-slate-300">{open ? "▾" : "›"}</span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-slate-100 p-4">
          {hasLodging ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Staying at</p>
              <p className="text-[14px] font-bold text-ink">{trip.lodgingName || "-"}</p>
              {trip.lodgingAddress ? (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(trip.lodgingAddress)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] font-bold text-fairway-900 underline"
                >
                  {trip.lodgingAddress}
                </a>
              ) : null}
            </div>
          ) : null}

          {rounds.length > 0 ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Golf</p>
              {rounds.map((r) => {
                const course = courses.find((c) => c.id === r.courseId);
                return (
                  <p key={r.id} className="text-[13px] leading-6 text-slate-600">
                    <span className="font-bold text-ink">{r.title}</span>
                    {r.dateLabel ? ` · ${r.dateLabel}` : ""}
                    {course ? ` · ${course.name}` : ""}
                    {r.arrivalTime ? ` · arrive ${r.arrivalTime}` : ""}
                  </p>
                );
              })}
            </div>
          ) : null}

          {notes ? (
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                Everything else
              </p>
              <p className="whitespace-pre-wrap text-[14px] leading-6 text-slate-700">{notes}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
