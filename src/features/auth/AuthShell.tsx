"use client";

import { BrandWordmark } from "@/features/trip/components/Brand";
import { useAuth } from "@/features/auth/AuthContext";
import { AccountMenu } from "@/features/account/AccountMenu";

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-sand-50">
      {/* signed-in account menu, available on every shell screen */}
      <div className="flex h-16 items-center justify-end px-4">
        {user ? <AccountMenu /> : null}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-12">
        <a href="/" className="mb-6 flex items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white shadow-md">
            <img
              src="/logo-icon.png"
              alt="TourneyBirdie"
              className="h-[82%] w-[82%] object-contain"
            />
          </span>
          <BrandWordmark />
        </a>
        <div className="w-full max-w-sm rounded-3xl border border-sand-100 bg-white p-6 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
