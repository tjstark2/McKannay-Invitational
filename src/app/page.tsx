"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { Landing } from "@/features/marketing/Landing";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/home");
  }, [user, loading, router]);

  // Signed-in users are headed to their dashboard; show a brief loader.
  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f1]">
        <p className="text-3xl">⛳</p>
      </div>
    );
  }

  // Signed-out visitors get the marketing front door.
  return <Landing />;
}
