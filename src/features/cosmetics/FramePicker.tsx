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
  }

  function equipSelected() {
    const f = frameById(shown);
    if (unlocked(f)) void equipFrame(f.id);
    else if (f.tier === "boss") setUpsell(true);
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
      <div className="sticky top-0 z-10 mb-4 flex flex-col items-center bg-[#f7f6f1]/95 pb-3 pt-1 backdrop-blur">
        <AvatarFrame frameId={shown} avatarId={avatarId} size={120} />
        <p className="mt-2 text-sm font-black text-ink">
          {frameById(shown).name}
        </p>
        {shown === frameId ? (
          <button
            disabled
            className="mt-2 inline-flex items-center gap-1.5 rounded-2xl bg-mint/20 px-5 py-2.5 text-sm font-black text-green"
          >
            <Check size={16} /> Equipped
          </button>
        ) : unlocked(frameById(shown)) ? (
          <button
            onClick={equipSelected}
            className="mt-2 rounded-2xl bg-fairway-900 px-6 py-2.5 text-sm font-black text-white shadow"
          >
            Equip this ring
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
