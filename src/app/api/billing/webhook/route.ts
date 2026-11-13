import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server/push";
import { billingEnv, verifyStripeSignature, type StripeSession } from "@/lib/server/stripe";
import { completeSession, endSubscription } from "@/lib/server/billing";

export const runtime = "nodejs";

/**
 * Stripe tells us about payments here. Point the Stripe webhook at
 * https://www.tourneybirdie.com/api/billing/webhook with these events:
 *   checkout.session.completed
 *   checkout.session.async_payment_succeeded
 *   customer.subscription.deleted
 */
export async function POST(req: Request) {
  const env = billingEnv();
  const admin = getAdminClient();
  if (!env.webhookSecret || !admin) return NextResponse.json({ ok: false }, { status: 503 });

  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"), env.webhookSecret)) {
    return NextResponse.json({ ok: false, error: "Bad signature." }, { status: 400 });
  }

  const event = JSON.parse(raw) as { type: string; data: { object: Record<string, unknown> } };
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await completeSession(admin, event.data.object as unknown as StripeSession);
    } else if (event.type === "customer.subscription.deleted") {
      const id = event.data.object.id;
      if (typeof id === "string") await endSubscription(admin, id);
    }
  } catch {
    // Tell Stripe to retry - it does, for days.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
