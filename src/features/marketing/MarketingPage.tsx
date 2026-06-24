import { MarketingNav, MarketingFooter } from "@/features/marketing/MarketingChrome";

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
      <MarketingNav />

      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-4xl font-black tracking-tight text-ink">
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-slate-500">{subtitle}</p> : null}
        <div className="mt-8 space-y-4 leading-7 text-slate-600 [&>h2]:mt-8 [&>h2]:font-display [&>h2]:text-xl [&>h2]:font-black [&>h2]:text-ink [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-6 [&>a]:font-bold [&>a]:text-fairway-900">
          {children}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
