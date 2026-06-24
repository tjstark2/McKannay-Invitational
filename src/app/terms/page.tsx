import { MarketingPage } from "@/features/marketing/MarketingPage";

export default function TermsPage() {
  return (
    <MarketingPage title="Terms of Service" subtitle="Last updated: June 2026">
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
        This is a plain-English starter template provided for convenience. It is
        not legal advice. Please have a qualified professional review and adapt
        it before relying on it.
      </p>
      <p>
        These terms govern your use of TourneyBirdie. By creating an account or
        using the service, you agree to them.
      </p>
      <h2>Your account</h2>
      <p>
        You&apos;re responsible for the information you provide and for keeping
        your login and any tournament admin codes secure. You&apos;re
        responsible for activity that happens under your account.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t misuse the service or try to disrupt it.</li>
        <li>Don&apos;t upload unlawful, harmful, or infringing content.</li>
        <li>Don&apos;t access data or tournaments you aren&apos;t authorized to.</li>
      </ul>
      <h2>Your content</h2>
      <p>
        You keep ownership of the tournament information you add. You grant us
        the permission needed to store and display it so the service can work.
      </p>
      <h2>Service availability</h2>
      <p>
        TourneyBirdie is provided on an &quot;as is&quot; and &quot;as
        available&quot; basis. We&apos;re actively developing it, so features
        may change and occasional downtime can happen.
      </p>
      <h2>Limitation of liability</h2>
      <p>
        To the extent permitted by law, TourneyBirdie is not liable for indirect
        or incidental damages arising from your use of the service.
      </p>
      <h2>Changes</h2>
      <p>
        We may update these terms. We&apos;ll post the new version here and
        update the date above. Continued use means you accept the changes.
      </p>
      <h2>Contact</h2>
      <p>
        Questions? Email{" "}
        <a href="mailto:hello@tourneybirdie.com">hello@tourneybirdie.com</a>.
      </p>
    </MarketingPage>
  );
}
