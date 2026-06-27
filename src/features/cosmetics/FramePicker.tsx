"use client";

import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useBirdieBoss } from "@/features/account/birdieBoss";
import { useCosmetics } from "./useCosmetics";
import { AvatarFrame } from "./AvatarFrame";
import { BossLockUpsell } from "./BossLockUpsell";
import { FRAMES, FOUNDER_EMAIL, frameById, type FrameDef } from "./frames";

export function FramePicker({ avatarId }: { avatarId?: string | null }) {
  const { user } = useAuth();
  const { isBoss, upgrade } = useBirdieBoss();
  const { frameId, equipFrame } = useCosmetics();
  const [preview, setPreview] = useState<string | null>(null);
  const [upsell, setUpsell] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const isFounder = user?.email === FOUNDER_EMAIL;
  const shown = preview ?? frameId;

  const unlocked = (f: FrameDef) =>
    f.tier === "free" ||
    (f.tier === "boss" && isBoss) ||
    (f.tier === "owner" && isFounder);

  function tap(f: FrameDef) {
    setPreview(f.id);
    if (unlocked(f)) {
      void equipFrame(f.id);
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

  const groups: { label: string; items: FrameDef[] }[] = [
    { label: "Free", items: FRAMES.filter((f) => f.tier === "free") },
    { label: "Birdie Boss", items: FRAMES.filter((f) => f.tier === "boss") },
    {
      label: "Owner exclusive",
      items: FRAMES.filter((f) => f.tier === "owner" && isFounder),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col items-center">
        <AvatarFrame frameId={shown} avatarId={avatarId} size={120} />
        <p className="mt-2 text-sm font-black text-ink">
          {frameById(shown).name}
        </p>
        {shown === frameId ? (
          <p className="text-xs font-bold text-green">Equipped</p>
        ) : unlocked(frameById(shown)) ? (
          <p className="text-xs text-slate-400">Tap to equip</p>
        ) : (
          <p className="text-xs font-bold text-[#a07a06]">Birdie Boss locked</p>
        )}
      </div>

      {groups.map((g) =>
        g.items.length === 0 ? null : (
          <div key={g.label} className="mb-4">
            <p className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-slate-400">
              {g.label}
            </p>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
              {g.items.map((f) => {
                const locked = !unlocked(f);
                const equipped = f.id === frameId;
                return (
                  <button
                    key={f.id}
                    onClick={() => tap(f)}
                    title={f.name}
                    className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-2 ${
                      equipped ? "border-fairway-900 bg-fairway-50" : "border-transparent"
                    }`}
                  >
                    <AvatarFrame frameId={f.id} avatarId={avatarId} size={56} />
                    <span className="truncate text-[11px] font-bold text-slate-500">
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
          </div>
        )
      )}

      <BossLockUpsell
        open={upsell}
        upgrading={upgrading}
        onUpgrade={doUpgrade}
        onClose={() => setUpsell(false)}
      />
    </div>
  );
}
