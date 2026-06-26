"use client";

import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { BrandHeaderMark } from "@/features/trip/components/Brand";
import { AccountMenu } from "@/features/account/AccountMenu";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";

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

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

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
        {/* Identity */}
        <div className="flex items-center gap-4">
          <PlayerAvatar
            avatarId={profile?.avatar_id}
            name={fullName || user.email}
            size={68}
            ring="#1f6f54"
          />
          <div className="min-w-0">
            <h1 className="truncate font-anton text-3xl tracking-tight text-ink">
              {fullName || "Your Profile"}
            </h1>
            <p className="mt-0.5 text-sm font-bold text-fairway-900">
              {profile?.username ? `@${profile.username}` : ""}
            </p>
            {location ? (
              <p className="text-sm text-slate-500">{location}</p>
            ) : null}
          </div>
        </div>

        {/* Membership */}
        <Section title="Membership">
          <div className="rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-anton text-2xl tracking-tight text-ink">
                  Free plan
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  Run and join tournaments at no cost.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/20 px-3 py-1 text-xs font-black uppercase tracking-wide text-green">
                <span className="h-1.5 w-1.5 rounded-full bg-green" />
                Active
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-sand-50 p-3.5">
              <p className="text-sm font-bold text-ink">
                Go ad-free + unlock more birdies — coming soon.
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                A personal membership that removes ads and adds extra avatar
                options. We&apos;ll let you know the moment it&apos;s ready.
              </p>
            </div>
          </div>
        </Section>

        {/* Account details */}
        <Section title="Account">
          <div className="divide-y divide-sand-100 overflow-hidden rounded-2xl border border-line bg-white">
            <Row label="Email" value={profile?.email || user.email || "—"} />
            <Row label="Phone" value={profile?.phone || "—"} />
            <Row
              label="Username"
              value={profile?.username ? `@${profile.username}` : "—"}
            />
            <Row label="Location" value={location || "—"} />
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
            onClick={() => router.push("/profile/avatar")}
            className="flex w-full items-center justify-between rounded-2xl border border-line bg-white px-4 py-3.5 font-black text-fairway-900"
          >
            <span>🐦 Change your birdie</span>
            <ChevronRight className="h-5 w-5 text-slate-300" />
          </button>
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
