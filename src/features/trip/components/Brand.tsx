/* Fore Friends brand lockups — keep the logo + wordmark consistent everywhere. */

export function BrandWordmark({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const text = size === "sm" ? "text-base" : "text-lg";
  return (
    <span
      className={`font-display font-black tracking-tight text-fairway-900 ${text} ${className}`}
    >
      Fore <span className="text-moss">Friends</span>
    </span>
  );
}

/* White rounded box with the icon + wordmark — sits on top of photos. */
export function BrandBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-2xl bg-white py-1.5 pl-1.5 pr-3 shadow-lg ${className}`}
    >
      <span className="h-9 w-9 overflow-hidden rounded-xl">
        <img
          src="/logo-icon.png"
          alt="Fore Friends"
          className="h-full w-full scale-105 object-cover"
        />
      </span>
      <BrandWordmark size="sm" />
    </div>
  );
}

/* Header chip (icon + wordmark) on the warm background, no white box. */
export function BrandHeaderMark({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-10 w-10 overflow-hidden rounded-xl shadow-sm">
        <img
          src="/logo-icon.png"
          alt="Fore Friends"
          className="h-full w-full scale-105 object-cover"
        />
      </span>
      <div>
        <BrandWordmark />
        {subtitle ? (
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* Full vertical lockup for the login screen: icon + FORE FRIENDS + taglines. */
export function BrandLockup() {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-5 h-32 w-32 overflow-hidden rounded-[28px] shadow-2xl">
        <img
          src="/logo-icon.png"
          alt="Fore Friends"
          className="h-full w-full scale-105 object-cover"
        />
      </span>
      <span className="font-display text-5xl font-black leading-none tracking-tight text-fairway-900">
        FORE
      </span>
      <span className="mt-1 flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-[0.18em] text-moss">
        <span className="h-[3px] w-5 rounded bg-moss" />
        FRIENDS
        <span className="h-[3px] w-5 rounded bg-moss" />
      </span>
      <p className="mt-4 font-display text-sm font-black tracking-wide text-fairway-900">
        CREATE<span className="text-accent">.</span> INVITE
        <span className="text-accent">.</span> COMPETE
        <span className="text-accent">.</span>
      </p>
      <p className="mt-2 font-display text-[10px] font-bold tracking-[0.16em] text-moss">
        — TOURNAMENTS MADE EASY —
      </p>
    </div>
  );
}
