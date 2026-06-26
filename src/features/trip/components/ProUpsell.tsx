"use client";

// The Pro upsell shown at the end of tournament creation AND from Admin when
// upgrading an existing tournament. Same screen, different surrounding chrome.
export function ProUpsell({
  upgrading,
  onUpgrade,
  onSkip,
  heading = "Your tournament is ready!",
  subhead = "One last thing - want to make it a Pro tournament?",
  emoji = "🎉",
  upgradeLabel = "Make it a Pro tournament",
  skipLabel = "Maybe later - continue to my tournament",
}: {
  upgrading: boolean;
  onUpgrade: () => void;
  onSkip: () => void;
  heading?: string;
  subhead?: string;
  emoji?: string;
  upgradeLabel?: string;
  skipLabel?: string;
}) {
  return (
    <div>
      <div className="text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 text-3xl">
          {emoji}
        </span>
        <h1 className="font-anton text-3xl tracking-tight text-fairway-900">
          {heading}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{subhead}</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border-2 border-accent/50 bg-white">
        <div className="bg-fairway-900 px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="font-anton text-2xl tracking-tight text-white">
              TourneyBirdie Pro
            </p>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-black uppercase tracking-wide text-ink">
              Per tournament
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[#cfe6d8]">
            Upgrade once - <strong>everyone</strong> in this tournament gets it.
          </p>
        </div>

        <div className="space-y-2.5 p-5">
          {[
            "Pro features for the whole crew (placeholder)",
            "More to come - coming soon",
            "More to come - coming soon",
          ].map((b, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint/20 text-[11px] font-black text-green">
                ✓
              </span>
              <span className="text-sm font-semibold text-slate-600">{b}</span>
            </div>
          ))}

          <div className="mt-3 rounded-xl bg-sand-50 p-3 text-center">
            <p className="text-xs font-bold text-slate-500">
              Free while in preview - no card required. Billing is coming later.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <button
          onClick={onUpgrade}
          disabled={upgrading}
          className="w-full rounded-2xl bg-accent px-4 py-4 font-black text-ink disabled:opacity-50"
        >
          {upgrading ? "Upgrading…" : upgradeLabel}
        </button>
        <button
          onClick={onSkip}
          disabled={upgrading}
          className="w-full rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 disabled:opacity-50"
        >
          {skipLabel}
        </button>
      </div>
    </div>
  );
}
