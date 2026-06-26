/* TourneyBirdie brand lockups - keep the logo + wordmark consistent everywhere.
   The icon is a transparent PNG, so it sits inside a white tile on light UIs. */

export function BrandWordmark({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const text = size === "sm" ? "text-sm" : "text-base";
  return (
    <span
      className={`font-anton tracking-tight ${text} ${className}`}
    >
      <span className="text-ink">TOURNEY</span>
      <span className="text-green">BIRDIE</span>
    </span>
  );
}

/* White tile holding the transparent mark. */
function IconTile({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center overflow-hidden bg-white ${className}`}
    >
      <img
        src="/logo-icon.png"
        alt="TourneyBirdie"
        className="h-[82%] w-[82%] object-contain"
      />
    </span>
  );
}

/* White rounded box with the icon + wordmark - sits on top of photos. */
export function BrandBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-2xl bg-white py-1.5 pl-1.5 pr-3 shadow-lg ${className}`}
    >
      <IconTile className="h-9 w-9 rounded-xl" />
      <BrandWordmark size="sm" />
    </div>
  );
}

/* Header chip (icon + wordmark) on the page background. */
export function BrandHeaderMark({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <IconTile className="h-10 w-10 rounded-xl shadow-sm" />
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

/* Full vertical lockup for the login screen. */
export function BrandLockup() {
  return (
    <div className="flex flex-col items-center text-center">
      <IconTile className="mb-5 h-32 w-32 rounded-[28px] shadow-2xl" />
      <span className="font-anton text-3xl tracking-tight">
        <span className="text-ink">TOURNEY</span>
        <span className="text-green">BIRDIE</span>
      </span>
      <p className="mt-3 font-display text-sm font-extrabold tracking-wide text-ink">
        CREATE<span className="text-accent-dark">.</span> INVITE
        <span className="text-accent-dark">.</span> CROWN
        <span className="text-accent-dark">.</span>
      </p>
      <p className="mt-2 font-display text-[10px] font-bold tracking-[0.16em] text-green">
        TOURNAMENTS MADE EASY
      </p>
    </div>
  );
}
