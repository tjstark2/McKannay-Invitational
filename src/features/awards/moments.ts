// The moment inventory: every award the app can give, how it is spotted, and
// what it says - with different lines for different situations.
//
// A moment's line is chosen by context, most specific first:
//   1. repeat   - this person has won it before this trip (tier 2, tier 3+)
//   2. finale   - it is the last round of the trip
//   3. standing - their team is leading, trailing, level, or the trip is decided
//   4. band     - low, mid or high handicap: an attack, a jab, or affection
//   5. default
// Each variant holds several lines, so the same award does not repeat word for
// word across a trip. The AI rewrites the chosen line with personal context;
// if it is slow or fails, this line is shown as it stands.
//
// Tone: spunky and borderline - roast the golf, the handicap, the ego and the
// bar tab as hard as you like. Never someone's background, looks or anything
// personal. Lines are templates - {name}, {count} and so on
// are filled from the facts, never invented.

import type { MatchFacts, PlayerFacts } from "@/features/awards/detectors";

export type Standing = "leading" | "trailing" | "tied" | "decided";
export type Band = "low" | "mid" | "high";
export type Stage = "opener" | "middle" | "finale";

export type VariantKey =
  | "tier3" | "tier2" | "finale"
  | "leading" | "trailing" | "tied" | "decided"
  | "low" | "mid" | "high"
  | "default";

export type Candidate = {
  momentId: string;
  /** Who it is about. One person for most, a pair for some match moments. */
  playerIds: string[];
  /** How strong a story this is. Higher wins a place in the round's awards. */
  score: number;
  /** The proof, shown under the line. Always from the facts. */
  stat: string;
  /** Values for the line template. */
  vars: Record<string, string | number>;
};

export type RoundInputs = {
  players: PlayerFacts[];
  matches: MatchFacts[];
  /** Each player's net to par in their previous round this trip, if any. */
  previousNetToPar: Record<string, number>;
};

export type Moment = {
  id: string;
  title: string;
  /** Voted by the group rather than proven by the scores. */
  voteable?: boolean;
  /** The voting question, for voteable moments. */
  question?: string;
  detect?: (r: RoundInputs) => Candidate[];
  lines: Partial<Record<VariantKey, string[]>>;
};

const nameOf = (r: RoundInputs, id: string) => r.players.find((p) => p.playerId === id)?.name ?? "Someone";
const names = (r: RoundInputs, ids: string[]) => ids.map((id) => nameOf(r, id)).join(" and ");
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Best and worst of a list, by a number. */
function extreme<T>(items: T[], by: (t: T) => number, pick: "max" | "min"): T | null {
  if (items.length === 0) return null;
  return items.reduce((a, b) => ((pick === "max" ? by(b) > by(a) : by(b) < by(a)) ? b : a));
}

