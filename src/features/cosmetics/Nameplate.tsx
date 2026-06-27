import type { CSSProperties } from "react";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { plateById, type PlateDef, type PlateFx } from "./nameplates";

function Sheen({ gold }: { gold?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        background: gold
          ? "linear-gradient(100deg,transparent 30%,rgba(255,235,170,.3) 50%,transparent 70%)"
          : "linear-gradient(110deg,transparent 30%,rgba(255,255,255,.26) 50%,transparent 70%)",
        backgroundSize: "220% 100%",
        animation: "tbsheen 3.8s linear infinite",
        pointerEvents: "none",
      }}
    />
  );
}

function Bolt({ top, right, h, dur, delay }: { top: string; right: string; h: number; dur: number; delay: number }) {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        top,
        right,
        width: 6,
        height: h,
        background: "linear-gradient(#fff,#7df9ff)",
        clipPath: "polygon(50% 0,12% 42%,52% 44%,18% 100%,72% 38%,40% 40%)",
        filter: "drop-shadow(0 0 4px #7df9ff)",
        animation: `tbzap ${dur}s steps(1) infinite ${delay}s`,
      }}
    />
  );
}

function Electric() {
  return (
    <>
      <span aria-hidden style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 2px rgba(125,249,255,.8), inset 0 0 22px rgba(125,249,255,.4)", animation: "tbzap .55s steps(1) infinite", pointerEvents: "none" }} />
      <Bolt top="10px" right="30px" h={40} dur={0.5} delay={0} />
      <Bolt top="16px" right="84px" h={30} dur={0.6} delay={0.18} />
      <Bolt top="auto" right="56px" h={26} dur={0.52} delay={0.32} />
    </>
  );
}

function Ball() {
  return (
    <span aria-hidden style={{ position: "absolute", right: 18, bottom: 12, width: 48, height: 50 }}>
      <span style={{ position: "absolute", bottom: 0, left: 6, width: 34, height: 11, borderRadius: "50%", background: "#06281a" }} />
      <span style={{ position: "absolute", bottom: 9, left: 30, width: 2, height: 30, background: "#eaeef2" }} />
      <span style={{ position: "absolute", bottom: 30, left: 30, width: 14, height: 9, background: "#ffd34d", clipPath: "polygon(0 0,100% 50%,0 100%)" }} />
      <span style={{ position: "absolute", left: 17, top: 0, width: 12, height: 12, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%,#fff,#d8dde2)", animation: "tbball 2.4s ease-in infinite" }} />
    </span>
  );
}

function Particles({
  emoji,
  up,
  color,
}: {
  emoji: string;
  up?: boolean;
  color?: string;
}) {
  const items = [
    { left: 30, dur: 3.0, delay: 0, size: 14 },
    { left: 45, dur: 3.6, delay: 0.8, size: 12 },
    { left: 58, dur: 2.7, delay: 0.4, size: 15 },
    { left: 70, dur: 3.3, delay: 1.4, size: 13 },
    { left: 82, dur: 2.9, delay: 0.6, size: 12 },
    { left: 92, dur: 3.5, delay: 1.1, size: 14 },
  ];
  return (
    <span aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {items.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: up ? undefined : "-12%",
            bottom: up ? "-12%" : undefined,
            fontSize: p.size,
            lineHeight: 1,
            color,
            textShadow: color ? `0 0 6px ${color}` : undefined,
            animation: `${up ? "tbfloatup" : "tbfall"} ${p.dur}s linear infinite ${p.delay}s`,
          }}
        >
          {emoji}
        </span>
      ))}
    </span>
  );
}

function Moon() {
  return (
    <>
      <span aria-hidden style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 34px rgba(255,140,30,.4)", animation: "tbglow 2.2s ease-in-out infinite", pointerEvents: "none" }} />
      <span aria-hidden style={{ position: "absolute", top: 14, right: 20, width: 20, height: 20, borderRadius: "50%", background: "radial-gradient(circle at 38% 34%,#fff4c2,#ffb23d)", boxShadow: "0 0 14px rgba(255,178,61,.7)" }} />
    </>
  );
}

