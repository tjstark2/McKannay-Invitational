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
