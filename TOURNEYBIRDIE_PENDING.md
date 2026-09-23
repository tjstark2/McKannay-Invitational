# TourneyBirdie - pending work

Running log. Newest session at the top of each section. When something ships,
move it to "Recently shipped" with the date, don't delete it - the history is
what stops us rebuilding something twice.

Last updated: 17 August 2026

---

## Blocking a real launch

These are the things that stop you inviting people who are not you.

- **Real SMTP.** Supabase's built-in mail is rate limited to a handful an hour
  and lands in spam. Invites are how people join a tournament, so this gates
  any group larger than the test accounts. About 30 minutes with Resend or
  Postmark, plus DNS records on the tourneybirdie.com domain.
- **Error monitoring (Sentry).** With real testers you get "it broke" and no
  stack trace. Needs one npm dependency and a DSN from the Sentry dashboard.
- **Database backups / point-in-time recovery.** Supabase dashboard, paid
  tier. One bad migration currently has no undo.
- **Pro billing.** Pro is a manual database flag. Fine for friends, not for
  strangers who expect to pay for it.

## Needs a design decision before it can be built

- **Batch 4 - friends rivalry and head-to-head records.** Marked "mockups
  needed" in the original plan and still is. Building it blind would waste
  more of TJ's time than mine.
- **Season series.** Linking tournaments across years into a standing.
- **More than two teams.** Structural - teams are A and B throughout the
  scoring engine, the draw engine and the leaderboard.
- **Other tournament templates** beyond the current Ryder-Cup shape.
- **Handing a tournament to another owner.** Also the reason account deletion
  refuses while you own one - there is no way to pass it on first.

## Known incomplete in the app

- **Tutorials are out of date.** The Manage hub, matchup draws, teams and
  house rules have all changed shape since the walkthroughs were written.
- **Create-a-tournament flow** does not match how Manage actually behaves now.
- `ProUpsell.tsx` renders "More to come - coming soon" twice as literal
  feature bullets.
- Coin toss uses team colours and names - teams have no logo field to draw.
- Create flow says custom course upload is "coming soon".
- Landing page has a "Coming soon" block.
- Avatar payments are a placeholder toast.
- Clubhouse chat has no way to edit or delete a message.

## Engineering debt

- **Automated tests STARTED 23 Aug.** `npm test` runs 10 tests over the draw
  engine, the field grouping, the snake draft and the score labels, using
  Node's built-in runner through tsx - no new dependency. Verified they catch
  the historical dropped-player bug. Still to cover: `scoring.ts` (the two
  handicap implementations that disagreed), the match-state moments, and the
  offline queue.
- **Audit every query against its mapper.** `loadRoundSetups` mapped
  `started_at` without selecting it, which made a working Start round button
  look dead across two sessions. A crude scan found that one; only two others
  were hand-checked. Worth doing properly once.
- **Four files over 900 lines** - `scoring.ts`, `queries.ts`,
  `manage/[code]/page.tsx`, `SetMatchupsScreen.tsx`. Not urgent, but that is
  where bugs hide.
- **Stale README.** Actively misleading; either rewrite or delete it.
- **Test data cannot cover roster-add flows.** Seeding an approved member who
  is not yet on the roster needs a real `auth.users` row, which SQL cannot
  fabricate. Requires signing up Gmail +alias accounts once, after which the
  seed can pick them up.

## Recently shipped

**24 Aug 2026 (second bundle) - notifications**
- FOUND AND FIXED: quiet hours SILENTLY DROPPED notifications. Anything
  generated between 10pm and 6am was discarded and the reminder log marked it
  sent, so it never retried. The night-before reminder was the worst case - it
  hangs off a calendar DATE, so it fired around 10pm, inside quiet hours, and
  could vanish entirely with nothing reporting it.
- Reminders now hang off the REAL tee time (round_date plus arrival_time), so
  the evening-before reminder lands in the evening. Added a 45-minute
  "you are on the tee" warning.
- Notifications are now RECORDED, one row per recipient, delivered or held.
  That gives the notification centre its history and lets a held one wait for
  morning instead of vanishing.
- Critical notifications bypass quiet hours: teeing off soon, the tee warning,
  a round starting, and an organizer changing your score. The test was "could
  you have acted differently if you had known at 2am" - for a tee time yes, for
  a birdie no.
- NOTIFICATION CENTRE on Profile: everything you were sent, newest first, with
  unread marks, mark-all-read, and tapping through to where it happened. Plus a
  plain-English guide to what each category covers.
