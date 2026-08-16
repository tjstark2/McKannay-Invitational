// Server-only push plumbing shared by /api/push/send, /api/cron/reminders and
// /api/notify-event, so preference checks, delivery and dead-subscription
// pruning can never drift apart between routes.

import webpush from "web-push";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { shouldDeliver, type Category, type Prefs } from "@/features/notifications/categories";

export type PushArgs = {
  userIds: string[];
  title: string;
  message: string;
  category: Category;
  kind?: string;
  url?: string;
};

/** Service-role client, or null when the env isn't configured. */
export function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/** True once VAPID is configured; safe to call more than once. */
export function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@tourneybirdie.com",
    publicKey,
    privateKey
  );
  return true;
}

/**
 * Send one notification to a set of users. Loads each person's preferences,
 * runs the shared shouldDeliver decision, pushes to every registered device
 * and prunes subscriptions the push service says are gone (404/410).
 */
export async function sendPushToUsers(
  admin: SupabaseClient,
  args: PushArgs
): Promise<number> {
  const userIds = args.userIds.filter(Boolean);
  if (userIds.length === 0) return 0;

  const { data: prefs } = await admin
    .from("notification_prefs")
    .select(
      "user_id,round_day,live_action,my_card,awards,clubhouse_level,organizer,quiet_start,quiet_end,time_zone"
    )
    .in("user_id", userIds);
  const prefById = new Map(
    ((prefs ?? []) as Record<string, unknown>[]).map((p) => [
      p.user_id as string,
      p as unknown as Partial<Prefs>,
    ])
  );

  const notification = {
    category: args.category,
    kind: args.kind,
    title: args.title,
    message: args.message,
  };
  const wanted = userIds.filter((id) => shouldDeliver(notification, prefById.get(id) ?? null));
  if (wanted.length === 0) return 0;

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .in("user_id", wanted);

  const payload = JSON.stringify({
    title: args.title,
    body: args.message,
    url: args.url || "/home",
  });

  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    ((subs ?? []) as Record<string, unknown>[]).map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint as string,
            keys: { p256dh: s.p256dh as string, auth: s.auth as string },
          },
          payload
        );
        sent += 1;
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) dead.push(s.id as string);
      }
    })
  );
  if (dead.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", dead);
  }
  return sent;
}

/**
 * One-shot guard for round-scoped events: returns true the first time it is
 * called for a (round, kind) pair, false ever after. Backed by reminder_log's
 * unique constraint, so two racing callers can't both get true.
 */
export async function onceForRound(
  admin: SupabaseClient,
  roundId: string,
  kind: string
): Promise<boolean> {
  const { error } = await admin.from("reminder_log").insert({ round_id: roundId, kind });
  // A unique violation means someone else already sent this one.
  return !error;
}

/** Owner + active admins of a trip, deduplicated. */
export async function organizerIds(admin: SupabaseClient, tripId: string): Promise<string[]> {
  const [{ data: trip }, { data: mgrs }] = await Promise.all([
    admin.from("trips").select("owner_id").eq("id", tripId).maybeSingle(),
    admin
      .from("trip_members")
      .select("user_id,role")
      .eq("trip_id", tripId)
      .eq("status", "active")
      .in("role", ["owner", "admin"]),
  ]);
  const ids = new Set<string>();
  const ownerId = (trip as { owner_id?: string } | null)?.owner_id;
  if (ownerId) ids.add(ownerId);
  for (const m of (mgrs ?? []) as { user_id: string }[]) ids.add(m.user_id);
  return [...ids];
}

/** Active members' user ids for a trip. */
export async function activeMemberIds(admin: SupabaseClient, tripId: string): Promise<string[]> {
  const { data } = await admin
    .from("trip_members")
    .select("user_id")
    .eq("trip_id", tripId)
    .eq("status", "active");
  return ((data ?? []) as { user_id: string }[]).map((m) => m.user_id);
}

type RoundRow = {
  id: string;
  trip_id: string;
  title: string;
  round_number: number | null;
  started_at: string | null;
  finished_at: string | null;
  first_score_at: string | null;
};

const SEVEN_HOURS_MS = 7 * 60 * 60 * 1000;

/** Mirrors features/voting/votingStatus.ts, over raw rows. */
function concluded(round: RoundRow, all: RoundRow[], now: number): boolean {
  if (round.finished_at) return true;
  const later = all.some(
    (r) => (r.round_number ?? 0) > (round.round_number ?? 0) && r.started_at
  );
  if (later) return true;
  if (round.first_score_at) {
    const first = new Date(round.first_score_at).getTime();
    if (Number.isFinite(first) && now - first >= SEVEN_HOURS_MS) return true;
  }
  return false;
}

/**
 * Finds every round whose voting has concluded, has real votes, and hasn't had
 * its "results are in" push yet, then sends it to the trip's active members.
 * Safe to run any number of times (reminder_log dedupes); pass a tripId to
 * limit the sweep, or nothing to sweep everything (the cron does the latter).
 */
export async function sweepConcludedVoting(
  admin: SupabaseClient,
  tripId?: string
): Promise<number> {
  let q = admin
    .from("rounds")
    .select("id,trip_id,title,round_number,started_at,finished_at,first_score_at")
    .not("started_at", "is", null);
  if (tripId) q = q.eq("trip_id", tripId);
  const { data: roundRows } = await q;
  const rounds = (roundRows ?? []) as RoundRow[];
  if (rounds.length === 0) return 0;

  const byTrip = new Map<string, RoundRow[]>();
  for (const r of rounds) byTrip.set(r.trip_id, [...(byTrip.get(r.trip_id) ?? []), r]);

  const now = Date.now();
  const due: RoundRow[] = [];
  for (const list of byTrip.values()) {
    for (const r of list) if (concluded(r, list, now)) due.push(r);
  }
  if (due.length === 0) return 0;

  // Only rounds that actually collected votes have anything to reveal.
  const { data: voteRows } = await admin
    .from("round_votes")
    .select("round_id")
    .in(
      "round_id",
      due.map((r) => r.id)
    );
  const voted = new Set(((voteRows ?? []) as { round_id: string }[]).map((v) => v.round_id));

  let sent = 0;
  for (const r of due) {
    if (!voted.has(r.id)) continue;
    if (!(await onceForRound(admin, r.id, "results_revealed"))) continue;
    const { data: trip } = await admin
      .from("trips")
      .select("name,join_code")
      .eq("id", r.trip_id)
      .maybeSingle();
    const t = (trip ?? {}) as { name?: string; join_code?: string };
    const members = await activeMemberIds(admin, r.trip_id);
    sent += await sendPushToUsers(admin, {
      userIds: members,
      title: t.name ?? "TourneyBirdie",
      message: `The votes are in for ${r.title}. Open the app for the awards reveal.`,
      category: "awards",
      url: t.join_code ? `/t/${t.join_code}` : "/home",
    });
  }
  return sent;
}
