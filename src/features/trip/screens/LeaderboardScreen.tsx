import { formatPlusMinus } from "@/lib/format";
import { buildLeaderboard, getTournamentAwards } from "@/lib/scoring";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useTripState } from "@/features/trip/state/TripStateContext";
import { useLiveRound } from "@/features/trip/scoring/useLiveRound";
import { toParLabel } from "@/features/trip/scoring/liveStandings";
import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { AvatarWithFrame } from "@/features/cosmetics/AvatarWithFrame";

type LbRow = ReturnType<typeof buildLeaderboard>[number];

const TIER: Record<
  number,
  { ring: string; grad: string; ped: string; medalText: string }
> = {
  1: { ring: "#f3b50a", grad: "from-[#ffe393] to-[#f0a500]", ped: "h-24", medalText: "#3a2a00" },
  2: { ring: "#aab3bd", grad: "from-[#eef2f6] to-[#aeb7c1]", ped: "h-20", medalText: "#2b333a" },
  3: { ring: "#a87a45", grad: "from-[#c9a577] to-[#8a5e30]", ped: "h-16", medalText: "#ffffff" },
};

function avgLabel(avg: number | null) {
  if (avg === null) return "-";
  return avg > 0 ? `+${avg.toFixed(1)}` : avg.toFixed(1);
}

function Pod({ row, place }: { row: LbRow; place: number }) {
  const t = TIER[place];
  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="relative">
        {place === 1 ? (
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-lg">👑</span>
        ) : null}
        <span
          className="relative inline-flex rounded-full"
          style={{ boxShadow: `0 0 0 3px #fff, 0 0 0 6px ${t.ring}` }}
        >
          <AvatarWithFrame
            frameId={row.player.frameId}
            avatarId={row.player.avatarId}
            emoji={row.player.avatarEmoji}
            name={row.player.name}
            size={place === 1 ? 56 : 46}
            playerId={row.player.id}
          />
        </span>
        <span
          className="absolute -bottom-1.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white text-[10px] font-black"
          style={{ background: t.ring, color: t.medalText }}
        >
          {place}
        </span>
      </div>
      <p className="mt-2.5 max-w-[88px] truncate text-center text-sm font-extrabold">
        {row.player.name}
      </p>
      <p className="font-anton text-xl leading-none text-fairway-900">
        {row.pointsWon}
        <span className="ml-0.5 font-body text-[10px] font-bold text-slate-400">
          pts
        </span>
      </p>
      <div
        className={`mt-2 flex w-full ${t.ped} items-start justify-center rounded-t-2xl border border-b-0 border-line bg-gradient-to-b ${t.grad}`}
      >
        <span
          className="mt-2 font-anton text-3xl text-white"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,.3)" }}
        >
          {place}
        </span>
      </div>
    </div>
  );
}

function AwardCard({
  img,
  name,
  detail,
}: {
  img: string;
  name: string | undefined;
  detail: string;
}) {
  return (
    <Card className="p-3 text-center">
      <img src={img} alt="" className="mx-auto h-14 w-14 object-contain" />
      <p className="mt-1 truncate text-sm font-black">{name ?? "-"}</p>
      <p className="text-[10px] font-semibold text-slate-500">{detail}</p>
    </Card>
  );
}

