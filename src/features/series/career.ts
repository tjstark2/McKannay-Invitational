// Career records across a series of trips.
//
// People are matched on their ACCOUNT, not their player row - a player row
// belongs to one trip, so Wade in 2026 and Wade in 2027 are different rows but
// the same person. Teams deliberately do not carry across: they are drawn
// fresh each year, so career records belong to people and team history belongs
// to trips.
//
// Pure functions, so the numbers that end up on the wall can be tested.

export type CareerTrip = {
  id: string;
  name: string;
  sequence: number;
  /** Points each side finished on, as recorded at the time. */
  finalA: number | null;
  finalB: number | null;
  /** "A", "B", or null for a tie or an unfinished trip. */
  winner: string | null;
  completedAt: string | null;
};

export type CareerPlayer = {
  id: string;
  tripId: string;
  accountId: string | null;
  name: string;
  team: string | null;
};

export type CareerMatch = {
  id: string;
  tripId: string;
  points: number;
  /** "A", "B", "T", or null if it never resolved. */
  result: string | null;
  aPlayers: string[];
  bPlayers: string[];
};

export type CareerRow = {
  accountId: string;
  name: string;
  trips: number;
  matches: number;
  won: number;
  lost: number;
  halved: number;
  /** Match points this person was on the winning side of. */
  points: number;
  /** Their best 18-hole gross across the whole series. */
  bestGross: number | null;
  /** Trips where their team won outright. */
  trophies: number;
};

/**
 * One row per person, across every trip in the series.
 *
 * Points are match points only - a round scored on net across the field, like
 * the 2026 Saturday, awards points to the TEAM rather than through a match, so
 * they cannot be attributed to an individual. The trip's final score is stored
 * separately and is the authority on who won.
 */
export function buildCareerTable(input: {
  trips: CareerTrip[];
  players: CareerPlayer[];
  matches: CareerMatch[];
  /** Gross scores, for the best round. */
  scores: { tripId: string; playerId: string; gross: number | null }[];
}): CareerRow[] {
  const { trips, players, matches, scores } = input;

  // A player row belongs to one trip; an account spans them all.
  const accountOf = new Map<string, string>();
  const rows = new Map<string, CareerRow>();
  const seenTrips = new Map<string, Set<string>>();

  for (const p of players) {
    if (!p.accountId) continue; // a placeholder player with no account
    accountOf.set(p.id, p.accountId);
    const row = rows.get(p.accountId) ?? {
      accountId: p.accountId,
      name: p.name,
      trips: 0,
      matches: 0,
      won: 0,
      lost: 0,
      halved: 0,
      points: 0,
      bestGross: null,
      trophies: 0,
    };
    row.name = p.name; // most recent name wins
    rows.set(p.accountId, row);

    const trips_ = seenTrips.get(p.accountId) ?? new Set<string>();
    trips_.add(p.tripId);
    seenTrips.set(p.accountId, trips_);

    // A trophy is the trip's stored result, not something re-derived.
    const trip = trips.find((t) => t.id === p.tripId);
    if (trip?.winner && p.team && trip.winner === p.team) row.trophies += 1;
  }

  for (const [accountId, set] of seenTrips) {
    const row = rows.get(accountId);
    if (row) row.trips = set.size;
  }

  for (const m of matches) {
    if (!m.result) continue; // never resolved - counts for nobody
    for (const side of ["A", "B"] as const) {
      const ids = side === "A" ? m.aPlayers : m.bPlayers;
      for (const pid of ids) {
        const acc = accountOf.get(pid);
        const row = acc ? rows.get(acc) : null;
        if (!row) continue;
        row.matches += 1;
        if (m.result === "T") {
          row.halved += 1;
          row.points += m.points / 2;
        } else if (m.result === side) {
          row.won += 1;
          row.points += m.points;
        } else {
          row.lost += 1;
        }
      }
    }
  }

  for (const s of scores) {
    if (s.gross == null) continue;
    const acc = accountOf.get(s.playerId);
    const row = acc ? rows.get(acc) : null;
    if (!row) continue;
    if (row.bestGross == null || s.gross < row.bestGross) row.bestGross = s.gross;
  }

  return [...rows.values()].sort(
    (a, b) => b.points - a.points || b.won - a.won || a.name.localeCompare(b.name)
  );
}

export type HeadToHead = {
  /** Wins for the first person named. */
  wins: number;
  losses: number;
  halved: number;
  /** Every meeting, newest trip first. */
  meetings: { tripId: string; matchId: string; result: "win" | "loss" | "halved" }[];
};

/**
 * How two people have fared against each other across the whole series.
 * Only counts matches where they were on OPPOSITE sides - being partners is
 * not a meeting.
 */
export function headToHead(
  accountA: string,
  accountB: string,
  input: { players: CareerPlayer[]; matches: CareerMatch[] }
): HeadToHead {
  const accountOf = new Map(input.players.filter((p) => p.accountId).map((p) => [p.id, p.accountId!]));
  const out: HeadToHead = { wins: 0, losses: 0, halved: 0, meetings: [] };

  for (const m of input.matches) {
    if (!m.result) continue;
    const accs = (ids: string[]) => ids.map((id) => accountOf.get(id)).filter(Boolean) as string[];
    const a = accs(m.aPlayers);
    const b = accs(m.bPlayers);

    let side: "A" | "B" | null = null;
    if (a.includes(accountA) && b.includes(accountB)) side = "A";
    else if (b.includes(accountA) && a.includes(accountB)) side = "B";
    if (!side) continue;

    const result = m.result === "T" ? "halved" : m.result === side ? "win" : "loss";
    if (result === "win") out.wins += 1;
    else if (result === "loss") out.losses += 1;
    else out.halved += 1;
    out.meetings.push({ tripId: m.tripId, matchId: m.id, result });
  }
  return out;
}

/** "Team Dietz won 9-6" - straight from what was recorded at the time. */
export function tripResultLine(
  trip: CareerTrip,
  teamName: (code: string) => string
): string {
  if (trip.finalA == null || trip.finalB == null) return "Not finished";
  const a = trip.finalA;
  const b = trip.finalB;
  if (!trip.winner) return `Tied ${a} - ${b}`;
  const winner = trip.winner === "A" ? a : b;
  const loser = trip.winner === "A" ? b : a;
  return `${teamName(trip.winner)} won ${winner} - ${loser}`;
}
