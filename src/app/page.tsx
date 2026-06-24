"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/home" : "/signin");
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f6f1]">
      <p className="text-3xl">⛳</p>
    </div>
  );
}
