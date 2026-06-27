"use client";

import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { useBirdieBoss } from "@/features/account/birdieBoss";
import { useCosmetics } from "./useCosmetics";
import { Nameplate } from "./Nameplate";
import { BossLockUpsell } from "./BossLockUpsell";
import { NAMEPLATES, type PlateDef } from "./nameplates";

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
  const { nameplateId, frameId, equipNameplate } = useCosmetics();
  const [upsell, setUpsell] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const unlocked = (p: PlateDef) => p.tier === "free" || isBoss;

  function tap(p: PlateDef) {
    if (unlocked(p)) void equipNameplate(p.id);
    else setUpsell(true);
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
        Your nameplate shows on your player profile and the roster. Tap one to
        equip.
      </p>
      <div className="space-y-3">
        {NAMEPLATES.map((p) => {
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
                frameId={frameId}
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
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <BossLockUpsell
        open={upsell}
        upgrading={upgrading}
        onUpgrade={doUpgrade}
        onClose={() => setUpsell(false)}
      />
    </div>
  );
}
