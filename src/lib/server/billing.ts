// Granting what was paid for. Server only - the database refuses these flags
// from the app itself (see bundleF_billing.sql), so this is the one way in.
//
// Every grant is recorded in `purchases`. A Stripe checkout can complete
// twice in our eyes (the return page AND the webhook both see it), so the
// session id is unique and the second one changes nothing.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product, StripeSession } from "@/lib/server/stripe";

export type Grant = {
  product: Product;
  userId: string;
  tripId: string | null;
  source: "stripe" | "preview" | "comp";
  sessionId?: string | null;
  subscriptionId?: string | null;
  amountCents?: number | null;
  currency?: string | null;
};

export async function grant(admin: SupabaseClient, g: Grant): Promise<boolean> {
  if (g.product === "pro" && !g.tripId) return false;
  await admin.from("purchases").upsert(
    {
      user_id: g.userId,
      trip_id: g.tripId,
      product: g.product,
      source: g.source,
      stripe_session_id: g.sessionId ?? null,
      stripe_subscription_id: g.subscriptionId ?? null,
      amount_cents: g.amountCents ?? null,
      currency: g.currency ?? null,
      status: "active",
    },
    g.sessionId ? { onConflict: "stripe_session_id", ignoreDuplicates: true } : undefined
  );

  const now = new Date().toISOString();
  if (g.product === "pro") {
    const { data, error } = await admin
      .from("trips")
      .update({ is_pro: true, pro_since: now })
      .eq("id", g.tripId!)
      .eq("is_pro", false)
      .select("id");
    // Already Pro counts as granted.
    return !error && (Boolean(data?.length) || (await isPro(admin, g.tripId!)));
  }
  const { error } = await admin
    .from("profiles")
    .update({ is_birdie_boss: true, birdie_boss_since: now })
    .eq("id", g.userId);
  return !error;
}

export async function isPro(admin: SupabaseClient, tripId: string): Promise<boolean> {
  const { data } = await admin.from("trips").select("is_pro").eq("id", tripId).maybeSingle();
  return Boolean((data as { is_pro?: boolean } | null)?.is_pro);
}

export async function isBoss(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin.from("profiles").select("is_birdie_boss").eq("id", userId).maybeSingle();
  return Boolean((data as { is_birdie_boss?: boolean } | null)?.is_birdie_boss);
}

/** A finished checkout - grant it if it was actually paid (or comped by a 100% code). */
export async function completeSession(admin: SupabaseClient, s: StripeSession): Promise<Product | null> {
  const paid = s.status === "complete" && (s.payment_status === "paid" || s.payment_status === "no_payment_required");
  const product = s.metadata?.product as Product | undefined;
  const userId = s.metadata?.user_id;
  if (!paid || !userId || (product !== "pro" && product !== "boss")) return null;
  const ok = await grant(admin, {
    product,
    userId,
    tripId: s.metadata?.trip_id || null,
    source: "stripe",
    sessionId: s.id,
    subscriptionId: s.subscription,
    amountCents: s.amount_total,
    currency: s.currency,
  });
  return ok ? product : null;
}

/**
 * A Birdie Boss subscription ended. Take Boss away - unless they also have it
 * some other way (an older one-off purchase, a comp).
 */
export async function endSubscription(admin: SupabaseClient, subscriptionId: string): Promise<void> {
  const { data } = await admin
    .from("purchases")
    .update({ status: "ended" })
    .eq("stripe_subscription_id", subscriptionId)
    .select("user_id,product");
  for (const row of (data ?? []) as { user_id: string | null; product: string }[]) {
    if (row.product !== "boss" || !row.user_id) continue;
    const { count } = await admin
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", row.user_id)
      .eq("product", "boss")
      .eq("status", "active");
    if ((count ?? 0) === 0) {
      await admin.from("profiles").update({ is_birdie_boss: false }).eq("id", row.user_id);
    }
  }
}

/** Only ever send people back inside the app. */
export function safeReturnPath(raw: unknown): string {
  const p = typeof raw === "string" ? raw : "";
  return p.startsWith("/") && !p.startsWith("//") && !p.includes("\\") ? p : "/home";
}

export function withParam(path: string, key: string, value: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}
