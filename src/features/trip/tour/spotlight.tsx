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

// The player (non-owner) walkthrough - same spotlight style as the owner tour,
// highlighting the real controls a member uses inside the tournament.
export function buildMemberSpotlight(code: string, isPro: boolean): SpotStep[] {
  const p = `/t/${code}`;
  const steps: SpotStep[] = [
    { path: p, title: "Welcome to the tournament! 🏌️", body: "Quick tour of the few things you'll use most. Takes 20 seconds." },
    { path: p, tourneyTab: "schedule", anchor: "tab-schedule", title: "Check the Schedule", body: "Rounds, courses, tee times, and when to arrive all live under Schedule - peek here before every round." },
    { path: p, anchor: "nav-addScore", title: "Enter your scores", body: "Tap 'Tee It Up' to log scores. Submit after the front 9, then again after 18 - your net and the standings update as you play." },
    { path: p, anchor: "nav-addScore", title: "2v2 best ball: one submits", body: "In a 2v2 best ball round, only ONE person in each pair submits the group's score - one entry covers your team." },
    { path: p, tourneyTab: "leaderboard", anchor: "tab-leaderboard", title: "Watch the standings", body: "The Leaders tab shows live net standings and team points as scores roll in." },
  ];
  if (isPro) {
    steps.push({ path: p, title: "Awards & Trip Wrapped ✨", body: "After each round you'll vote on superlatives, and at the end there's a shareable Trip Wrapped. Watch for the prompts!" });
  }
  steps.push({ path: p, title: "That's it - have fun!", body: "You can revisit any tab anytime. Good luck out there." });
  return steps;
}

// Admins (not the owner) get the player basics AND a tour of the admin controls
// they can use inside the tournament.
export function buildAdminSpotlight(code: string, isPro: boolean): SpotStep[] {
  const p = `/t/${code}`;
  const steps: SpotStep[] = [
    { path: p, title: "You're an admin here 👋", body: "You can both play and help run the tournament. Quick tour of the essentials." },
    { path: p, tourneyTab: "schedule", anchor: "tab-schedule", title: "Check the Schedule", body: "Rounds, courses, tee times, and when to arrive live under Schedule." },
    { path: p, anchor: "nav-addScore", title: "Enter scores", body: "Tap 'Tee It Up' to log scores - submit after the front 9, then again after 18. In 2v2 best ball only one person per pair submits." },
    { path: p, tourneyTab: "leaderboard", anchor: "tab-leaderboard", title: "Watch the standings", body: "The Leaders tab shows live net standings and team points." },
    { path: p, appScreen: "admin", anchor: "adm-managelink", title: "Admin: manage members & teams", body: "As an admin you can run the tournament. This opens member & team management - approve players, set handicaps, assign teams." },
    { path: p, appScreen: "admin", adminTab: "setup", anchor: "adm-pro", title: "Setup tab", body: isPro ? "Pro is on - awards & voting, Trip Wrapped, custom backgrounds and the Clubhouse are unlocked." : "Setup starts with your plan and perks." },
    { path: p, appScreen: "admin", adminTab: "setup", anchor: "adm-backgrounds", title: "Change backgrounds", body: "Set the tournament banner and each screen's scenery here." },
    { path: p, appScreen: "admin", adminTab: "rounds", anchor: "adm-rounds", title: "Rounds tab", body: "Add rounds, pick courses and formats, and set arrival & tee times. Start a round when you're on the course." },
    { path: p, appScreen: "admin", adminTab: "scoring", anchor: "adm-scoring", title: "Scoring tab", body: "Fine-tune scoring and, on Pro, toggle post-round awards & voting." },
    { path: p, appScreen: "admin", adminTab: "setup", title: "You're all set!", body: "Everything's reachable from these tabs. Have fun out there." },
  ];
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
