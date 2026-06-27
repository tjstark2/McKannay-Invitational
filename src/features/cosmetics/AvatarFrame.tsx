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

function Sparkles({ size }: { size: number }) {
  const pts = [
    { x: 0.16, y: 0.18, d: 1.7, delay: 0 },
    { x: 0.82, y: 0.3, d: 2.1, delay: 0.5 },
    { x: 0.3, y: 0.84, d: 2.4, delay: 1.0 },
  ];
  const s = Math.max(3, size * 0.07);
  return (
    <>
      {pts.map((p, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: `${p.x * 100}%`,
            top: `${p.y * 100}%`,
            width: s,
            height: s,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 0 6px #fff",
            zIndex: 3,
            animation: `tbtwinkle ${p.d}s ease-in-out infinite ${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}

function Bolts({ size }: { size: number }) {
  const pts = [
    { x: 0.74, y: 0.04, h: 0.4, delay: 0 },
    { x: 0.58, y: 0.12, h: 0.3, delay: 0.18 },
    { x: 0.68, y: 0.58, h: 0.26, delay: 0.32 },
  ];
  return (
    <>
      {pts.map((p, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: `${p.x * 100}%`,
            top: `${p.y * 100}%`,
            width: 5,
            height: p.h * size,
            background: "linear-gradient(#fff,#7df9ff)",
            clipPath: "polygon(50% 0,12% 42%,52% 44%,18% 100%,72% 38%,40% 40%)",
            filter: "drop-shadow(0 0 4px #7df9ff)",
            zIndex: 3,
            animation: `tbzap ${0.5 + p.delay}s steps(1) infinite ${p.delay}s`,
          }}
        />
      ))}
    </>
  );
}

function Orbit({ size }: { size: number }) {
  const ball = Math.max(7, size * 0.13);
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 3,
        animation: "tborbit 2.8s linear infinite",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: "50%",
          top: -ball / 2.5,
          width: ball,
          height: ball,
          marginLeft: -ball / 2,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%,#fff,#d8dde2)",
          boxShadow: "0 0 4px rgba(0,0,0,.3)",
        }}
      />
    </span>
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
      {f.sparkle ? <Sparkles size={size} /> : null}
      {f.bolts ? <Bolts size={size} /> : null}
      {f.orbit ? <Orbit size={size} /> : null}
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
