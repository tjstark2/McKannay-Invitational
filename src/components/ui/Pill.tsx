type PillTone = "default" | "green" | "blue" | "red" | "amber" | "purple" | "sand";

export function Pill({
  children,
  tone = "default"
}: {
  children: React.ReactNode;
  tone?: PillTone;
}) {
  const styles: Record<PillTone, string> = {
    default: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    red: "bg-red-100 text-red-800",
    amber: "bg-amber-100 text-amber-800",
    purple: "bg-purple-100 text-purple-800",
    sand: "bg-sand-100 text-sand-700"
  };

  return (
    <span className={`rounded-md px-3 py-1 text-xs font-bold ${styles[tone]}`}>
      {children}
    </span>
  );
}
