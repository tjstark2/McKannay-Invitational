"use client";

// The series a person belongs to, on their dashboard.
//
// Row level security does the filtering: you see a series if you are in one of
// its tournaments. No series yet just means nothing shows.

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadMySeries, type SeriesInfo } from "@/lib/supabase/series";

export function SeriesLinks() {
  const [series, setSeries] = useState<SeriesInfo[]>([]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;
    loadMySeries(supabase)
      .then((rows) => active && setSeries(rows))
      .catch(() => {
        /* not set up yet - show nothing */
      });
    return () => {
      active = false;
    };
  }, []);

  if (series.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {series.map((s) => (
        <a
          key={s.id}
          href={`/series/${s.id}`}
          className="flex items-center gap-3 rounded-2xl border-2 border-fairway-900 bg-white p-4"
        >
          <span className="text-2xl" aria-hidden="true">🏆</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-black text-ink">{s.name}</span>
            <span className="block text-[13px] font-bold text-slate-500">
              The trophy, all-time records and head to head
            </span>
          </span>
          <span className="text-slate-300" aria-hidden="true">›</span>
        </a>
      ))}
    </div>
  );
}
