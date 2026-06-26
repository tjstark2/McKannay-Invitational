import { MarketingNav, MarketingFooter } from "@/features/marketing/MarketingChrome";

export function Landing() {
  return (
    <div className="min-h-screen bg-[#f7f6f1] text-ink">
      <MarketingNav />

      {/* HERO */}
      <header className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-sand-100 bg-white px-3 py-1.5 text-xs font-extrabold tracking-wide text-green">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            FOR GOLF TRIPS &amp; GROUP OUTINGS
          </span>
          <h1 className="mt-4 font-display text-5xl font-black leading-[1.03] tracking-tight text-ink md:text-6xl">
            Run your golf trip like a <span className="text-green">real tournament.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600">
            Teams, match play, net scoring, live standings — TourneyBirdie turns
            your buddies&apos; trip into a proper competition everyone can follow
            in real time.
          </p>
          <div className="mt-7 flex items-center gap-3">
            <a
              href="/signup"
              className="rounded-2xl bg-accent px-6 py-3.5 font-display text-base font-extrabold text-ink"
            >
              Create your tournament
            </a>
            <a
              href="/signin"
              className="font-display text-base font-extrabold text-fairway-900"
            >
              Sign in →
            </a>
          </div>
          <p className="mt-6 font-display text-xs font-extrabold tracking-[0.16em] text-accent-dark">
            CREATE · INVITE · CROWN
          </p>
        </div>

        {/* hero image: mascot + live app */}
        <div className="relative flex justify-center">
          <div className="absolute top-8 h-80 w-80 rounded-full bg-accent/30 blur-2xl" />
          <img
            src="/brand/landing-hero.png"
            alt="The TourneyBirdie mascot beside a phone showing live tournament standings"
            className="relative w-full max-w-[480px] drop-shadow-2xl"
          />
        </div>
      </header>

      {/* PROOF */}
      <section className="bg-fairway-900 text-[#cfe6d8]">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-around gap-6 px-5 py-8 text-center">
          {[
            ["5+", "Scoring Formats"],
            ["Live", "Standings & Momentum"],
            ["Net", "Handicap Scoring Built In"],
            ["30", "Birdie Avatars"],
          ].map(([v, k]) => (
            <div key={k}>
              <div className="font-display text-3xl font-black text-accent">{v}</div>
              <div className="mt-1 text-sm">{k}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-center font-display text-sm font-extrabold uppercase tracking-[0.14em] text-accent-dark">
          How it works
        </p>
        <h2 className="mt-2 text-center font-display text-4xl font-black tracking-tight text-ink">
          Get your group on the tee
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            ["1", "Bring your crew", "Add your golf buddies as friends so building rosters takes seconds."],
            ["2", "Build the tournament", "Set your teams, rounds, courses, and formats — done in minutes."],
            ["3", "Pick your Birdie", "Everyone chooses a Birdie avatar that follows them all trip long."],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-3xl border border-sand-100 bg-white p-7 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent font-display text-xl font-black text-ink">
                {n}
              </div>
              <h3 className="mt-4 font-display text-xl font-black text-fairway-900">{t}</h3>
              <p className="mt-2 text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-y border-line bg-[#f3efe6]">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="text-center font-display text-sm font-extrabold uppercase tracking-[0.14em] text-accent-dark">
            Features
          </p>
          <h2 className="mx-auto mt-2 max-w-2xl text-center font-display text-4xl font-black tracking-tight text-ink">
            Everything your trip needs, in one place
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-lg text-slate-600">
            From the first tee to the final putt — set it up, get everyone in,
            and let the competition tell its own story.
          </p>

          {/* spotlight 1 — live leaderboard */}
          <div className="mt-16 grid items-center gap-10 md:grid-cols-2">
            <div>
              <span className="inline-block rounded-full bg-fairway-900/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-fairway-900">
                Live Leaderboard
              </span>
              <h3 className="mt-3 font-display text-3xl font-black tracking-tight text-ink">
                Standings that settle the argument
              </h3>
              <p className="mt-3 text-lg text-slate-600">
                Net and gross handled automatically. Every score you log
                re-ranks the field in real time — with a gold, silver, and
                bronze podium up top.
              </p>
            </div>
            <div className="rounded-[22px] border border-line bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="font-anton text-xl tracking-tight text-ink">Leaderboard</span>
                <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[11px] font-black text-mint-ink">
                  LIVE
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { r: "1", ini: "JM", n: "Jack M.", sc: "\u22126", medal: "#f3b50a", team: "#e5484d" },
                  { r: "2", ini: "RS", n: "Ravi S.", sc: "\u22124", medal: "#aab3bd", team: "#3b82f6" },
                  { r: "3", ini: "LB", n: "Leo B.", sc: "\u22122", medal: "#a87a45", team: "#e5484d" },
                  { r: "4", ini: "AO", n: "Ava O.", sc: "+1", medal: "", team: "#3b82f6" },
                ].map((row) => (
                  <div
                    key={row.r}
                    className="flex items-center gap-3 rounded-xl bg-[#f7f6f1] px-3 py-2"
                  >
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-black"
                      style={{
                        background: row.medal || "#d8dcd6",
                        color: row.medal ? "#0b2418" : "#64748b",
                      }}
                    >
                      {row.r}
                    </span>
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-black text-fairway-900"
                      style={{ boxShadow: `0 0 0 2px ${row.team}` }}
                    >
                      {row.ini}
                    </span>
                    <span className="flex-1 truncate text-sm font-bold text-ink">{row.n}</span>
                    <span className="font-anton text-lg text-fairway-900">{row.sc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* spotlight 2 — team standings with crests */}
          <div className="mt-16 grid items-center gap-10 md:grid-cols-2">
            <div className="rounded-[22px] border border-line bg-white p-6 shadow-xl md:order-1">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                <div>
                  <img src="/brand/team-red.png" alt="" className="mx-auto h-16 w-16 object-contain" />
                  <p className="mt-1 text-sm font-extrabold text-team-north">North</p>
                  <p className="font-anton text-5xl text-team-north">8</p>
                </div>
                <div className="font-anton text-xl text-slate-400">VS</div>
                <div>
                  <img src="/brand/team-blue.png" alt="" className="mx-auto h-16 w-16 object-contain" />
                  <p className="mt-1 text-sm font-extrabold text-team-south">South</p>
                  <p className="font-anton text-5xl text-team-south">4</p>
                </div>
              </div>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-sand-100">
                <span className="bg-team-north" style={{ width: "44%" }} />
                <span className="bg-team-south" style={{ width: "22%" }} />
              </div>
              <p className="mt-3 text-center text-xs font-bold text-slate-500">
                North needs 1.5 to clinch · 6 points still in play
              </p>
            </div>
            <div className="md:order-2">
              <span className="inline-block rounded-full bg-fairway-900/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-fairway-900">
                Teams &amp; Matches
              </span>
              <h3 className="mt-3 font-display text-3xl font-black tracking-tight text-ink">
                Two teams. Every match that matters.
              </h3>
              <p className="mt-3 text-lg text-slate-600">
                Singles, best ball, scramble — set your matchups and watch the
                points swing hole by hole, with your team colors and crests
                carried through the whole app.
              </p>
            </div>
          </div>

          {/* spotlight 3 — live match */}
          <div className="mt-16 grid items-center gap-10 md:grid-cols-2">
            <div>
              <span className="inline-block rounded-full bg-fairway-900/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-fairway-900">
                Follow Live
              </span>
              <h3 className="mt-3 font-display text-3xl font-black tracking-tight text-ink">
                See it unfold, hole by hole
              </h3>
              <p className="mt-3 text-lg text-slate-600">
                A live match center shows who&apos;s up, who&apos;s dormie, and
                which games are still alive — so the whole group can rail the
                action from the cart.
              </p>
            </div>
            <div className="rounded-[22px] border border-line bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  LIVE
                </span>
                <span className="text-xs font-bold text-slate-400">Match 3 · Singles</span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-black text-fairway-900"
                    style={{ boxShadow: "0 0 0 2px #e5484d" }}
                  >
                    CM
                  </span>
                  <span className="text-sm font-bold text-ink">Cole M.</span>
                </div>
                <span className="font-anton text-lg text-team-north">2 UP</span>
              </div>
              <div className="my-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-300">
                through 14
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-black text-fairway-900"
                    style={{ boxShadow: "0 0 0 2px #3b82f6" }}
                  >
                    DT
                  </span>
                  <span className="text-sm font-bold text-ink">Drew T.</span>
                </div>
                <span className="font-anton text-lg text-slate-400">—</span>
              </div>
            </div>
          </div>

          {/* awards */}
          <div className="mt-20 rounded-[24px] border border-line bg-white p-7 shadow-sm">
            <h3 className="text-center font-display text-2xl font-black tracking-tight text-ink">
              A story at the end of every trip
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">
              Automatic awards crown the standouts — and the cautionary tales.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {[
                ["/brand/mvp.png", "MVP"],
                ["/brand/clutch.png", "Clutch"],
                ["/brand/best-net.png", "Best Net"],
                ["/brand/biggest-mover.png", "Biggest Mover"],
                ["/brand/coldest.png", "Ice Cold"],
              ].map(([img, label]) => (
                <div
                  key={label}
                  className="flex flex-col items-center rounded-2xl bg-[#f7f6f1] p-4 text-center"
                >
                  <img src={img} alt="" className="h-16 w-16 object-contain" />
                  <p className="mt-2 text-sm font-black text-fairway-900">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* everything else */}
          <div className="mt-16">
            <h3 className="text-center font-display text-2xl font-black tracking-tight text-ink">
              And everything else your trip needs
            </h3>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Net & Handicap Scoring", "Handicaps and allowances are built in, so net results stay fair and tally automatically."],
                ["Live Momentum", "A momentum bar and current-round race show who's surging in real time."],
                ["Schedule & Tee Times", "Lay out each round's course, date, and tee-time groups in one place."],
                ["Player Profiles", "Tap any golfer for their rounds, results, and how they're trending across the trip."],
                ["Shareable Join Codes", "Every tournament gets a code — text it and your group is in."],
                ["Admin Controls", "Set the active round, manage rosters, and tune scoring on the fly."],
              ].map(([t, b]) => (
                <div key={t} className="rounded-2xl border border-line bg-white p-6">
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-1.5 rounded-[3px] bg-mint" />
                    <h4 className="font-display text-lg font-black text-fairway-900">{t}</h4>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CLUBHOUSE TEASER */}
      <section className="mx-auto max-w-6xl px-5 pb-2 pt-12">
        <div className="overflow-hidden rounded-[28px] bg-[#0b2418] text-white md:flex md:items-center">
          <div className="p-9 md:flex-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-accent">
              Coming soon
            </span>
            <h2 className="mt-4 font-display text-3xl font-black tracking-tight md:text-4xl">
              The Clubhouse — where the trip lives on
            </h2>
            <p className="mt-3 max-w-md text-lg text-[#cfe6d8]">
              Post your photos from the round, talk a little trash in the group
              chat, and turn every trip into a story you’ll be retelling for
              years. The bets, the blow-ups, the hero shots — all in one place.
            </p>
          </div>
          <div className="md:flex-1">
            <img
              src="/brand/birdie-family.png"
              alt=""
              className="mx-auto block w-full max-w-sm object-contain"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="rounded-[28px] bg-gradient-to-br from-fairway-900 to-green p-14 text-center text-white">
          <h2 className="font-display text-4xl font-black tracking-tight">
            Ready to run your next trip?
          </h2>
          <p className="mt-3 text-lg opacity-90">
            Create your tournament free and have your buddies competing by the
            first tee.
          </p>
          <a
            href="/signup"
            className="mt-7 inline-block rounded-2xl bg-accent px-7 py-4 font-display text-base font-extrabold text-ink"
          >
            Create your tournament
          </a>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
