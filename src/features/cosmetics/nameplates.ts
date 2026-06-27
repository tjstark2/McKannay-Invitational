import type { CosmeticTier } from "./frames";

// Profile nameplates - data-driven bars showing avatar, name, title, HCP, wins.
// Free: one plain bar. Birdie Boss: banners + colored bars.
export type PlateLayout = "plain" | "banner" | "bar";

export interface PlateDef {
  id: string;
  name: string;
  tier: CosmeticTier;
  layout: PlateLayout;
  bg?: string; // banner background
  ring?: string; // avatar ring inside the plate
  accent?: string; // accent / bar border / chip color
  sheen?: boolean; // animated diagonal sheen (banners)
}

export const NAMEPLATES: PlateDef[] = [
  {
    id: "plain",
    name: "Plain Bar",
    tier: "free",
    layout: "plain",
    bg: "#1c2a22",
    ring: "#5b6b60",
    accent: "#2e4036",
  },

  // Birdie Boss - banners (animated sheen)
  { id: "banner_ocean", name: "Ocean", tier: "boss", layout: "banner", sheen: true, bg: "linear-gradient(120deg,#11233a,#1f3a63 60%,#2b5fa8)", ring: "linear-gradient(135deg,#cfd8e4,#7d8da3)", accent: "#9ec3ff" },
  { id: "banner_emerald", name: "Emerald", tier: "boss", layout: "banner", sheen: true, bg: "linear-gradient(120deg,#0c3a2a,#157a52 65%,#1fae74)", ring: "linear-gradient(135deg,#cdf0c9,#7db89a)", accent: "#a7f0cd" },
  { id: "banner_purple", name: "Purple", tier: "boss", layout: "banner", sheen: true, bg: "linear-gradient(120deg,#3a1145,#7a1ea0 60%,#ff5bd0)", ring: "linear-gradient(135deg,#f0cfe9,#b87da8)", accent: "#ffc7f0" },

  // Birdie Boss - colored bars
  { id: "bar_gold", name: "Gold", tier: "boss", layout: "bar", accent: "#d6b66a", ring: "linear-gradient(135deg,#e7c869,#b8901f)" },
  { id: "bar_cyan", name: "Cyan", tier: "boss", layout: "bar", accent: "#2ca6c9", ring: "conic-gradient(from 0deg,#2ce8f0,#0a6b8f,#bafcff,#2ce8f0)" },
  { id: "bar_rose", name: "Rose", tier: "boss", layout: "bar", accent: "#d9657f", ring: "linear-gradient(135deg,#f3c9b8,#c2725a)" },
  { id: "bar_navy", name: "Navy", tier: "boss", layout: "bar", accent: "#1f3a63", ring: "#1f3a63" },
  { id: "bar_crimson", name: "Crimson", tier: "boss", layout: "bar", accent: "#9e1b2b", ring: "#9e1b2b" },
  { id: "bar_forest", name: "Forest", tier: "boss", layout: "bar", accent: "#1f5d3a", ring: "#1f5d3a" },
];

export const DEFAULT_PLATE = "plain";
export const plateById = (id?: string | null) =>
  NAMEPLATES.find((p) => p.id === id) ?? NAMEPLATES[0];
