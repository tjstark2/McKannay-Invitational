"use client";

import { useMemo, useRef, useState } from "react";
import {
  type Avatar,
  type AvatarTier,
  TIER_META,
  PUBLIC_TIER_TABS,
  UNLOCKED_PUBLIC_TIERS,
  logoUrl,
  cardUrl,
} from "./catalog";
import {
  birdVoice,
  golfSwing,
  tabSound,
  setSoundEnabled,
} from "./sounds";
import styles from "./AvatarFlow.module.css";

type Step = "intro" | "choose" | "paywall";

export function AvatarFlow({
  avatars,
  grantedIds,
  onComplete,
  mode = "firstLogin",
  initialId,
  onCancel,
}: {
  avatars: Avatar[];
  grantedIds: string[];
  onComplete: (avatarId: string) => Promise<{ ok: boolean; error?: string }>;
  mode?: "firstLogin" | "edit";
  initialId?: string;
  onCancel?: () => void;
}) {
  const granted = useMemo(() => new Set(grantedIds), [grantedIds]);
  const isGranted = (a: Avatar) => granted.has(a.id);
  const hasSpecialAccess = useMemo(
    () => avatars.some((a) => a.tier === "special" && granted.has(a.id)),
    [avatars, granted]
  );
  const isUnlocked = (a: Avatar) =>
    a.tier === "special"
      ? isGranted(a)
      : UNLOCKED_PUBLIC_TIERS.includes(a.tier) || isGranted(a);

  const displayable = useMemo(
    () => avatars.filter((a) => a.tier !== "special" || hasSpecialAccess),
    [avatars, hasSpecialAccess]
  );

  const defaultId =
    avatars.find((a) => a.id === "Duckling_Rookie")?.id ?? avatars[0]?.id ?? "";

  const [step, setStep] = useState<Step>(mode === "edit" ? "choose" : "intro");
  const [selectedId, setSelectedId] = useState(initialId || defaultId);
  const [tab, setTab] = useState<AvatarTier | null>("free");
  const [soundOn, setSoundOn] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const byId = (id: string) => avatars.find((a) => a.id === id);
  const selected = byId(selectedId);

  const tabOrder: AvatarTier[] = hasSpecialAccess
    ? [...PUBLIC_TIER_TABS, "special"]
    : PUBLIC_TIER_TABS;
  const visible = tab ? displayable.filter((a) => a.tier === tab) : displayable;

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  function pick(id: string) {
    setSelectedId(id);
    birdVoice(id);
  }
  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next && selectedId) birdVoice(selectedId);
  }
  function chooseTab(t: AvatarTier) {
    const next = tab === t ? null : t;
    setTab(next);
    if (next) tabSound(next);
  }
  function startChoose() {
    golfSwing();
    if (!selectedId) setSelectedId(defaultId);
    setStep("choose");
  }
  function play() {
    const b = selected;
    if (!b) return;
    if (b.tier === "special" && !isGranted(b)) {
      showToast("That birdie is assigned to specific players.");
      return;
    }
    if (!isUnlocked(b)) showToast("That bird’s locked — opening upgrade.");
    birdVoice(b.id);
    if (mode === "edit") {
      complete();
      return;
    }
    setTimeout(() => setStep("paywall"), 380);
  }
  async function complete() {
    if (busy || !selected) return;
    setBusy(true);
    const res = await onComplete(selected.id);
    if (!res.ok) {
      showToast(res.error || "Couldn’t save your bird — please try again.");
      setBusy(false);
    }
    // on success the page navigates away and this component unmounts
  }

  const cssVar = (k: string, v: string) =>
    ({ [k]: v } as React.CSSProperties);

  const tierColor = selected ? TIER_META[selected.tier].color : "#6ee7b7";
  const selUnlocked = selected ? isUnlocked(selected) : true;
  const selSpecial = selected?.tier === "special";

  return (
    <div className={styles.wrap}>
      <div className={styles.panel}>
        {/* INTRO */}
        <section className={`${styles.screen} ${styles.intro} ${step === "intro" ? styles.on : ""}`}>
          <div className={styles.orbits} aria-hidden>
            {avatars.map((a, i) => (
              <div
                key={a.id}
                className={styles.orbWrap}
                style={{
                  left: `${6 + (i % 6) * 16}%`,
                  top: `${9 + Math.floor(i / 6) * 18}%`,
                  animation: `tb-drift ${5 + (i % 6) + (i % 3) * 0.5}s ease-in-out ${(i % 7) * 0.3}s infinite`,
                }}
              >
                <img
                  src={logoUrl(a.id)}
                  alt=""
                  className={styles.orb}
                  style={{
                    animation: `tb-bob ${4 + (i % 5) + (i % 4) * 0.4}s ease-in-out ${(i % 5) * 0.25}s infinite`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className={styles.introContent}>
            <div className={styles.brand}>
              <span className={styles.brandMark}>
                <img src={logoUrl("Bluebird_Founder")} alt="TourneyBirdie mascot" />
              </span>
              <span className={styles.brandWord}>
                Tourney<b>Birdie</b>
              </span>
            </div>
            <h1 className={styles.h1}>
              Ready to Earn <span className={styles.pop}>Your Wings?</span>
            </h1>
            <p className={styles.lede}>
              Your bird is your identity throughout your tournament — on
              leaderboards, scorecards, pairings, and beyond.
            </p>
            <button className={styles.cta} onClick={startChoose}>
              Choose Your Birdie
            </button>
          </div>
        </section>

        {/* CHOOSE */}
        <section className={`${styles.screen} ${step === "choose" ? styles.on : ""}`}>
          <div className={styles.bar}>
            {mode === "edit" && onCancel ? (
              <button className={styles.iconbtn} onClick={onCancel} aria-label="Cancel">
                ✕
              </button>
            ) : (
              <div className={styles.wordmark}>
                Tourney<b>Birdie</b>
              </div>
            )}
            <button className={styles.iconbtn} onClick={toggleSound} aria-label="Toggle sound">
              {soundOn ? "🔊" : "🔇"}
            </button>
          </div>

          <div className={styles.stage}>
            <div
              className={styles.glow}
              style={{ background: `radial-gradient(circle, ${tierColor}, transparent 65%)` }}
            />
            <div className={styles.herowrap}>
              <div
                key={selectedId}
                className={`${styles.hero} ${styles.swap} ${!selUnlocked ? styles.heroLocked : ""}`}
              >
                <span
                  className={styles.tierbadge}
                  style={
                    selSpecial
                      ? { background: "linear-gradient(90deg,#e5484d,#2f9e44)", color: "#fff" }
                      : { background: tierColor, color: "#06140f" }
                  }
                >
                  {selected && isGranted(selected) ? "★ " : ""}
                  {selected ? TIER_META[selected.tier].label : ""}
                </span>
                <span className={styles.lockchip}>🔒 Locked</span>
                {selected ? <img src={cardUrl(selected.id)} alt={`${selected.name} ${selected.klass} card`} /> : null}
              </div>
            </div>
            <div className={styles.meta}>
              <div className={styles.name}>{selected?.name ?? "—"}</div>
              <div className={styles.klass}>
                {selected ? `${selected.klass} · ${TIER_META[selected.tier].label}` : "—"}
              </div>
              {!selUnlocked ? (
                <div className={styles.lockmsg}>
                  {selSpecial
                    ? "Special access — assigned to specific players. Only they can choose it."
                    : "Locked — start playing, then upgrade anytime to switch to Premium & Legendary birdies."}
                </div>
              ) : null}
            </div>
          </div>

          <button
            className={`${styles.playbtn} ${!selUnlocked ? styles.playLocked : ""}`}
            onClick={play}
          >
            {selUnlocked
              ? mode === "edit"
                ? `Use ${selected?.name ?? ""}`
                : `Play as ${selected?.name ?? ""}`
              : selSpecial
              ? "Special access only"
              : "Upgrade to unlock"}
          </button>

          <div className={styles.tabs} role="tablist">
            {tabOrder.map((t) => {
              const active = tab === t;
              const seasonal = t === "seasonal";
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={active}
                  className={[
                    styles.tab,
                    seasonal ? styles.tabSeasonal : "",
                    active ? styles.tabActive : "",
                    active && seasonal ? styles.tabSeasonalActive : "",
                  ].join(" ")}
                  style={cssVar("--m", TIER_META[t].color)}
                  onClick={() => chooseTab(t)}
                >
                  {TIER_META[t].label}
                </button>
              );
            })}
          </div>

          <div className={styles.grid}>
            {visible.length === 0 ? (
              <div className={styles.empty}>Nothing here yet.</div>
            ) : (
              visible.map((a) => {
                const unlocked = isUnlocked(a);
                const sel = a.id === selectedId;
                return (
                  <button
                    key={a.id}
                    className={[
                      styles.tile,
                      sel ? styles.tileSelected : "",
                      !unlocked ? styles.tileLocked : "",
                      isGranted(a) ? styles.tileGranted : "",
                    ].join(" ")}
                    style={cssVar("--sel", TIER_META[a.tier].color)}
                    aria-pressed={sel}
                    aria-label={`${a.name} ${a.klass}${isGranted(a) ? " (yours)" : ""}${unlocked ? "" : " (locked)"}`}
                    onClick={() => pick(a.id)}
                  >
                    <span className={styles.ring} />
                    <img src={logoUrl(a.id)} alt="" />
                    <span className={styles.tlock}>🔒</span>
                    <span className={styles.grant}>★</span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* PAYWALL */}
        <section className={`${styles.screen} ${styles.paywall} ${step === "paywall" ? styles.on : ""}`}>
          <div style={{ flex: 1 }} />
          <div className={styles.sheet}>
            <div className={styles.crown}>♛</div>
            <h2>Go Premium</h2>
            <div className={styles.sub}>
              You’re all set with <b>{selected?.name ?? "your bird"}</b>. Unlock the rest of the clubhouse:
            </div>
            {[
              ["Premium & Legendary birdies", "the full roster, including Mythic and Ace."],
              ["Stats & handicap tracking", "trends across every trip."],
              ["Private tournaments", "invite-only, your rules."],
              ["Ad-free", "just golf."],
            ].map(([title, desc], i) => (
              <div key={title} className={`${styles.perk} ${i === 0 ? styles.perkFirst : ""}`}>
                <span className={styles.dot}>✦</span>
                <div>
                  <b>{title}</b> <span>— {desc}</span>
                </div>
              </div>
            ))}
            <button
              className={styles.cta}
              style={{ marginTop: 18 }}
              onClick={() => showToast("Payments coming soon — this is a placeholder.")}
            >
              Upgrade — $4.99/mo
            </button>
            <button
              className={`${styles.cta} ${styles.ghost}`}
              style={{ marginTop: 10 }}
              onClick={complete}
              disabled={busy}
            >
              {busy ? "Setting your bird…" : "Maybe later"}
            </button>
            <div className={styles.stub}>Placeholder — no real payment. First login only.</div>
          </div>
        </section>

        <div className={`${styles.toast} ${toast ? styles.toastShow : ""}`}>{toast}</div>
      </div>
    </div>
  );
}
