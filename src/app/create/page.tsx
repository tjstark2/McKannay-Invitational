"use client";

import { useRouter } from "next/navigation";
import { AuthShell } from "@/features/auth/AuthShell";

export default function CreatePage() {
  const router = useRouter();
  return (
    <AuthShell>
      <div className="text-center">
        <p className="text-4xl">🏗️</p>
        <h1 className="mt-3 text-2xl font-black text-ink">
          Create a tournament
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The full setup wizard is coming next — name, teams, rounds, courses,
          and scoring, with the option to clone a past edition.
        </p>
        <button
          onClick={() => router.push("/home")}
          className="mt-6 w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white"
        >
          Back to home
        </button>
      </div>
    </AuthShell>
  );
}
