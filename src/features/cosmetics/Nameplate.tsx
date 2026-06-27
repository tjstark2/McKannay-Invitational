import type { CSSProperties } from "react";
import { AvatarFrame } from "./AvatarFrame";
import { plateById, type PlateDef } from "./nameplates";

/**
 * Profile nameplate: avatar (with frame), name, title, HCP, wins.
 * Plain (free) and Boss banners/bars.
 */
export function Nameplate({
  plateId,
  frameId,
  avatarId,
  emoji,
  name,
  title,
  hcp,
  wins,
}: {
  plateId?: string | null;
  frameId?: string | null;
  avatarId?: string | null;
  emoji?: string | null;
  name?: string | null;
  title?: string | null;
  hcp?: string | number | null;
  wins?: string | number | null;
}) {
  const p: PlateDef = plateById(plateId);
  const isBanner = p.layout === "banner";
  const light = isBanner; // banners use light text on dark bg

  const wrap: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    background: isBanner ? p.bg : "#ffffff",
    border: isBanner ? "none" : "1px solid #e8e3d6",
    borderLeft: p.layout === "bar" ? `5px solid ${p.accent}` : undefined,
  };

  const chip = (text: string) => (
    <span
      style={{
        background: light ? "rgba(255,255,255,.18)" : "#f1ece0",
        color: light ? "#fff" : "#3a463c",
        borderRadius: 999,
        padding: "3px 9px",
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );

  return (
    <div style={wrap}>
      {p.sheen ? (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(110deg,transparent 30%,rgba(255,255,255,.25) 50%,transparent 70%)",
            backgroundSize: "200% 100%",
            animation: "tbsheen 3.5s linear infinite",
            pointerEvents: "none",
          }}
        />
      ) : null}

      <span style={{ position: "relative", zIndex: 1 }}>
        <AvatarFrame
          frameId={frameId}
          avatarId={avatarId}
          emoji={emoji}
          name={name}
          size={46}
        />
      </span>

      <div style={{ position: "relative", zIndex: 1, minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: 900,
            fontSize: 15,
            color: light ? "#fff" : "#16201b",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name || "Player"}
        </div>
        {title ? (
          <div
            style={{
              fontSize: 12,
              color: light ? "rgba(255,255,255,.8)" : "#6b7d70",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        ) : null}
      </div>

      {hcp != null || wins != null ? (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            gap: 6,
            flexShrink: 0,
          }}
        >
          {hcp != null ? chip(`HCP ${hcp}`) : null}
          {wins != null ? chip(`${wins} W`) : null}
        </div>
      ) : null}

      {p.tier === "boss" && p.layout === "bar" ? (
        <span
          style={{
            position: "relative",
            zIndex: 1,
            background: p.accent,
            color: "#1d1402",
            borderRadius: 999,
            padding: "2px 9px",
            fontSize: 10,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          BOSS
        </span>
      ) : null}
    </div>
  );
}
