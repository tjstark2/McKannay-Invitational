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
      {/* NAV */}
      <nav className="sticky top-0 z-40 border-b border-sand-100 bg-[#f7f6f1]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <IconTile className="h-10 w-10 rounded-xl shadow-sm" />
            <Wordmark className="text-xl" />
          </div>
          <div className="flex items-center gap-5">
            <a href="#how" className="hidden text-sm font-bold text-fairway-900 sm:block">
              How it works
            </a>
            <a href="#features" className="hidden text-sm font-bold text-fairway-900 sm:block">
              Features
            </a>
            <a href="/signin" className="text-sm font-extrabold text-fairway-900">
              Sign in
            </a>
            <a
              href="/signup"
              className="rounded-xl bg-fairway-900 px-5 py-2.5 text-sm font-extrabold text-white"
            >
              Create account
            </a>
          </div>
        </div>
      </nav>

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
      <section id="features" className="mx-auto max-w-6xl px-5 pb-8">
        <p className="text-center font-display text-sm font-extrabold uppercase tracking-[0.14em] text-accent-dark">
          Features
        </p>
        <h2 className="mt-2 text-center font-display text-4xl font-black tracking-tight text-ink">
          Everything your trip needs
        </h2>

        <div className="mt-14 grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="inline-block rounded-full bg-sand-100 px-3 py-1 text-xs font-extrabold tracking-wide text-accent-dark">
              LIVE SCORING
            </span>
            <h3 className="mt-3 font-display text-3xl font-black tracking-tight text-ink">
              Standings that update as you play
            </h3>
            <p className="mt-3 text-lg text-slate-600">
              Best ball, match play, and net score — points tally automatically,
              with confirmed-vs-projected so you always know where the trip stands.
            </p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-sand-100 shadow-xl">
            <img src="/images/heron-point.jpg" alt="Live scoring" className="w-full" />
          </div>
        </div>

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

      {/* FOOTER */}
      <footer className="bg-[#08200f] text-[#bfe0cd]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-4">
          <div>
            <span className="font-display text-xl font-extrabold">
              <span className="text-white">TOURNEY</span>
              <span className="text-accent">BIRDIE</span>
            </span>
            <p className="mt-3 max-w-xs text-sm">
              Create. Invite. Crown. Tournaments made easy — for golf trips and
              group outings.
            </p>
          </div>
          <div>
            <h5 className="mb-3 font-extrabold text-white">Product</h5>
            <a href="#how" className="mb-2 block text-sm">How it works</a>
            <a href="#features" className="mb-2 block text-sm">Features</a>
            <a href="/signup" className="mb-2 block text-sm">Create account</a>
            <a href="/signin" className="mb-2 block text-sm">Sign in</a>
          </div>
          <div>
            <h5 className="mb-3 font-extrabold text-white">Company</h5>
            <a href="#" className="mb-2 block text-sm">About</a>
            <a href="#" className="mb-2 block text-sm">Contact</a>
          </div>
          <div>
            <h5 className="mb-3 font-extrabold text-white">Legal</h5>
            <a href="#" className="mb-2 block text-sm">Privacy Policy</a>
            <a href="#" className="mb-2 block text-sm">Terms of Service</a>
          </div>
        </div>
        <div className="border-t border-[#16482e]">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-5 py-5 text-sm text-[#8fb8a0]">
            <span>© 2026 TourneyBirdie. All rights reserved.</span>
            <span>Create. Invite. Crown.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
