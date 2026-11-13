import { NextResponse } from "next/server";
import { getAdminClient, organizerIds } from "@/lib/server/push";
import { billingEnv, createCheckout, getPrice, type Product } from "@/lib/server/stripe";
import { grant, isBoss, isPro, safeReturnPath } from "@/lib/server/billing";

export const runtime = "nodejs";

/**
 * Start an upgrade.
 *   - Free preview (billing not live): granted on the spot, no card.
 *   - Live: returns a Stripe Checkout URL to send the person to.
 * Pro is per tournament and only an organizer can buy it; Birdie Boss is for
 * the person buying it.
 */
export async function POST(req: Request) {
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "Server isn't configured." }, { status: 500 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { data: userData } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const user = userData?.user ?? null;
  if (!user) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });

  let body: { product?: string; tripId?: string; returnPath?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* fall through */
  }
  const product = body.product as Product;
  if (product !== "pro" && product !== "boss") {
    return NextResponse.json({ ok: false, error: "Unknown upgrade." }, { status: 400 });
  }
  const tripId = product === "pro" ? body.tripId ?? "" : null;
  const returnPath = safeReturnPath(body.returnPath);

  if (product === "pro") {
    if (!tripId) return NextResponse.json({ ok: false, error: "No tournament given." }, { status: 400 });
    if (!(await organizerIds(admin, tripId)).includes(user.id)) {
      return NextResponse.json({ ok: false, error: "Only an organizer can upgrade the tournament." }, { status: 403 });
    }
    if (await isPro(admin, tripId)) return NextResponse.json({ ok: true, granted: true });
  } else if (await isBoss(admin, user.id)) {
    return NextResponse.json({ ok: true, granted: true });
  }

  const env = billingEnv();
  if (!env.live) {
    const ok = await grant(admin, { product, userId: user.id, tripId, source: "preview" });
    return ok
      ? NextResponse.json({ ok: true, granted: true })
      : NextResponse.json({ ok: false, error: "Couldn't upgrade - try again." }, { status: 500 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  try {
    const price = await getPrice(env.secretKey!, env.prices[product]!);
    const session = await createCheckout(env.secretKey!, {
      price,
      product,
      userId: user.id,
      email: user.email ?? null,
      tripId,
      successUrl: `${site}/api/billing/return?session_id={CHECKOUT_SESSION_ID}&next=${encodeURIComponent(returnPath)}`,
      cancelUrl: `${site}${returnPath}`,
    });
    if (!session.url) throw new Error("No checkout page came back.");
    return NextResponse.json({ ok: true, url: session.url });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Checkout isn't available right now (${e instanceof Error ? e.message : "unknown"}).` },
      { status: 502 }
    );
  }
}
