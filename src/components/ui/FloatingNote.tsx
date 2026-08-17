"use client";

import { useEffect } from "react";

/**
 * A message that floats above the page instead of rendering inline.
 *
 * Inline notices in these long scrolling admin tabs have burned hours of
 * testing: the action worked (or was correctly refused) but the message drew
 * far up or down the page, so the button looked dead. Anything the person
 * needs to read right after tapping belongs here.
 */
export function FloatingNote({
  text,
  tone = "info",
  onDone,
  ms = 4000,
}: {
  text: string | null;
  tone?: "info" | "error";
  onDone: () => void;
  ms?: number;
}) {
  useEffect(() => {
    if (!text) return;
    // Errors stay put until dismissed - they usually need reading twice.
    if (tone === "error") return;
    const t = setTimeout(onDone, ms);
    return () => clearTimeout(t);
  }, [text, tone, ms, onDone]);

  if (!text) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[200] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-2xl px-4 py-3 shadow-lg ${
          tone === "error" ? "bg-red-600 text-white" : "bg-fairway-900 text-white"
        }`}
      >
        <span className="text-[13px] font-bold leading-5">{text}</span>
        <button
          type="button"
          onClick={onDone}
          aria-label="Dismiss"
          className="tb-tap-target shrink-0 font-black opacity-80"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
