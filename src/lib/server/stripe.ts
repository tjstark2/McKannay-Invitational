// Stripe, without the SDK - a few REST calls and the webhook signature check.
// No new npm dependency, so deploys stay one step.
//
// Prices live in Stripe, not in this code: STRIPE_PRICE_PRO and
// STRIPE_PRICE_BOSS point at Price objects, and whether a product is one-off
// or monthly comes from the Price itself. Change a price in the Stripe
// dashboard and the app follows - no deploy.

import { createHmac, timingSafeEqual } from "node:crypto";

export type Product = "pro" | "boss";

export type BillingEnv = {
  live: boolean;
  secretKey: string | null;
  webhookSecret: string | null;
  prices: Record<Product, string | null>;
};

/**
 * Live billing needs BILLING_MODE=live AND the keys. Anything less is the free
 * preview, so a half-configured deploy can never take money without being
 * able to grant what was paid for.
 */
export function billingEnv(env: NodeJS.ProcessEnv = process.env): BillingEnv {
  const secretKey = env.STRIPE_SECRET_KEY || null;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET || null;
  const prices = { pro: env.STRIPE_PRICE_PRO || null, boss: env.STRIPE_PRICE_BOSS || null };
  const live = env.BILLING_MODE === "live" && Boolean(secretKey && webhookSecret && prices.pro && prices.boss);
  return { live, secretKey, webhookSecret, prices };
}

/** Stripe's API takes form encoding with bracketed keys for nesting. */
export function formEncode(obj: Record<string, unknown>, prefix = ""): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item !== null && typeof item === "object") parts.push(formEncode(item as Record<string, unknown>, `${key}[${i}]`));
        else parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof v === "object") {
      parts.push(formEncode(v as Record<string, unknown>, key));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return parts.filter(Boolean).join("&");
}

async function stripe<T>(secretKey: string, method: "GET" | "POST", path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? formEncode(body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`);
  return json;
}

export type StripePrice = {
  id: string;
  unit_amount: number | null;
  currency: string;
  recurring: { interval: string } | null;
};

export type StripeSession = {
  id: string;
  url: string | null;
  mode: "payment" | "subscription";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  status: "open" | "complete" | "expired";
  amount_total: number | null;
  currency: string | null;
  subscription: string | null;
  metadata: Record<string, string>;
};

export const getPrice = (key: string, id: string) => stripe<StripePrice>(key, "GET", `/prices/${id}`);
export const getSession = (key: string, id: string) => stripe<StripeSession>(key, "GET", `/checkout/sessions/${id}`);

export async function createCheckout(
  key: string,
  args: {
    price: StripePrice;
    product: Product;
    userId: string;
    email: string | null;
    tripId: string | null;
    successUrl: string;
    cancelUrl: string;
  }
): Promise<StripeSession> {
  const metadata = { product: args.product, user_id: args.userId, trip_id: args.tripId ?? "" };
  const subscription = Boolean(args.price.recurring);
  return stripe<StripeSession>(key, "POST", "/checkout/sessions", {
    mode: subscription ? "subscription" : "payment",
    line_items: [{ price: args.price.id, quantity: 1 }],
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    client_reference_id: args.userId,
    customer_email: args.email ?? undefined,
    // Lets you hand out codes - a 100% one comps a trip without a card.
    allow_promotion_codes: true,
    metadata,
    // A subscription carries the same tags, so cancelling it can find who to revoke.
    ...(subscription ? { subscription_data: { metadata } } : {}),
  });
}

/**
 * Check a webhook really came from Stripe. The header is
 * "t=<unix>,v1=<hex hmac>"; the signed text is "<t>.<raw body>". Rejects
 * anything older than `toleranceSec`, so a captured request can't be replayed.
 */
export function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
  toleranceSec = 300
): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isFinite(t) || sigs.length === 0) return false;
  if (Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return sigs.some((s) => {
    if (!s || s.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(s, "hex"), Buffer.from(expected, "hex"));
  });
}

/** "$29" or "$4.99/mo" - what the buttons say. */
export function formatPrice(p: Pick<StripePrice, "unit_amount" | "currency" | "recurring">): string {
  if (p.unit_amount == null) return "";
  const amount = p.unit_amount / 100;
  const text = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: p.currency.toUpperCase(),
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
  const per: Record<string, string> = { month: "/mo", year: "/yr", week: "/wk", day: "/day" };
  return p.recurring ? `${text}${per[p.recurring.interval] ?? ""}` : text;
}
