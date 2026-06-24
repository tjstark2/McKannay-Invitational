import { MarketingPage } from "@/features/marketing/MarketingPage";

export default function AboutPage() {
  return (
    <MarketingPage
      title="About TourneyBirdie"
      subtitle="Golf tournaments made easy — for trips and group outings."
    >
      <p>
        TourneyBirdie started with a simple problem: a great golf trip with
        friends deserves to feel like a real tournament — teams, matches, a
        running scoreboard, and a champion at the end — but pulling that off
        with spreadsheets and group texts is a pain.
      </p>
      <p>
        So we built a place to run the whole thing. Set up your tournament,
        invite your group with a code, build your teams, schedule your rounds,
        and log scores as you play. Standings update live, handicaps and net
        scoring are handled for you, and everyone can follow along in real time.
      </p>
      <h2>Who it&apos;s for</h2>
      <p>
        Buddies&apos; trips, member-guest weekends, family outings, charity
        scrambles — any time a group of golfers wants a little friendly
        competition with a proper scoreboard behind it.
      </p>
      <h2>Where we&apos;re headed</h2>
      <p>
        We&apos;re actively building TourneyBirdie. Year-over-year history,
        richer stats, and more scoring formats are on the way. If there&apos;s
        something your trip needs, we&apos;d love to hear it — reach out from the{" "}
      </p>
      <p>
        <a href="/contact">Contact page</a>.
      </p>
    </MarketingPage>
  );
}
