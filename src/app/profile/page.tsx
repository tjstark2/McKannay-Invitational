"use client";

import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useBirdieBoss } from "@/features/account/birdieBoss";
import { AvatarFrame } from "@/features/cosmetics/AvatarFrame";
import { frameById } from "@/features/cosmetics/frames";
import { useCosmetics } from "@/features/cosmetics/useCosmetics";
import { getSupabaseClient } from "@/lib/supabase/client";
import { BrandHeaderMark } from "@/features/trip/components/Brand";
import { AccountMenu } from "@/features/account/AccountMenu";

type Profile = {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  city: string | null;
  state: string | null;
  email: string | null;
  phone: string | null;
  marketing_opt_in: boolean | null;
  avatar_id: string | null;
};

const BOSS_FEATURES = [
  "Every avatar unlocked (except the Founder)",
  "Exclusive Boss reaction stickers in Clubhouse & chat",
  "Ad-free across the app",
  "More Boss perks coming shortly",
];

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const { isBoss, upgrade } = useBirdieBoss();
  const { frameId } = useCosmetics();
  const [upgrading, setUpgrading] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  async function becomeBoss() {
    setUpgrading(true);
    try {
      await upgrade();
    } finally {
      setUpgrading(false);
    }
  }

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;
    (async () => {
      const p = await supabase
        .from("profiles")
        .select(
          "first_name,last_name,username,city,state,email,phone,marketing_opt_in,avatar_id"
        )
        .eq("id", user.id)
        .maybeSingle();
      if (active) setProfile((p.data as Profile) ?? null);
    })();
    return () => {
      active = false;
    };
  }, [user, loading, router]);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ");
  const location =
    [profile?.city, profile?.state].filter(Boolean).join(", ") || null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const tournamentUpdatesOn = meta.tournament_updates_opt_in !== false;
  const marketingOn =
    profile?.marketing_opt_in ??
    (meta.marketing_opt_in as boolean | undefined) ??
    false;

  return (
    <div className="min-h-screen bg-[#f7f6f1]">
      <header className="relative z-50 border-b border-sand-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <BrandHeaderMark />
          <AccountMenu />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-5 py-8">
        {/* Hero */}
        <div className="overflow-hidden rounded-3xl border border-line shadow-sm">
          <div className="relative bg-gradient-to-br from-fairway-900 to-fairway-700 px-6 py-7">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 85% -10%, rgba(243,181,10,.35), transparent 55%)",
              }}
            />
            <div className="relative flex flex-col items-center text-center">
              <AvatarFrame
                frameId={frameId}
                avatarId={profile?.avatar_id}
                name={fullName || user.email}
                size={108}
              />
              <h1 className="mt-3 font-anton text-3xl tracking-tight text-white">
                {fullName || "Your Profile"}
              </h1>
              <p className="text-sm font-semibold text-mint">
                {profile?.username ? `@${profile.username}` : ""}
                {profile?.username && location ? " · " : ""}
                {location ?? ""}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                {isBoss ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1d1402] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-accent">
                    👑 Birdie Boss
                  </span>
                ) : null}
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                  {frameById(frameId).name} ring
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push("/profile/customize")}
            className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-accent to-[#e09a06] px-5 py-4 font-black text-[#1d1402] transition active:brightness-95"
          >
            🎨 Customize my Birdie
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Birdie Boss */}
        <Section title="Membership">
          {isBoss ? (
            <div className="overflow-hidden rounded-2xl border-2 border-accent/40">
              <div className="flex items-center justify-between gap-3 bg-gradient-to-br from-[#1d1402] to-[#3a2a06] px-5 py-4">
                <div>
                  <p className="font-anton text-2xl tracking-tight text-white">
                    👑 Birdie Boss
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-[#f5e6bf]">
                    Your perks travel with you to every tournament.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-black uppercase tracking-wide text-[#1d1402]">
                  Active
                </span>
              </div>
              <div className="bg-[#fffdf6] px-5 py-3">
                <button
                  onClick={() => setShowFeatures((s) => !s)}
                  className="flex w-full items-center justify-between text-sm font-black text-[#a07a06]"
                >
                  See what&apos;s included
                  <ChevronDown
                    size={18}
                    className={`transition ${showFeatures ? "rotate-180" : ""}`}
                  />
                </button>
                {showFeatures ? (
                  <div className="mt-3 space-y-2">
                    {BOSS_FEATURES.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-black text-[#a07a06]">
                          ✓
                        </span>
                        <span className="text-sm font-semibold text-slate-600">
                          {f}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border-2 border-accent/50">
              <div className="relative bg-gradient-to-br from-[#1d1402] to-[#3a2a06] px-5 py-4 text-white">
                <span className="absolute right-4 top-3 text-2xl">👑</span>
                <p className="font-anton text-2xl tracking-tight">
                  Birdie Boss
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[#f5e6bf]">
                  Your personal upgrade - travels with you to every tournament.
                </p>
              </div>
              <div className="bg-[#fffdf6] px-5 py-4">
                {BOSS_FEATURES.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 py-1">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-black text-[#a07a06]">
                      ✓
                    </span>
                    <span className="text-sm font-semibold text-slate-600">{f}</span>
                  </div>
                ))}
                <div className="mt-3 rounded-xl bg-sand-50 p-3 text-center text-xs font-bold text-slate-500">
                  Free while in preview - no card required.
                </div>
                <button
                  onClick={becomeBoss}
                  disabled={upgrading}
                  className="mt-3 w-full rounded-2xl bg-accent px-4 py-3.5 font-black text-[#1d1402] disabled:opacity-50"
                >
                  {upgrading ? "Upgrading…" : "Become a Birdie Boss"}
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* Account details */}
        <Section title="Account">
          <div className="divide-y divide-sand-100 overflow-hidden rounded-2xl border border-line bg-white">
            <Row label="Email" value={profile?.email || user.email || "-"} />
            <Row label="Phone" value={profile?.phone || "-"} />
            <Row
              label="Username"
              value={profile?.username ? `@${profile.username}` : "-"}
            />
            <Row label="Location" value={location || "-"} />
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <div className="divide-y divide-sand-100 overflow-hidden rounded-2xl border border-line bg-white">
            <Row
              label="Tournament updates"
              hint="Tee times, scores, results"
              value={tournamentUpdatesOn ? "On" : "Off"}
            />
            <Row
              label="News & offers"
              hint="Tips, features, deals"
              value={marketingOn ? "On" : "Off"}
            />
          </div>
          <p className="mt-2 px-1 text-xs text-slate-400">
            Change these any time from Edit Profile.
          </p>
        </Section>

        {/* Actions */}
        <div className="grid gap-2">
          <button
            onClick={() => router.push("/profile/edit")}
            className="w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white"
          >
            Edit Profile
          </button>
          <button
            onClick={() => router.push("/home")}
            className="w-full rounded-2xl border border-line bg-white px-4 py-3.5 font-black text-fairway-900"
          >
            ← Back to My Tournaments
          </button>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
      </div>
      <span className="shrink-0 text-right font-bold text-ink">{value}</span>
    </div>
  );
}
