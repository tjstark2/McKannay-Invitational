"use client";

import { useMemo, useState } from "react";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import type { DrawGroup } from "@/features/trip/draw/drawCompute";
import { fromTimeInput, toTimeInput } from "@/lib/teeTime";
import type { Player } from "@/types";

/**
 * The board every field-draw method lands on. Tap two players to swap them,
 * adjust the first tee time and the gap, reshuffle, then save - which writes
 * the round's tee times and who's in each one.
 */
export function FieldGroupBoard({
  groups,
  players,
  hcp,
  showHandicaps,
  startTime,
  stepMinutes,
  busy,
  onStartTimeChange,
  onStepChange,
  onSwap,
  onReshuffle,
  onSave,
  saveLabel,
}: {
  groups: DrawGroup[];
  players: Player[];
  hcp: Record<string, number>;
  showHandicaps: boolean;
  startTime: string;
  stepMinutes: number;
  busy: boolean;
  onStartTimeChange: (value: string) => void;
  onStepChange: (value: number) => void;
  onSwap: (a: { g: number; i: number }, b: { g: number; i: number }) => void;
  onReshuffle?: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  const [sel, setSel] = useState<{ g: number; i: number } | null>(null);

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "-";
  const playerOf = (id: string) => players.find((p) => p.id === id);

  const totals = useMemo(
    () => groups.map((g) => g.players.reduce((sum, id) => sum + (hcp[id] ?? 0), 0)),
    [groups, hcp]
  );
  const spread = useMemo(() => {
    const full = groups
      .map((g, i) => ({ n: g.players.length, t: totals[i] }))
      .filter((x) => x.n === 4)
      .map((x) => x.t);
    if (full.length < 2) return null;
    return Math.max(...full) - Math.min(...full);
  }, [groups, totals]);

  function tap(g: number, i: number) {
    if (!sel) {
      setSel({ g, i });
      return;
    }
    if (sel.g === g && sel.i === i) {
      setSel(null);
      return;
    }
    onSwap(sel, { g, i });
    setSel(null);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-bold text-slate-400">
          {sel ? "Tap another player to swap" : "Tap two players to swap them"}
        </span>
        {spread != null ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              spread <= 3
                ? "bg-emerald-100 text-emerald-700"
                : spread <= 6
                ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            Spread {spread}
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        {groups.map((g, gi) => (
          <div key={gi} className="rounded-2xl border-[1.5px] border-sand-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                Group {gi + 1}
              </span>
              <span className="flex items-center gap-2">
                {showHandicaps ? (
                  <span className="text-[11px] font-black text-slate-400">
                    Total {totals[gi]}
                  </span>
                ) : null}
                <span className="text-[13px] font-black text-fairway-900">{g.tee}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {g.players.map((pid, pi) => {
                const selected = sel?.g === gi && sel?.i === pi;
                const p = playerOf(pid);
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => tap(gi, pi)}
                    className={`flex items-center gap-1.5 rounded-xl border-[1.5px] px-2 py-1.5 text-left transition ${
                      selected
                        ? "border-accent bg-accent/20 ring-2 ring-accent"
                        : "border-sand-200 bg-[#f7f6f1]"
                    }`}
                  >
                    <PlayerAvatar
                      avatarId={p?.avatarId}
                      emoji={p?.avatarEmoji}
                      name={p?.name}
                      size={20}
                      playerId={pid}
                    />
                    <span className="text-[13px] font-bold text-ink">{nameOf(pid)}</span>
                    {showHandicaps ? (
                      <span className="text-[11px] font-black text-slate-400">{hcp[pid] ?? 0}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {g.players.length < 4 ? (
              <p className="mt-2 text-[11px] font-bold text-slate-400">
                Last group of {g.players.length} - not padded
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-end gap-2 rounded-2xl bg-[#f3efe6] p-3">
        <label className="flex-1">
          <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500">
            First tee
          </span>
          <input
            type="time"
            value={toTimeInput(startTime)}
            onChange={(e) => {
              const next = fromTimeInput(e.target.value);
              if (next) onStartTimeChange(next);
            }}
            className="mt-1 w-full rounded-xl border-[1.5px] border-sand-200 bg-white px-3 py-2 font-bold text-ink outline-none focus:border-fairway-900"
          />
        </label>
        <label className="w-28">
          <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500">
            Gap (min)
          </span>
          <input
            inputMode="numeric"
            value={String(stepMinutes)}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^0-9]/g, ""));
              onStepChange(Number.isFinite(n) && n > 0 ? n : 0);
            }}
            className="mt-1 w-full rounded-xl border-[1.5px] border-sand-200 bg-white px-3 py-2 font-bold text-ink outline-none focus:border-fairway-900"
          />
        </label>
      </div>

      <div className="mt-3 flex gap-2 pb-8">
        {onReshuffle ? (
          <button
            type="button"
            onClick={onReshuffle}
            disabled={busy}
            className="flex-1 rounded-2xl border-[1.5px] border-fairway-900 px-4 py-3 font-black text-fairway-900 disabled:opacity-50"
          >
            Reshuffle
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSave}
          disabled={busy || groups.length === 0}
          className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3 font-black text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}
