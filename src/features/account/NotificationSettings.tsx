"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

type Prefs = { live_callouts: boolean; round_info: boolean; clubhouse: boolean };

const DEFAULTS: Prefs = { live_callouts: true, round_info: true, clubhouse: true };

const LABELS: { key: keyof Prefs; title: string; blurb: string }[] = [
  { key: "live_callouts", title: "Live callouts", blurb: "Birdies, eagles and the odd disaster, as they happen." },
  { key: "round_info", title: "Round info", blurb: "Night before and morning of: tee times, matchups, where to be." },
  { key: "clubhouse", title: "Clubhouse", blurb: "Photos and chat from the group." },
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
          .select("live_callouts,round_info,clubhouse")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) setPrefs(data as Prefs);
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

  async function savePref(key: keyof Prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const supabase = getSupabaseClient();
    if (supabase && user?.id) {
      await supabase.from("notification_prefs").upsert(
        { user_id: user.id, ...next, updated_at: new Date().toISOString() },
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

      <div className="rounded-2xl border border-sand-200 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">What to send me</p>
        {LABELS.map((l) => (
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
    </div>
  );
}
