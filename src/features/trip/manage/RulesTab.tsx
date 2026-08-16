"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  ANSWER_LABELS,
  PRESET_RULES,
  presetByKey,
  type RuleAnswer,
} from "@/features/trip/rules/presetRules";
import {
  addCustomRule,
  addPresetRule,
  loadTripRules,
  removeRule,
  setRuleAnswer,
  updateCustomRule,
  type TripRule,
} from "@/lib/supabase/tripRules";

const ANSWERS: RuleAnswer[] = ["yes", "no", "discretion"];

/**
 * House rules admin. Switch on the arguments that actually come up, set each
 * one to yes / no / their-call, and (on Pro) write your own. Everything here
 * shows up on the Rules screen under Local Rules for the whole tournament.
 */
export function RulesTab({
  tripId,
  isPro,
  onUpsell,
}: {
  tripId: string;
  isPro: boolean;
  onUpsell?: () => void;
}) {
  const [rules, setRules] = useState<TripRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const refresh = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setRules(await loadTripRules(supabase, tripId));
    setLoading(false);
  }, [tripId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enabledKeys = new Set(rules.filter((r) => r.ruleKey).map((r) => r.ruleKey));
  const customRules = rules.filter((r) => r.isCustom);
  const presetRules = rules.filter((r) => !r.isCustom);
  const available = PRESET_RULES.filter((p) => !enabledKeys.has(p.key));

  async function togglePreset(key: string) {
    const supabase = getSupabaseClient();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    const existing = rules.find((r) => r.ruleKey === key);
    if (existing) {
      await removeRule(supabase, existing.id);
    } else {
      const preset = presetByKey(key);
      if (preset) {
        const res = await addPresetRule(supabase, tripId, preset, rules.length);
        if (!res.ok) setError(res.error ?? "Couldn't add that rule.");
      }
    }
    await refresh();
    setBusy(false);
  }

  async function answer(ruleId: string, value: RuleAnswer) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, answer: value } : r)));
    await setRuleAnswer(supabase, ruleId, value);
  }

  async function saveCustom() {
    const supabase = getSupabaseClient();
    if (!supabase || busy || !newTitle.trim()) return;
    setBusy(true);
    setError(null);
    const res = await addCustomRule(
      supabase,
      tripId,
      newTitle.trim(),
      newBody.trim(),
      rules.length
    );
    if (!res.ok) setError(res.error ?? "Couldn't save that rule.");
    setNewTitle("");
    setNewBody("");
    await refresh();
    setBusy(false);
  }

  async function saveEdit(ruleId: string) {
    const supabase = getSupabaseClient();
    if (!supabase || !editTitle.trim()) return;
    await updateCustomRule(supabase, ruleId, editTitle.trim(), editBody.trim());
    setEditing(null);
    await refresh();
  }

  async function drop(ruleId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await removeRule(supabase, ruleId);
    await refresh();
  }

  if (loading) return <p className="text-sm text-slate-400">Loading rules…</p>;

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-5 text-slate-600">
        Settle the arguments before they happen. Anything you turn on here shows
        up for everyone on the Rules screen.
      </p>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      {/* --- turned on --- */}
      {presetRules.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Your house rules
          </p>
          {presetRules.map((r) => {
            const preset = r.ruleKey ? presetByKey(r.ruleKey) : undefined;
            return (
              <div key={r.id} className="rounded-2xl border border-sand-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-black text-ink">{r.title}</p>
                    {preset ? (
                      <p className="text-[13px] text-slate-500">{preset.question}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${r.title}`}
                    onClick={() => drop(r.id)}
                    className="shrink-0 rounded-lg px-2 py-1 text-slate-400"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {ANSWERS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => answer(r.id, a)}
                      className={`flex-1 rounded-xl border-[1.5px] px-2 py-2 text-[13px] font-black ${
                        r.answer === a
                          ? "border-fairway-900 bg-fairway-900 text-white"
                          : "border-sand-200 bg-white text-slate-600"
                      }`}
                    >
                      {ANSWER_LABELS[a]}
                    </button>
                  ))}
                </div>
                {preset?.detail[r.answer] ? (
                  <p className="mt-2 text-[13px] leading-5 text-slate-600">
                    {preset.detail[r.answer]}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* --- catalog --- */}
      {available.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Common rules to add
          </p>
          {available.map((p) => (
            <button
              key={p.key}
              type="button"
              disabled={busy}
              onClick={() => togglePreset(p.key)}
              className="flex w-full items-center gap-3 rounded-2xl border-[1.5px] border-sand-200 bg-white p-3 text-left disabled:opacity-50"
            >
              <span className="flex-1">
                <span className="block font-black text-ink">{p.title}</span>
                <span className="block text-[13px] text-slate-500">{p.question}</span>
              </span>
              <span className="font-black text-slate-300">+</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* --- custom --- */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Your own rules
          </p>
          <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-accent-dark">
            Pro
          </span>
        </div>

        {customRules.map((r) =>
          editing === r.id ? (
            <div key={r.id} className="rounded-2xl border border-sand-200 bg-white p-3">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                aria-label="Rule title"
                className="w-full rounded-xl border-[1.5px] border-sand-200 px-3 py-2 font-bold text-ink outline-none focus:border-fairway-900"
              />
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                aria-label="Rule details"
                className="mt-2 w-full rounded-xl border-[1.5px] border-sand-200 px-3 py-2 text-[14px] text-ink outline-none focus:border-fairway-900"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-xl border-[1.5px] border-slate-300 px-3 py-2 font-black text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveEdit(r.id)}
                  className="flex-1 rounded-xl bg-fairway-900 px-3 py-2 font-black text-white"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div key={r.id} className="rounded-2xl border border-sand-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-black text-ink">{r.title}</p>
                  {r.body ? (
                    <p className="mt-0.5 text-[13px] leading-5 text-slate-600">{r.body}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(r.id);
                      setEditTitle(r.title);
                      setEditBody(r.body ?? "");
                    }}
                    className="rounded-lg px-2 py-1 text-[13px] font-black text-slate-500"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${r.title}`}
                    onClick={() => drop(r.id)}
                    className="rounded-lg px-2 py-1 text-slate-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {isPro ? (
          <div className="rounded-2xl border-[1.5px] border-dashed border-sand-200 bg-white p-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Rule name, e.g. Wolf on the par 3s"
              aria-label="New rule title"
              className="w-full rounded-xl border-[1.5px] border-sand-200 px-3 py-2 font-bold text-ink outline-none focus:border-fairway-900"
            />
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={3}
              placeholder="How it works"
              aria-label="New rule details"
              className="mt-2 w-full rounded-xl border-[1.5px] border-sand-200 px-3 py-2 text-[14px] text-ink outline-none focus:border-fairway-900"
            />
            <button
              type="button"
              onClick={saveCustom}
              disabled={busy || !newTitle.trim()}
              className="mt-2 w-full rounded-xl bg-fairway-900 px-3 py-2.5 font-black text-white disabled:opacity-50"
            >
              Add rule
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onUpsell}
            className="w-full rounded-2xl border-[1.5px] border-dashed border-sand-200 bg-white p-4 text-left"
          >
            <p className="font-black text-ink">Write your own rules</p>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-500">
              Upgrade to Pro to add house rules of your own on top of the common
              ones.
            </p>
          </button>
        )}
      </div>
    </div>
  );
}
