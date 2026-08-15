// One-liner for sending a push from anywhere in the app. Never throws: a
// notification failing must not break the thing that triggered it.

import type { Category } from "@/features/notifications/categories";

export async function notify(args: {
  userIds: (string | null | undefined)[];
  title: string;
  message: string;
  category: Category;
  kind?: string;
  url?: string;
}): Promise<void> {
  const userIds = args.userIds.filter((v): v is string => Boolean(v));
  if (userIds.length === 0) return;
  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...args, userIds }),
    });
  } catch {
    /* non-blocking by design */
  }
}

/** Everyone in the tournament except the person who caused it. */
export function othersIn(
  players: { accountId?: string | null }[],
  meUserId?: string | null
): string[] {
  return players
    .map((p) => p.accountId)
    .filter((id): id is string => Boolean(id) && id !== meUserId);
}
