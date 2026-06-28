export type TeamId = "A" | "B";
export type Winner = TeamId | "T" | null;

export type Screen =
  | "overview"
  | "tournament"
  | "schedule"
  | "scoreboard"
  | "leaderboard"
  | "addScore"
  | "players"
  | "playerProfile"
  | "teams"
  | "teamDetail"
  | "matchCenter"
  | "matchDetail"
  | "rules"
  | "admin"
  | "more"
  | "clubhouse"
  | "courseDetail";

export type RoundFormat =
  | "best_ball"
  | "match_play"
  | "net_score"
  | "casual"
  | "scramble";

export type Trip = {
  id: string;
  name: string;
  location: string;
  dates: string;
  joinCode: string;
  seriesId: string | null;
  lodgingName: string;
  lodgingAddress: string;
  totalPoints: number;
  winningNumber: number;
  retainNumber: number;
  defendingTeam: TeamId | null;
  defaultFormat: string | null;
  rosterSize: number;
  isPro: boolean;
  wrappedAt?: string | null;
  headerBackground: string | null;
};

export type Team = {
  id: TeamId;
  name: string;
  color: "red" | "blue";
};

export type Player = {
  id: string;
  name: string;
  team: TeamId;
  handicapIndex: number;
  avatarEmoji?: string;
  accountId?: string;
  avatarId?: string; // chosen bird (from the account profile), shown everywhere
  frameId?: string | null; // equipped border ring
  nameplateId?: string | null; // equipped nameplate
};

export type Course = {
  id: string;
  name: string;
  location: string;
  address: string;
  par: number;
  rating: number;
  slope: number;
  teeName: string;
  yardage: number | null;
  imageUrl: string;
  notes: string;
};

export type TeeTime = {
  id: string;
  time: string;
  players: string[];
};

export type Round = {
  id: string;
  roundNumber: number;
  title: string;
  dateLabel: string;
  courseId: string;
  format: RoundFormat;
  groupSize: number | null;
  pointsAvailable: number;
  arrivalTime: string;
  teeTimes: TeeTime[];
  roundDate?: string | null; // scheduled calendar date (yyyy-mm-dd)
  startedAt?: string | null; // owner opened the round (gates scoring)
  finishedAt?: string | null; // owner finished the round (concludes voting)
  firstScoreAt?: string | null; // first score logged (drives 7h voting close)
};

export type ManualMatchResult = Winner;

export type Match = {
  id: string;
  roundId: string;
  label: string;
  aPlayers: string[];
  bPlayers: string[];
  points: number;
  manualResult?: ManualMatchResult;
};

export type GroupScore = {
  matchId: string;
  side: "A" | "B";
  frontNineScore?: number;
  grossScore?: number;
};

export type ScoreEntry = {
  roundId: string;
  playerId: string;
  frontNineScore?: number;
  grossScore?: number;
};

export type ScoringSettings = {
  bestBallHandicapAllowance: number;
  singlesHandicapAllowance: number;
  netScoreHandicapAllowance: number;
  netScorePointsOverride?: number | null;
};

export type MatchResult = {
  status: "open" | "final";
  winner: Winner;
  label: string;
  aNet?: number;
  bNet?: number;
  waitingOn: string[];
  isManual?: boolean;
};

export type LeaderboardRow = {
  player: Player;
  roundsPlayed: number;
  pointsWon: number;
  totalNetToPar: number;
  averageNetToPar: number | null;
};

export type TeamSummary = {
  teamId: TeamId;
  teamName: string;
  playerCount: number;
  averageHandicap: number;
  totalHandicap: number;
  points: number;
  completedMatches: number;
};

export type Vote = {
  roundId: string;
  awardKey: string;
  voterAccount: string;
  nomineePlayer: string;
};

export type TripState = {
  trip: Trip;
  teams: Team[];
  players: Player[];
  courses: Course[];
  rounds: Round[];
  matches: Match[];
  scores: ScoreEntry[];
  groupScores: GroupScore[];
  scoringSettings: ScoringSettings;
  currentRoundId: string;
  votingEnabled: boolean; // owner/admin toggle (effective only on Pro trips)
  votes: Vote[];
  seenRounds: string[]; // round ids whose results this user has already seen
};
export type TripPhoto = {
  id: string;
  tripId: string;
  userId: string;
  storagePath: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
};

export type TripMessage = {
  id: string;
  tripId: string;
  userId: string;
  body: string;
  createdAt: string;
};

export type TripMessageReaction = {
  messageId: string;
  userId: string;
  emoji: string;
};

export type PhotoReaction = {
  photoId: string;
  userId: string;
  emoji: string;
};

export type PhotoComment = {
  id: string;
  photoId: string;
  userId: string;
  body: string;
  createdAt: string;
};
