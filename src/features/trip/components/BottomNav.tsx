import type { Screen } from "@/types";

/**
 * Four tabs, down from five. The first one changes what it IS with the state
 * of the tournament: Home between rounds, Round while one is live - where you
 * score. The nav never changes shape, so nobody gets lost; what changes is
 * what home means.
 */
export function BottomNav({
  activeScreen,
  setActiveScreen,
  clubhouseUnread = 0,
  roundLive = false,
}: {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
  clubhouseUnread?: number;
  /** A round is being played right now. */
  roundLive?: boolean;
}) {
  const items: { id: Screen; label: string; img: string }[] = [
    roundLive
      ? { id: "overview", label: "Round", img: "/brand/tee-it-up.png" }
      : { id: "overview", label: "Home", img: "/brand/the-nest.png" },
    { id: "tournament", label: "Standings", img: "/brand/pecking-order.png" },
    { id: "trip", label: "Trip", img: "/brand/locker.png" },
    { id: "clubhouse", label: "Clubhouse", img: "/brand/clubhouse.png" },
  ];

  // Which tab lights up for screens reached from inside it.
  const tabFor = (screen: Screen): Screen => {
    if (["tournament", "scoreboard", "matchCenter", "matchDetail", "leaderboard"].includes(screen)) return "tournament";
    if (["trip", "schedule", "teams", "teamDetail", "players", "rules", "courseDetail", "more"].includes(screen)) return "trip";
    if (["overview", "addScore", "playerProfile"].includes(screen)) return "overview";
    return screen;
  };

  return (
    <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-t-[26px] border-t border-line bg-white/95 px-3 pb-4 pt-2 shadow-[0_-10px_28px_-18px_rgba(11,36,24,0.45)] backdrop-blur">
      <div className="grid grid-cols-4 items-end gap-1">
        {items.map((item) => {
          const active = tabFor(activeScreen) === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`flex flex-col items-center gap-1 text-[10px] font-extrabold leading-tight ${
                active ? "text-fairway-900" : "text-slate-400"
              }`}
            >
              <span className="relative -mt-7 inline-flex">
                <span
                  className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-white ring-4 ring-[#f7f6f1] transition ${
                    active
                      ? "scale-[1.18] -translate-y-1.5 border-[3px] border-fairway-900 shadow-[0_18px_28px_-8px_rgba(19,100,63,0.65)]"
                      : "border border-line shadow-[0_10px_20px_-8px_rgba(11,36,24,0.4)]"
                  }`}
                >
                  <img
                    src={item.img}
                    alt={item.label}
                    className="h-full w-full object-contain"
                  />
                </span>
                {item.id === "clubhouse" && clubhouseUnread > 0 ? (
                  <span className="absolute -right-1 -top-1 z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-team-north px-1 text-[10px] font-black text-white ring-2 ring-white">
                    {clubhouseUnread > 99 ? "99+" : clubhouseUnread}
                  </span>
                ) : null}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
