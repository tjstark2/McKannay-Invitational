"use client";

// Everyone picks a bird on their first login - wherever they land.
//
// The check used to live only on the Home page. An invite link sends a new
// player straight into the tournament, skipping Home, so most players on the
// 2026 trip never picked a bird at all - which is likely why the survey said
// nobody noticed anyone else's avatar. This runs on every page instead, then
// returns the player to wherever they were heading.

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { fetchMyAvatar } from "@/features/avatar/data";

/** Pages where sending someone off to pick a bird would be wrong. */
const EXEMPT = new Set([
  "/",
  "/signin",
  "/signup",
  "/reset-password",
  "/complete-profile",
  "/choose-avatar",
  "/choose-style",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
]);

/** Carry a destination through the bird pages, accepting only our own paths. */
export function safeNext(raw: string | null | undefined): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "";
}

export function BirdGate() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  // Once we know they have a bird, stop asking for the rest of the visit.
  const settled = useRef(false);

  useEffect(() => {
    if (loading || !user || settled.current) return;
    if (EXEMPT.has(pathname)) return;
    let active = true;
    (async () => {
      const mine = await fetchMyAvatar().catch(() => null);
      if (!active) return;
      if (mine && mine.selectedAt == null) {
        const here = `${pathname}${window.location.search}`;
        router.replace(`/choose-avatar?next=${encodeURIComponent(here)}`);
        return;
      }
      settled.current = true;
    })();
    return () => {
      active = false;
    };
  }, [user, loading, pathname, router]);

  return null;
}
