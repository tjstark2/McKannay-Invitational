"use client";

import { useState } from "react";
import { logoUrl } from "./catalog";
import { useSnowmen } from "@/features/trip/state/SnowmenContext";

/**
 * Circular avatar for a person. Prefers their chosen bird (avatarId), then an
 * emoji (typed players), then an initial. Use everywhere a player/account is shown.
 *
 * Pass playerId inside a tournament and the avatar swaps to the snowman while
 * that player is wearing one (an 8+ on a hole puts it on; playing their way
 * out takes it off). Outside a tournament the snowman set is empty, so the
 * prop is harmless everywhere else.
 */
export function PlayerAvatar({
  avatarId,
  emoji,
  name,
  size = 36,
  ring,
  className = "",
  playerId,
}: {
  avatarId?: string | null;
  emoji?: string | null;
  name?: string | null;
  size?: number;
  ring?: string; // optional ring color (e.g., team color)
  className?: string;
  playerId?: string | null;
}) {
  const snowmen = useSnowmen();
  // An avatar row can exist with no artwork on disk (the Special Access birds
  // were granted before their images were added). Rather than showing a broken
  // image, fall back to the emoji or initial.
  const [imgFailed, setImgFailed] = useState(false);
  const dim = { width: size, height: size } as React.CSSProperties;
  const ringStyle = ring
    ? ({ boxShadow: `0 0 0 2px ${ring}` } as React.CSSProperties)
    : undefined;

  if (playerId && snowmen.has(playerId)) {
    return (
      <span
        className={`inline-flex shrink-0 overflow-hidden rounded-full bg-sky-50 ${className}`}
        style={{ ...dim, ...ringStyle }}
        title={name ? `${name} is wearing the snowman` : "Wearing the snowman"}
      >
        <img
          src="/draw/img_snowman.png"
          alt={name ? `${name} is wearing the snowman` : "snowman"}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </span>
    );
  }

  if (avatarId && !imgFailed) {
    return (
      <span
        className={`inline-flex shrink-0 overflow-hidden rounded-full bg-sand-50 ${className}`}
        style={{ ...dim, ...ringStyle }}
      >
        <img
          src={logoUrl(avatarId)}
          alt={name ? `${name}’s birdie` : "birdie"}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  if (emoji) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-sand-50 ${className}`}
        style={{ ...dim, ...ringStyle, fontSize: size * 0.55 }}
        aria-hidden
      >
        {emoji}
      </span>
    );
  }

  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-fairway-900 font-black text-white ${className}`}
      style={{ ...dim, ...ringStyle, fontSize: size * 0.42 }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
