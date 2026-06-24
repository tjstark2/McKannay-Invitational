import { BrandWordmark } from "@/features/trip/components/Brand";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-sand-50 px-5 py-10">
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
  );
}
