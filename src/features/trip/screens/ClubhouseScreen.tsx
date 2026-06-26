"use client";

import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { PhotosTab } from "@/features/trip/screens/clubhouse/PhotosTab";
import { ChatTab } from "@/features/trip/screens/clubhouse/ChatTab";
import type { ClubhouseUnread } from "@/lib/supabase/clubhouse";

export type ClubhouseTab = "photos" | "chat";

export function ClubhouseScreen({
  tab,
  onTabChange,
  unread,
  onRead,
}: {
  tab: ClubhouseTab;
  onTabChange: (tab: ClubhouseTab) => void;
  unread: ClubhouseUnread;
  onRead: (tab: ClubhouseTab) => void;
}) {
  const tabs: { id: ClubhouseTab; label: string; count: number }[] = [
    { id: "photos", label: "Photos", count: unread.photos },
    { id: "chat", label: "Chat", count: unread.chat },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <ScreenHeader
          img="/brand/clubhouse.png"
          title="Clubhouse"
          subtitle="Photos from the round and trash talk from the crew."
        />
        <img
          src={
            tab === "photos"
              ? "/brand/clubhouse-photos-birdy.png"
              : "/brand/clubhouse-chat-birdy.png"
          }
          alt=""
          aria-hidden="true"
          className="pointer-events-none -mt-1 h-24 w-auto shrink-0 drop-shadow-[0_10px_14px_rgba(11,36,24,0.35)]"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-white p-1">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold transition ${
                active
                  ? "bg-fairway-900 text-white shadow-[0_8px_16px_-10px_rgba(19,100,63,0.8)]"
                  : "text-slate-500"
              }`}
            >
              {t.label}
              {t.count > 0 ? (
                <span
                  className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-black ${
                    active ? "bg-white text-fairway-900" : "bg-team-north text-white"
                  }`}
                >
                  {t.count > 99 ? "99+" : t.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "photos" ? <PhotosTab onRead={() => onRead("photos")} /> : null}
      {tab === "chat" ? <ChatTab onRead={() => onRead("chat")} /> : null}
    </div>
  );
}
