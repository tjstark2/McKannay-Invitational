import type { Screen } from "@/types";

export function BottomNav({
  activeScreen,
  setActiveScreen,
}: {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}) {
  const items: { id: Screen; label: string; icon: string; primary?: boolean }[] = [
    { id: "overview", label: "Overview", icon: "🏠" },
    { id: "tournament", label: "Tournament", icon: "🏆" },
    { id: "addScore", label: "Log Round", icon: "⛳", primary: true },
    { id: "more", label: "More", icon: "⋯" },
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
    <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white px-3 pb-4 pt-2">
      <div className="grid grid-cols-4 items-end gap-1">
        {items.map((item) => {
          const active =
            item.id === "tournament"
              ? tournamentScreens.includes(activeScreen)
              : activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1 text-xs font-bold ${
                active ? "text-fairway-900" : "text-slate-500"
              }`}
            >
              <span
                className={
                  item.primary
                    ? "flex h-12 w-12 items-center justify-center rounded-full bg-fairway-900 text-2xl text-white shadow-lg"
                    : "text-xl"
                }
              >
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