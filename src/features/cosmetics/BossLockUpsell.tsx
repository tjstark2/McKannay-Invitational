"use client";

import { X } from "lucide-react";

export function BossLockUpsell({
  open,
  onClose,
  onUpgrade,
  upgrading,
}: {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  upgrading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xs overflow-hidden rounded-3xl border-2 border-accent/60 bg-white shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 z-10 rounded-lg p-1 text-white/80"
        >
          <X size={18} />
        </button>
        <div className="bg-gradient-to-br from-[#1d1402] to-[#3a2a06] px-5 py-5 text-center text-white">
          <div className="text-4xl">👑</div>
          <p className="mt-1 font-anton text-xl tracking-tight">
            Become a Birdie Boss?
          </p>
        </div>
        <div className="p-5 text-center">
          <p className="text-sm font-semibold text-slate-600">
            Frames, nameplates, and avatars like this are a Birdie Boss perk -
            plus Boss reaction stickers and an ad-free app. Free while in preview.
          </p>
          <button
            onClick={onUpgrade}
            disabled={upgrading}
            className="mt-4 w-full rounded-2xl bg-accent px-4 py-3 font-black text-[#1d1402] disabled:opacity-50"
          >
            {upgrading ? "Upgrading…" : "Become a Birdie Boss"}
          </button>
          <button
            onClick={onClose}
            className="mt-1 w-full rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-500"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
