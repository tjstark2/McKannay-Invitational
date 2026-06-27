"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Check } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { BrandHeaderMark } from "@/features/trip/components/Brand";
import { AvatarFrame } from "@/features/cosmetics/AvatarFrame";
import { FramePicker } from "@/features/cosmetics/FramePicker";
import { NameplatePicker } from "@/features/cosmetics/NameplatePicker";
import { useCosmetics } from "@/features/cosmetics/useCosmetics";
import { fetchAvatars } from "@/features/avatar/data";
import { taglineForClass } from "@/features/cosmetics/taglines";

type Tab = "birdie" | "nameplate" | "surrounding";

export default function CustomizePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { frameId } = useCosmetics();
  const [tab, setTab] = useState<Tab>("surrounding");
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [klass, setKlass] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOnboarding(
        new URLSearchParams(window.location.search).get("onboarding") === "1"
      );
    }
  }, []);

  const exitTo = onboarding ? "/home" : "/profile";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;
    (async () => {
      const [{ data }, avatars] = await Promise.all([
        supabase
          .from("profiles")
          .select("avatar_id,first_name,last_name,username")
          .eq("id", user.id)
          .maybeSingle(),
        fetchAvatars(),
      ]);
      if (!active) return;
      const aid = data?.avatar_id ?? null;
      setAvatarId(aid);
      setKlass(avatars.find((a) => a.id === aid)?.klass ?? null);
      setName(
        [data?.first_name, data?.last_name].filter(Boolean).join(" ") ||
          data?.username ||
          (user.email ?? "You")
      );
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [user, loading, router]);

  if (loading || !user || !ready) return <LoadingScreen />;

  const tabs: { id: Tab; label: string }[] = [
    { id: "birdie", label: "Birdie" },
    { id: "nameplate", label: "Nameplate" },
    { id: "surrounding", label: "Border" },
  ];

  return (
    <div className="min-h-screen bg-[#f7f6f1]">
      <header className="relative z-50 border-b border-sand-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <BrandHeaderMark />
          <button
            onClick={() => router.push(exitTo)}
            className="text-sm font-bold text-fairway-900"
          >
            Done
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6 pb-28">
        <h1 className="font-anton text-3xl tracking-tight text-ink">
          Customize My Birdie
        </h1>
        {onboarding ? (
          <p className="mt-1 text-sm font-semibold text-fairway-900">
            Last step - add a border and nameplate, then tap Done to jump in.
          </p>
        ) : null}

        <div className="mt-4 flex gap-1 rounded-2xl border border-line bg-white p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-black ${
                tab === t.id
                  ? "bg-fairway-900 text-white"
                  : "text-slate-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "birdie" ? (
            <div className="flex flex-col items-center">
              <AvatarFrame frameId={frameId} avatarId={avatarId} name={name} size={120} />
              <button
                onClick={() => router.push("/profile/avatar")}
                className="mt-5 flex w-full max-w-sm items-center justify-between rounded-2xl bg-fairway-900 px-5 py-4 font-black text-white"
              >
                Choose your birdie
                <ChevronRight size={20} />
              </button>
              <p className="mt-2 text-xs text-slate-400">
                Birdie Boss unlocks the premium birds.
              </p>
            </div>
          ) : tab === "nameplate" ? (
            <NameplatePicker
              avatarId={avatarId}
              name={name}
              title={taglineForClass(klass)}
              hcp="8.4"
              wins="12"
            />
          ) : (
            <FramePicker avatarId={avatarId} />
          )}
        </div>
      </main>

      {/* Clear save affordance: everything auto-saves; this confirms + exits */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-green">
            <Check size={16} /> Saved automatically
          </span>
          <button
            onClick={() => router.push(exitTo)}
            className="rounded-2xl bg-fairway-900 px-7 py-2.5 font-black text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
