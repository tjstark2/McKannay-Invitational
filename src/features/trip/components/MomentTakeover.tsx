"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useAuth } from "@/features/auth/AuthContext";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { loadUnseenMoments, markMomentSeen, type Moment } from "@/lib/supabase/moments";
import { setOverlayOpen } from "@/features/trip/tour/overlayState";

const ART: Record<string, string> = { ace: "🕳️", albatross: "🦅", eagle: "🦅" };

/**
 * If someone made an eagle while you were in your pocket, you hear about it the
 * moment you open the app. Shown once per person per moment.
 */
export function MomentTakeover() {
  const { trip, players } = useTripState();
  const { user } = useAuth();
  const [queue, setQueue] = useState<Moment[]>([]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user?.id || !trip?.id) return;
    let alive = true;
    loadUnseenMoments(supabase, trip.id, user.id).then((m) => {
      if (alive) setQueue(m);
    });
    return () => {
      alive = false;
    };
  }, [trip?.id, user?.id]);

  const current = queue[0] ?? null;

  useEffect(() => {
    setOverlayOpen("momentTakeover", Boolean(current));
    return () => setOverlayOpen("momentTakeover", false);
  }, [current]);

  if (!current) return null;

  const who = players.find((p) => p.id === current.playerId);

  async function dismiss() {
    const supabase = getSupabaseClient();
    if (supabase && user?.id && current) await markMomentSeen(supabase, current.id, user.id);
    setQueue((q) => q.slice(1));
  }

  return (
    <div
      className="fixed inset-0 z-[185] flex items-center justify-center bg-black/85 p-6"
      onClick={dismiss}
    >
      <div className="text-center">
        <p className="text-[76px] leading-none">{ART[current.kind] ?? "🐦"}</p>
        {who ? (
          <div className="mt-4 flex justify-center">
            <PlayerAvatar avatarId={who.avatarId} emoji={who.avatarEmoji} name={who.name} size={72} playerId={who.id} />
          </div>
        ) : null}
        <p className="mt-4 font-anton text-3xl leading-tight tracking-tight text-white">{current.body}</p>
        <p className="mt-5 text-sm font-bold text-white/60">Tap to carry on</p>
      </div>
    </div>
  );
}
