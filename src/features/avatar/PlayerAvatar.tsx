import { logoUrl } from "./catalog";

/**
 * Circular avatar for a person. Prefers their chosen bird (avatarId), then an
 * emoji (typed players), then an initial. Use everywhere a player/account is shown.
 */
export function PlayerAvatar({
  avatarId,
  emoji,
  name,
  size = 36,
  ring,
  className = "",
}: {
  avatarId?: string | null;
  emoji?: string | null;
  name?: string | null;
  size?: number;
  ring?: string; // optional ring color (e.g., team color)
  className?: string;
}) {
  const dim = { width: size, height: size } as React.CSSProperties;
  const ringStyle = ring
    ? ({ boxShadow: `0 0 0 2px ${ring}` } as React.CSSProperties)
    : undefined;

  if (avatarId) {
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
