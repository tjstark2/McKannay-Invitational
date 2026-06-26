import { MarketingPage } from "@/features/marketing/MarketingPage";

export default function ContactPage() {
  return (
    <MarketingPage
      title="Contact Us"
      subtitle="Have a question? An idea? Found a birdie we missed?"
    >
      <p>
        We’re building TourneyBirdie to be the best way to run a golf trip, and
        we’d love your help getting there.
      </p>
      <p>
        Whether you need support, want to suggest a feature, or just have
        feedback from your latest tournament, send us a note.
      </p>

      <h2>Email</h2>
      <p>
        <a href="mailto:hello@tourneybirdie.com">hello@tourneybirdie.com</a>
      </p>
      <p>
        For tournament-specific questions, include the tournament name and join
        code so we can get you back on the course as quickly as possible.
      </p>

      <p className="font-bold text-ink">
        Every feature starts with a conversation. We’d love to hear from you.
      </p>
    </MarketingPage>
  );
}