export const MOMENTS: Moment[] = [
  // ------------------------------------------------------------ the scorecard
  {
    id: "medalist",
    title: "Medalist",
    detect: (r) => {
      const best = extreme(r.players.filter((p) => p.holesPlayed >= 9), (p) => -p.netToPar, "max");
      if (!best) return [];
      return [{
        momentId: "medalist", playerIds: [best.playerId], score: 55 + Math.max(0, best.vsField) * 4,
        stat: `Net ${fmtPar(best.netToPar)}, best in the field`,
        vars: { name: best.name, net: fmtPar(best.netToPar) },
      }];
    },
    lines: {
      default: [
        "Low net of the day at {net}. {name} will be bringing this up at dinner. And breakfast. And your wedding.",
        "{name} shot {net} net and is already asking if anyone saw the drive on 7. We did. Please stop.",
        "Medalist: {name} at {net}. Somebody check that pencil for an eraser.",
        "{name} posted {net}. The rest of you got outplayed by someone who warmed up with a hot dog.",
      ],
      tier3: [
        "Third medalist of the trip. We're renaming the award 'The {name}' and throwing it in the pond.",
        "Three for three. {name} has stopped playing golf and started playing the handicap system.",
      ],
      tier2: [
        "{name}, medalist again. At this point it's not a trip, it's a residency.",
        "Back-to-back low nets for {name}. Nobody's buying their drinks anymore, purely out of spite.",
      ],
      finale: [
        "{name} saved the best for last - {net} on the final day. Enjoy the 11-month victory lap.",
      ],
      leading: [
        "{name} posts {net} and the lead gets bigger. The other side would like to see some ID.",
      ],
      trailing: [
        "{name} posts {net} with the team behind. Carrying the bag and the whole squad on their back.",
      ],
      low: [
        "{name} did exactly what a low handicap is supposed to do. Nobody's clapping, but it's been noted.",
        "Low man shoots low net. Thrilling stuff, {name}. Someone wake us up when it's interesting.",
      ],
      high: [
        "A high handicap taking low net at {net}. Either {name} found a swing overnight or the index needs an audit. We know which one.",
        "{name} plays off a number that says 'beginner' and a scorecard that says 'liar'.",
      ],
    },
  },
  {
    id: "wooden_spoon",
    title: "Wooden Spoon",
    detect: (r) => {
      const worst = extreme(r.players.filter((p) => p.holesPlayed >= 9), (p) => p.netToPar, "max");
      if (!worst || r.players.length < 3) return [];
      return [{
        momentId: "wooden_spoon", playerIds: [worst.playerId], score: 45 + Math.max(0, -worst.vsField) * 3,
        stat: `Net ${fmtPar(worst.netToPar)}, last in the field`,
        vars: { name: worst.name, net: fmtPar(worst.netToPar) },
      }];
    },
    lines: {
      default: [
        "Dead last at {net}. {name}, the course wants you to know it's not mad, just disappointed.",
        "{name} brought up the rear at {net}. The cart girl asked if they were okay. That's a first.",
        "Somebody had to finish last. {name} volunteered early and never looked back.",
        "{net}. {name} didn't play the course today so much as negotiate with it. And lose.",
      ],
      tier3: [
        "Third wooden spoon. {name} is now legally a cutlery drawer.",
        "Three last places. {name} isn't losing anymore, {name} is holding the floor up for everyone else.",
      ],
      tier2: [
        "Two wooden spoons for {name}. Not a collection yet. Give it a day.",
        "{name} finishes last again. Consistency is a skill - just not the one we were hoping for.",
      ],
      finale: [
        "{name} finishes the trip in last at {net}. A farewell tour nobody bought tickets to.",
      ],
      decided: [
        "Trip's already decided and {name} still found a way to come last. That's not losing, that's a lifestyle.",
      ],
      low: [
        "Last place from a low handicap. {name}, the strokes were for giving, not for using.",
        "A single-digit finishing dead last. {name}'s handicap is going to hear about this from its friends.",
      ],
      high: [
        "{name} took every shot on the card and still finished last. Generosity has limits, and so do we.",
      ],
    },
  },
  {
    id: "santas_helper",
    title: "Santa's Helper",
    detect: (r) => r.players
      .filter((p) => p.snowmen >= 2)
      .map((p) => ({
        momentId: "santas_helper", playerIds: [p.playerId], score: 50 + p.snowmen * 12,
        stat: `${p.snowmen} holes of 8 or worse`,
        vars: { name: p.name, count: p.snowmen },
      })),
    lines: {
      default: [
        "2, 4, 6, 8 - who do we appreciate? {name}, with {count} snowmen.",
        "{count} snowmen from {name}. It's not even cold out.",
        "{name} built {count} snowmen today. Frosty has filed a restraining order.",
        "{count} eights on the card. {name} wasn't playing golf, {name} was doing long division.",
      ],
      tier3: [
        "Three days of snowmen. Award retired. It's called 'The {name}' now. Frame it.",
      ],
      tier2: [
        "Another snowman day for {name}. The course should start charging them rent.",
        "{name} is back on the snowman build. Whole family now. Little scarves. Carrot noses.",
      ],
      finale: [
        "{name} closes the trip with {count} snowmen. Out the way they came in: sideways and in the trees.",
      ],
      low: [
        "{count} snowmen from a low handicap. {name}, blink twice if you need help.",
      ],
      high: [
        "{count} snowmen, but {name} gets shots for a reason. Still - eight is a choice.",
      ],
    },
  },
  {
    id: "big_number",
    title: "The Big Number",
    detect: (r) => r.players
      // Blowups the snowman doesn't already cover - a 7 on a par 3, say. One
      // bad hole shouldn't pay out twice.
      .filter((p) => p.worstHole && p.worstHole.overPar >= 4 && p.worstHole.strokes < 8)
      .map((p) => ({
        momentId: "big_number", playerIds: [p.playerId], score: 40 + p.worstHole!.overPar * 8,
        stat: `${p.worstHole!.strokes} on hole ${p.worstHole!.hole}`,
        vars: { name: p.name, strokes: p.worstHole!.strokes, hole: p.worstHole!.hole },
      })),
    lines: {
      default: [
        "{name} carded a {strokes} on {hole}. Somebody check on them. Gently. From a distance.",
        "A {strokes} on {hole}. {name} played that hole twice and lost both times.",
        "{strokes} on hole {hole}. That's not a score, {name}, that's a shoe size.",
        "Hole {hole} took {strokes} swings off {name} and gave back nothing but a story.",
      ],
      tier2: [
        "{name} found another big number. Hole-by-hole scoring was a mistake for some of us.",
        "Another crooked number from {name}. The app has started to flinch when they open it.",
      ],
      finale: [
        "A {strokes} on {hole} on the last day. {name} wanted a souvenir.",
      ],
      low: [
        "A {strokes} from a low handicap on {hole}. {name} will be thinking about that one in the shower. For years.",
      ],
      high: [
        "{name} put up a {strokes} on {hole}, but in fairness they did warn us on the first tee.",
      ],
    },
  },
  {
    id: "the_vanisher",
    title: "The Vanisher",
    detect: (r) => r.players
      .filter((p) => p.frontNine != null && p.backNine != null && p.backNine - p.frontNine >= 7)
      .map((p) => ({
        momentId: "the_vanisher", playerIds: [p.playerId], score: 45 + (p.backNine! - p.frontNine!) * 3,
        stat: `${p.frontNine} out, ${p.backNine} in`,
        vars: { name: p.name, front: p.frontNine!, back: p.backNine! },
      })),
    lines: {
      default: [
        "{front} out, {back} in. {name} was a real golfer for about two hours, then the beer cart showed up.",
        "{name} turned in {front} and came home in {back}. Front nine was the trailer, back nine went straight to DVD.",
        "Somewhere around the turn {name} left and a stranger finished the round. {front} out, {back} in.",
      ],
      tier2: [
        "{name} vanishes on the back nine again. Front-nine golfer, back-nine tourist.",
        "Two rounds, two disappearing acts. {name} should start charging admission at the turn.",
      ],
      finale: [
        "{name} had it going on the front and gave every bit of it back on the last nine of the trip. Poetic, really.",
      ],
      leading: [
        "{name} nearly gave the lead away single-handed on the back nine. {front} out, {back} in. Thanks for the heart attack.",
      ],
      trailing: [
        "{front} out, {back} in, with the team already behind. {name} found a hole and kept digging.",
      ],
    },
  },
  {
    id: "par_train",
    title: "Par Train",
    detect: (r) => r.players
      .filter((p) => p.parStreak >= 4)
      .map((p) => ({
        momentId: "par_train", playerIds: [p.playerId], score: 35 + p.parStreak * 6,
        stat: `${p.parStreak} holes in a row at par or better`,
        vars: { name: p.name, streak: p.parStreak },
      })),
    lines: {
      default: [
        "{streak} straight at par or better. {name} got in a groove and became genuinely unbearable.",
        "All aboard - {name} ran off {streak} in a row without a bogey. Choo choo, who knew.",
        "{streak} holes without a bogey. For a moment {name} became the golfer they describe at parties.",
      ],
      tier2: [
        "The Par Train rolls again for {name}. Next stop: a handicap revision.",
      ],
      trailing: [
        "{name} strung together {streak} pars with the team down. Finally, someone clocked in.",
      ],
      low: [
        "{streak} in a row at par or better. {name} remembered how to play golf. Took a few days.",
      ],
      high: [
        "{streak} straight pars from a high handicap. {name}, the handicap committee would like a word. In private.",
      ],
    },
  },
  {
    id: "bogey_express",
    title: "Bogey Express",
    detect: (r) => r.players
      .filter((p) => p.doubleStreak >= 3)
      .map((p) => ({
        momentId: "bogey_express", playerIds: [p.playerId], score: 38 + p.doubleStreak * 7,
        stat: `${p.doubleStreak} doubles or worse in a row`,
        vars: { name: p.name, streak: p.doubleStreak },
      })),
    lines: {
      default: [
        "{streak} doubles or worse back to back. {name}'s round left the station and drove into a lake.",
        "{name} went {streak} straight holes at double or worse. A total collapse, beautifully executed.",
        "{streak} in a row at double or worse. At some point {name} stopped playing golf and started surviving it.",
      ],
      tier2: [
        "{name} is back on the express. Same stops, same destination, same thousand-yard stare.",
      ],
      finale: [
        "{name} rode the Bogey Express right into the end of the trip. No brakes, no survivors.",
      ],
      low: [
        "{streak} doubles in a row from a low handicap. {name} is going to need a minute. And a drink. Make it two.",
      ],
      high: [
        "{streak} doubles in a row. {name} gets shots, but nobody gets that many shots.",
      ],
    },
  },
  {
    id: "bird_watcher",
    title: "Bird Watcher",
    detect: (r) => r.players
      .filter((p) => p.birdies + p.eagles * 2 >= 3)
      .map((p) => ({
        momentId: "bird_watcher", playerIds: [p.playerId], score: 40 + p.birdies * 6 + p.eagles * 15,
        stat: p.eagles ? `${p.eagles} ${plural(p.eagles, "eagle", "eagles")}, ${p.birdies} ${plural(p.birdies, "birdie", "birdies")}` : `${p.birdies} birdies`,
        vars: { name: p.name, count: p.birdies + p.eagles, eagles: p.eagles },
      })),
    lines: {
      default: [
        "{count} birds for {name}. The rest of you can start clapping now.",
        "{name} went bird hunting and came back with {count}. Wildlife services has questions.",
        "{count} birds. {name} is going to be unbearable at dinner and, annoyingly, has earned it.",
      ],
      tier2: [
        "Bird Watcher again for {name}. Somebody check the bag for a falcon.",
      ],
      finale: [
        "{name} signs off the trip with {count} birds. Leave them wanting more. Or less, if you're the other team.",
      ],
      low: [
        "{count} birds. {name} finally playing to the number they keep bringing up uninvited.",
      ],
      high: [
        "{count} birds from a high handicap. {name}, please explain. Slowly. To the committee.",
      ],
    },
  },
  {
    id: "free_square",
    title: "Free Square",
    detect: (r) => r.players
      .filter((p) => p.wastedShots >= 2)
      .map((p) => ({
        momentId: "free_square", playerIds: [p.playerId], score: 32 + p.wastedShots * 7,
        stat: `${p.wastedShots} holes with a shot and still double or worse`,
        vars: { name: p.name, count: p.wastedShots },
      })),
    lines: {
      default: [
        "{name} got a shot on {count} holes and still made double. Bold strategy. It did not pay off.",
        "Handed a free stroke {count} times, {name} gave every one back with interest. Very generous. Very bad.",
        "{name} treats a handicap stroke like a gift card they forgot in a drawer. {count} wasted.",
      ],
      tier2: [
        "{name} wasting free shots again. We're cutting off the allowance.",
      ],
      high: [
        "{name} receives more shots than anyone and still found a way to waste {count} of them. Impressive, in the wrong direction.",
      ],
    },
  },

  // ------------------------------------------------------- against the number
  {
    id: "sandbagger",
    title: "Sandbagger",
    detect: (r) => r.players
      .filter((p) => p.vsField >= 5)
      .map((p) => ({
        momentId: "sandbagger", playerIds: [p.playerId], score: 50 + p.vsField * 5,
        stat: `${p.vsField} shots better than the field`,
        vars: { name: p.name, vs: p.vsField },
      })),
    lines: {
      default: [
        "{name} beat the field by {vs} shots. Somebody frisk the bag for a fake handicap card.",
        "{vs} shots clear of everyone, net. {name}'s handicap is a work of fiction and should be shelved as such.",
        "{name}, {vs} under the field. Funny how the swing shows up right when there's money on it.",
      ],
      tier3: [
        "Three sandbag jobs. {name}'s handicap is now under federal investigation.",
      ],
      tier2: [
        "{name} has done it again. Formal complaint filed. The committee is 'looking into it'.",
      ],
      finale: [
        "Last round, {vs} shots clear. {name} waited until the very end to stop pretending.",
      ],
      leading: [
        "{name} sandbagging the team further into the lead. Disgusting. Brilliant. Mostly disgusting.",
      ],
      trailing: [
        "{name} beat the field by {vs} with the team behind. Where was this yesterday?",
      ],
      high: [
        "A high handicap {vs} shots clear of the field. {name}, this is why nobody trusts you with a pencil.",
      ],
    },
  },
  {
    id: "no_show",
    title: "No-Show",
    detect: (r) => r.players
      .filter((p) => p.vsField <= -10)
      .map((p) => ({
        momentId: "no_show", playerIds: [p.playerId], score: 45 + -p.vsField * 3,
        stat: `${-p.vsField} shots worse than the field`,
        vars: { name: p.name, vs: -p.vsField },
      })),
    lines: {
      default: [
        "{name} finished {vs} shots behind the field, net. The clubs showed up. Unclear about {name}.",
        "{vs} shots off the pace. {name} was physically present and that's about all we can confirm.",
        "{name} lost to the field by {vs}. Even the handicap couldn't save them, and it really tried.",
      ],
      finale: [
        "{name} finishes the trip {vs} shots behind the field. Saving it all for next year, apparently.",
      ],
      trailing: [
        "Team's behind and {name} posts this. No pressure next round. Just all of it.",
      ],
      low: [
        "{vs} shots behind from a low handicap. {name} left their game in the car park. Possibly another state.",
      ],
      high: [
        "{vs} behind the field with a fistful of shots. {name}, the strokes are supposed to help.",
      ],
    },
  },
  {
    id: "mip",
    title: "Most Improved",
    detect: (r) => r.players
      .filter((p) => r.previousNetToPar[p.playerId] != null && r.previousNetToPar[p.playerId] - p.netToPar >= 5)
      .map((p) => {
        const gain = r.previousNetToPar[p.playerId] - p.netToPar;
        return {
          momentId: "mip", playerIds: [p.playerId], score: 45 + gain * 4,
          stat: `${gain} shots better than last round`,
          vars: { name: p.name, gain, before: fmtPar(r.previousNetToPar[p.playerId]), after: fmtPar(p.netToPar) },
        };
      }),
    lines: {
      default: [
        "Most improved. {name} went from {before} to {after} overnight. Either a lesson or a lot of electrolytes.",
        "{gain} shots better than last round. {name} either found a swing or finally went to bed.",
        "{before} last time, {after} this time. {name} is either fixed or lying about something.",
      ],
      finale: [
        "{name} saved the best round for last - {gain} shots better than the one before. Shame it took the whole trip.",
      ],
      trailing: [
        "{name} bounced back {gain} shots with the team behind. The comeback starts here. Allegedly.",
      ],
    },
  },

  // ---------------------------------------------------------------- the match
  {
    id: "cinderella",
    title: "Cinderella",
    detect: (r) => r.matches
      .filter((m) => m.underdog && m.winner === m.underdog && m.strokesGiven >= 6)
      .map((m) => {
        const dogs = m.underdog === "A" ? m.aPlayers : m.bPlayers;
        const favs = m.underdog === "A" ? m.bPlayers : m.aPlayers;
        return {
          momentId: "cinderella", playerIds: dogs, score: 60 + m.strokesGiven * 2 + m.margin * 4,
          stat: `Won by ${m.margin}, receiving ${m.strokesGiven} shots`,
          vars: { name: names(r, dogs), opponent: names(r, favs), shots: m.strokesGiven, margin: m.margin },
        };
      }),
    lines: {
      default: [
        "{name} took {shots} shots and barely needed them. {opponent} has some explaining to do, preferably in writing.",
        "{opponent} gave {name} {shots} shots and got rolled by {margin}. Cinderella story. Glass slipper, rental clubs.",
        "A win by {margin} for {name}. {opponent} will tell you it was the handicaps. It was not the handicaps.",
      ],
      tier2: [
        "{name} pulls off another upset. At what point do we stop calling it an upset and start calling it a pattern?",
      ],
      finale: [
        "Last day, and {name} takes down {opponent} by {margin}. The clock struck midnight on somebody, and it wasn't Cinderella.",
      ],
      trailing: [
        "{name} took down {opponent} with the team behind. That's not a win, that's a statement.",
      ],
      decided: [
        "Trip's decided, but {name} still made sure {opponent} drives home in silence.",
      ],
    },
  },
  {
    id: "escape_artist",
    title: "Escape Artist",
    detect: (r) => r.matches
      .filter((m) => m.underdog && m.winner !== "T" && m.winner !== m.underdog && m.margin <= 2 && m.strokesGiven >= 8)
      .map((m) => {
        const favs = m.winner === "A" ? m.aPlayers : m.bPlayers;
        const dogs = m.winner === "A" ? m.bPlayers : m.aPlayers;
        return {
          momentId: "escape_artist", playerIds: favs, score: 50 + m.strokesGiven * 2,
          stat: `Won by ${m.margin}, giving ${m.strokesGiven} shots`,
          vars: { name: names(r, favs), opponent: names(r, dogs), shots: m.strokesGiven, margin: m.margin },
        };
      }),
    lines: {
      default: [
        "Gave {opponent} {shots} shots and only won by {margin}. {name}, that was sweatier than a July tee time.",
        "{name} barely pulled it out despite the premium handicap treatment. Better lucky than good. Much, much luckier.",
        "{shots} shots handed over and {name} still only scraped home by {margin}. Houdini with a bad short game.",
      ],
      tier2: [
        "{name} escapes again. Nine lives, short game of a raccoon.",
      ],
      finale: [
        "Last match of the trip and {name} nearly coughed it up to {opponent}. Won by {margin}. Survived, technically.",
      ],
      low: [
        "A low handicap nearly losing to {opponent} with {shots} shots in hand. {name}, that's how rumours start.",
      ],
    },
  },
  {
    id: "the_comeback",
    title: "The Comeback",
    detect: (r) => r.matches
      .filter((m) => m.winner !== "T" && m.comeback >= 3)
      .map((m) => {
        const won = m.winner === "A" ? m.aPlayers : m.bPlayers;
        const lost = m.winner === "A" ? m.bPlayers : m.aPlayers;
        return {
          momentId: "the_comeback", playerIds: won, score: 55 + m.comeback * 8,
          stat: `Came back from ${m.comeback} down`,
          vars: { name: names(r, won), opponent: names(r, lost), down: m.comeback },
        };
      }),
    lines: {
      default: [
        "{down} down and dead and buried. {name} came back and took it off {opponent} anyway. Rude.",
        "{name} was {down} down and simply did not care. {opponent} will be unpacking this in therapy.",
        "{opponent} had it {down} up and started celebrating. Never celebrate early. Never.",
      ],
      tier2: [
        "Another comeback for {name}. Next time just spot everyone {down} holes on the first tee and save us the drama.",
      ],
      finale: [
        "A {down}-down comeback on the last day. {name} wrote the ending, and {opponent} has to reread it every year.",
      ],
      trailing: [
        "{name} came back from {down} down with the team behind. Momentum is real and it's furious.",
      ],
    },
  },
  {
    id: "the_closer",
    title: "The Closer",
    detect: (r) => r.matches
      .filter((m) => m.winner !== "T" && m.decidedOn != null && m.decidedOn >= 17 && m.margin <= 2)
      .map((m) => {
        const won = m.winner === "A" ? m.aPlayers : m.bPlayers;
        const lost = m.winner === "A" ? m.bPlayers : m.aPlayers;
        return {
          momentId: "the_closer", playerIds: won, score: 48 + (m.decidedOn === 18 ? 12 : 6),
          stat: `Took the lead for good on hole ${m.decidedOn}`,
          vars: { name: names(r, won), opponent: names(r, lost), hole: m.decidedOn! },
        };
      }),
    lines: {
      default: [
        "Tied going late, and {name} took it on {hole}. Ice in the veins, beer in the cupholder.",
        "{name} saved it for hole {hole}. {opponent} never saw it coming and still doesn't want to talk about it.",
        "Decided on {hole}. {name} closed like a bartender at 2am: no mercy, no last call for {opponent}.",
      ],
      finale: [
        "Decided on {hole} of the last round. {name}, that's how you end a trip.",
      ],
      trailing: [
        "Team's behind and {name} grinds it out on {hole}. That one counts double in the group chat.",
      ],
      tied: [
        "Everything level and {name} closes it on {hole}. Big-time player, big-time hole.",
      ],
    },
  },

  // ------------------------------------------------------------- voted
  {
    id: "shot_of_the_day",
    title: "Shot of the Day",
    voteable: true,
    question: "Shot of the day - who earned it?",
    lines: {
      default: [
        "The group has spoken: {name} had the shot of the day. Nobody will ever hear the end of it.",
        "Shot of the day goes to {name}. Already retold four times. It'll be a hole-in-one by Christmas.",
      ],
    },
  },
  {
    id: "worst_decision",
    title: "Worst Decision",
    voteable: true,
    question: "Dumbest decision on the course today?",
    lines: {
      default: [
        "Voted dumbest decision of the day: {name}. Nobody's letting this go. Ever.",
        "{name} wins worst decision by popular vote. The people have spoken, and the people were laughing.",
      ],
    },
  },
];

