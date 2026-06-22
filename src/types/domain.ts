export type TeamId = "A" | "B";
export type Winner = TeamId | "T" | null;

export type Screen =
  | "overview"
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
  | "courseDetail";

export type RoundFormat = "best_ball" | "match_play" | "net_score" | "casual";

export type Trip = {
  id: string;
  name: string;
  location: string;
  dates: string;
  joinCode: string;
  lodgingName: string;
  lodgingAddress: string;
  totalPoints: number;
  winningNumber: number;
  retainNumber: number;
  defendingTeam: TeamId | null;
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
};

export type Course = {
  id: string;
  name: string;
  location: string;
  address: string;
  par: number;
  rating: number;
  slope: number;
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
  pointsAvailable: number;
  arrivalTime: string;
  teeTimes: TeeTime[];
};

export type Match = {
  id: string;
  roundId: string;
  label: string;
  aPlayers: string[];
  bPlayers: string[];
  points: number;
};

export type ScoreEntry = {
  roundId: string;
  playerId: string;
  grossScore: number;
};

export type MatchResult = {
  status: "open" | "final";
  winner: Winner;
  label: string;
  aNet?: number;
  bNet?: number;
  waitingOn: string[];
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

export type TripState = {
  trip: Trip;
  teams: Team[];
  players: Player[];
  courses: Course[];
  rounds: Round[];
  matches: Match[];
  scores: ScoreEntry[];
};
