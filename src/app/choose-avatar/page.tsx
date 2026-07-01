"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import {
  fetchAvatars,
  fetchMyAvatar,
  fetchMyGrants,
  setMyAvatar,
} from "@/features/avatar/data";
import { AvatarFlow } from "@/features/avatar/AvatarFlow";
import type { Avatar } from "@/features/avatar/catalog";

export default function ChooseAvatarPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [grants, setGrants] = useState<string[]>([]);

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
      // Already chosen -> this screen is first-time only.
      if (mine && mine.selectedAt) {
        router.replace("/home");
        return;
      }
      const [a, g] = await Promise.all([fetchAvatars(), fetchMyGrants()]);
      if (!active) return;
      setAvatars(a);
      setGrants(g);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [user, loading, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05100c] text-3xl">
        ⛳
      </div>
    );
  }

  return (
    <AvatarFlow
      avatars={avatars}
      grantedIds={grants}
      onComplete={async (id) => {
        const res = await setMyAvatar(id);
        if (res.ok) router.replace("/choose-style");
        return res;
      }}
    />
  );
}