/** Net to par the way a golfer writes it. */
export function fmtPar(n: number): string {
  return n === 0 ? "E" : n > 0 ? `+${n}` : `${n}`;
}

export type LineContext = {
  tier: number;
  standing: Standing;
  band: Band;
  stage: Stage;
};

export function bandFor(handicapIndex: number): Band {
  return handicapIndex < 8 ? "low" : handicapIndex > 20 ? "high" : "mid";
}

/** The most specific variant this moment has for the situation. */
export function variantFor(moment: Moment, ctx: LineContext): VariantKey {
  const has = (k: VariantKey) => (moment.lines[k]?.length ?? 0) > 0;
  const order: VariantKey[] = [];
  if (ctx.tier >= 3) order.push("tier3", "tier2");
  else if (ctx.tier === 2) order.push("tier2");
  if (ctx.stage === "finale") order.push("finale");
  order.push(ctx.standing, ctx.band, "default");
  return order.find(has) ?? "default";
}

/** Fill a template from the facts. Any placeholder without a value is left out. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ""));
}

/**
 * The line for a moment in a situation. `seed` picks between the variant's
 * lines so the same award reads differently across a trip, but the same
 * round always gets the same line - which keeps it stable on refresh.
 */
export function lineFor(moment: Moment, ctx: LineContext, vars: Record<string, string | number>, seed: string): string {
  const key = variantFor(moment, ctx);
  const options = moment.lines[key] ?? moment.lines.default ?? [""];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return fill(options[h % options.length], vars);
}
