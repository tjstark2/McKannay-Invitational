import type { CSSProperties } from "react";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { frameById, type FrameDef } from "./frames";

// Parse a "prop:value;prop:value" CSS string into a React style object.
function cssToStyle(css: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const part of css.split(";")) {
    const i = part.indexOf(":");
    if (i === -1) continue;
    const prop = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (!prop) continue;
    const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = value;
  }
  return out as CSSProperties;
}

function Flames({ size }: { size: number }) {
  const arm = size * 0.5;
  const w = Math.max(8, size * 0.16);
  const h = Math.max(16, size * 0.36);
  return (
    <>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = i * 30;
        const style: CSSProperties = {
          position: "absolute",
          left: `calc(50% - ${w / 2}px)`,
          top: `calc(50% - ${arm}px)`,
          width: w,
          height: h,
          background: "linear-gradient(#fff0a6,#ff9b21 45%,#e8330b)",
          borderRadius: "50% 50% 50% 50% / 62% 62% 40% 40%",
          transformOrigin: `${w / 2}px ${arm}px`,
          transform: `rotate(${a}deg)`,
          filter: "blur(.4px)",
          zIndex: 0,
          // @ts-expect-error custom property
          "--a": `${a}deg`,
          animation: `tbflame ${(0.7 + (i % 4) * 0.12).toFixed(2)}s ease-in-out infinite ${(i * 0.06).toFixed(2)}s`,
        };
        return <span key={i} style={style} aria-hidden />;
      })}
    </>
  );
}

/**
 * Renders a circular avatar wrapped in its equipped frame ring (pure CSS).
 * Works at any size; drop-in wherever a player avatar shows.
 */
export function AvatarFrame({
  frameId,
  avatarId,
  emoji,
  name,
  size = 44,
}: {
  frameId?: string | null;
  avatarId?: string | null;
  emoji?: string | null;
  name?: string | null;
  size?: number;
}) {
  const f: FrameDef = frameById(frameId);
  const inset = Math.max(2, Math.round(size * 0.07));
  const inner = size - 2 * inset;

  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
    >
      {f.glow ? (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: "50%",
            boxShadow: `0 0 ${Math.round(size * 0.18)}px 2px ${f.glow}`,
            animation: "tbglow 1.6s ease-in-out infinite",
            zIndex: 0,
          }}
        />
      ) : null}
      {f.flames ? <Flames size={size} /> : null}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          zIndex: 1,
          ...cssToStyle(f.ring),
        }}
      />
      <span
        style={{
          position: "absolute",
          inset,
          borderRadius: "50%",
          background: "#fff",
          zIndex: 1,
        }}
      />
      <span style={{ position: "absolute", inset, zIndex: 2 }}>
        <PlayerAvatar
          avatarId={avatarId}
          emoji={emoji}
          name={name}
          size={inner}
        />
      </span>
    </span>
  );
}
