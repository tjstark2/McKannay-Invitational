export function SectionHeader({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-black text-slate-900">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
}
