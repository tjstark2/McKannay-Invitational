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

- **No automated tests.** 35,000 lines, and every regression is caught by one
  person on a phone. `scoring.ts` and `drawCompute.ts` are pure functions -
  a handful of unit tests there would have caught the dropped-player bug
  instantly instead of it surviving three test passes. Highest-value item on
  this list.
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
