export function LoadingScreen({ label = "Teeing things up…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center text-slate-900">
      <img
        src="/brand/loading-birdie.png"
        alt=""
        aria-hidden="true"
        className="h-40 w-auto animate-[tb-walk_0.7s_ease-in-out_infinite]"
      />
      <p className="font-anton text-2xl tracking-tight text-ink">{label}</p>
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-fairway-900 animate-[tb-dot_0.9s_ease-in-out_infinite]" />
        <span className="h-2.5 w-2.5 rounded-full bg-fairway-900 animate-[tb-dot_0.9s_ease-in-out_0.15s_infinite]" />
        <span className="h-2.5 w-2.5 rounded-full bg-fairway-900 animate-[tb-dot_0.9s_ease-in-out_0.3s_infinite]" />
        <span className="h-2.5 w-2.5 rounded-full bg-fairway-900/40 animate-[tb-dot_0.9s_ease-in-out_0.45s_infinite]" />
      </div>
    </div>
  );
}
