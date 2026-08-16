"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { flushQueue, pendingCount } from "@/lib/offlineScores";

/**
 * Watches the connection and drains the offline score queue whenever it comes
 * back. Also retries on a slow timer, because "online" in a browser only means
 * the device has a network, not that it can actually reach Supabase from the
 * 14th fairway.
 */
export function useOfflineScores(roundId: string) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(() => {
    setPending(pendingCount(roundId));
  }, [roundId]);

  const sync = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase || pendingCount(roundId) === 0) {
      refreshCount();
      return;
    }
    setSyncing(true);
    await flushQueue(supabase, roundId);
    setSyncing(false);
    refreshCount();
  }, [roundId, refreshCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(window.navigator.onLine);
    refreshCount();

    const goOnline = () => {
      setOnline(true);
      void sync();
    };
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    // Coming back to the tab is the other moment worth retrying.
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => void sync(), 30000);

    void sync();

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [sync, refreshCount]);

  return { online, pending, syncing, sync, refreshCount };
}
