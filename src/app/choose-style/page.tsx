"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { fetchMyAvatar, fetchAvatars } from "@/features/avatar/data";
import { taglineForClass } from "@/features/cosmetics/taglines";
import { StyleOnboarding } from "@/features/cosmetics/StyleOnboarding";

export default function ChooseStylePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [tagline, setTagline] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    let active = true;
    (async () => {
      const mine = await fetchMyAvatar();
      if (!active) return;
      // No bird chosen yet -> send them to the birdie chooser first.
      if (!mine?.avatarId) {
        router.replace("/choose-avatar");
        return;
      }
      const avatars = await fetchAvatars();
      if (!active) return;
      const klass = avatars.find((a) => a.id === mine.avatarId)?.klass ?? null;
      setAvatarId(mine.avatarId);
      setTagline(taglineForClass(klass));
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [user, loading, router]);

  if (!ready || !avatarId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05100c] text-3xl">
        ⛳
      </div>
    );
  }

  return <StyleOnboarding avatarId={avatarId} tagline={tagline} />;
}
