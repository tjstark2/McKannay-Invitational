"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { fetchMyAvatar } from "@/features/avatar/data";
import { AccountHome } from "@/features/account/AccountHome";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // First-login gate: a signed-in user who hasn't picked a bird is sent to
  // the avatar flow before the app. Once chosen (selected_at set), never again.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setChecked(true);
      return;
    }
    let active = true;
    (async () => {
      const mine = await fetchMyAvatar();
      if (!active) return;
      if (mine && mine.selectedAt == null) {
        router.replace("/choose-avatar");
        return;
      }
      setChecked(true);
    })();
    return () => {
      active = false;
    };
  }, [user, loading, router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f1] text-3xl">
        ⛳
      </div>
    );
  }

  return <AccountHome />;
}
