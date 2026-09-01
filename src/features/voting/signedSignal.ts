// Signing a card should open the awards vote immediately.
//
// The vote used to be picked up by a reactive effect watching several loaded
// collections (scores, votes, confirmations). By the moment you sign, at least
// one of those has not caught up, so the vote silently never opened. Rather
// than make that effect cleverer, signing now says so directly and the gate
// listens - the same tiny pub/sub pattern the guided tour already uses for
// overlays.

const EVENT = "tb-round-signed";

/** Called by the card-signing flow the instant a signature is recorded. */
export function announceSigned(roundId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: roundId }));
}

/** Returns an unsubscribe function. */
export function onSigned(handler: (roundId: string) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const wrapped = (e: Event) => {
    const id = (e as CustomEvent<string>).detail;
    if (id) handler(id);
  };
  window.addEventListener(EVENT, wrapped);
  return () => window.removeEventListener(EVENT, wrapped);
}
