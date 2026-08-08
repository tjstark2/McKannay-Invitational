"use client";

/**
 * Context-tailored Pro upsell. The pitch is driven by WHAT the user tapped, so
 * a member poking the hole-by-hole toggle sees the live-scoring story, while a
 * Clubhouse tap sees the social story.
 */

export type UpsellTopic = "hole_by_hole" | "clubhouse" | "draw" | "wrapped" | "general";

type Pitch = {
  eyebrow: string;
  title: string;
  lede: string;
  bullets: string[];
  art?: string;
};

const PITCHES: Record<UpsellTopic, Pitch> = {
  hole_by_hole: {
    eyebrow: "Pro - Hole by hole",
    title: "Turn your trip into live TV",
    lede:
      "Every score lands the moment it happens. The group watches the match swing on the hole it actually swung on.",
    bullets: [
      "Live leaderboard that updates as you play",
      "Strokes given on the right holes, off each course's stroke index",
      "Birdie flashes, triple-bogey roasts, and the snowman for an 8",
      "Blow-up tracking, MVP and award stats that need per-hole data",
      "A far richer Trip Wrapped at the end",
    ],
    art: "/draw/img_wheel.png",
  },
  clubhouse: {
    eyebrow: "Pro - Clubhouse",
    title: "The 19th hole, all trip long",
    lede: "Photos and group chat that live with the tournament, not buried in a text thread.",
    bullets: [
      "Shared photo feed for the whole trip",
      "Group chat with reactions and trash-talk stickers",
      "Matchup boards and results posted automatically",
    ],
    art: "/draw/img_social.png",
  },
  draw: {
    eyebrow: "Pro - Matchup Draw",
    title: "Make the pairings an event",
    lede: "Project it on the TV and let the room lose it.",
    bullets: [
      "Slot machine, hat draw, spinning wheel, captain's draft",
      "Handicap auto-balance for the fairest possible matchups",
      "Post the finished board straight to the Clubhouse",
    ],
    art: "/draw/img_slot.png",
  },
  wrapped: {
    eyebrow: "Pro - Trip Wrapped",
    title: "The trip, wrapped up",
    lede: "A shareable recap card of the whole tournament.",
    bullets: ["Champions, awards and round-by-round results", "Saves straight to your camera roll"],
    art: "/draw/img_draft.png",
  },
  general: {
    eyebrow: "Pro",
    title: "Upgrade this tournament",
    lede: "Everything that makes the trip feel like a real event.",
    bullets: ["Hole-by-hole live scoring", "Clubhouse photos and chat", "Matchup draws", "Trip Wrapped"],
  },
};

export function ProUpsellModal({
  topic,
  onClose,
  onUpgrade,
}: {
  topic: UpsellTopic;
  onClose: () => void;
  onUpgrade?: () => void;
}) {
  const p = PITCHES[topic] ?? PITCHES.general;
  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-gradient-to-b from-[#0b3b2e] to-[#0b2418] p-6 text-white sm:rounded-3xl">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-black uppercase tracking-widest text-accent">{p.eyebrow}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="text-white/50">
            ✕
          </button>
        </div>

        {p.art ? (
          <div className="my-2 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.art} alt="" width={110} height={110} style={{ objectFit: "contain" }} />
          </div>
        ) : null}

        <h2 className="font-anton text-3xl leading-tight tracking-tight">{p.title}</h2>
        <p className="mt-1.5 text-[15px] leading-6 text-white/70">{p.lede}</p>

        <ul className="mt-4 space-y-2">
          {p.bullets.map((b) => (
            <li key={b} className="flex gap-2 text-[14px] leading-6">
              <span className="text-accent">✓</span>
              <span className="text-white/90">{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={onUpgrade ?? onClose}
            className="w-full rounded-2xl bg-accent px-4 py-3.5 font-black text-ink"
          >
            Upgrade to Pro
          </button>
          <button type="button" onClick={onClose} className="w-full py-2 text-sm font-bold text-white/50">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
