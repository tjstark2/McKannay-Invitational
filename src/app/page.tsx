"use client";

import { useEffect } from "react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
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
      <LoadingScreen />
    );
  }

  // Signed-out visitors get the marketing front door.
  return <Landing />;
}
