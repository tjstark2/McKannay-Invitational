import { ChevronRight } from "lucide-react";

export function ChevronButton({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black shadow-sm ${className}`}
    >
      {children}
      <ChevronRight className="h-5 w-5" />
    </button>
  );
}
