// What Pro unlocks - the ONE list. It was written out separately in four
// places (create intro, create finish, the upgrade screen, Settings), and they
// had drifted: placeholder bullets, and awards described as "vote for
// Three-Putt king" long after the awards were rebuilt.
//
// `headline` marks the few that lead every short pitch.

export type ProFeature = { title: string; detail: string; emoji: string; headline?: boolean };

export const PRO_FEATURES: ProFeature[] = [
  { emoji: "⛳", title: "Hole-by-hole live scoring", detail: "Every score as it happens, with a live leaderboard the whole group watches.", headline: true },
  { emoji: "🏅", title: "Awards after every round", detail: "The scores hand out the roasts - snowmen, sandbaggers, comebacks - and the group votes on the rest.", headline: true },
  { emoji: "🎬", title: "Trip Wrapped and the champion moment", detail: "A full-screen finish for the winning side, then a shareable recap of the trip.", headline: true },
  { emoji: "💬", title: "The Clubhouse", detail: "A live feed of every birdie and blow-up, plus group chat and photos.", headline: true },
  { emoji: "🖼️", title: "Custom backgrounds", detail: "Your own course photos behind each round.", headline: true },
  { emoji: "🎯", title: "Real stroke play", detail: "Strokes given on the right holes off each course's handicap index, with per-round allowances." },
  { emoji: "📶", title: "Scoring that works with no signal", detail: "Scores save on the phone and sync themselves when the signal comes back." },
  { emoji: "🎰", title: "Matchup draws", detail: "Slot machine, hat draw, spinning wheel, captain's draft and handicap auto-balance." },
  { emoji: "🪙", title: "Captain's Draft for teams", detail: "Coin toss, then the captains take turns picking the whole roster." },
  { emoji: "⚖️", title: "Balanced tee-time groups", detail: "Field rounds split into groups that mix low and high handicaps evenly." },
  { emoji: "⛄", title: "Callouts and the snowman", detail: "Birdies, eagles and blow-ups posted as they happen - an 8 puts a snowman on your avatar until you play it off." },
  { emoji: "📜", title: "House rules", detail: "Settle gimmes, mulligans and breakfast balls before the first tee." },
  { emoji: "🔔", title: "Push notifications", detail: "Tee times, matchups and live drama, each player choosing what they get." },
];

export const PRO_HEADLINES = PRO_FEATURES.filter((f) => f.headline);
