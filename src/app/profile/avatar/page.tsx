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

export default function EditAvatarPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [grants, setGrants] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    let active = true;
    (async () => {
      const [a, g, mine] = await Promise.all([
        fetchAvatars(),
        fetchMyGrants(),
        fetchMyAvatar(),
      ]);
      if (!active) return;
      setAvatars(a);
      setGrants(g);
      setCurrent(mine?.avatarId ?? undefined);
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
      mode="edit"
      initialId={current}
      avatars={avatars}
      grantedIds={grants}
      onCancel={() => router.replace("/profile")}
      onComplete={async (id) => {
        const res = await setMyAvatar(id);
        if (res.ok) router.replace("/profile");
        return res;
      }}
    />
  );
}
