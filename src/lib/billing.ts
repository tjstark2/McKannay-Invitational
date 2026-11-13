"use client";

// Every upgrade button goes through here. The server decides: in free preview
// it grants on the spot; with billing live it hands back a Stripe checkout
// page. The app can no longer switch Pro or Birdie Boss on by itself - the
// database refuses it.

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export type UpgradeResult =
  | { status: "granted" }
  | { status: "checkout"; url: string }
  | { status: "error"; error: string };

export async function startUpgrade(
  product: "pro" | "boss",
  opts: { tripId?: string; returnPath?: string } = {}
): Promise<UpgradeResult> {
  const sb = getSupabaseClient();
  if (!sb) return { status: "error", error: "No connection." };
  const { data } = await sb.auth.getSession();
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify({
      product,
      tripId: opts.tripId,
      returnPath: opts.returnPath ?? (typeof window !== "undefined" ? window.location.pathname : "/home"),
    }),
  }).catch(() => null);
  if (!res) return { status: "error", error: "No connection." };
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; granted?: boolean; url?: string; error?: string };
  if (!res.ok || !body.ok) return { status: "error", error: body.error ?? "Couldn't upgrade." };
  if (body.url) return { status: "checkout", url: body.url };
  return { status: "granted" };
}

/** Start an upgrade and follow it through: off to checkout, or done. */
export async function upgradeOrCheckout(
  product: "pro" | "boss",
  opts: { tripId?: string; returnPath?: string } = {}
): Promise<UpgradeResult> {
  const r = await startUpgrade(product, opts);
  if (r.status === "checkout" && typeof window !== "undefined") window.location.href = r.url;
  return r;
}

export type BillingConfig = { live: boolean; prices: { pro: string | null; boss: string | null } };

let configCache: Promise<BillingConfig> | null = null;

/** Whether billing is live and the price labels, loaded once per visit. */
export function useBillingConfig(): BillingConfig | null {
  const [cfg, setCfg] = useState<BillingConfig | null>(null);
  useEffect(() => {
    configCache ??= fetch("/api/billing/config")
      .then((r) => r.json() as Promise<BillingConfig>)
      .catch(() => ({ live: false, prices: { pro: null, boss: null } }));
    let alive = true;
    void configCache.then((c) => alive && setCfg(c));
    return () => {
      alive = false;
    };
  }, []);
  return cfg;
}

/** The small print under an upgrade button. */
export function priceNote(cfg: BillingConfig | null, product: "pro" | "boss"): string {
  if (!cfg) return "";
  if (!cfg.live) return "Free while in preview - no card required.";
  const price = cfg.prices[product];
  if (product === "pro") return price ? `${price} per tournament. Everyone in it gets Pro.` : "One payment per tournament.";
  return price ? `${price}. Cancel anytime.` : "";
}
