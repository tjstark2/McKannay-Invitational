import { NextResponse } from "next/server";
import { billingEnv, formatPrice, getPrice } from "@/lib/server/stripe";

export const runtime = "nodejs";

// Price labels change rarely; don't ask Stripe on every screen.
let cache: { at: number; body: unknown } | null = null;
const TTL_MS = 5 * 60 * 1000;

/** Whether billing is live, and what each product costs, for the buttons. */
export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) return NextResponse.json(cache.body);
  const env = billingEnv();
  let body: { live: boolean; prices: { pro: string | null; boss: string | null } } = {
    live: false,
    prices: { pro: null, boss: null },
  };
  if (env.live) {
    try {
      const [pro, boss] = await Promise.all([getPrice(env.secretKey!, env.prices.pro!), getPrice(env.secretKey!, env.prices.boss!)]);
      body = { live: true, prices: { pro: formatPrice(pro), boss: formatPrice(boss) } };
    } catch {
      body = { live: true, prices: { pro: null, boss: null } };
    }
  }
  cache = { at: Date.now(), body };
  return NextResponse.json(body);
}
