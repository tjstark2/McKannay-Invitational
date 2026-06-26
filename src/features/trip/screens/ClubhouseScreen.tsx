"use client";

import { useState } from "react";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PhotosTab } from "@/features/trip/screens/clubhouse/PhotosTab";

type ClubhouseTab = "photos" | "chat";

export function ClubhouseScreen() {
  const [tab, setTab] = useState<ClubhouseTab>("photos");

  return (
    <div className="space-y-4">
      <ScreenHeader
        img="/brand/clubhouse.png"
        title="Clubhouse"
        subtitle="Photos from the round and trash talk from the crew."
      />

      {/* Segmented toggle: Photos | Chat */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-white p-1">
        {[
          { id: "photos" as const, label: "Photos" },
          { id: "chat" as const, label: "Chat" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-3 py-2 text-sm font-extrabold transition ${
              tab === t.id
                ? "bg-fairway-900 text-white shadow-[0_8px_16px_-10px_rgba(19,100,63,0.8)]"
                : "text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "photos" ? <PhotosTab /> : null}

      {tab === "chat" ? (
        <EmptyState
          img="/brand/clubhouse-birdy.png"
          title="Chat is coming soon"
          message="Group trash talk lands here next. For now, let the photos do the talking."
        />
      ) : null}
    </div>
  );
}
