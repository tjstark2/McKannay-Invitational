import { NextResponse } from "next/server";

export const runtime = "nodejs";

import { getAdminClient } from "@/lib/server/push";

const BUCKETS = ["trip-photos", "trip-backgrounds"] as const;

/**
 * Removes a tournament's photos and background images.
 *
 * This has to go through the Storage API - Supabase blocks direct deletes from
 * storage.objects at the database level ("Direct deletion from storage tables
 * is not allowed"), so a SQL trigger can't do it. Called by the owner just
 * before the trip itself is deleted, while the rows still exist to check
 * ownership against.
 */
export async function POST(req: Request) {
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Server isn't configured." }, { status: 500 });
  }

  let body: { tripId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const tripId = body.tripId;
  if (!tripId) {
    return NextResponse.json({ ok: false, error: "No tournament given." }, { status: 400 });
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { data: userData } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const caller = userData?.user ?? null;
  if (!caller) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  // Only the owner can wipe a tournament's files, same rule as deleting it.
  const { data: trip } = await admin
    .from("trips")
    .select("owner_id")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip || (trip as { owner_id?: string }).owner_id !== caller.id) {
    return NextResponse.json(
      { ok: false, error: "Only the owner can do that." },
      { status: 403 }
    );
  }

  let removed = 0;
  for (const bucket of BUCKETS) {
    // Everything for a trip lives under "<trip id>/". Take the first 100,
    // delete them, look again - removing shifts the window, so paging with an
    // offset would skip files. The pass counter is just a safety stop.
    for (let pass = 0; pass < 50; pass++) {
      const { data: files, error } = await admin.storage
        .from(bucket)
        .list(tripId, { limit: 100 });
      if (error || !files || files.length === 0) break;
      const paths = files.map((f) => `${tripId}/${f.name}`);
      const { error: rmError } = await admin.storage.from(bucket).remove(paths);
      if (rmError) break;
      removed += paths.length;
      if (files.length < 100) break;
    }
  }

  return NextResponse.json({ ok: true, removed });
}
