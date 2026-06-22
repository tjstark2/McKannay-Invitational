import type { Course, Match, Player, Round, ScoreEntry, Team, Trip, TripState } from "@/types";

export const initialTrip: Trip = {
  id: "mckannay-2026",
  name: "2nd Annual McKannay Invitational",
  location: "Hilton Head, SC",
  dates: "Sept 9–13",
  joinCode: "MCK2026",
  lodgingName: "Sea Pines Resort",
  lodgingAddress: "Hilton Head Island, South Carolina",
  totalPoints: 18,
  winningNumber: 9.5,
  retainNumber: 9,
  defendingTeam: null
};

export const initialTeams: Team[] = [
  { id: "A", name: "Team North", color: "red" },
  { id: "B", name: "Team South", color: "blue" }
];

export const initialPlayers: Player[] = [
  { id: "A1", name: "Alex Carter", team: "A", handicapIndex: 6, avatarEmoji: "🏌️" },
  { id: "A2", name: "Ben Murphy", team: "A", handicapIndex: 9, avatarEmoji: "⛳" },
  { id: "A3", name: "Chris Walker", team: "A", handicapIndex: 12, avatarEmoji: "🔥" },
  { id: "A4", name: "David Reed", team: "A", handicapIndex: 15, avatarEmoji: "🎯" },
  { id: "A5", name: "Ethan Brooks", team: "A", handicapIndex: 18, avatarEmoji: "🌴" },
  { id: "A6", name: "Frank Sullivan", team: "A", handicapIndex: 21, avatarEmoji: "🌊" },
  { id: "B1", name: "Ryan Cooper", team: "B", handicapIndex: 7, avatarEmoji: "🏌️" },
  { id: "B2", name: "Matt Lewis", team: "B", handicapIndex: 10, avatarEmoji: "⛳" },
  { id: "B3", name: "Tyler James", team: "B", handicapIndex: 13, avatarEmoji: "🔥" },
  { id: "B4", name: "Nick Parker", team: "B", handicapIndex: 16, avatarEmoji: "🎯" },
  { id: "B5", name: "Jake Wilson", team: "B", handicapIndex: 19, avatarEmoji: "🌴" },
  { id: "B6", name: "Luke Bennett", team: "B", handicapIndex: 22, avatarEmoji: "🌊" }
];

export const initialCourses: Course[] = [
  {
    id: "atlantic-dunes",
    name: "Atlantic Dunes",
    location: "Sea Pines Resort",
    address: "Hilton Head Island, SC",
    par: 72,
    rating: 72,
    slope: 130,
    imageUrl: "/images/atlantic-dunes.jpg",
    notes: "Round 1 course for 2v2 Best Ball."
  },
  {
    id: "harbour-town",
    name: "Harbour Town Golf Links",
    location: "Sea Pines Resort",
    address: "Hilton Head Island, SC",
    par: 71,
    rating: 71.4,
    slope: 136,
    imageUrl: "/images/harbour-town.jpg",
    notes: "Round 2 course for 1v1 Match Play."
  },
  {
    id: "heron-point",
    name: "Heron Point",
    location: "Sea Pines Resort",
    address: "Hilton Head Island, SC",
    par: 72,
    rating: 71.2,
    slope: 132,
    imageUrl: "/images/heron-point.jpg",
    notes: "Round 3 course for Individual Net Score."
  }
];

export const initialRounds: Round[] = [
  {
    id: "round-1",
    roundNumber: 1,
    title: "Match 1",
    dateLabel: "Sept 10",
    courseId: "atlantic-dunes",
    format: "best_ball",
    pointsAvailable: 6,
    arrivalTime: "7:15 AM",
    teeTimes: [
      { id: "r1t1", time: "8:00 AM", players: ["A1", "A2", "B1", "B2"] },
      { id: "r1t2", time: "8:10 AM", players: ["A3", "A4", "B3", "B4"] },
      { id: "r1t3", time: "8:20 AM", players: ["A5", "A6", "B5", "B6"] }
    ]
  },
  {
    id: "round-2",
    roundNumber: 2,
    title: "Match 2",
    dateLabel: "Sept 11",
    courseId: "harbour-town",
    format: "match_play",
    pointsAvailable: 6,
    arrivalTime: "7:15 AM",
    teeTimes: [
      { id: "r2t1", time: "8:00 AM", players: ["A1", "B1", "A2", "B2"] },
      { id: "r2t2", time: "8:10 AM", players: ["A3", "B3", "A4", "B4"] },
      { id: "r2t3", time: "8:20 AM", players: ["A5", "B5", "A6", "B6"] }
    ]
  },
  {
    id: "round-3",
    roundNumber: 3,
    title: "Match 3",
    dateLabel: "Sept 12",
    courseId: "heron-point",
    format: "net_score",
    pointsAvailable: 6,
    arrivalTime: "7:15 AM",
    teeTimes: [
      { id: "r3t1", time: "8:00 AM", players: ["A1", "A3", "B1", "B3"] },
      { id: "r3t2", time: "8:10 AM", players: ["A2", "A4", "B2", "B4"] },
      { id: "r3t3", time: "8:20 AM", players: ["A5", "A6", "B5", "B6"] }
    ]
  }
];

export const initialMatches: Match[] = [
  { id: "m1", roundId: "round-1", label: "Best Ball 1", aPlayers: ["A1", "A2"], bPlayers: ["B1", "B2"], points: 2 },
  { id: "m2", roundId: "round-1", label: "Best Ball 2", aPlayers: ["A3", "A4"], bPlayers: ["B3", "B4"], points: 2 },
  { id: "m3", roundId: "round-1", label: "Best Ball 3", aPlayers: ["A5", "A6"], bPlayers: ["B5", "B6"], points: 2 },
  { id: "m4", roundId: "round-2", label: "Singles 1", aPlayers: ["A1"], bPlayers: ["B1"], points: 1 },
  { id: "m5", roundId: "round-2", label: "Singles 2", aPlayers: ["A2"], bPlayers: ["B2"], points: 1 },
  { id: "m6", roundId: "round-2", label: "Singles 3", aPlayers: ["A3"], bPlayers: ["B3"], points: 1 },
  { id: "m7", roundId: "round-2", label: "Singles 4", aPlayers: ["A4"], bPlayers: ["B4"], points: 1 },
  { id: "m8", roundId: "round-2", label: "Singles 5", aPlayers: ["A5"], bPlayers: ["B5"], points: 1 },
  { id: "m9", roundId: "round-2", label: "Singles 6", aPlayers: ["A6"], bPlayers: ["B6"], points: 1 }
];

export const initialScores: ScoreEntry[] = [];

export const initialTripState: TripState = {
  trip: initialTrip,
  teams: initialTeams,
  players: initialPlayers,
  courses: initialCourses,
  rounds: initialRounds,
  matches: initialMatches,
  scores: initialScores
};