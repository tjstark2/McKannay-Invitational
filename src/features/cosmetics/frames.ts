// Avatar frame rings - pure CSS layered around any circular avatar.
// Free: one plain ring. Birdie Boss: the animated/legendary/solid set.
// Owner: Founder's Flames, hard-locked to a single email.
export type CosmeticTier = "free" | "boss" | "owner";

export interface FrameDef {
  id: string;
  name: string;
  tier: CosmeticTier;
  ring: string; // CSS applied to the ring layer (background + animation)
  glow?: string; // optional pulsing glow color (rgba)
  flames?: boolean; // Founder's Flames special
  sparkle?: boolean; // twinkling dots
  bolts?: boolean; // lightning bolts
  orbit?: boolean; // orbiting golf ball
  cat?: "animated" | "seasonal" | "solid"; // boss sub-category
}

export const FOUNDER_EMAIL = "tjstark2@gmail.com";

const spin = (css: string) => css;

export const FRAMES: FrameDef[] = [
  { id: "slate", name: "Slate", tier: "free", ring: "background:#5b6b60;" },

  // Birdie Boss - animated (12)
  { id: "gold_rush", name: "Gold Rush", tier: "boss", cat: "animated", sparkle: true, ring: spin("background:conic-gradient(from 0deg,#e7c869,#fff6d8,#c8a23c,#7a5c12,#e7c869);animation:tbspin 6s linear infinite;") },
  { id: "platinum", name: "Platinum", tier: "boss", cat: "animated", ring: "background:conic-gradient(from 90deg,#cfd8e4,#7d8da3,#eef2f7,#9aa8bb,#cfd8e4);animation:tbspinR 8s linear infinite;" },
  { id: "emerald", name: "Emerald", tier: "boss", cat: "animated", ring: "background:linear-gradient(135deg,#1f8a5b,#0c5c39);", glow: "rgba(31,170,90,.85)" },
  { id: "neon_cyan", name: "Neon Cyan", tier: "boss", cat: "animated", sparkle: true, ring: "background:conic-gradient(from 0deg,#2ce8f0,#0a6b8f,#bafcff,#2ce8f0);animation:tbspin 5s linear infinite;", glow: "rgba(56,224,232,.8)" },
  { id: "royal_purple", name: "Royal Purple", tier: "boss", cat: "animated", ring: "background:conic-gradient(from 0deg,#a14bff,#5a1ea0,#ff5bd0,#a14bff);animation:tbspin 7s linear infinite;" },
  { id: "sunset", name: "Sunset", tier: "boss", cat: "animated", ring: "background:conic-gradient(from 0deg,#ff7a18,#ffd34d,#ff3d77,#ff7a18);animation:tbspin 6.5s linear infinite;" },
  { id: "rainbow", name: "Rainbow", tier: "boss", cat: "animated", ring: "background:conic-gradient(#ff4d4d,#ffb24d,#fff24d,#4dff88,#4dd2ff,#a14bff,#ff4d9e,#ff4d4d);animation:tbspin 6s linear infinite,tbhue 8s linear infinite;" },
  { id: "electric", name: "Electric", tier: "boss", cat: "animated", ring: "background:linear-gradient(135deg,#3b73e0,#1233a0);", glow: "rgba(60,140,255,.9)" },
  { id: "rose_gold", name: "Rose Gold", tier: "boss", cat: "animated", ring: "background:conic-gradient(from 0deg,#f3c9b8,#d98a6a,#ffe3d6,#c2725a,#f3c9b8);animation:tbspin 9s linear infinite;" },
  { id: "aqua_ice", name: "Aqua Ice", tier: "boss", cat: "animated", sparkle: true, ring: "background:conic-gradient(from 0deg,#bfe9ff,#5aa9d6,#eafaff,#bfe9ff);animation:tbspinR 7s linear infinite;" },
  { id: "starlight", name: "Starlight", tier: "boss", cat: "animated", sparkle: true, ring: "background:radial-gradient(circle at 30% 30%,#2a2150,#0c0a22);", glow: "rgba(180,160,255,.6)" },
  { id: "crimson_gold", name: "Crimson Gold", tier: "boss", cat: "animated", ring: "background:conic-gradient(from 0deg,#e23a0e,#ffd34d,#a01010,#e23a0e);animation:tbspin 5.5s linear infinite;" },

  // Birdie Boss - legendary & seasonal (9)
  { id: "legendary", name: "Legendary", tier: "boss", cat: "seasonal", sparkle: true, ring: "background:conic-gradient(from 0deg,#f6e27a,#0e0e0e,#d6b66a,#0e0e0e,#f6e27a);animation:tbspin 9s linear infinite;", glow: "rgba(214,182,106,.95)" },
  { id: "lightning", name: "Lightning", tier: "boss", cat: "seasonal", bolts: true, ring: "background:linear-gradient(135deg,#0a2540,#0e3a5a);", glow: "rgba(125,249,255,.9)" },
  { id: "hole_in_one", name: "Hole in One", tier: "boss", cat: "seasonal", orbit: true, ring: "background:conic-gradient(from 0deg,#1f8a5b,#0c5c39,#3fcf8a,#1f8a5b);animation:tbspin 7s linear infinite;" },
  { id: "frostbite", name: "Frostbite", tier: "boss", cat: "seasonal", sparkle: true, ring: "background:conic-gradient(from 0deg,#bfe9ff,#5aa9d6,#eafaff,#bfe9ff);animation:tbspinR 9s linear infinite;", glow: "rgba(150,220,255,.7)" },
  { id: "spooky", name: "Spooky", tier: "boss", cat: "seasonal", ring: "background:conic-gradient(from 0deg,#ff7a18,#3a1145,#ffae42,#3a1145,#ff7a18);animation:tbspin 7s linear infinite;", glow: "rgba(255,120,20,.8)" },
  { id: "holly_jolly", name: "Holly Jolly", tier: "boss", cat: "seasonal", sparkle: true, ring: "background:repeating-conic-gradient(#c01f2e 0deg 18deg,#fff 18deg 36deg,#1f8a3c 36deg 54deg);animation:tbspin 8s linear infinite;" },
  { id: "lucky", name: "Lucky", tier: "boss", cat: "seasonal", sparkle: true, ring: "background:repeating-conic-gradient(#1f8a3c 0deg 22deg,#6ee07a 22deg 44deg);animation:tbspin 8s linear infinite;", glow: "rgba(46,200,90,.7)" },
  { id: "sweetheart", name: "Sweetheart", tier: "boss", cat: "seasonal", sparkle: true, ring: "background:conic-gradient(from 0deg,#ff8fb3,#e23a6e,#ffd0de,#ff8fb3);animation:tbspin 7s linear infinite;", glow: "rgba(255,90,150,.75)" },
  { id: "old_glory", name: "Old Glory", tier: "boss", cat: "seasonal", sparkle: true, ring: "background:conic-gradient(from 0deg,#b22234,#fff,#3c3b6e,#fff,#b22234);animation:tbspin 8s linear infinite;" },

  // Birdie Boss - solid colors (6)
  { id: "onyx", name: "Onyx", tier: "boss", cat: "solid", ring: "background:#161616;" },
  { id: "pearl", name: "Pearl", tier: "boss", cat: "solid", ring: "background:#e6e8ea;" },
  { id: "navy", name: "Navy", tier: "boss", cat: "solid", ring: "background:#1f3a63;" },
  { id: "crimson", name: "Crimson", tier: "boss", cat: "solid", ring: "background:#9e1b2b;" },
  { id: "forest", name: "Forest", tier: "boss", cat: "solid", ring: "background:#1f5d3a;" },
  { id: "royal", name: "Royal", tier: "boss", cat: "solid", ring: "background:#4a2a8a;" },

  // Owner exclusive
  { id: "founder_flames", name: "Founder's Flames", tier: "owner", ring: "background:radial-gradient(circle,#ff7a18,#7a1e02);", flames: true },
];

export const DEFAULT_FRAME = "slate";
export const frameById = (id?: string | null) =>
  FRAMES.find((f) => f.id === id) ?? FRAMES[0];
