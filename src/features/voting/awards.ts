// Every award the app has ever shown, keyed by what is stored in
// round_votes.award_key (voted) or round_awards.moment_id (proven by scores).
//
// The BALLOT is what the group votes on today: only things the scores can't
// see. Everything the scores CAN see (snowmen, comebacks, sandbaggers) is
// awarded outright by the awards engine and never voted on.
//
// Shortest Drive, Three-Putt and Sandman are kept here only so older trips'
// Wrapped still shows them. They are no longer on the ballot.

export type AwardDef = {
  key: string;
  title: string;
  subtitle: string;
  /** /public path, or null for awards drawn with an emoji. */
  badge: string | null;
  emoji: string;
};

export const AWARDS: AwardDef[] = [
  { key: "shot_of_the_day", title: "Shot of the Day", subtitle: "Shot of the day - who earned it?", badge: null, emoji: "🎯" },
  { key: "worst_decision", title: "Dumbest Decision", subtitle: "Dumbest decision on the course today?", badge: null, emoji: "🤦" },
  { key: "firstbeer", title: "First Beer", subtitle: "Who cracked one open first today?", badge: "/awards/Toucan_FirstBeer.png", emoji: "🍺" },
  { key: "sundial", title: "The Sundial", subtitle: "Slowest player out there?", badge: "/awards/Vulture_Sundial.png", emoji: "🐢" },
  // Retired from the ballot - older trips only.
  { key: "shortest", title: "Shortest Drive", subtitle: "Who got out-driven by a 7-iron today?", badge: "/awards/Kiwi_ShortestDrive.png", emoji: "🥝" },
  { key: "threeputt", title: "Three-Putt Champion", subtitle: "Whose putter completely betrayed them?", badge: "/awards/Loon_ThreePutt.png", emoji: "🕳️" },
  { key: "sandman", title: "Sandman", subtitle: "Who spent the day living in the bunkers?", badge: "/awards/Ostrich_Sandman.png", emoji: "🏖️" },
];

/** What the group votes on, in order. Must match the voteable moments. */
export const BALLOT_KEYS = ["shot_of_the_day", "worst_decision", "firstbeer", "sundial"];
export const BALLOT: AwardDef[] = BALLOT_KEYS.map((k) => AWARDS.find((a) => a.key === k)!);

export function awardDef(key: string): AwardDef | undefined {
  return AWARDS.find((a) => a.key === key);
}

/** Awards proven by the scores - an emoji each for the reveal. */
export const MOMENT_EMOJI: Record<string, string> = {
  medalist: "🏅",
  wooden_spoon: "🥄",
  santas_helper: "⛄",
  big_number: "💥",
  the_vanisher: "👻",
  par_train: "🚂",
  bogey_express: "🚆",
  bird_watcher: "🐦",
  free_square: "🎁",
  sandbagger: "💰",
  no_show: "🫥",
  mip: "📈",
  cinderella: "👠",
  escape_artist: "🪄",
  the_comeback: "🔥",
  the_closer: "🧊",
};
