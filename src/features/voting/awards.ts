// The 5 default post-round superlative awards. `key` is what's stored in
// round_votes.award_key and trip_award_config.award_keys.
export type AwardDef = {
  key: string;
  title: string;
  subtitle: string;
  badge: string; // /public path
};

export const AWARDS: AwardDef[] = [
  {
    key: "shortest",
    title: "Shortest Drive",
    subtitle: "Who got out-driven by a 7-iron today?",
    badge: "/awards/Kiwi_ShortestDrive.png",
  },
  {
    key: "threeputt",
    title: "Three-Putt Champion",
    subtitle: "Whose putter completely betrayed them?",
    badge: "/awards/Loon_ThreePutt.png",
  },
  {
    key: "sandman",
    title: "Sandman",
    subtitle: "Who spent the day living in the bunkers?",
    badge: "/awards/Ostrich_Sandman.png",
  },
  {
    key: "firstbeer",
    title: "First Beer",
    subtitle: "Who cracked one open first today?",
    badge: "/awards/Toucan_FirstBeer.png",
  },
  {
    key: "sundial",
    title: "The Sundial",
    subtitle: "Longest time between shots - slowest player out there.",
    badge: "/awards/Vulture_Sundial.png",
  },
];

export const DEFAULT_AWARD_KEYS = AWARDS.map((a) => a.key);

export function awardsForKeys(keys: string[] | null | undefined): AwardDef[] {
  if (!keys || keys.length === 0) return AWARDS;
  const set = new Set(keys);
  return AWARDS.filter((a) => set.has(a.key));
}
