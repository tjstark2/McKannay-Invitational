function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      <span className="text-ink">TOURNEY</span>
      <span className="text-green">BIRDIE</span>
    </span>
  );
}

export function MarketingPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f6f1] text-ink">
      <nav className="border-b border-sand-100 bg-[#f7f6f1]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <a href="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
              <img
                src="/logo-icon.png"
                alt="TourneyBirdie"
                className="h-[82%] w-[82%] object-contain"
              />
            </span>
            <Wordmark className="text-xl" />
          </a>
          <a
            href="/signup"
            className="rounded-xl bg-fairway-900 px-5 py-2.5 text-sm font-extrabold text-white"
          >
            Create account
          </a>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-4xl font-black tracking-tight text-ink">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-slate-500">{subtitle}</p>
        ) : null}
        <div className="mt-8 space-y-4 leading-7 text-slate-600 [&>h2]:mt-8 [&>h2]:font-display [&>h2]:text-xl [&>h2]:font-black [&>h2]:text-ink [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-6 [&>a]:font-bold [&>a]:text-fairway-900">
          {children}
        </div>
      </main>

      <footer className="border-t border-sand-100">
        <div className="mx-auto flex max-w-3xl flex-wrap justify-between gap-2 px-5 py-6 text-sm text-slate-400">
          <span>© 2026 TourneyBirdie. All rights reserved.</span>
          <span className="flex gap-4">
            <a href="/about" className="hover:text-fairway-900">About</a>
            <a href="/privacy" className="hover:text-fairway-900">Privacy</a>
            <a href="/terms" className="hover:text-fairway-900">Terms</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
