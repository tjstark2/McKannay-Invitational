export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[20px] border border-line bg-white shadow-[0_14px_30px_-22px_rgba(14,76,48,0.4)] ${className}`}
    >
      {children}
    </div>
  );
}