function Fx({ fx }: { fx?: PlateFx }) {
  switch (fx) {
    case "sheen":
      return <Sheen gold />;
    case "electric":
      return <Electric />;
    case "ball":
      return <Ball />;
    case "snow":
      return <Particles emoji="❄" color="#fff" />;
    case "leaves":
      return <Particles emoji="🍂" />;
    case "moon":
      return <Moon />;
    case "hearts":
      return <Particles emoji="💗" up />;
    case "clovers":
      return <Particles emoji="🍀" />;
    default:
      return null;
  }
}

function PlateAvatar({ ring, avatarId, emoji, name }: { ring?: string; avatarId?: string | null; emoji?: string | null; name?: string | null }) {
  const spin = ring ? ring.includes("conic") : false;
  return (
    <span style={{ position: "relative", display: "inline-block", width: 60, height: 60, flexShrink: 0, zIndex: 1 }}>
      <span aria-hidden style={{ position: "absolute", inset: 0, borderRadius: "50%", background: ring || "#5b6b60", ...(spin ? { animation: "tbspin 7s linear infinite" } : {}) }} />
      <span aria-hidden style={{ position: "absolute", inset: 4, borderRadius: "50%", background: "#fff" }} />
      <span style={{ position: "absolute", inset: 6 }}>
        <PlayerAvatar avatarId={avatarId} emoji={emoji} name={name} size={48} />
      </span>
    </span>
  );
}

/**
 * Profile nameplate: avatar, name, tagline (from the avatar), HCP, wins.
 * Plain (free) and Boss banners/bars/animated/seasonal.
 */
export function Nameplate({
  plateId,
  avatarId,
  emoji,
  name,
  title,
  hcp,
  wins,
}: {
  plateId?: string | null;
  avatarId?: string | null;
  emoji?: string | null;
  name?: string | null;
  title?: string | null;
  hcp?: string | number | null;
  wins?: string | number | null;
}) {
  const p: PlateDef = plateById(plateId);
  const isBanner = p.layout === "banner";
  const light = isBanner;

  const wrap: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 16px",
    background: isBanner ? p.bg : "#ffffff",
    border: isBanner ? "none" : "1px solid #e8e3d6",
    borderLeft: p.layout === "bar" ? `5px solid ${p.accent}` : undefined,
    boxShadow: isBanner ? "0 10px 26px -14px rgba(0,0,0,.5)" : undefined,
  };

  const chip = (text: string) => (
    <span style={{ background: light ? "rgba(255,255,255,.16)" : "#f1ece0", color: light ? "#fff" : "#3a463c", borderRadius: 8, padding: "4px 9px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>
      {text}
    </span>
  );

  return (
    <div style={wrap}>
      <Fx fx={p.fx} />

      <PlateAvatar ring={p.ring} avatarId={avatarId} emoji={emoji} name={name} />

      <div style={{ position: "relative", zIndex: 1, minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 900, fontSize: 17, color: light ? "#fff" : "#16201b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name || "Player"}
          </span>
          {p.tag ? (
            <span style={{ background: p.tagBg || "#d6b66a", color: p.tagColor || "#2a210c", borderRadius: 999, padding: "2px 9px", fontSize: 9, fontWeight: 900, letterSpacing: ".06em", whiteSpace: "nowrap" }}>
              {p.tag}
            </span>
          ) : null}
        </div>
        {title ? (
          <div style={{ fontSize: 12, marginTop: 3, color: light ? p.titleColor || "rgba(255,255,255,.85)" : "#6b7d70", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </div>
        ) : null}
        {hcp != null || wins != null ? (
          <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
            {hcp != null ? chip(`HCP ${hcp}`) : null}
            {wins != null ? chip(`${wins} W`) : null}
          </div>
        ) : null}
      </div>

      {p.tier === "boss" && p.layout === "bar" ? (
        <span style={{ position: "relative", zIndex: 1, background: p.accent, color: "#1d1402", borderRadius: 999, padding: "2px 9px", fontSize: 10, fontWeight: 900, flexShrink: 0 }}>
          BOSS
        </span>
      ) : null}
    </div>
  );
}
