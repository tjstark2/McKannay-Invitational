import type { Round } from "@/types/domain";

export type RoundLifecycle = "not_started" | "live" | "finished";

export function roundLifecycle(r: Pick<Round, "startedAt" | "finishedAt">): RoundLifecycle {
  if (r.finishedAt) return "finished";
  if (r.startedAt) return "live";
  return "not_started";
}

export const lifecycleLabel: Record<RoundLifecycle, string> = {
  not_started: "Not started",
  live: "Live",
  finished: "Finished",
};

// Scores may only be entered while a round is open (started and not finished).
export function canEnterScores(r: Pick<Round, "startedAt" | "finishedAt">): boolean {
  return roundLifecycle(r) === "live";
}
