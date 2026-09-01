"use client";

// Who's wearing the snowman right now. An 8+ on any hole puts it on
// (detectCallouts in scoring/callouts.ts records the moment); playing well
// enough - tiered by handicap - takes it off (clearSnowman). This context just
// mirrors that table so every avatar in the tournament can swap live.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadActiveSnowmen } from "@/lib/supabase/moments";

const SnowmenContext = createContext<Set<string>>(new Set());

/** Player ids currently in the snowman. Empty outside a tournament. */
export function useSnowmen(): Set<string> {
  return useContext(SnowmenContext);
}

export function SnowmenProvider({
  tripId,
  children,
}: {
  tripId: string;
  children: ReactNode;
}) {
  const [snowmen, setSnowmen] = useState<Set<string>>(new Set());
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!tripId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    let cancelled = false;
    const reload = async () => {
      const set = await loadActiveSnowmen(supabase, tripId);
      if (!cancelled) setSnowmen(set);
    };
    // Small debounce: a burst of moment writes reloads once.
    const scheduleReload = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(reload, 400);
    };

    reload();
    // Belt and braces: the app can ask for a reload directly when it has just
    // changed a snowman, so a dropped realtime socket does not leave a melted
    // snowman on screen.
    const manual = () => scheduleReload();
    window.addEventListener("tb-snowmen-changed", manual);

    const channel = supabase.channel(`snowmen-${tripId}`);
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "round_moments" },
      () => scheduleReload()
    );
    channel.subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener("tb-snowmen-changed", manual);
      supabase.removeChannel(channel);
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, [tripId]);

  return <SnowmenContext.Provider value={snowmen}>{children}</SnowmenContext.Provider>;
}
