import { ChevronRight } from "lucide-react";

export function ClickableRow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 ${className}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </div>
  );
}
