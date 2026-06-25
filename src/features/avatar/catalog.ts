// Avatar catalog types, tier styling, and asset path helpers.
// The catalog rows themselves come from the `avatars` table (see data.ts);
// this module holds the presentation metadata that lives in the client.

export type AvatarTier = "free" | "premium" | "legendary" | "seasonal" | "special";

export interface Avatar {
  id: string; // stable slug, e.g. "Eagle_Champion"
  name: string;
  klass: string;
  tier: AvatarTier;
  event: string | null;
  sortOrder: number;
}

export const TIER_META: Record<AvatarTier, { label: string; color: string }> = {
  free: { label: "Free", color: "#cd7f32" }, // bronze
  premium: { label: "Premium", color: "#c2ccd6" }, // silver
  legendary: { label: "Legendary", color: "#ffce42" }, // gold
  seasonal: { label: "Seasonal", color: "#e5484d" }, // christmas red
  special: { label: "Special Access", color: "#eaeff4" }, // platinum
};

export const XMAS = { red: "#e5484d", green: "#2f9e44" };

// Tabs (no "All"); Special Access is appended only when the user has access.
export const PUBLIC_TIER_TABS: AvatarTier[] = [
  "free",
  "premium",
  "legendary",
  "seasonal",
];

// Today every public tier is unlocked; special is grant-only. When premium
// launches, narrow this list and the server RPC enforces the rest.
export const UNLOCKED_PUBLIC_TIERS: AvatarTier[] = [
  "free",
  "premium",
  "legendary",
  "seasonal",
];

export const logoUrl = (id: string) => `/avatars/logos/${id}.webp`;
export const cardUrl = (id: string) => `/avatars/cards/${id}.webp`;
