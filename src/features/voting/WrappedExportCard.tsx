import { forwardRef } from "react";
import type { Player } from "@/types/domain";
import { AWARDS } from "@/features/voting/awards";

export type WrappedData = {
  tripName: string;
  dates: string;
  championTeam: string | null;
  championMembers: string[];
  mvpName: string | null;
  mvpDetail: string | null;
  cumulative: { key: string; title: string; names: string[] }[];
};

// Fixed 1080x1920 (Instagram story) card used for the PNG download.
export const WrappedExportCard = forwardRef<HTMLDivElement, { data: WrappedData }>(
  function WrappedExportCard({ data }, ref) {
    const badge = (key: string) =>
      AWARDS.find((a) => a.key === key)?.badge ?? "";
    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1920,
          background:
            "radial-gradient(120% 80% at 50% 0%, #1a4630 0%, #103022 45%, #0a2017 100%)",
          color: "#f4efe2",
          fontFamily: "'Source Sans 3', Arial, sans-serif",
          padding: "80px 64px",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "Anton, sans-serif", fontSize: 44, letterSpacing: 2 }}>
            TourneyBirdie
          </div>
          <div style={{ fontFamily: "Anton, sans-serif", fontSize: 110, lineHeight: 0.95, marginTop: 14 }}>
            FINAL AWARDS
          </div>
          <div style={{ fontSize: 34, color: "#9fb6a6", marginTop: 10 }}>
            {data.tripName} · {data.dates}
          </div>
        </div>

        {/* MVP */}
        <div
          style={{
            marginTop: 56,
            border: "2px solid rgba(231,200,105,0.5)",
            background: "rgba(231,200,105,0.10)",
            borderRadius: 28,
            padding: "32px 36px",
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: "Anton, sans-serif", fontSize: 30, letterSpacing: 4, color: "#d6b66a" }}>
            MVP
          </div>
          <div style={{ fontFamily: "Anton, sans-serif", fontSize: 72, lineHeight: 1 }}>
            {data.mvpName ?? "-"}
          </div>
          {data.mvpDetail ? (
            <div style={{ fontSize: 30, color: "#9fb6a6", marginTop: 6 }}>{data.mvpDetail}</div>
          ) : null}
        </div>

        {/* superlatives */}
        <div
          style={{
            marginTop: 44,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
          }}
        >
          {data.cumulative.map((a) => (
            <div
              key={a.key}
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: 22,
                padding: "24px 18px",
                textAlign: "center",
              }}
            >
              <img src={badge(a.key)} alt="" style={{ height: 130, width: "auto" }} />
              <div style={{ fontFamily: "Anton, sans-serif", fontSize: 30, color: "#d6b66a", marginTop: 8 }}>
                {a.title}
              </div>
              <div style={{ fontFamily: "Anton, sans-serif", fontSize: 40 }}>
                {a.names.length ? a.names.join(" & ") : "No winner"}
              </div>
            </div>
          ))}
        </div>

        {/* champions */}
        <div style={{ position: "absolute", left: 64, right: 64, bottom: 72, textAlign: "center" }}>
          <div style={{ fontFamily: "Anton, sans-serif", fontSize: 40, color: "#e7c869" }}>
            🏆 Champions · {data.championTeam ?? "-"}
          </div>
          <div style={{ fontSize: 30, color: "#9fb6a6", marginTop: 8 }}>
            {data.championMembers.join(" · ")}
          </div>
          <div style={{ fontSize: 26, color: "#7e978a", marginTop: 18 }}>
            Run your golf trip on TourneyBirdie
          </div>
        </div>
      </div>
    );
  }
);
