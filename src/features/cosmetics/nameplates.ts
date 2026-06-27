import type { CosmeticTier } from "./frames";

// Profile nameplates - data-driven bars. Title text comes from the player's
// avatar tagline (see taglines.ts). Free: one plain bar. Birdie Boss: banners,
// colored bars, animated, and seasonal.
export type PlateLayout = "plain" | "banner" | "bar";
export type PlateFx =
  | "sheen"
  | "electric"
  | "ball"
  | "snow"
  | "leaves"
  | "moon"
  | "hearts"
  | "clovers";

export interface PlateDef {
  id: string;
  name: string;
  tier: CosmeticTier;
  layout: PlateLayout;
  bg?: string; // banner background
  ring?: string; // avatar ring inside the plate
  accent?: string; // bar border / chip color
  titleColor?: string; // tagline color on banners
  fx?: PlateFx; // animated overlay
  tag?: string; // small chip by the name
  tagBg?: string;
  tagColor?: string;
  cat?: "banner" | "bar" | "animated" | "seasonal";
}

export const NAMEPLATES: PlateDef[] = [
  { id: "plain", name: "Plain Bar", tier: "free", layout: "plain", ring: "#5b6b60" },

  // Banners (animated sheen)
  { id: "banner_ocean", name: "Ocean", tier: "boss", layout: "banner", cat: "banner", fx: "sheen", bg: "linear-gradient(120deg,#11233a,#1f3a63 60%,#2b5fa8)", ring: "linear-gradient(135deg,#cfd8e4,#7d8da3)", titleColor: "#9ec3ff" },
  { id: "banner_emerald", name: "Emerald", tier: "boss", layout: "banner", cat: "banner", fx: "sheen", bg: "linear-gradient(120deg,#0c3a2a,#157a52 65%,#1fae74)", ring: "linear-gradient(135deg,#cdf0c9,#7db89a)", titleColor: "#a7f0cd" },
  { id: "banner_purple", name: "Purple", tier: "boss", layout: "banner", cat: "banner", fx: "sheen", bg: "linear-gradient(120deg,#3a1145,#7a1ea0 60%,#ff5bd0)", ring: "linear-gradient(135deg,#f0cfe9,#b87da8)", titleColor: "#ffc7f0" },

  // Colored bars
  { id: "bar_gold", name: "Gold", tier: "boss", layout: "bar", cat: "bar", accent: "#d6b66a", ring: "linear-gradient(135deg,#e7c869,#b8901f)" },
  { id: "bar_cyan", name: "Cyan", tier: "boss", layout: "bar", cat: "bar", accent: "#2ca6c9", ring: "conic-gradient(from 0deg,#2ce8f0,#0a6b8f,#bafcff,#2ce8f0)" },
  { id: "bar_rose", name: "Rose", tier: "boss", layout: "bar", cat: "bar", accent: "#d9657f", ring: "linear-gradient(135deg,#f3c9b8,#c2725a)" },
  { id: "bar_navy", name: "Navy", tier: "boss", layout: "bar", cat: "bar", accent: "#1f3a63", ring: "#1f3a63" },
  { id: "bar_crimson", name: "Crimson", tier: "boss", layout: "bar", cat: "bar", accent: "#9e1b2b", ring: "#9e1b2b" },
  { id: "bar_forest", name: "Forest", tier: "boss", layout: "bar", cat: "bar", accent: "#1f5d3a", ring: "#1f5d3a" },

  // Animated
  { id: "electric", name: "Electric", tier: "boss", layout: "banner", cat: "animated", fx: "electric", bg: "linear-gradient(120deg,#06121f,#0c2742 60%,#103a5c)", ring: "conic-gradient(from 0deg,#2ce8f0,#0a6b8f,#bafcff,#2ce8f0)", titleColor: "#7df9ff" },
  { id: "hole_in_one", name: "Hole in One", tier: "boss", layout: "banner", cat: "animated", fx: "ball", bg: "linear-gradient(120deg,#0c3a2a,#157a52 65%,#1fae74)", ring: "linear-gradient(135deg,#cdf0c9,#3fae74)", titleColor: "#a7f0cd" },
  { id: "legendary", name: "Legendary", tier: "boss", layout: "banner", cat: "animated", fx: "sheen", bg: "linear-gradient(120deg,#0e0e0e,#2a2210 55%,#5a4416)", ring: "conic-gradient(from 0deg,#f6e27a,#0e0e0e,#d6b66a,#0e0e0e,#f6e27a)", titleColor: "#f1d99a", tag: "LEGENDARY", tagBg: "#d6b66a", tagColor: "#2a210c" },

  // Seasonal
  { id: "winter", name: "Winter", tier: "boss", layout: "banner", cat: "seasonal", fx: "snow", bg: "linear-gradient(120deg,#16384f,#2f6f9c 60%,#5aa9d6)", ring: "conic-gradient(from 0deg,#dff3ff,#5aa9d6,#eafaff,#dff3ff)", titleColor: "#d6f0ff", tag: "WINTER", tagBg: "rgba(255,255,255,.85)", tagColor: "#1a4a66" },
  { id: "thanksgiving", name: "Harvest", tier: "boss", layout: "banner", cat: "seasonal", fx: "leaves", bg: "linear-gradient(120deg,#4a2207,#9a531a 60%,#c97e2a)", ring: "linear-gradient(135deg,#ffd9a3,#c97e2a)", titleColor: "#ffd9a3", tag: "THANKSGIVING", tagBg: "#e0962f", tagColor: "#3a1c04" },
  { id: "christmas", name: "Holiday", tier: "boss", layout: "banner", cat: "seasonal", fx: "snow", bg: "linear-gradient(120deg,#0c3a1f,#1f7a3a 55%,#c01f2e)", ring: "repeating-conic-gradient(#c01f2e 0deg 18deg,#fff 18deg 36deg,#1f8a3c 36deg 54deg)", titleColor: "#d6ffe0", tag: "HOLIDAY", tagBg: "#fff", tagColor: "#c01f2e" },
  { id: "spooky", name: "Spooky", tier: "boss", layout: "banner", cat: "seasonal", fx: "moon", bg: "linear-gradient(120deg,#1c0a2a,#4a1670 55%,#7a1ea0)", ring: "conic-gradient(from 0deg,#ff7a18,#3a1145,#ffae42,#3a1145,#ff7a18)", titleColor: "#ffc78a", tag: "SPOOKY", tagBg: "#ff8a1e", tagColor: "#2a1004" },
  { id: "valentine", name: "Sweetheart", tier: "boss", layout: "banner", cat: "seasonal", fx: "hearts", bg: "linear-gradient(120deg,#5a1030,#a01e5a 60%,#ff5b9e)", ring: "conic-gradient(from 0deg,#ff8fb3,#e23a6e,#ffd0de,#ff8fb3)", titleColor: "#ffd0de", tag: "VALENTINE", tagBg: "#ff5b9e", tagColor: "#3a0418" },
  { id: "lucky", name: "Lucky", tier: "boss", layout: "banner", cat: "seasonal", fx: "clovers", bg: "linear-gradient(120deg,#0b3d1f,#1f8a3c 60%,#46c85a)", ring: "repeating-conic-gradient(#1f8a3c 0deg 22deg,#6ee07a 22deg 44deg)", titleColor: "#caffd6", tag: "LUCKY", tagBg: "#6ee07a", tagColor: "#0b3d1f" },
];

export const DEFAULT_PLATE = "plain";
export const plateById = (id?: string | null) =>
  NAMEPLATES.find((p) => p.id === id) ?? NAMEPLATES[0];
