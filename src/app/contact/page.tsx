import { MarketingPage } from "@/features/marketing/MarketingPage";

export default function ContactPage() {
  return (
    <MarketingPage
      title="Contact us"
      subtitle="Questions, ideas, or running into trouble? We'd love to hear from you."
    >
      <p>
        The best way to reach us is by email. We read everything and try to
        reply quickly.
      </p>
      <h2>Email</h2>
      <p>
        <a href="mailto:hello@tourneybirdie.com">hello@tourneybirdie.com</a>
      </p>
      <p>
        For help with a specific tournament, include the tournament name and
        your join code so we can find it fast.
      </p>
      <p className="text-sm text-slate-400">
        Note: this contact address is a placeholder for now — update it to your
        real support inbox before launch.
      </p>
    </MarketingPage>
  );
}
