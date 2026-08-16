// House rules for a tournament: preset rules from the catalog with a
// yes / no / their-call answer, plus free-text custom rules (Pro).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RuleAnswer } from "@/features/trip/rules/presetRules";

export type TripRule = {
  id: string;
  ruleKey: string | null;
  title: string;
  body: string | null;
  answer: RuleAnswer;
  isCustom: boolean;
  sortOrder: number;
};

function mapRule(row: Record<string, unknown>): TripRule {
  return {
    id: row.id as string,
    ruleKey: (row.rule_key as string) ?? null,
    title: (row.title as string) ?? "",
    body: (row.body as string) ?? null,
    answer: ((row.answer as string) ?? "yes") as RuleAnswer,
    isCustom: Boolean(row.is_custom),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export async function loadTripRules(
  supabase: SupabaseClient,
  tripId: string
): Promise<TripRule[]> {
  const { data } = await supabase
    .from("trip_rules")
    .select("id,rule_key,title,body,answer,is_custom,sort_order")
    .eq("trip_id", tripId)
    .order("sort_order");
  return ((data ?? []) as Record<string, unknown>[]).map(mapRule);
}

/** Turn a preset on. Idempotent thanks to the unique index on (trip, key). */
export async function addPresetRule(
  supabase: SupabaseClient,
  tripId: string,
  preset: { key: string; title: string; defaultAnswer: RuleAnswer },
  sortOrder: number
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("trip_rules").upsert(
    {
      trip_id: tripId,
      rule_key: preset.key,
      title: preset.title,
      answer: preset.defaultAnswer,
      is_custom: false,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "trip_id,rule_key" }
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function addCustomRule(
  supabase: SupabaseClient,
  tripId: string,
  title: string,
  body: string,
  sortOrder: number
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("trip_rules").insert({
    trip_id: tripId,
    rule_key: null,
    title,
    body: body || null,
    answer: "yes",
    is_custom: true,
    sort_order: sortOrder,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function setRuleAnswer(
  supabase: SupabaseClient,
  ruleId: string,
  answer: RuleAnswer
): Promise<void> {
  await supabase
    .from("trip_rules")
    .update({ answer, updated_at: new Date().toISOString() })
    .eq("id", ruleId);
}

export async function updateCustomRule(
  supabase: SupabaseClient,
  ruleId: string,
  title: string,
  body: string
): Promise<void> {
  await supabase
    .from("trip_rules")
    .update({ title, body: body || null, updated_at: new Date().toISOString() })
    .eq("id", ruleId);
}

export async function removeRule(supabase: SupabaseClient, ruleId: string): Promise<void> {
  await supabase.from("trip_rules").delete().eq("id", ruleId);
}
