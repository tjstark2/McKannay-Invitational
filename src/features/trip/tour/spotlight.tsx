"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// A single tour step. `path` is the route it lives on; `appScreen` (optional)
// asks the in-tournament SPA to switch screens; `anchor` is a data-tour id to
// spotlight. No anchor = a centered card.
export type SpotStep = {
  path: string;
  appScreen?: string;
  adminTab?: string;
  tourneyTab?: string;
  anchor?: string;
  title: string;
  body: string;
};

const KEY = "tb_spot";
const EVT = "tb-tour-change";

type TourState = { steps: SpotStep[]; i: number };

function read(): TourState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TourState) : null;
  } catch {
    return null;
  }
}

function write(v: TourState | null) {
  try {
    if (v) sessionStorage.setItem(KEY, JSON.stringify(v));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVT));
}

export function startSpotlightTour(steps: SpotStep[]) {
  if (steps.length === 0) return;
  write({ steps, i: 0 });
}

// First time inside a tournament: the four tabs and what each is for. Kept
// short on purpose - the rest is taught one screen at a time, the first time
// you open each one, when you actually need it.
export function buildMemberSpotlight(code: string, isPro: boolean): SpotStep[] {
  const p = `/t/${code}`;
  const steps: SpotStep[] = [
    { path: p, title: "You're in", body: "Four tabs run the whole trip. Twenty seconds and you'll know where everything is." },
    { path: p, appScreen: "overview", anchor: "nav-overview", title: "Home becomes your round", body: "Between rounds this is your next tee time and your matchup. Once your round starts it turns into the scorecard - your match at the top, then the hole you're on." },
    { path: p, appScreen: "tournament", anchor: "nav-tournament", title: "Standings", body: "Team score, the individual leaderboard, and every match, all on one screen." },
    { path: p, appScreen: "trip", anchor: "nav-trip", title: "Trip", body: "Everyone's tee times, the teams, the players and the rules. Tap any name to see their card." },
    { path: p, anchor: "nav-clubhouse", title: "Clubhouse", body: "Chat, photos, and a feed of the best and worst moments as they happen." },
  ];
  if (isPro) {
    steps.push({ path: p, title: "After every round", body: "When your group finishes you'll get a nudge to check your card and vote for the awards. That's what posts your points." });
  }
  steps.push({ path: p, appScreen: "overview", title: "That's it", body: "Good luck out there." });
  return steps;
}

// Admins play too, so they get the same tour plus what's theirs to run.
export function buildAdminSpotlight(code: string, isPro: boolean): SpotStep[] {
  const steps = buildMemberSpotlight(code, isPro);
  const last = steps.pop()!;
  steps.push({
    path: `/t/${code}`,
    title: "What's yours to run",
    body: "Rounds open on their own 30 minutes before the first tee and close themselves once everyone's done. You'll be told if a round isn't ready - usually matchups not drawn - and exactly what's missing. Everything else is in Manage.",
  });
  steps.push(last);
  return steps;
}

export function endSpotlightTour() {
  write(null);
}

export function TourHost() {
  const pathname = usePathname();
  const router = useRouter();
  const [tour, setTour] = useState<TourState | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const navved = useRef<string>("");

  // hydrate + subscribe
  useEffect(() => {
    setTour(read());
    const h = () => setTour(read());
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);

  const step = tour ? tour.steps[tour.i] : null;
  const onThisPage = !!step && step.path === pathname;

  // Navigate to the step's page if we're not on it (only once per target).
  useEffect(() => {
    if (!step) return;
    if (step.path !== pathname) {
      if (navved.current !== step.path) {
        navved.current = step.path;
        router.push(step.path);
      }
    } else {
      navved.current = "";
      if (step.appScreen) {
        window.dispatchEvent(
          new CustomEvent("tb-tour-appscreen", { detail: step.appScreen })
        );
      }
      if (step.adminTab) {
        window.dispatchEvent(
          new CustomEvent("tb-tour-admintab", { detail: step.adminTab })
        );
      }
      if (step.tourneyTab) {
        window.dispatchEvent(
          new CustomEvent("tb-tour-tourneytab", { detail: step.tourneyTab })
        );
      }
    }
  }, [step, pathname, router]);

  // Measure (and keep measuring) the anchored element on this page.
  useEffect(() => {
    setReady(false);
    setRect(null);
    if (!onThisPage || !step) return;
    if (!step.anchor) {
      setReady(true);
      return;
    }
    let tries = 0;
    let timer: number;
    const sel = `[data-tour="${step.anchor}"]`;
    const measure = () => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
    };
    const find = () => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => {
          measure();
          setReady(true);
        }, 380);
      } else if (tries++ < 14) {
        timer = window.setTimeout(find, 170);
      } else {
        setReady(true); // fall back to a centered card
      }
    };
    find();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [onThisPage, step]);

  if (!tour || !step || !onThisPage || !ready) return null;

  const last = tour.i + 1 >= tour.steps.length;
  const next = () => (last ? endSpotlightTour() : write({ steps: tour.steps, i: tour.i + 1 }));
  const back = () => tour.i > 0 && write({ steps: tour.steps, i: tour.i - 1 });

  // Card goes to the top when the highlight sits in the lower half, else bottom.
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const cardBottom = !rect || rect.top < vh * 0.55;

  return (
    <div className="fixed inset-0 z-[130]">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-2xl"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: "0 0 0 9999px rgba(6,20,14,0.62)",
            border: "3px solid #f3b50a",
            transition: "all .25s ease",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(6,20,14,0.62)]" />
      )}

      <div
        className={`fixed left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-3xl bg-white p-5 shadow-[0_16px_50px_rgba(0,0,0,0.35)] ${
          cardBottom ? "bottom-5" : "top-5"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1">
            {tour.steps.map((_, k) => (
              <span
                key={k}
                className={`h-1.5 w-4 rounded-full ${k <= tour.i ? "bg-fairway-900" : "bg-sand-200"}`}
              />
            ))}
          </div>
          <button onClick={() => setConfirmSkip(true)} className="text-sm font-bold text-slate-400">
            Skip
          </button>
        </div>
        <h3 className="text-xl font-black text-fairway-900">{step.title}</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          {tour.i > 0 ? (
            <button onClick={back} className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-500">
              Back
            </button>
          ) : null}
          <button
            onClick={next}
            className="flex-1 rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white"
          >
            {last ? "Got it - let's go" : "Next"}
          </button>
        </div>
      </div>

      {confirmSkip ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-[0_16px_50px_rgba(0,0,0,0.4)]">
            <div className="text-3xl">✋</div>
            <h3 className="mt-2 text-xl font-black text-fairway-900">Skip the walkthrough?</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              This covers important stuff - how to set up and run the tournament if you&apos;re an organizer, and how to check the schedule and enter scores if you&apos;re playing. You can&apos;t easily reopen it.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => setConfirmSkip(false)}
                className="w-full rounded-2xl bg-fairway-900 px-4 py-3.5 font-black text-white"
              >
                Keep showing me
              </button>
              <button
                onClick={endSpotlightTour}
                className="w-full rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-400"
              >
                Skip anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
