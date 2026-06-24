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

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-sand-100 bg-[#f7f6f1]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="/" className="flex items-center gap-2.5">
          <IconTile className="h-10 w-10 rounded-xl shadow-sm" />
          <Wordmark className="text-xl" />
        </a>
        <div className="flex items-center gap-5">
          <a href="/#how" className="hidden text-sm font-bold text-fairway-900 sm:block">
            How it works
          </a>
          <a href="/#features" className="hidden text-sm font-bold text-fairway-900 sm:block">
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
  );
}

export function MarketingFooter() {
  return (
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
          <a href="/#how" className="mb-2 block text-sm">How it works</a>
          <a href="/#features" className="mb-2 block text-sm">Features</a>
          <a href="/signup" className="mb-2 block text-sm">Create account</a>
          <a href="/signin" className="mb-2 block text-sm">Sign in</a>
        </div>
        <div>
          <h5 className="mb-3 font-extrabold text-white">Company</h5>
          <a href="/about" className="mb-2 block text-sm">About</a>
          <a href="/contact" className="mb-2 block text-sm">Contact</a>
        </div>
        <div>
          <h5 className="mb-3 font-extrabold text-white">Legal</h5>
          <a href="/privacy" className="mb-2 block text-sm">Privacy Policy</a>
          <a href="/terms" className="mb-2 block text-sm">Terms of Service</a>
        </div>
      </div>
      <div className="border-t border-[#16482e]">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-5 py-5 text-sm text-[#8fb8a0]">
          <span>© 2026 TourneyBirdie. All rights reserved.</span>
          <span>Create. Invite. Crown.</span>
        </div>
      </div>
    </footer>
  );
}
