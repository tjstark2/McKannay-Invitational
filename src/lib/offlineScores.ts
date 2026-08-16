"use client";

// Golf courses have terrible signal. A score typed on the 7th green has to
// survive a dead zone, a locked phone and a browser tab the OS decided to
// evict - so every hole score is written to localStorage first and pushed to
// Supabase after, with anything that failed retried on reconnect.
//
// The queue is keyed by round+player+hole, so re-entering the same hole
// replaces the pending write rather than stacking up duplicates.

import type { SupabaseClient } from "@supabase/supabase-js";

export type QueuedScore = {
  roundId: string;
  playerId: string;
  hole: number;
  strokes: number;
  enteredBy: string | null;
  queuedAt: number;
};

const KEY = "tb_pending_hole_scores";

function readAll(): QueuedScore[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedScore[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: QueuedScore[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked - the write still went to the network */
  }
}

const idOf = (s: { roundId: string; playerId: string; hole: number }) =>
  `${s.roundId}:${s.playerId}:${s.hole}`;

/** Put a score in the queue (replacing any pending write for the same hole). */
export function enqueueScore(score: Omit<QueuedScore, "queuedAt">): void {
  const list = readAll().filter((s) => idOf(s) !== idOf(score));
  list.push({ ...score, queuedAt: Date.now() });
  writeAll(list);
}

export function dequeueScore(score: {
  roundId: string;
  playerId: string;
  hole: number;
}): void {
  writeAll(readAll().filter((s) => idOf(s) !== idOf(score)));
}

export function pendingCount(roundId?: string): number {
  const list = readAll();
  return roundId ? list.filter((s) => s.roundId === roundId).length : list.length;
}

export function pendingScores(roundId?: string): QueuedScore[] {
  const list = readAll();
  return roundId ? list.filter((s) => s.roundId === roundId) : list;
}

/**
 * Try to push everything pending. Returns how many made it. Anything that
 * fails stays queued for the next attempt, so this is safe to call often.
 */
export async function flushQueue(
  supabase: SupabaseClient,
  roundId?: string
): Promise<{ sent: number; remaining: number }> {
  const all = readAll();
  const mine = roundId ? all.filter((s) => s.roundId === roundId) : all;
  let sent = 0;

  for (const item of mine) {
    const { error } = await supabase.from("hole_scores").upsert(
      {
        round_id: item.roundId,
        player_id: item.playerId,
        hole_number: item.hole,
        strokes: item.strokes,
        entered_by: item.enteredBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "round_id,player_id,hole_number" }
    );
    if (!error) {
      dequeueScore(item);
      sent += 1;
      continue;
    }
    // A refusal is permanent - the round is finished, or the card is signed.
    // Retrying that forever would drain the battery and never succeed, so drop
    // it. Anything else (no signal, timeout) stays queued for the next try.
    const permanent =
      error.code === "23514" ||
      /finished|signed|violates|check constraint/i.test(error.message ?? "");
    if (permanent) {
      dequeueScore(item);
      continue;
    }
    // Network problem: stop here and try the whole queue again later.
    break;
  }
  return { sent, remaining: pendingCount(roundId) };
}
