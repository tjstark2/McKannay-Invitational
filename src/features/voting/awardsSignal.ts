// "Show me the awards again" - any screen can ask, the post-round gate shows
// them. Same tiny pub/sub as signedSignal.

const EVENT = "tb-open-awards";

export function openAwards(roundId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: roundId }));
}

/** Returns an unsubscribe function. */
export function onOpenAwards(handler: (roundId: string) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const wrapped = (e: Event) => {
    const id = (e as CustomEvent<string>).detail;
    if (id) handler(id);
  };
  window.addEventListener(EVENT, wrapped);
  return () => window.removeEventListener(EVENT, wrapped);
}
