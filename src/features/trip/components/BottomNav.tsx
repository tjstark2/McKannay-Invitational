import type { Screen } from "@/types";

export function BottomNav({
  activeScreen,
  setActiveScreen,
}: {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}) {
  const items: { id: Screen; label: string; icon: string; primary?: boolean }[] = [
    { id: "overview", label: "The Nest", icon: "🪺" },
    { id: "tournament", label: "Pecking Order", icon: "🏆" },
    { id: "addScore", label: "Tee It Up", icon: "⛳", primary: true },
    { id: "more", label: "Locker", icon: "🗄️" },
  ];

  const tournamentScreens: Screen[] = [
    "tournament",
    "scoreboard",
    "matchCenter",
    "matchDetail",
    "schedule",
    "leaderboard",
    "teams",
    "teamDetail",
    "players",
    "playerProfile",
  ];

  return (
    <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-t-[26px] border-t border-line bg-white/95 px-3 pb-4 pt-2 shadow-[0_-10px_28px_-18px_rgba(11,36,24,0.45)] backdrop-blur">
      <div className="grid grid-cols-4 items-end gap-1">
        {items.map((item) => {
          const active =
            item.id === "tournament"
              ? tournamentScreens.includes(activeScreen)
              : activeScreen === item.id;

          if (item.primary) {
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className="flex flex-col items-center gap-1 text-[11px] font-extrabold text-fairway-900"
              >
                <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-fairway-900 text-2xl text-white shadow-[0_12px_22px_-8px_rgba(19,100,63,0.75)] ring-4 ring-[#f7f6f1]">
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1 text-[11px] font-extrabold ${
                active ? "text-fairway-900" : "text-slate-400"
              }`}
            >
              <span className={`text-xl ${active ? "" : "opacity-50 grayscale"}`}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
