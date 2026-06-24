import { MarketingNav, MarketingFooter } from "@/features/marketing/MarketingChrome";

function IconTile({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center overflow-hidden bg-white ${className}`}
    >
      <img
        src="/logo-icon.png"
        alt="TourneyBirdie"
        className="h-[82%] w-[82%] object-contain"
      />
    </span>
  );
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      <span className="text-ink">TOURNEY</span>
      <span className="text-green">BIRDIE</span>
    </span>
  );
}

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

        {/* hero phone */}
        <div className="relative flex justify-center">
          <div className="absolute top-8 h-80 w-80 rounded-full bg-accent/30 blur-2xl" />
          <div className="relative w-[300px] overflow-hidden rounded-[34px] border-[7px] border-[#0c1f15] bg-[#f7f6f1] shadow-2xl">
            <div className="relative h-40">
              <img src="/images/header.jpg" alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#082014]/90 to-[#0b3d25]/30" />
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1 shadow-md">
                <IconTile className="h-6 w-6 rounded-md" />
                <Wordmark className="text-xs" />
              </div>
              <div className="absolute bottom-3 left-0 right-0 text-center text-white">
                <p className="text-[8px] font-extrabold tracking-[0.18em] opacity-90">
                  HILTON HEAD ISLAND, SC
                </p>
                <h4 className="font-display text-sm font-black">McKannay Invitational</h4>
              </div>
            </div>
            <div className="p-3">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="h-3 w-1 rounded bg-accent" />
                <b className="text-[13px] font-black text-fairway-900">Live Round</b>
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-black text-red-700">
                  <span className="h-1 w-1 rounded-full bg-red-500" />
                  LIVE
                </span>
              </div>
              <div className="mb-2.5 overflow-hidden rounded-xl border border-sand-100">
                <div className="relative h-20">
                  <img src="/images/heron-point.jpg" alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#082014]/90 to-[#0b3d25]/30" />
                  <div className="absolute bottom-2 left-2.5 text-white">
                    <div className="text-[9px] font-bold text-[#cfe6d8]">Round 3 · Net</div>
                    <div className="font-display text-sm font-black">Heron Point</div>
                  </div>
                </div>
              </div>
              <div className="mb-2 flex items-center gap-1.5">
                <span className="h-3 w-1 rounded bg-accent" />
                <b className="text-[13px] font-black text-fairway-900">Trip Standings</b>
              </div>
              <div className="rounded-xl border border-sand-100 bg-white p-3">
                <div className="flex items-center justify-around text-center">
                  <div>
                    <div className="text-[10px] font-extrabold text-fairway-900">Team North</div>
                    <div className="font-display text-3xl font-black text-fairway-900">8</div>
                  </div>
                  <div className="text-lg">🏆</div>
                  <div>
                    <div className="text-[10px] font-extrabold text-green">Team South</div>
                    <div className="font-display text-3xl font-black text-green">4</div>
                  </div>
                </div>
                <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-sand-100">
                  <span className="bg-fairway-900" style={{ width: "44%" }} />
                  <span className="bg-green" style={{ width: "23%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* PROOF */}
      <section className="bg-fairway-900 text-[#cfe6d8]">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-around gap-6 px-5 py-8 text-center">
          {[
            ["5+", "Scoring formats"],
            ["Live", "Standings & momentum"],
            ["Net", "Handicap scoring built in"],
            ["Year / year", "History & champions"],
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
          Up and running in minutes
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            ["1", "Create", "Set up your tournament — teams, rounds, courses, and scoring."],
            ["2", "Invite", "Share a join code. Your buddies create an account and they're on the roster."],
            ["3", "Crown", "Enter scores as you play, watch standings update live, and crown your champion."],
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
      <section id="features" className="mx-auto max-w-6xl px-5 pb-8 pt-4">
        <p className="text-center font-display text-sm font-extrabold uppercase tracking-[0.14em] text-accent-dark">
          Features
        </p>
        <h2 className="mt-2 text-center font-display text-4xl font-black tracking-tight text-ink">
          From first tee to final scoreboard
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-lg text-slate-600">
          TourneyBirdie runs the whole journey — set it up, get everyone in,
          play it out, and crown a winner.
        </p>

        {/* journey strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm font-extrabold">
          {["Create", "Invite", "Teams", "Schedule", "Log scores", "Scoreboard", "Crown"].map(
            (step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-sand-100 bg-white px-3 py-1.5 text-fairway-900">
                  {step}
                </span>
                {i < arr.length - 1 ? (
                  <span className="text-accent-dark">→</span>
                ) : null}
              </span>
            )
          )}
        </div>

        {/* spotlight 1 — set up */}
        <div className="mt-16 grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="inline-block rounded-full bg-sand-100 px-3 py-1 text-xs font-extrabold tracking-wide text-accent-dark">
              SET UP IN MINUTES
            </span>
            <h3 className="mt-3 font-display text-3xl font-black tracking-tight text-ink">
              Create your tournament, your way
            </h3>
            <p className="mt-3 text-lg text-slate-600">
              Name it, set a join code, build two teams, and add your rounds,
              courses, and tee times. Choose best ball, match play, or net score
              for each round — TourneyBirdie handles the scoring math.
            </p>
          </div>
          <div className="rounded-3xl border border-sand-100 bg-white p-6 shadow-xl">
            <div className="space-y-3">
              <div className="rounded-xl bg-sand-50 px-4 py-3">
                <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                  Tournament name
                </div>
                <div className="font-display font-black text-ink">
                  3rd Annual McKannay Invitational
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-sand-50 px-4 py-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                    Join code
                  </div>
                  <div className="font-display font-black text-fairway-900">MCK2027</div>
                </div>
                <div className="rounded-xl bg-sand-50 px-4 py-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                    Teams
                  </div>
                  <div className="font-display font-black text-ink">
                    <span className="text-fairway-900">North</span> v{" "}
                    <span className="text-green">South</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {["R1 · Best Ball", "R2 · Match Play", "R3 · Net"].map((r) => (
                  <span
                    key={r}
                    className="rounded-full bg-fairway-900/10 px-3 py-1 text-xs font-extrabold text-fairway-900"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* spotlight 2 — log scores live */}
        <div className="mt-16 grid items-center gap-12 md:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-sand-100 shadow-xl md:order-2">
            <img src="/images/heron-point.jpg" alt="Live scoring" className="w-full" />
          </div>
          <div className="md:order-1">
            <span className="inline-block rounded-full bg-sand-100 px-3 py-1 text-xs font-extrabold tracking-wide text-accent-dark">
              LIVE SCORING
            </span>
            <h3 className="mt-3 font-display text-3xl font-black tracking-tight text-ink">
              Log scores as you play
            </h3>
            <p className="mt-3 text-lg text-slate-600">
              Enter scores hole by hole or round by round. Standings, matches,
              and awards update instantly — with confirmed-vs-projected so you
              always know where the trip really stands.
            </p>
          </div>
        </div>

        {/* spotlight 3 — teams & matches */}
        <div className="mt-16 grid items-center gap-12 md:grid-cols-2">
          <div className="rounded-3xl border border-sand-100 bg-white p-8 shadow-xl md:order-2">
            <div className="flex items-center justify-around text-center">
              <div>
                <div className="text-sm font-extrabold text-fairway-900">Team North</div>
                <div className="font-display text-5xl font-black text-fairway-900">8</div>
              </div>
              <div className="text-3xl">🏆</div>
              <div>
                <div className="text-sm font-extrabold text-green">Team South</div>
                <div className="font-display text-5xl font-black text-green">4</div>
              </div>
            </div>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-sand-100">
              <span className="bg-fairway-900" style={{ width: "44%" }} />
              <span className="bg-green" style={{ width: "23%" }} />
            </div>
          </div>
          <div className="md:order-1">
            <span className="inline-block rounded-full bg-sand-100 px-3 py-1 text-xs font-extrabold tracking-wide text-accent-dark">
              TEAMS &amp; MATCHES
            </span>
            <h3 className="mt-3 font-display text-3xl font-black tracking-tight text-ink">
              Two teams. Every match that matters.
            </h3>
            <p className="mt-3 text-lg text-slate-600">
              Set rosters, run singles and best-ball matches, and track momentum
              hole by hole — with team colors carried through the whole app.
            </p>
          </div>
        </div>

        {/* feature grid */}
        <div className="mt-20">
          <h3 className="text-center font-display text-2xl font-black tracking-tight text-ink">
            And everything else your trip needs
          </h3>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["\u26F3", "Net & handicap scoring", "Handicaps and allowances are built in, so net results stay fair and tally automatically."],
              ["\uD83D\uDD52", "Schedule & tee times", "Lay out each round's course, date, and tee-time groups in one place."],
              ["\uD83C\uDFC6", "Awards & highlights", "Automatic MVP, hot rounds, biggest movers, and round highlights."],
              ["\uD83D\uDD17", "Shareable links", "Every tournament gets its own link — text it and your group is in."],
              ["\uD83D\uDCCA", "Confirmed vs projected", "See locked-in points and what's still in play, at a glance."],
              ["\u2699\uFE0F", "Admin controls", "Run the show: set the active round, manage rosters, and tune scoring."],
            ].map(([icon, title, body]) => (
              <div
                key={title}
                className="rounded-2xl border border-sand-100 bg-white p-6"
              >
                <div className="text-3xl">{icon}</div>
                <h4 className="mt-3 font-display text-lg font-black text-fairway-900">
                  {title}
                </h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
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
