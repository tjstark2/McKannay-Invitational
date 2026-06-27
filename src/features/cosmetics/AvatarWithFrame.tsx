import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { AvatarFrame } from "./AvatarFrame";

/**
 * Drop-in for PlayerAvatar that renders the player's equipped border ring when
 * they have one. Falls back to a plain PlayerAvatar (keeping any team ring) for
 * players who haven't equipped a border, to keep dense screens clean.
 */
export function AvatarWithFrame({
  frameId,
  avatarId,
  emoji,
  name,
  size = 36,
  ring,
  className = "",
}: {
  frameId?: string | null;
  avatarId?: string | null;
  emoji?: string | null;
  name?: string | null;
  size?: number;
  ring?: string;
  className?: string;
}) {
  if (frameId) {
    return (
      <AvatarFrame
        frameId={frameId}
        avatarId={avatarId}
        emoji={emoji}
        name={name}
        size={size}
      />
    );
  }
  return (
    <PlayerAvatar
      avatarId={avatarId}
      emoji={emoji}
      name={name}
      size={size}
      ring={ring}
      className={className}
    />
  );
}
