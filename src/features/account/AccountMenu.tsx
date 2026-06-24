"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Home, LogOut, User } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";

/** Consistent account control: shows on the dashboard, profile, and inside a
 *  trip. Always offers My Tournaments, Profile, and Sign out (-> landing). */
export function AccountMenu({ tone = "light" }: { tone?: "light" | "onPhoto" }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;
    (async () => {
      const p = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle();
      if (active) setName((p.data?.first_name as string) ?? "");
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const initial = (name || user?.email || "?").charAt(0).toUpperCase();
  const btnCls =
    tone === "onPhoto"
      ? "bg-white/90 text-fairway-900 shadow-lg backdrop-blur"
      : "border border-sand-100 bg-white text-fairway-900 shadow-sm";

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.replace("/");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm font-extrabold ${btnCls}`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-fairway-900 text-xs font-black text-white">
          {initial}
        </span>
        <span className="hidden sm:block">{name || "Account"}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-sand-100 bg-white text-left shadow-2xl">
            <div className="border-b border-sand-100 px-4 py-3">
              <p className="text-xs text-slate-400">Signed in as</p>
              <p className="truncate text-sm font-bold text-ink">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                router.push("/home");
              }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-bold text-fairway-900 hover:bg-sand-50"
            >
              <Home className="h-4 w-4" /> My Tournaments
            </button>
            <button
              onClick={() => {
                setOpen(false);
                router.push("/profile");
              }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-bold text-fairway-900 hover:bg-sand-50"
            >
              <User className="h-4 w-4" /> Profile
            </button>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 border-t border-sand-100 px-4 py-3 text-sm font-bold text-red-600 hover:bg-sand-50"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
