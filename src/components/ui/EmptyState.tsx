export function EmptyState({
  img,
  title,
  message,
  children,
}: {
  img: string;
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-line bg-white p-6 text-center shadow-[0_14px_30px_-22px_rgba(14,76,48,0.4)]">
      <img
        src={img}
        alt=""
        aria-hidden="true"
        className="mx-auto h-40 w-auto object-contain"
      />
      <p className="mt-3 font-anton text-2xl tracking-tight text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-[30ch] text-sm font-semibold text-slate-500">
        {message}
      </p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
