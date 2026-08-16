"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

/**
 * Take your data with you, or leave entirely. Both are things a real product
 * has to offer once actual people have accounts.
 *
 * Deleting is refused while you still own a tournament - quietly destroying
 * everyone else's trip alongside your account would be the wrong call, so you
 * hand it over or delete it first.
 */
export function AccountDangerZone() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    const supabase = getSupabaseClient();
    if (!supabase || !user?.id || exporting) return;
    setExporting(true);
    setError(null);
    try {
      const [profile, memberships, players, scores, holeScores] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("trip_members").select("*").eq("user_id", user.id),
        supabase.from("players").select("*").eq("account_id", user.id),
        supabase.from("score_entries").select("*"),
        supabase.from("hole_scores").select("*").eq("entered_by", user.id),
      ]);
      const myPlayerIds = ((players.data ?? []) as { id: string }[]).map((p) => p.id);
      const payload = {
        exportedAt: new Date().toISOString(),
        account: { id: user.id, email: user.email },
        profile: profile.data ?? null,
        tournaments: memberships.data ?? [],
        rosterEntries: players.data ?? [],
        myScores: ((scores.data ?? []) as { player_id: string }[]).filter((s) =>
          myPlayerIds.includes(s.player_id)
        ),
        holesIEntered: holeScores.data ?? [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tourneybirdie-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't build your export.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    const supabase = getSupabaseClient();
    if (!supabase || busy) return;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.rpc("delete_my_account");
    if (e) {
      setBusy(false);
      setError(e.message);
      return;
    }
    await signOut();
    router.push("/");
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={exportData}
        disabled={exporting}
        className="w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-left font-black text-fairway-900 disabled:opacity-60"
      >
        {exporting ? "Building your file…" : "Download my data"}
        <span className="mt-0.5 block text-[13px] font-normal text-slate-500">
          Your profile, tournaments and scores as a JSON file.
        </span>
      </button>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3.5 text-left font-black text-red-600"
        >
          Delete my account
          <span className="mt-0.5 block text-[13px] font-normal text-slate-500">
            Permanent. Your scores stay in other people&apos;s tournaments, without
            your name attached.
          </span>
        </button>
      ) : (
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4">
          <p className="font-black text-red-900">This cannot be undone</p>
          <p className="mt-1 text-[13px] leading-5 text-red-900">
            Type DELETE to confirm. If you own a tournament you&apos;ll need to
            hand it over or delete it first.
          </p>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label="Type DELETE to confirm"
            placeholder="DELETE"
            className="mt-3 w-full rounded-xl border-[1.5px] border-red-300 bg-white px-3 py-2 font-black text-ink outline-none focus:border-red-600"
          />
          {error ? (
            <p className="mt-2 text-[13px] font-bold text-red-700">{error}</p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setTyped("");
                setError(null);
              }}
              className="flex-1 rounded-xl border-[1.5px] border-slate-300 bg-white px-3 py-2.5 font-black text-slate-600"
            >
              Keep my account
            </button>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={typed !== "DELETE" || busy}
              className="flex-1 rounded-xl bg-red-600 px-3 py-2.5 font-black text-white disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Delete forever"}
            </button>
          </div>
        </div>
      )}

      {error && !confirming ? (
        <p className="text-[13px] font-bold text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
