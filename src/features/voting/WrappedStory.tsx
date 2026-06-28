import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { AWARDS } from "@/features/voting/awards";
import { roundAwardWinners, tripAwardWinners } from "@/features/voting/tally";
import {
  buildTeamSummaries,
  getTournamentAwards,
} from "@/lib/scoring";
import {
  WrappedExportCard,
  type WrappedData,
} from "@/features/voting/WrappedExportCard";

export function WrappedStory({ onClose }: { onClose: () => void }) {
  const {
    trip,
    teams,
    players,
    rounds,
    matches,
    scores,
    courses,
    scoringSettings,
    votes,
  } = useTripState();

  const exportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const nameFor = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Someone";

  const teamSummaries = useMemo(
    () =>
      buildTeamSummaries(
        teams,
        players,
        rounds,
        matches,
        scores,
        courses,
        scoringSettings
      ),
    [teams, players, rounds, matches, scores, courses, scoringSettings]
  );
  const champion = useMemo(
    () => [...teamSummaries].sort((a, b) => b.points - a.points)[0] ?? null,
    [teamSummaries]
  );
  const championMembers = useMemo(
    () =>
      champion
        ? players.filter((p) => p.team === champion.teamId).map((p) => p.name)
        : [],
    [champion, players]
  );

  const awards = useMemo(
    () =>
      getTournamentAwards(players, rounds, matches, scores, courses, scoringSettings),
    [players, rounds, matches, scores, courses, scoringSettings]
  );
  const mvpName = awards.mvp?.player.name ?? null;
  const mvpDetail = awards.mvp ? `Most points · ${awards.mvp.pointsWon} pts` : null;

  const cumulative = useMemo(
    () =>
      AWARDS.map((a) => {
        const w = tripAwardWinners(votes, a.key);
        return { key: a.key, title: a.title, names: w.winnerIds.map(nameFor) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [votes, players]
  );

  const exportData: WrappedData = {
    tripName: trip.name,
    dates: trip.dates ?? "",
    championTeam: champion?.teamName ?? null,
    championMembers,
    mvpName,
    mvpDetail,
    cumulative,
  };

  // Screens: cover, one per round (with votes), champions, final.
  const roundScreens = rounds.filter((r) =>
    votes.some((v) => v.roundId === r.id)
  );
  const total = 1 + roundScreens.length + 2;
  const [idx, setIdx] = useState(0);
  const next = () => setIdx((i) => Math.min(total - 1, i + 1));
  const back = () => setIdx((i) => Math.max(0, i - 1));

  const isCover = idx === 0;
  const roundPos = idx - 1;
  const isRound = roundPos >= 0 && roundPos < roundScreens.length;
  const isChampions = idx === 1 + roundScreens.length;
  const isFinal = idx === total - 1;

  async function download() {
    if (!exportRef.current) return;
    setDownloading(true);
    try {
      const url = await toPng(exportRef.current, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `${trip.name.replace(/[^a-z0-9]+/gi, "-")}-wrapped.png`;
      link.href = url;
      link.click();
    } catch {
      // no-op; the on-screen card is still visible
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[140] flex justify-center bg-black/70">
      <div className="relative flex w-full max-w-md flex-col overflow-hidden bg-[linear-gradient(180deg,#1a4630,#0a2017)] text-[#f4efe2]">
        {/* progress */}
        <div className="absolute left-3 right-3 top-3 z-20 flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{ background: i <= idx ? "#e7c869" : "rgba(255,255,255,0.2)" }}
            />
          ))}
        </div>
        {/* tap zones (disabled on final so buttons are reachable) */}
        {!isFinal ? (
          <div className="absolute inset-0 z-10 flex">
            <button className="flex-1" aria-label="Back" onClick={back} />
            <button className="flex-1" aria-label="Next" onClick={next} />
          </div>
        ) : null}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-6 z-30 rounded-full bg-white/10 px-2.5 py-1 text-lg font-black text-white/80"
        >
          ×
        </button>

        <div className="relative z-0 flex flex-1 flex-col items-center justify-center px-8 py-14 text-center">
          {isCover ? (
            <>
              <div className="text-6xl">🐦</div>
              <h1 className="mt-3 font-anton text-6xl leading-none">
                TRIP
                <br />
                WRAPPED
              </h1>
              <div className="mt-4 rounded-full border border-accent/50 px-5 py-2 font-anton">
                {trip.name} · {trip.dates}
              </div>
              <p className="mt-8 text-sm text-[#9fb6a6]">Tap to relive the trip →</p>
            </>
          ) : isRound ? (
            (() => {
              const r = roundScreens[roundPos];
              return (
                <>
                  <p className="font-anton text-base tracking-[0.2em] text-accent">
                    {r.title.toUpperCase()}
                  </p>
                  <p className="mt-1 text-sm text-[#9fb6a6]">Award winners</p>
                  <div className="mt-6 w-full space-y-3">
                    {AWARDS.map((a) => {
                      const w = roundAwardWinners(votes, r.id, a.key);
                      if (w.winnerIds.length === 0) return null;
                      return (
                        <div
                          key={a.key}
                          className="flex items-center gap-3 rounded-2xl bg-white/5 p-3"
                        >
                          <img src={a.badge} alt="" className="h-12 w-auto" />
                          <div className="text-left">
                            <div className="font-anton text-xs tracking-wide text-[#d6b66a]">
                              {a.title}
                            </div>
                            <div className="font-anton text-lg">
                              {w.winnerIds.map(nameFor).join(" & ")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()
          ) : isChampions ? (
            <>
              <div className="text-6xl">🏆</div>
              <p className="mt-2 font-anton text-base tracking-[0.2em] text-[#d6b66a]">
                YOUR CHAMPIONS
              </p>
              <h2 className="mt-1 font-anton text-5xl">
                {champion?.teamName ?? "-"}
              </h2>
              <p className="mt-4 text-sm text-[#cfe0d6]">
                {championMembers.join(" · ")}
              </p>
              <span className="mt-5 rounded-full bg-accent px-5 py-2 font-anton text-[#10271c]">
                {champion?.points ?? 0} pts
              </span>
            </>
          ) : (
            // FINAL: preview (scaled) + download
            <>
              <div
                className="overflow-hidden rounded-2xl"
                style={{ width: 324, height: 576 }}
              >
                <div style={{ transform: "scale(0.3)", transformOrigin: "top left" }}>
                  <WrappedExportCard data={exportData} />
                </div>
              </div>
              <button
                onClick={download}
                disabled={downloading}
                className="mt-5 rounded-full bg-gradient-to-r from-[#f1d99a] to-[#d6b66a] px-7 py-3 font-anton text-[#0a2017]"
              >
                {downloading ? "Saving…" : "⬇ Save to Camera Roll"}
              </button>
              <button
                onClick={onClose}
                className="mt-3 text-sm font-semibold text-[#9fb6a6]"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hidden full-size node used for the PNG export */}
      <div style={{ position: "fixed", top: 0, left: -20000, pointerEvents: "none" }}>
        <WrappedExportCard ref={exportRef} data={exportData} />
      </div>
    </div>
  );
}
