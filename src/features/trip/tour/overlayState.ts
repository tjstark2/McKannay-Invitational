// Tiny shared registry so full-screen overlays (post-round awards, voting
// reveal) can tell the guided tour to wait its turn. Without this the tour
// spotlights render on top of the awards screen, which is what Wade hit:
// tour boxes floating over a "Match 2 Awards" background.

const open = new Set<string>();
const EVENT = "tb-overlay-change";

export function setOverlayOpen(key: string, isOpen: boolean) {
  const had = open.has(key);
  if (isOpen) open.add(key);
  else open.delete(key);
  if (had !== isOpen && typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

export function isAnyOverlayOpen(): boolean {
  return open.size > 0;
}

/** Runs `fn` as soon as nothing is covering the screen. Returns a cleanup. */
export function whenOverlaysClear(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (!isAnyOverlayOpen()) {
    fn();
    return () => {};
  }
  const handler = () => {
    if (!isAnyOverlayOpen()) {
      window.removeEventListener(EVENT, handler);
      fn();
    }
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
