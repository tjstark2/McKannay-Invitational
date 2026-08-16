import { NextResponse } from "next/server";

export const runtime = "nodejs";

import {
  activeMemberIds,
  configureWebPush,
  getAdminClient,
  organizerIds,
  sendPushToUsers,
  sweepConcludedVoting,
} from "@/lib/server/push";

/**
 * Events the client can't send itself:
 *  - join_request: the requester isn't a member yet, so RLS hides who the
 *    organizers are. The server looks them up and pushes to them.
 *  - voting_concluded_sweep: finding newly concluded rounds and making sure
 *    the "results are in" push goes exactly once needs the service role
 *    (reminder_log has no client policies, on purpose).
 *
 * Callers must be signed in: the client sends its Supabase access token and
 * we verify it before doing anything.
 */
export async function POST(req: Request) {
  const admin = getAdminClient();
  if (!admin || !configureWebPush()) {
    return NextResponse.json({ ok: false, error: "Push isn't configured yet." }, { status: 500 });
  }

  let body: {
    event?: string;
    tripId?: string;
    text?: string;
    messageId?: string;
    emoji?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const tripId = body.tripId;
  if (!body.event || !tripId) {
    return NextResponse.json({ ok: false, error: "Nothing to send." }, { status: 400 });
  }

  // Who is calling? The bearer token is the caller's Supabase session token.
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { data: userData } = token
    ? await admin.auth.getUser(token)
    : { data: { user: null } };
  const caller = userData?.user ?? null;
  if (!caller) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  if (body.event === "join_request") {
    // Only someone with a real membership row for this trip (their request)
    // can trigger the organizer ping - stops drive-by spam.
    const { data: mem } = await admin
      .from("trip_members")
      .select("id,status")
      .eq("trip_id", tripId)
      .eq("user_id", caller.id)
      .maybeSingle();
    if (!mem) {
      return NextResponse.json({ ok: false, error: "No request found." }, { status: 403 });
    }

    const [{ data: trip }, { data: prof }] = await Promise.all([
      admin.from("trips").select("name,join_code").eq("id", tripId).maybeSingle(),
      admin
        .from("public_profiles")
        .select("username,first_name,last_name")
        .eq("id", caller.id)
        .maybeSingle(),
    ]);
    const t = (trip ?? {}) as { name?: string; join_code?: string };
    const p = (prof ?? {}) as {
      username?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    };
    const who =
      [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username || "Someone";
    const pending = (mem as { status?: string }).status === "pending";

    const orgs = (await organizerIds(admin, tripId)).filter((id) => id !== caller.id);
    const sent = await sendPushToUsers(admin, {
      userIds: orgs,
      title: t.name ?? "TourneyBirdie",
      message: pending
        ? `${who} asked to join. Approve or decline in Manage.`
        : `${who} joined the tournament.`,
      category: "organizer",
      url: t.join_code ? `/manage/${t.join_code}` : "/home",
    });
    return NextResponse.json({ ok: true, sent });
  }

  if (body.event === "chat_message" || body.event === "chat_reaction") {
    // Must be an active member of the trip to make it buzz anyone's phone.
    const { data: mem } = await admin
      .from("trip_members")
      .select("id")
      .eq("trip_id", tripId)
      .eq("user_id", caller.id)
      .eq("status", "active")
      .maybeSingle();
    const { data: tripRow } = await admin
      .from("trips")
      .select("name,join_code,owner_id")
      .eq("id", tripId)
      .maybeSingle();
    const t = (tripRow ?? {}) as { name?: string; join_code?: string; owner_id?: string };
    if (!mem && t.owner_id !== caller.id) {
      return NextResponse.json({ ok: false, error: "Not a member." }, { status: 403 });
    }
    const url = t.join_code ? `/t/${t.join_code}` : "/home";

    const { data: prof } = await admin
      .from("public_profiles")
      .select("username,first_name")
      .eq("id", caller.id)
      .maybeSingle();
    const p = (prof ?? {}) as { username?: string | null; first_name?: string | null };
    const who = p.first_name || p.username || "Someone";

    if (body.event === "chat_reaction") {
      // Tell the author their message got a reaction. Never yourself.
      if (!body.messageId) {
        return NextResponse.json({ ok: false, error: "No message." }, { status: 400 });
      }
      const { data: msg } = await admin
        .from("trip_messages")
        .select("user_id,body")
        .eq("id", body.messageId)
        .maybeSingle();
      const author = (msg as { user_id?: string } | null)?.user_id;
      if (!author || author === caller.id) return NextResponse.json({ ok: true, sent: 0 });
      const snippet = ((msg as { body?: string }).body ?? "").slice(0, 60);
      const sent = await sendPushToUsers(admin, {
        userIds: [author],
        title: t.name ?? "TourneyBirdie",
        message: `${who} reacted ${body.emoji ?? "👍"} to "${snippet}"`,
        category: "clubhouse",
        kind: "reaction",
        url,
      });
      return NextResponse.json({ ok: true, sent });
    }

    // ---- chat message: mentions immediately, everyone else batched --------
    const members = await activeMemberIds(admin, tripId);
    const others = members.filter((id) => id !== caller.id);
    const text = (body.text ?? "").trim();
    if (others.length === 0 || !text) return NextResponse.json({ ok: true, sent: 0 });

    // Who got @mentioned? Match against the usernames of people in this trip.
    const { data: profs } = await admin
      .from("public_profiles")
      .select("id,username")
      .in("id", others);
    const handles = ((profs ?? []) as { id: string; username: string | null }[]).filter(
      (x) => x.username
    );
    const lowered = text.toLowerCase();
    const mentioned = handles
      .filter((x) => lowered.includes(`@${(x.username ?? "").toLowerCase()}`))
      .map((x) => x.id);

    let sent = 0;
    if (mentioned.length > 0) {
      sent += await sendPushToUsers(admin, {
        userIds: mentioned,
        title: t.name ?? "TourneyBirdie",
        message: `${who} mentioned you: ${text.slice(0, 80)}`,
        category: "clubhouse",
        kind: "mention",
        url,
      });
    }

    // Everyone else hears at most once every 15 minutes, so a lively thread
    // doesn't turn into 40 buzzes. The log row is the whole batching mechanism.
    const rest = others.filter((id) => !mentioned.includes(id));
    if (rest.length > 0) {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: logRow } = await admin
        .from("chat_notify_log")
        .select("last_sent_at")
        .eq("trip_id", tripId)
        .maybeSingle();
      const last = (logRow as { last_sent_at?: string } | null)?.last_sent_at;
      if (!last || last < cutoff) {
        await admin
          .from("chat_notify_log")
          .upsert(
            { trip_id: tripId, last_sent_at: new Date().toISOString() },
            { onConflict: "trip_id" }
          );
        sent += await sendPushToUsers(admin, {
          userIds: rest,
          title: t.name ?? "TourneyBirdie",
          message: `${who} in the Clubhouse: ${text.slice(0, 80)}`,
          category: "clubhouse",
          kind: "message",
          url,
        });
      }
    }
    return NextResponse.json({ ok: true, sent });
  }

  if (body.event === "voting_concluded_sweep") {
    // Any active member of the trip can nudge the sweep; the sweep itself
    // decides what (if anything) is due and dedupes.
    const { data: mem } = await admin
      .from("trip_members")
      .select("id")
      .eq("trip_id", tripId)
      .eq("user_id", caller.id)
      .eq("status", "active")
      .maybeSingle();
    const { data: trip } = await admin
      .from("trips")
      .select("owner_id")
      .eq("id", tripId)
      .maybeSingle();
    const isOwner = (trip as { owner_id?: string } | null)?.owner_id === caller.id;
    if (!mem && !isOwner) {
      return NextResponse.json({ ok: false, error: "Not a member." }, { status: 403 });
    }
    const sent = await sweepConcludedVoting(admin, tripId);
    return NextResponse.json({ ok: true, sent });
  }

  return NextResponse.json({ ok: false, error: "Unknown event." }, { status: 400 });
}
