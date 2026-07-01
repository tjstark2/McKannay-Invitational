# TourneyBirdie — Working Backlog & Checklist

_Living doc. Check items off as they ship. Keep this in the repo so it survives new chats._
_Last updated: 2026-06-30._

---

## ✅ Shipped (verify in prod, then leave checked)
- [x] Round lifecycle: Start / Finish / Reopen + score-entry gating (Chunk 2)
- [x] Confirm on Start/Finish, "round is today" banner, Finish warns who hasn't scored (Chunk 2b)
- [x] Post-round voting: ballot, capture, Pro on/off toggle, `first_score_at` stamp (Chunk 3)
- [x] Admin round-date field
- [x] Log Round defaults to yourself; "entering for another player" note
- [x] Voting prompts on app open when your round is scored by anyone (best ball / match play)
- [x] Voting modal no longer closes after first vote; resumes incomplete rounds
- [x] Voting conclusion (finish / next-round start / 7h) + reveal-on-open once per person (Chunk 4)
- [x] Round + cumulative tallies (co-winners on tie, none at 0 votes)
- [x] End Tournament + trip lock + owner-only reopen (Chunk 5)
- [x] Trip Wrapped story + 1080×1920 PNG download
- [x] Auth: email-confirm redirect from canonical `NEXT_PUBLIC_SITE_URL`
- [x] Build fix: `smsOptIn` added to `SignUpInput` (+ `sms_opt_in` metadata)

## 🔧 Infra / config (not code — do in dashboards)
- [x] Supabase Auth Site URL = `https://www.tourneybirdie.com` + redirect allowlist
- [x] Set `NEXT_PUBLIC_SITE_URL` in Vercel (Production)
- [ ] Add apex `tourneybirdie.com` to Vercel → redirect to `www`
- [ ] GoDaddy: add A record `@ → 76.76.21.21` (or whatever Vercel shows) so the apex resolves
- [ ] Verify: visiting `tourneybirdie.com` redirects to `www`; fresh signup confirms end-to-end

## 👀 Watch-items from the new features (validate)
- [ ] Wrapped PNG: confirm fonts render in the downloaded image (Anton/Source Sans may fall back)
- [ ] Wrapped per-round screens show voting winners only — enrich later with per-round team winner + clutchest
- [ ] Full end-to-end test pass using `FULL_TEST_CHECKLIST.md`

---

## 🐛 Known bugs
- [ ] Tournament banner does NOT update when changed inside the app
- [ ] First-login redirect is spotty — should be a clean flow: choose avatar → nameplate → border, each its own screen (confirm step "freaked out")
- [ ] Join-code error on first screen — check if code is taken on step 1 before advancing
- [ ] Sounds don't work on mobile — resume AudioContext on first user tap

## ⚡ Quick (small, ~1 deploy each)
- [ ] First-run guided tour of the tournament navigator (separate flows for admins vs members): what each screen/subtab does, how to enter scores
- [ ] Front/marketing screen should match real app screenshots (ask which images) — chat/photo now enabled
- [ ] Loading state for photos & chat (skeleton + loading dots; reuse placeholder art)
- [ ] Account creation defaults shouldn't prefill a specific name/info; add a birthday field
- [ ] Sign Up: validate real phone number; reword the marketing/SMS opt-in copy
- [ ] Round backgrounds & header image: let users set their own + provide defaults (top of round shows an emoji flag today)
- [ ] Upgrading to Pro inside a tournament should prompt the owner through the Pro setup additions
- [ ] Join-code "taken" check on step 1
- [ ] Friends "No Friends Yet" empty-state mascot art
- [ ] Score-saved: replace checkmark with a small celebrating birdie
- [ ] App Store + USPTO name checks (research, no code)
- [ ] Best Ball classic vs grouped — decide keep both or retire classic
- [ ] Branding cleanup: rename McKannay sample/demo names (optional)
- [ ] Pro upsell bullets are placeholders — define what Pro actually includes
- [ ] Individual ad-free/avatars membership still "coming soon" — define
- [ ] Optional cosmetics: 16:9 crop frame; next-round card gradient vs flat green

## 🎯 Medium (a focused feature / review)
- [ ] Champion celebration moment on finish (winning team + awards + trophy birdie) — partly covered by Wrapped; decide overlap
- [ ] Uneven-players hard validation (block odd/uneven, not just warn)
- [ ] Profile page enhancement (stats/history) — decide then build
- [ ] Course creation UX pass; mark optional fields
- [ ] Per-round status labels surfaced (Not Started / In Progress / Finalized)
- [ ] Front-page insights polish (hero, hero birdie, tune stats)
- [ ] App-wide sentence-case capitalization pass
- [ ] Live updates for friends/lobby (realtime)
- [ ] Accessibility pass (aria labels on icon buttons, input associations)
- [ ] Automated tests around `scoring.ts` + RLS paths
- [ ] DB constraints for score-lock (front-9-before-gross; lock after finalize)

## 🏗️ Large (systems / architectural)
- [ ] Strategy: Pro + avatars + payment (define the model)
- [ ] Payment / premium tier: Stripe billing + feature gating
- [ ] Notifications (email/text): provider + preferences + triggers, default-on
- [ ] More than 2 teams: generalize schema/scoring/UI beyond A/B
- [ ] Cross-trip history / season series (series model + aggregate stats + clone-forward)
- [ ] Other preset tournament templates (reusable system)
- [ ] Gamify (club challenges): new mechanic + data model

## 🌐 Long-term & external
- [ ] 18Birdies-style integration (external API for courses + score sync)
- [ ] Real legal review of Privacy/Terms (lawyer; copy exists, unvetted)

---

### How we work (delivery rules)
- Each change ships as a partial-overlay `.zip` (only changed files) + any standalone `.sql`.
- SQL runs first in Supabase, then deploy code: `unzip -o … -d . && npm install && npm run build && git push`.
- New deps → remember `npm install` before build (this is what broke the last two deploys).
- Never touch MCK2026 in reset/seed scripts.
