"use client";

import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useBirdieBoss } from "@/features/account/birdieBoss";
import { useCosmetics } from "./useCosmetics";
import { AvatarFrame } from "./AvatarFrame";
import { BossLockUpsell } from "./BossLockUpsell";
import { FRAMES, FOUNDER_EMAIL, frameById, type FrameDef } from "./frames";

type Cat = "All" | "Animated" | "Seasonal" | "Solid" | "Founder";

export function FramePicker({ avatarId }: { avatarId?: string | null }) {
  const { user } = useAuth();
  const { isBoss, upgrade } = useBirdieBoss();
  const { frameId, equipFrame } = useCosmetics();
  const [preview, setPreview] = useState<string | null>(null);
  const [cat, setCat] = useState<Cat>("All");
  const [upsell, setUpsell] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [saved, setSaved] = useState(false);

  const isFounder = user?.email === FOUNDER_EMAIL;
  const shown = preview ?? frameId;

  const unlocked = (f: FrameDef) =>
    f.tier === "free" ||
    (f.tier === "boss" && isBoss) ||
    (f.tier === "owner" && isFounder);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1600);
    return () => clearTimeout(t);
  }, [saved]);

  const cats: Cat[] = isFounder
    ? ["All", "Animated", "Seasonal", "Solid", "Founder"]
    : ["All", "Animated", "Seasonal", "Solid"];

  const visible = FRAMES.filter((f) => {
    if (f.tier === "owner" && !isFounder) return false;
    if (cat === "All") return true;
    if (cat === "Founder") return f.tier === "owner";
    return f.cat === cat.toLowerCase();
  });

  function tap(f: FrameDef) {
    setPreview(f.id);
  }
  function equipSelected() {
    const f = frameById(shown);
    if (unlocked(f)) {
      void equipFrame(f.id);
      setSaved(true);
    } else if (f.tier === "boss") {
      setUpsell(true);
    }
  }
  async function doUpgrade() {
    setUpgrading(true);
    try {
      await upgrade();
    } finally {
      setUpgrading(false);
      setUpsell(false);
    }
  }

  const cur = frameById(shown);

  return (
    <div>
      {/* Sticky preview + save */}
      <div className="sticky top-0 z-10 mb-3 flex flex-col items-center bg-[#f7f6f1]/95 pb-3 pt-1 backdrop-blur">
        <AvatarFrame frameId={shown} avatarId={avatarId} size={116} />
        <p className="mt-2 text-sm font-black text-ink">{cur.name}</p>
        {shown === frameId ? (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-2xl bg-mint/20 px-5 py-2.5 text-sm font-black text-green">
            <Check size={16} /> Equipped
          </span>
        ) : unlocked(cur) ? (
          <button
            onClick={equipSelected}
            className="mt-2 rounded-2xl bg-fairway-900 px-7 py-2.5 text-sm font-black text-white shadow-lg"
          >
            Save &amp; equip
          </button>
        ) : (
          <button
            onClick={equipSelected}
            className="mt-2 inline-flex items-center gap-1.5 rounded-2xl bg-accent px-5 py-2.5 text-sm font-black text-[#1d1402] shadow"
          >
            <Lock size={15} /> Unlock with Birdie Boss
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-black ${
              cat === c
                ? "bg-fairway-900 text-white"
                : "bg-white text-slate-500 border border-line"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {visible.map((f) => {
          const locked = !unlocked(f);
          const equipped = f.id === frameId;
          const selected = f.id === shown;
          return (
            <button
              key={f.id}
              onClick={() => tap(f)}
              title={f.name}
              className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-2 ${
                selected
                  ? "border-fairway-900 bg-fairway-50"
                  : "border-transparent"
              }`}
            >
              <AvatarFrame frameId={f.id} avatarId={avatarId} size={54} />
              <span className="w-full truncate text-center text-[11px] font-bold text-slate-500">
                {f.name}
              </span>
              {equipped ? (
                <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-fairway-900 text-white">
                  <Check size={12} />
                </span>
              ) : locked ? (
                <span className="absolute right-1 top-1 text-slate-400">
                  <Lock size={12} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {saved ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[130] flex justify-center">
          <span className="rounded-full bg-fairway-900 px-5 py-2.5 text-sm font-black text-white shadow-xl">
            ✓ Border equipped
          </span>
        </div>
      ) : null}

      <BossLockUpsell
        open={upsell}
        upgrading={upgrading}
        onUpgrade={doUpgrade}
        onClose={() => setUpsell(false)}
      />
    </div>
  );
}
