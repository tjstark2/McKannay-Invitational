// Stock course/tournament backgrounds. The 20 image files (10 scenes x
// desktop+mobile) ship in /public/backgrounds. A stored background "value" is
// one of:
//   - null / ""          -> light green default
//   - "bg_<scene>"       -> stock scene (responsive desktop/mobile files)
//   - any other string   -> custom image URL (Pro uploads), used as-is
export type StockBackground = { id: string; title: string };

export const STOCK_BACKGROUNDS: StockBackground[] = [
  { id: "bg_lagoon_gold", title: "Lagoon Gold" },
  { id: "bg_dune_break", title: "Dune Break" },
  { id: "bg_harbor_light", title: "Harbor Light" },
  { id: "bg_first_light", title: "First Light" },
  { id: "bg_valley_fall", title: "Valley Fall" },
  { id: "bg_red_rock", title: "Red Rock" },
  { id: "bg_parkland", title: "The Parkland" },
  { id: "bg_cliffs_edge", title: "Cliff's Edge" },
  { id: "bg_island_time", title: "Island Time" },
  { id: "bg_blue_hour", title: "Blue Hour" },
];

export const GREEN_FALLBACK = "#dff0e4";

export function isStockBackground(value: string | null | undefined): boolean {
  return !!value && value.startsWith("bg_");
}

export function stockSrc(id: string, platform: "desktop" | "mobile"): string {
  return `/backgrounds/${platform}/${id}_${platform}.jpg`;
}

/** Thumbnail for pickers (mobile crop reads well at small sizes). */
export function backgroundThumb(value: string): string {
  return isStockBackground(value) ? stockSrc(value, "mobile") : value;
}
