"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/features/avatar/AvatarFlow.module.css";
import { useAuth } from "@/features/auth/AuthContext";
import { useBirdieBoss } from "@/features/account/birdieBoss";
import { useCosmetics } from "./useCosmetics";
import { AvatarWithFrame } from "./AvatarWithFrame";
import { Nameplate } from "./Nameplate";
import { FRAMES, FOUNDER_EMAIL, type FrameDef } from "./frames";
import { NAMEPLATES, type PlateDef } from "./nameplates";

const GOLD = "#e7c869";

const PLATE_CATS = ["all", "banner", "bar", "animated", "seasonal"] as const;
const FRAME_CATS = ["all", "animated", "seasonal", "solid"] as const;
const LABEL: Record<string, string> = {
  all: "All",
  banner: "Banners",
  bar: "Bars",
  animated: "Animated",
  seasonal: "Seasonal",
  solid: "Solid",
  owner: "Founder",
};

// Runs immediately after the birdie chooser. Two quick steps - nameplate, then
// border - both previewing on the bird the player just picked, then into the app.
export function StyleOnboarding({
  avatarId,
  tagline,
}: {
  avatarId: string;
  tagline: string | null;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { isBoss } = useBirdieBoss();
  const { frameId, nameplateId, equipFrame, equipNameplate } = useCosmetics();

  const [step, setStep] = useState<"plate" | "frame">("plate");
  const [plateCat, setPlateCat] = useState<string>("all");
  const [frameCat, setFrameCat] = useState<string>("all");
  const [lockedHint, setLockedHint] = useState(false);

  const firstName =
    (user?.user_metadata?.first_name as string | undefined)?.trim() || "You";
  const isFounder = user?.email === FOUNDER_EMAIL;

  const plateUnlocked = (p: PlateDef) =>
    p.tier === "free" || (p.tier === "boss" && isBoss);
  const frameUnlocked = (f: FrameDef) =>
    f.tier === "free" ||
    (f.tier === "boss" && isBoss) ||
    (f.tier === "owner" && isFounder);

  const frameCats = isFounder ? [...FRAME_CATS, "owner"] : FRAME_CATS;

  const plates = NAMEPLATES.filter((p) =>
    plateCat === "all" ? true : p.cat === plateCat
  );
  const frames = FRAMES.filter((f) => f.tier !== "owner" || isFounder).filter(
    (f) =>
      frameCat === "all"
        ? true
        : frameCat === "owner"
        ? f.tier === "owner"
        : f.cat === frameCat
  );

  function tapPlate(p: PlateDef) {
    if (!plateUnlocked(p)) return setLockedHint(true);
    setLockedHint(false);
    void equipNameplate(p.id);
  }
  function tapFrame(f: FrameDef) {
    if (!frameUnlocked(f)) return setLockedHint(true);
    setLockedHint(false);
    void equipFrame(f.id);
  }

  const advance = () =>
    step === "plate" ? setStep("frame") : router.replace("/home");

  const cats = step === "plate" ? PLATE_CATS : frameCats;
  const activeCat = step === "plate" ? plateCat : frameCat;
  const setCat = step === "plate" ? setPlateCat : setFrameCat;

  return (
    <div className={styles.wrap}>
      <div className={styles.panel}>
        <section className={`${styles.screen} ${styles.on}`}>
          <div className={styles.bar}>
            <div className={styles.wordmark}>Make it yours</div>
            <button
              className={styles.iconbtn}
              onClick={advance}
              aria-label="Skip"
              style={{ fontSize: 12, fontWeight: 800 }}
            >
              {step === "plate" ? "Skip" : "Skip"}
            </button>
          </div>

          {/* hero preview on the bird they just chose */}
          <div className={styles.stage}>
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                padding: "10px 6px 2px",
                minHeight: 150,
                alignItems: "center",
              }}
            >
              {step === "plate" ? (
                <Nameplate
                  plateId={nameplateId}
                  avatarId={avatarId}
                  name={firstName}
                  title={tagline}
                  hcp="—"
                />
              ) : (
                <AvatarWithFrame
                  frameId={frameId}
                  avatarId={avatarId}
                  name={firstName}
                  size={128}
                />
              )}
            </div>

            <div className={styles.meta}>
              <div className={styles.name}>
                {step === "plate"
                  ? "Pick your nameplate"
                  : "Pick your border"}
              </div>
              <div className={styles.klass}>
                {step === "plate"
                  ? "The banner behind your name"
                  : "The ring around your birdie"}
              </div>
              {lockedHint ? (
                <div className={styles.lockmsg}>
                  🔒 Locked - unlock these anytime with Birdie Boss in your
                  Profile.
                </div>
              ) : null}
            </div>
          </div>

          <button className={styles.playbtn} onClick={advance}>
            {step === "plate" ? "Continue" : "Enter TourneyBirdie"}
          </button>

          {/* category chips (reusing the birdie tier-tab look) */}
          <div className={styles.tabs} role="tablist">
            {cats.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={activeCat === c}
                className={`${styles.tab} ${
                  activeCat === c ? styles.tabActive : ""
                }`}
                onClick={() => setCat(c)}
              >
                {LABEL[c] ?? c}
              </button>
            ))}
          </div>

          {/* grid of cosmetic tiles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              width: "100%",
              padding: "4px 2px 8px",
              overflowY: "auto",
            }}
          >
            {step === "plate"
              ? plates.map((p) => {
                  const sel = p.id === nameplateId;
                  const locked = !plateUnlocked(p);
                  return (
                    <button
                      key={p.id}
                      onClick={() => tapPlate(p)}
                      aria-pressed={sel}
                      style={{
                        position: "relative",
                        borderRadius: 12,
                        height: 52,
                        border: sel
                          ? `2px solid ${GOLD}`
                          : "2px solid transparent",
                        background:
                          p.bg ||
                          (p.accent
                            ? `linear-gradient(120deg, ${p.accent}, #10271c)`
                            : "#1a2b23"),
                        opacity: locked ? 0.5 : 1,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        padding: 4,
                        boxShadow: sel ? `0 0 0 3px ${GOLD}44` : "none",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: "#fff",
                          textShadow: "0 1px 2px rgba(0,0,0,.6)",
                          lineHeight: 1,
                        }}
                      >
                        {p.name}
                      </span>
                      {locked ? (
                        <span
                          style={{ position: "absolute", top: 4, right: 6 }}
                        >
                          🔒
                        </span>
                      ) : null}
                    </button>
                  );
                })
              : frames.map((f) => {
                  const sel = f.id === frameId;
                  const locked = !frameUnlocked(f);
                  return (
                    <button
                      key={f.id}
                      onClick={() => tapFrame(f)}
                      aria-pressed={sel}
                      title={f.name}
                      style={{
                        position: "relative",
                        borderRadius: 14,
                        padding: 6,
                        border: sel
                          ? `2px solid ${GOLD}`
                          : "2px solid transparent",
                        background: "#0f221b",
                        opacity: locked ? 0.5 : 1,
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "center",
                        boxShadow: sel ? `0 0 0 3px ${GOLD}44` : "none",
                      }}
                    >
                      <AvatarWithFrame
                        frameId={f.id}
                        avatarId={avatarId}
                        name={firstName}
                        size={52}
                      />
                      {locked ? (
                        <span
                          style={{ position: "absolute", top: 2, right: 4 }}
                        >
                          🔒
                        </span>
                      ) : null}
                    </button>
                  );
                })}
          </div>
        </section>
      </div>
    </div>
  );
}
