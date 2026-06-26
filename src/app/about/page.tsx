import { MarketingPage } from "@/features/marketing/MarketingPage";

export default function AboutPage() {
  return (
    <MarketingPage
      title="About TourneyBirdie"
      subtitle="The home for golf trips, tournaments, and friendly competition."
    >
      <p>TourneyBirdie started during a golf trip with friends.</p>
      <p>Every round seemed to end with the same questions:</p>
      <ul>
        <li>“Who do I play next?”</li>
        <li>“How many points do we have?”</li>
        <li>“What’s the leaderboard look like?”</li>
        <li>“Who actually has a chance to win this thing?”</li>
      </ul>
      <p>The golf was great. The organization was not.</p>
      <p>
        Scores lived in one place, matchups in another, standings in a
        spreadsheet, and updates were buried in group texts. Keeping everyone
        informed became almost as much work as playing the tournament itself.
      </p>
      <p>So we built TourneyBirdie.</p>
      <p>
        TourneyBirdie brings everything together in one place. Create your
        tournament, invite players, build teams, schedule rounds, track scores,
        and follow the competition in real time. Whether you’re running a Ryder
        Cup-style golf trip, a member-guest weekend, a charity scramble, or an
        annual buddies trip, TourneyBirdie handles the logistics so your group
        can focus on the golf.
      </p>

      <h2>Built for golfers who love competition</h2>
      <p>
        Create custom tournaments, manage teams and pairings, track live
        standings, and crown a champion when it’s all over. From gross and net
        scoring to side games and bragging rights, TourneyBirdie is designed to
        make every round feel meaningful.
      </p>

      <h2>More than a scoreboard</h2>
      <p>
        TourneyBirdie turns a golf trip into an experience. Players choose a
        Birdie avatar, follow the action on live leaderboards, track their
        performance, and compete for the stories that get told long after the
        final putt drops.
      </p>

      <h2>We’re just getting started</h2>
      <p>
        We’re actively building new features including richer statistics,
        historical records, additional tournament formats, season-long rankings,
        and more ways to bring golf groups together.
      </p>

      <p className="font-bold text-ink">
        Because every great golf trip deserves more than a spreadsheet. It
        deserves a tournament.
      </p>
    </MarketingPage>
  );
}
