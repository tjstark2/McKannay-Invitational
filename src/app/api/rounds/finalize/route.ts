import { NextResponse } from "next/server";
import { configureWebPush, getAdminClient, organizerIds } from "@/lib/server/push";
import { finalizeRoundById } from "@/lib/server/roundEngine";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Close a round now. Organizers only.
 *
 * The Finish round button used to just stamp the round finished, which skipped
 * resolving matches and publishing totals - so points could silently never
 * post. It now runs the same close as the automatic one.
 */
export async function POST(req: Request) {
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Server isn't configured." }, { status: 500 });
  }
  configureWebPush();

  let roundId = "";
  try {
    roundId = ((await req.json()) as { roundId?: string }).roundId ?? "";
  } catch {
    /* fall through */
  }
  if (!roundId) return NextResponse.json({ ok: false, error: "No round given." }, { status: 400 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { data: userData } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const caller = userData?.user ?? null;
  if (!caller) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { data: r } = await admin.from("rounds").select("trip_id").eq("id", roundId).maybeSingle();
  const tripId = (r as { trip_id?: string } | null)?.trip_id;
  if (!tripId) return NextResponse.json({ ok: false, error: "Round not found." }, { status: 404 });

  if (!(await organizerIds(admin, tripId)).includes(caller.id)) {
    return NextResponse.json({ ok: false, error: "Only an organizer can finish a round." }, { status: 403 });
  }

  const result = await finalizeRoundById(admin, roundId);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
