"use client";

// A sheet that slides up over the current screen.
//
// Detail used to be a separate screen: tap a player or a match and you left
// where you were, then had to find your way back. Now detail opens on top and
// dismisses back to exactly where you were - which is most of why the app
// felt like a maze.

import { useEffect, type ReactNode } from "react";

export function Sheet({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Read out to screen readers when the sheet opens. */
  label: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Stop the page underneath scrolling while the sheet is up.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[26px] bg-[#f7f6f1] px-5 pb-8 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-1.5 w-12 rounded-full bg-slate-300"
          />
        </div>
        {children}
      </div>
    </div>
  );
}
