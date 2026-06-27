// Nameplate title text per avatar, keyed by the avatar's class (which is unique
// per bird). Falls back to the class name itself if a tagline is missing.
export const AVATAR_TAGLINES: Record<string, string> = {
  // Free
  Tactician: "Reads the green and your weaknesses",
  Instigator: "In your head before the first tee",
  Captain: "Owns the group chat and the spreadsheet",
  Sharpshooter: "Aims at the pin, not the green",
  Anchor: "Never spectacular, never a disaster",
  Grinder: "Last one off the range every night",
  Underdog: "Don't let the size fool you",
  "Party Animal": "Two beers up before the turn",
  Rookie: "Three mulligans and a great attitude",
  "The Mark": "Bring your wallet, leave it with me",
  Bogeyman: "Somehow always one over",
  "The Shank": "One bad swing from disaster",
  // Premium
  Champion: "Already cleared shelf space for the trophy",
  Predator: "Plays every hole like it owes him money",
  Closer: "Give me the putter, I've got this",
  Showman: "More headcovers than handicap",
  Hustler: "The real game starts on the first tee",
  Sandbagger: "Handicap's higher than his game",
  Veteran: "Beating you since before you were born",
  Scratch: "Plays to a zero, crows about it",
  // Legendary
  Legend: "Once in a lifetime, every single round",
  Mythic: "Statistically impossible, does it anyway",
  Ace: "Tee to cup, once, unforgettable",
  // Founder
  Founder: "Original TourneyBirdie mascot",
  // Seasonal
  Frostbite: "Plays right through the frost delay",
  "Hat Trick": "Three birdies in a row, baby",
  "Saint Nicklaus": "Sleighing it on the back nine",
  "The Haunt": "Sinks putts from six feet under",
  Sweetheart: "Playing for the heart of the green",
  Lucky: "Top o' the morning - fore!",
};

export function taglineForClass(klass?: string | null): string | null {
  if (!klass) return null;
  return AVATAR_TAGLINES[klass] ?? klass;
}
