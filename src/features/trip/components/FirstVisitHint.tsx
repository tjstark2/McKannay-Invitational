"use client";

// A one-time hint the first time someone opens a screen.
//
// The old tutorial ran once, up front, when nobody was paying attention, and
// described a layout that no longer exists. This teaches each screen the first
// time you actually arrive at it - when the explanation is useful - and never
// again once dismissed.

import { useEffect, useState } from "react";

export function FirstVisitHint({ id, title, body }: { id: string; title: string; body: string }) {
  const key = `tb_hint_v1_${id}`;
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      // Stay out of the way while the guided tour is running.
      if (localStorage.getItem("tb_spot")) return;
      if (!localStorage.getItem(key)) setShow(true);
    } catch {
      /* storage unavailable - just don't show it */
    }
  }, [key]);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border-2 border-fairway-900 bg-white p-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-black text-ink">{title}</p>
        <p className="mt-0.5 text-[13px] leading-5 text-slate-600">{body}</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-full bg-fairway-900 px-3 py-1.5 text-[12px] font-black text-white"
      >
        Got it
      </button>
    </div>
  );
}