- New triggers: comments on a feed moment, a nudge to whoever is holding up a
  round (and to the organizers who cannot close it), and a handicap-missing
  reminder to the player rather than only the organizer.
- 6 more tests, 24 total, covering quiet hours, criticality and the hold queue.

**24 Aug 2026**
- CLUBHOUSE SPLIT into Feed, Chat and Photos. Scoring callouts were posted as
  chat messages, so a busy round buried real conversation under automated
  lines and the unread badge meant nothing. Callouts now land in a Feed tabbed
  by round, each one commentable; Chat is people talking only.
- Snowman wording fixed - "put a snowman on the par 5 2" now reads
  "Swaggy snowmanned hole 2. Ice in his veins."
- Teams lock for the WHOLE tournament once any round has started (TJ's call),
  not just while a round is live.
- Finishing a round is BLOCKED until every score is in (TJ's call). It used to
  warn and allow.
- Leaders: even column widths, and a best-ball section showing where each pair
  stands on a 2v2 round.
- The Nest: live block moved to the top, and the Front 9 / Final counters -
  which read 0 of 8 all day on a hole-by-hole round - are replaced by cards
  going and furthest thru while a round is live.

## Bundle 4 - the Series

- **A Series sits above Trips.** "McKannay Invitational" owns MCK2026 and
  whatever comes next. People are linked by ACCOUNT, so the same person carries
  across years even though their player row is new each trip. Teams deliberately
  do not carry: career records belong to people, team history to trips.
- **Visible, not plumbing.** A series card on the dashboard opens a page with
  the trophy and its current holder, an all-time table (trips, matches won,
  points, best round, trophies) and head-to-head between any two players across
  every year, plus an archive of every trip.
- **Each trip records its own final result** when the last round closes -
  points for each side, the winner, and when it finished. Stored rather than
  re-derived, because the 2026 result cannot be rebuilt from matches alone:
  Saturday was scored on net across the field, so recomputing would say 4-6
  when the real answer was 6-9.
- **The engine computes that result from both sources** - match points, and
  net-score rounds where the best N in the field each take a point - reusing
  the same scoring maths the live screens use.
- **MCK2026 migrated in** as trip 1, with its real result: Team Dietz 9-6.
- 7 more tests (42 total) covering career records, trophies across changing
  team letters, unresolved matches counting for nobody, and head-to-head only
  counting opponents rather than partners.

## Bundle 3 - getting in

- **Password reset.** Did not exist - someone who forgot theirs had no way back
  in. "Forgot your password?" on sign-in emails a link to a new reset page,
  which handles every form the link can arrive in and says plainly if it has
  expired or was opened on a different device.
- **Invite links survive sign-up.** A new player following an invite used to
  confirm their email and land on an empty dashboard with the tournament lost.
  The destination is now carried through sign-up AND the confirmation email.
- **Your golf** on the profile: nickname, favourite golfer, home course, best
  round, holes in one, birthday. All optional - they feed the awards later.
- **Tutorial rewritten for the four-tab layout**, in three layers: a welcome on
  first login, a short tour of the four tabs the first time you open a
  tournament, and a one-line hint the first time you open each screen. The old
  tour pointed at tabs that no longer exist, and the nav never carried the
  anchors it was trying to spotlight. Everyone sees the new tour once.
- **Join screen** reworded: "Ask to join", and it says the handicap comes after
  approval.
- Awards left as they are, by decision - to be expanded properly later.
- **Fixed: Standings crashed with "This page couldn't load"** (Bundle 2 bug).
  Every live screen opened a Supabase subscription with the same fixed name.
  Asking for a name that already exists returns the one already running, and
  adding a listener to that throws. Standings shows three live screens at once,
  so the second one crashed the page; expanding Full scorecard on the Round
  screen would have done the same. Now ONE shared live round feeds every
  screen - one fetch, one subscription - with a unique name and a guard so a
  realtime failure can never take a page down again.

**Needs TJ:** Supabase redirect URLs must allow /reset-password, and custom
SMTP (Resend) to lift the few-an-hour email cap.

## Bundle 2 - the screens

- **Four tabs, down from five:** Home, Standings, Trip, Clubhouse. The first tab
  changes what it IS: "Home" between rounds, "Round" (with the Tee It Up bird)
  while one is live. The nav never changes shape.
- **Round screen while a round is live.** One screen instead of five, in the
  order a golfer asks: your match state big at the top (2 up / 1 down / all
  square) with a per-hole won-lost-halved strip, then this hole and score
  entry, then collapsed rows for team points, all matches and the full
  scorecard. The survey's loudest complaint was not seeing the match score.
- **Full scorecard view**, the whole card at once, with holes where each player
  gets a shot shaded - "I didn't notice he was stroking for five holes".
- **Standings** shows team score and the individual leaderboard together, with
  every match below. Replaces the six Pecking Order sub-tabs.
- **Trip tab** holds the browsing people do off the course: schedule with every
  group, teams, players, rules. Locker dissolved into it.
- **Player and match detail open as sheets** over the current screen and
  dismiss back to where you were, instead of navigating away. Every existing
  "open this player" in the app became a sheet automatically.
- **Past scorecards** - Locker was the only way back into a closed round's card,
  which is how an organizer fixes one. That now lives on Home between rounds.
- Known: the guided tour still describes the old layout. Rewritten in Bundle 3.

## Bundle 1 - the engine (deployed after the 2026 trip)

The tournament now moves itself through the day. Everything below was done by
hand in SQL during the McKannay Invitational.

- **The server can close a round.** The score lock only trusted logged-in
  organizers, so the automatic jobs and the SQL Editor were blocked - every
  "Ask an organizer to change a score" error from Saturday. It now trusts the
  server itself.
- **Closing a round does the whole job.** Resolves every match from the hole
  scores (matches made outside the draw tool never resolved before, so points
  silently never posted), publishes every complete card's total (180 holes
  counted for nothing on Saturday because only signing published a total),
  confirms outstanding cards, and points the tournament at the next round.
- **The manual Finish round button runs the same close.** It used to just stamp
  the round finished and skip all of the above.
- **Scoring opens on its own** 30 minutes before the first tee, if the round is
  ready. The organizer is told. If it is not ready, it holds and says exactly
  what is missing instead of silently doing nothing.
- **Readiness is checked per round** 12 hours out and again at 3, so a missing
  matchup is caught the night before rather than on the first tee.
- **Rounds close on their own** 3 hours after the last score or 9pm local,
  whichever is first, with one reminder 30 minutes before.
- **New notifications:** night before, per-group 30-minute tee warning (one per
  tee time), your round is in, 30 minutes before close, round final, and
  organizer notices for opened / held / not ready / closed.
- **Quiet hours hold instead of drop.** Every notification is written down; one
  generated at 2am now waits for morning. Tee warnings, scoring opening and
  score changes bypass quiet hours.
- **Trips carry a time zone**, so "7:30 AM" means the right instant - tested
  across the daylight-saving change the December trip will cross.
- **Signing is reworded as confirm and vote** - it is the way into the awards,
  not a certification chore.
- The old `notifications-aug24` bundle is superseded and should NOT be deployed.
- 35 tests, up from 21.

**Needs TJ:** cron-job.org must run every 10 minutes, not hourly.

## Found during the 2026 trip - fixed, not yet deployed

- **Net score rounds used group-relative strokes.** allocateForMatch always
  measured everyone off the lowest handicap IN THEIR GROUP, which is right for
  match play but wrong for a field-wide individual net round: a player's result
  depended on who they teed off with. Saturday's standings had to be worked out
  by hand. Now takes a `basis` of "relative" or "full", chosen from the round
  format, with tests using the real Saturday cards as the fixture.

## Found during the 2026 trip - STILL OPEN

- **Matches created outside the app never resolve.** resolveMatch reads
  manual_result for any round with a group_size, and nothing fills it in unless
  the match came through the draw tool. Cost about an hour on Thursday. It
  should fall back to computing the result from the hole scores.
- **Net score rounds have no tiebreak.** The top five are taken with a plain
  slice, so players tied at the cut are separated by arbitrary sort order.
  Needs a countback (back nine, last six, last three, 18th) or an explicit
  half-point split.
- **No top-five marker on a net score round.** The Leaders tab sorts by net but
  nothing shows which places are actually scoring points, or the cut line.
- **Stroke indexes came from a web source and were wrong.** Harbour Town's were
  completely different from the physical card and had to be corrected on the
  morning of the round. Course setup should make hole data easy to verify
  against a photographed card.
- **Signing is the hidden gate.** Points do not appear until cards are signed,
  and nothing on the leaderboard says so. Every round this trip needed chasing.

## Still open

- **Step 57**: scoring on two devices in MEMBER1 did not sync - scores entered
  on the phone did not appear on the computer. Not yet investigated.
- **Feed unread count**: the Feed tab has no badge yet. Chat and Photos do.
- **Basic-mode scoring** still pushes without confirming the write landed.
- Tutorials and the create-a-tournament flow still describe the old Manage.

**23 Aug 2026 (fourth bundle)**
- Live scoring now on ALL of it: Pecking Order > Leaders (full table), Pecking
  Order > Score (tentative points, clearly marked), Pecking Order > Matches
  (holes up and thru, deliberately NOT a result), and The Nest.
- Matches shows STATUS, not a winner. A match is not settled until the cards
  are signed, and putting points on the board from a half-played round would
  show numbers that can still move. The Score tab labels its points "if the
  round ended now" for the same reason.
- 3 more tests, 18 total, including one asserting a live match never declares
  a winner.

**23 Aug 2026 (third bundle)**
- LIVE SCORING ON PECKING ORDER AND THE NEST. Both read published totals, which
  on a hole-by-hole round do not exist until a card is signed - so both screens
  were empty for the whole of a round while Tee It Up updated hole by hole.
  A shared `useLiveRound` hook now reads hole scores directly and refreshes on
  realtime. Basic 9/18 trips are untouched: a round there is a single submitted
  number, so there is nothing "during" and the old behaviour stands.
- Three columns everywhere: strokes shot, to par, and net to par after
  handicap. One number was hiding the handicap - two players can card the same
  4 and sit a shot apart.
- 5 more tests covering the live maths, asserting the exact numbers in the test
  document. 15 tests total.

**23 Aug 2026 (second bundle)**
- Snowman is now a full-screen takeover, like an eagle, with its own icon. It
  was chat-level, which is why an 8 looked like nothing happened.


**23 Aug 2026**
- FIRST AUTOMATED TESTS. `npm test`, 10 tests, no new dependency. Confirmed
  they fail when the old dropped-player bug is reintroduced.
- Home no longer hangs on "Loading" offline - it says it cannot reach the
  server instead of spinning forever.
- Signing now tells the awards gate directly instead of relying on a reactive
  effect whose data had not refreshed, which is why the vote never opened.
- "Jump to hole N" button, plus a forward arrow, so you can reach the first
  unscored hole without confirming every hole on the way.
- Re-confirming a hole where nothing changed no longer re-fires its callouts.
  This was the source of duplicate eagle and hole-in-one pushes.
- Snowman clearing nudges the avatars directly, so a dropped realtime socket
  cannot leave a melted snowman on screen.
- Pro upgrade now writes with a select and reports refusal instead of looking
  like it worked. A blocked update matches zero rows and reports no error.
- approveMember now detects a silently refused write rather than telling
  someone they are in when they are not.

**22 Aug 2026 (third bundle)**
- Confirming an already-scored hole did nothing: confirmHole required a draft
  value for every player, and on a hole you scored earlier the draft is empty.
  It now falls back to the saved score, and the button reads "Save changes to
  hole N" so you can tell the two apart.
- Signing wrote only to the database, never to the app's own state, so the
  awards vote never opened and the signed gross never reached the leaderboard.
  Signing now publishes through the trip state as well.
- The organizer group picker only appeared with MORE than one tee time, so on a
  single-group round an organizer could not open a signed card at all.
- On a completed card, signing now sits ABOVE the hole entry, which is folded
  behind "Need to fix a hole?" - previously "Confirm hole 18" was the most
  prominent button on a finished round.
- Two players earning a takeover on the same hole now queue instead of the
  second replacing the first before you have read it.
- SERVICE WORKER now caches the app shell. The app could not previously LAUNCH
  without a signal - the offline score queue only helped if you already had it
  open. Navigations are network-first with a cached fallback and the cache is
  versioned, so a force-quit still lands on fresh code.

**22 Aug 2026 (second bundle)**
- Score entry rebuilt around confirm-then-write. Nothing is saved or announced
  until the whole hole is confirmed, so callouts and pushes fire exactly once
  and only for scores the person meant.
- Score buttons are now par-relative: the stroke number large, the golf term
  ("Par", "Bogey", "Double") small underneath, generated from the par of the
  hole being played. Anything worse than a triple reads "+4", "+5" rather than
  spelling out "quadruple bogey".
- The hole strip is a progress bar rather than tappable navigation - holes are
  played in order, which also stops scoring hole 2 before hole 1.
- Test document numbers were WRONG, not the app: hole-by-hole uses relative
  strokes off the low player (allocateForMatch), not the full course handicap
  (courseHandicap). Two handicap implementations that disagree - a strong
  argument for the unit tests at the top of the debt list.

**22 Aug 2026**
- Captains no longer wiped by the team draft (setPlayerTeam was clearing the
  star for every player it wrote, including the two captains).
- Teams unlock again once a round finishes - "live" now means started AND not
  finished, so any played round used to lock teams permanently.
- Hole-by-hole no longer hangs on "Loading the card" offline: the load is
  wrapped, only the first load blocks the screen, and a clear message replaces
  the spinner if the round was never opened online.
- Handicaps editable directly on Teams & Captains, so players with no account
  (seeded or manually added) can finally be given one.
- Move and error messages float above the page instead of rendering at the
  bottom of a long tab where nobody sees them.
- Field group board: time and gap controls moved above the group list, team
  colour rings on each player.
- Empty tee times now show as an amber card on the matchup board instead of
  silently disappearing.
- Banner heading shortened to stop it overflowing.

**21 Aug 2026**
- Special Access artwork for Wade (`Hawk_Dangerous11`) and Colum
  (`Osprey_LuckyRead`): logo badges and cards built to match the existing set
  exactly (384x384 and 440x577 RGBA webp, parchment circle, dark and gold
  rings). Both now render instead of showing a broken image.

**17 Aug 2026**
- Captaincy clears when a player moves teams, so two captains can no longer
  end up on one side.
- Finish round warns when players still have no score, naming how many.
- Reopen round warns when the round is complete and cards are signed.
- Avatar images fall back to the emoji when the artwork is missing.
- Deleted `computeMatches` - the dead pairing function that dropped players.

**16 Aug 2026**
- Matchup draws rebuilt around tee times: all players dealt exactly once, in
  the format their group actually plays. Verified across all six methods.
- Wheel labels realigned (they were a quarter turn from their own segment).
- House rules: preset catalog with yes/no/discretion, custom rules, fully Pro.
- Offline scoring queue with sync on reconnect.
- Score locks enforced by Postgres triggers, not just the UI.
- Rate limiting on the AI photo endpoints, per course.
- Account deletion and data export.
- Champion takeover, Captain's Draft for teams, field-round group draws.
- Accessibility: gold-on-white contrast fixed at the token level, focus rings,
  tap targets, reduce-motion support.

---

## Confirm-before-effects audit (22 Aug)

TJ's finding: the app fired callouts, pushes and leaderboard updates the moment
a score was typed, before the write was confirmed. A mistyped 1 sent a
hole-in-one push that could not be recalled, and correcting the score left the
leaderboard showing the old one. Every place with the same shape:

- **Hole-by-hole scoring** - FIXED 22 Aug. Scores are held locally until the
  whole hole is confirmed, then written, then the effects run once.
- **Basic-mode scoring (AddScoreScreen)** - STILL OPEN. `upsertScore` in
  TripStateContext is typed `(score) => void`: it cannot report failure, so the
  "an organizer updated your score" push goes out whether or not the write
  landed. Fixing it means making that function return a result, which touches
  every caller.
- **Approve member / promote to admin** (manage/[code]) - STILL OPEN, minor.
  `approveMember` and `setMemberRole` are awaited but their result is not
  checked before the push is sent. A silently refused write would still tell
  the person they are in.
- **Round start / finish** - already correct, checks `.ok` first.
- **Field group save, team draft save, card signing** - already correct.

## Still open from the 22 Aug test pass

- **Pro upgrade does not actually upgrade** (step 83). The screen returns to
  the Pro tab correctly but the tournament stays free. Needs investigation.
- **Post-round awards should be listed as Pro** in the feature list (step 81).
- **Tee It Up shows all players, not just your group** (step 89). Needs a
  closer look - it may be the organizer group picker being mistaken for the
  roster, or a genuine scoping bug.
- **Rounds tab is too busy.** TJ wants more of it behind tabs or folds.
- **Push cannot be received on the computer** (steps 30, 74). Web push needs
  notification permission, which Computer B does not have. The test document
  should stop asking for it - swap the roles or mark those rows N/A.

## Open questions for TJ

- Should teams be locked once the FIRST round starts, or only while a round is
  live? Currently the latter. Locking at first start is simpler to explain and
  harder to get wrong, but it means a late dropout cannot be handled without
  reopening a round.
- Should a round be finishable at all when scores are missing? It now warns and
  names the count, but still allows it. The alternative is refusing outright,
  which risks stranding a group whose last player never enters a card.
