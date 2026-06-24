"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
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
  sms_opt_in: boolean | null;
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
          "first_name,last_name,username,city,state,email,phone,marketing_opt_in,sms_opt_in"
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f1]">
        <p className="text-3xl">⛳</p>
      </div>
    );
  }

  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-screen bg-[#f7f6f1]">
      <header className="border-b border-sand-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <BrandHeaderMark />
          <AccountMenu />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-3xl font-black text-ink">Profile</h1>
        <p className="mt-1 text-slate-500">Your account details.</p>

        <div className="mt-6 divide-y divide-sand-100 overflow-hidden rounded-2xl border border-sand-100 bg-white">
          <Row label="Username" value={profile?.username ? `@${profile.username}` : "—"} />
          <Row label="Name" value={fullName || "—"} />
          <Row
            label="Location"
            value={
              [profile?.city, profile?.state].filter(Boolean).join(", ") || "—"
            }
          />
          <Row label="Email" value={profile?.email || user.email || "—"} />
          <Row label="Phone" value={profile?.phone || "—"} />
          <Row
            label="Marketing emails"
            value={profile?.marketing_opt_in ? "On" : "Off"}
          />
          <Row label="SMS updates" value={profile?.sms_opt_in ? "On" : "Off"} />
        </div>

        <p className="mt-4 text-sm text-slate-400">
          Editing your profile is coming soon. Need a change now? Reach us from
          the Contact page.
        </p>

        <button
          onClick={() => router.push("/home")}
          className="mt-6 w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white"
        >
          ← Back to My Tournaments
        </button>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className="font-bold text-ink">{value}</span>
    </div>
  );
}