export function LeaderboardScreen() {
  const { courses, matches, players, rounds, scores, scoringSettings } =
    useTripState();
  // Live round, for hole-by-hole trips. Empty on a basic 9/18 trip, where a
  // round is a single submitted number and there is nothing "during".
  const live = useLiveRound();

  const leaderboard = buildLeaderboard(
    players,
    rounds,
    matches,
    scores,
    courses,
    scoringSettings
  );

  const awards = getTournamentAwards(
    players,
    rounds,
    matches,
    scores,
    courses,
    scoringSettings
  );

  const [p1, p2, p3] = leaderboard;

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? "-";
  const playerOf = (id: string) => players.find((p) => p.id === id);

  return (
    <div className="space-y-4">
      {/* Live round. This screen used to be empty for the whole of a
          hole-by-hole round, because it only reads published totals - which do
          not exist until a card is signed. */}
      {live.rows.length > 0 && live.round ? (
        <div className="rounded-2xl border-2 border-fairway-900 bg-white p-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs font-black uppercase tracking-wide text-fairway-900">
              Live · {live.round.title}
            </span>
            <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">
              {live.round.finishedAt ? "Final" : "In progress"}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-sand-200 pb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
            <span>Player</span>
            <span className="text-right">Score</span>
            <span className="text-right">To par</span>
            <span className="text-right">Net</span>
          </div>

          {live.rows.map((r) => {
            const p = playerOf(r.playerId);
            return (
              <div
                key={r.playerId}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-b border-sand-100 py-1.5 last:border-0"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <PlayerAvatar
                    avatarId={p?.avatarId}
                    emoji={p?.avatarEmoji}
                    name={p?.name}
                    size={22}
                    playerId={r.playerId}
                    ring={p?.team === "A" ? "#e5484d" : "#3b82f6"}
                  />
                  <span className="truncate text-[13px] font-black text-ink">
                    {nameOf(r.playerId)}
                  </span>
                  <span className="shrink-0 text-[11px] font-bold text-slate-400">
                    thru {r.thru}
                  </span>
                </span>
                <span className="text-right text-[13px] font-black text-ink">{r.gross}</span>
                <span className="text-right text-[13px] font-bold text-slate-500">
                  {toParLabel(r.toPar)}
                </span>
                <span
                  className={`text-right text-[14px] font-black ${
                    r.netToPar < 0 ? "text-emerald-700" : "text-ink"
                  }`}
                >
                  {toParLabel(r.netToPar)}
                </span>
              </div>
            );
          })}

          <p className="mt-2 text-[11px] leading-4 text-slate-400">
            Score is what they actually shot. To par is that against the holes
            played. Net takes their strokes off - that is what decides the match.
          </p>
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <SectionHeader
          title="Leaderboard"
          subtitle="Individual points, net scoring, and awards."
        />
        <img
          src="/brand/leaderboard-birdy.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none -mt-1 h-24 w-auto shrink-0 drop-shadow-[0_10px_14px_rgba(11,36,24,0.35)]"
        />
      </div>

      {leaderboard.length >= 3 ? (
        <div className="flex items-end justify-center gap-2 px-1 pt-3">
          <Pod row={p2} place={2} />
          <Pod row={p1} place={1} />
          <Pod row={p3} place={3} />
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <AwardCard img="/brand/mvp.png" name={awards.mvp?.player.name} detail="Most points" />
        <AwardCard img="/brand/clutch.png" name={awards.clutch?.player.name} detail="Point impact" />
        <AwardCard img="/brand/coldest.png" name={awards.coldest?.player.name} detail="Worst net avg" />
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-5 border-b border-line pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          <div className="col-span-2">Player</div>
          <div className="text-center">Pts</div>
          <div className="text-center">+/-</div>
          <div className="text-center">Avg</div>
        </div>

        {leaderboard.map((row, index) => {
          const place = index + 1;
          const tier = place <= 3 ? TIER[place] : null;
          return (
            <div
              key={row.player.id}
              className="grid grid-cols-5 items-center border-b border-line py-2.5 text-sm last:border-b-0"
            >
              <div className="col-span-2 flex items-center gap-2.5">
                <span
                  className="w-5 text-center font-anton text-base"
                  style={{ color: tier ? tier.ring : "#9aa39c" }}
                >
                  {place}
                </span>
                <AvatarWithFrame
                  frameId={row.player.frameId}
                  avatarId={row.player.avatarId}
                  emoji={row.player.avatarEmoji}
                  name={row.player.name}
                  size={32}
                  playerId={row.player.id}
                />
                <div className="min-w-0">
                  <p className="truncate font-extrabold">{row.player.name}</p>
                  <p className="text-[11px] text-slate-500">
                    Team {row.player.team}
                  </p>
                </div>
              </div>

              <div className="text-center font-anton text-lg">
                {row.pointsWon}
              </div>
              <div className="text-center font-bold text-slate-600">
                {formatPlusMinus(row.totalNetToPar)}
              </div>
              <div className="text-center font-bold text-slate-600">
                {avgLabel(row.averageNetToPar)}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
