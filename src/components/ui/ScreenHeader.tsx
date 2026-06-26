export function ScreenHeader({
  img,
  title,
  subtitle,
}: {
  img: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-white shadow-[0_8px_18px_-12px_rgba(14,76,48,0.5)]">
        <img
          src={img}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-contain"
        />
      </span>
      <div className="min-w-0">
        <h2 className="font-anton text-3xl leading-none tracking-tight text-ink">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
