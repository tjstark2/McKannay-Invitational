"use client";

import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import { useBirdieBoss } from "@/features/account/birdieBoss";
import { useCosmetics } from "./useCosmetics";
import { Nameplate } from "./Nameplate";
import { BossLockUpsell } from "./BossLockUpsell";
import { NAMEPLATES, type PlateDef } from "./nameplates";

type Cat = "All" | "Banners" | "Bars" | "Animated" | "Seasonal";

export function NameplatePicker({
  avatarId,
  name,
  title,
  hcp,
  wins,
}: {
  avatarId?: string | null;
  name?: string | null;
  title?: string | null;
  hcp?: string | number | null;
  wins?: string | number | null;
}) {
  const { isBoss, upgrade } = useBirdieBoss();
  const { nameplateId, equipNameplate } = useCosmetics();
  const [cat, setCat] = useState<Cat>("All");
  const [upsell, setUpsell] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [saved, setSaved] = useState(false);

  const unlocked = (p: PlateDef) => p.tier === "free" || isBoss;

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1600);
    return () => clearTimeout(t);
  }, [saved]);

  const cats: Cat[] = ["All", "Banners", "Bars", "Animated", "Seasonal"];
  const catKey: Record<Cat, string | null> = {
    All: null,
    Banners: "banner",
    Bars: "bar",
    Animated: "animated",
    Seasonal: "seasonal",
  };
  const visible = NAMEPLATES.filter(
    (p) => cat === "All" || p.cat === catKey[cat]
  );

  function tap(p: PlateDef) {
    if (unlocked(p)) {
      void equipNameplate(p.id);
      setSaved(true);
    } else setUpsell(true);
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

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        Tap a nameplate to equip it - it shows on your player profile and the
        roster.
      </p>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-black ${
              cat === c
                ? "bg-fairway-900 text-white"
                : "border border-line bg-white text-slate-500"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((p) => {
          const locked = !unlocked(p);
          const equipped = p.id === nameplateId;
          return (
            <button
              key={p.id}
              onClick={() => tap(p)}
              className={`relative block w-full rounded-2xl border-2 p-1.5 text-left ${
                equipped ? "border-fairway-900" : "border-transparent"
              }`}
            >
              <Nameplate
                plateId={p.id}
                avatarId={avatarId}
                name={name}
                title={title}
                hcp={hcp}
                wins={wins}
              />
              <div className="mt-1 flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-500">
                  {p.name}
                  {p.tier === "boss" ? (
                    <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-black uppercase text-[#a07a06]">
                      Boss
                    </span>
                  ) : (
                    <span className="ml-2 rounded-full bg-mint/20 px-2 py-0.5 text-[10px] font-black uppercase text-green">
                      Free
                    </span>
                  )}
                </span>
                {equipped ? (
                  <span className="inline-flex items-center gap-1 text-xs font-black text-fairway-900">
                    <Check size={14} /> Equipped
                  </span>
                ) : locked ? (
                  <Lock size={14} className="text-slate-400" />
                ) : (
                  <span className="text-xs font-black text-fairway-900">
                    Tap to equip
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {saved ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[130] flex justify-center">
          <span className="rounded-full bg-fairway-900 px-5 py-2.5 text-sm font-black text-white shadow-xl">
            ✓ Nameplate equipped
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
