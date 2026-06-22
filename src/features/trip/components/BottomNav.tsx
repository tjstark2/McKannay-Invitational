import type { Screen } from "@/types";

export function BottomNav({
  activeScreen,
  setActiveScreen
}: {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}) {
  const items: { id: Screen; label: string; icon: string }[] = [
    { id: "overview", label: "Home", icon: "🏠" },
    { id: "addScore", label: "Add", icon: "➕" },
    { id: "teams", label: "Teams", icon: "🏆" },
    { id: "more", label: "More", icon: "⋯" }
  ];

  return (
    <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white px-3 pb-4 pt-2">
      <div className="grid grid-cols-4 items-end gap-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveScreen(item.id)}
            className={`flex flex-col items-center gap-1 rounded-xl px-1 py-1 text-xs font-bold ${
              activeScreen === item.id ? "text-fairway-900" : "text-slate-500"
            }`}
          >
            <span
              className={
                item.id === "addScore"
                  ? "flex h-12 w-12 items-center justify-center rounded-full bg-fairway-900 text-2xl text-white shadow-lg"
                  : "text-xl"
              }
            >
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
