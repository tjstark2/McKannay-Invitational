"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

import { DEFAULT_PREFS, type Prefs } from "@/features/notifications/categories";

const DEFAULTS: Prefs = DEFAULT_PREFS;

const TOGGLES: { key: "round_day" | "my_card" | "awards" | "organizer"; title: string; blurb: string; adminOnly?: boolean }[] = [
  { key: "round_day", title: "Round day", blurb: "Night before and matchups, plus any change to a tee time. Rounds starting and finishing." },
  { key: "my_card", title: "My card", blurb: "Your group has gone quiet, your card is ready to sign, everyone else has signed." },
  { key: "awards", title: "Awards and recap", blurb: "Voting opening and closing, results, and Trip Wrapped." },
  { key: "organizer", title: "Organizer alerts", blurb: "Join requests and anything not set up before a round.", adminOnly: true },
];

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** iOS only allows web push from a home-screen install, via Safari. */
function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function NotificationSettings() {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
    );
    (async () => {
      if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setEnabled(Boolean(sub));
      } catch {
        /* ignore */
      }
      const supabase = getSupabaseClient();
      if (supabase && user?.id) {
        const { data } = await supabase
          .from("notification_prefs")
          .select("round_day,live_action,my_card,awards,clubhouse_level,organizer,quiet_start,quiet_end,time_zone")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) setPrefs({ ...DEFAULTS, ...(data as Partial<Prefs>) });
      }
    })();
  }, [user?.id]);

  const needsInstall = isIos() && !isStandalone();

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Notifications aren't switched on for this app yet.");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("You'll need to allow notifications in your browser.");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const supabase = getSupabaseClient();
      if (supabase && user?.id && json.endpoint && json.keys?.p256dh && json.keys?.auth) {
        await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
            user_agent: navigator.userAgent,
          },
          { onConflict: "endpoint" }
        );
      }
      setEnabled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't turn notifications on.");
    } finally {
      setBusy(false);
    }
  }

  async function savePref(key: keyof Prefs, value: boolean | string | number) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const supabase = getSupabaseClient();
    if (supabase && user?.id) {
      await supabase.from("notification_prefs").upsert(
        {
          user_id: user.id,
          ...next,
          time_zone: next.time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }
  }

  if (!supported && !needsInstall) {
    return (
      <p className="text-[13px] text-slate-500">
        This browser can&apos;t do notifications. Try Safari on iPhone or Chrome on Android.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {needsInstall ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[13px] leading-6 text-amber-900">
          <b>One step first on iPhone.</b> Apple only allows notifications for apps added to your home
          screen. In <b>Safari</b>, tap the share button, then <b>Add to Home Screen</b>, and open
          TourneyBirdie from that icon. You&apos;ll get an app icon and full screen too.
        </div>
      ) : enabled ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-[13px] font-bold text-emerald-800">
          Notifications are on for this device.
        </div>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white disabled:opacity-50"
        >
          {busy ? "Turning on…" : "Turn on notifications"}
        </button>
      )}

      {error ? <p className="text-sm font-bold text-red-600">{error}</p> : null}

      <div className="rounded-2xl border border-sand-200 bg-[#f7f6f1] p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Always sent</p>
        <p className="mt-1 text-[12px] leading-5 text-slate-600">
          Your tee time on the morning of, when you are the last signature on a card, if an admin changes a
          locked score, and anything about your account. Miss these and you are on the wrong tee.
        </p>
      </div>

      <div className="rounded-2xl border border-sand-200 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Live action</p>
        <p className="mt-1 text-[12px] leading-5 text-slate-500">
          How much of the on-course drama you want on your phone.
        </p>
        <div className="mt-2 flex gap-1.5">
          {([
            ["big", "Big moments"],
            ["all", "Everything"],
            ["off", "Off"],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => savePref("live_action", val)}
              className={`flex-1 rounded-xl border-[1.5px] px-2 py-2 text-[12px] font-black ${
                prefs.live_action === val
                  ? "border-fairway-900 bg-fairway-900 text-white"
                  : "border-sand-200 text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] leading-5 text-slate-500">
          {prefs.live_action === "big"
            ? "Eagles, aces, snowmen, lead changes and a tight race at the turn."
            : prefs.live_action === "all"
            ? "Adds every birdie, triple, bad streak and group finishing."
            : "Nothing while the round is going."}
        </p>
      </div>

      <div className="rounded-2xl border border-sand-200 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Clubhouse and friends</p>
        <div className="mt-2 flex gap-1.5">
          {([
            ["all", "Everything"],
            ["mentions", "Mentions only"],
            ["off", "Off"],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => savePref("clubhouse_level", val)}
              className={`flex-1 rounded-xl border-[1.5px] px-2 py-2 text-[12px] font-black ${
                prefs.clubhouse_level === val
                  ? "border-fairway-900 bg-fairway-900 text-white"
                  : "border-sand-200 text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] leading-5 text-slate-500">
          Chat arrives batched, never one buzz per message.
        </p>
      </div>

      <div className="rounded-2xl border border-sand-200 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Everything else</p>
        {TOGGLES.map((l) => (
          <div key={l.key} className="mt-2 flex items-start gap-3">
            <span className="flex-1">
              <span className="block text-[13px] font-black text-ink">{l.title}</span>
              <span className="block text-[12px] leading-5 text-slate-500">{l.blurb}</span>
            </span>
            <button
              type="button"
              onClick={() => savePref(l.key, !prefs[l.key])}
              aria-label={`Toggle ${l.title}`}
              className={`h-7 w-12 shrink-0 rounded-full border-2 transition ${
                prefs[l.key] ? "border-fairway-900 bg-fairway-900" : "border-sand-200 bg-white"
              }`}
            >
              <span
                className={`block h-4 w-4 rounded-full bg-white transition ${prefs[l.key] ? "ml-6" : "ml-1"}`}
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,.25)" }}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-sand-200 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Quiet hours</p>
        <p className="mt-1 text-[12px] leading-5 text-slate-500">
          Nothing buzzes between these times except the always-sent ones.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <select
            value={prefs.quiet_start}
            onChange={(e) => savePref("quiet_start", Number(e.target.value))}
            className="flex-1 rounded-xl border-[1.5px] border-sand-200 px-2 py-2 font-bold"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {((h + 11) % 12) + 1}
                {h < 12 ? "am" : "pm"}
              </option>
            ))}
          </select>
          <span className="text-[13px] font-bold text-slate-400">to</span>
          <select
            value={prefs.quiet_end}
            onChange={(e) => savePref("quiet_end", Number(e.target.value))}
            className="flex-1 rounded-xl border-[1.5px] border-sand-200 px-2 py-2 font-bold"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {((h + 11) % 12) + 1}
                {h < 12 ? "am" : "pm"}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
