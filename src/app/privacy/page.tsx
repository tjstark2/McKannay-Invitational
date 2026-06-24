import { MarketingPage } from "@/features/marketing/MarketingPage";

export default function PrivacyPage() {
  return (
    <MarketingPage title="Privacy Policy" subtitle="Last updated: June 2026">
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
        This is a plain-English starter template provided for convenience. It is
        not legal advice. Please have a qualified professional review and adapt
        it before relying on it.
      </p>
      <p>
        This policy explains what information TourneyBirdie collects, how we use
        it, and the choices you have. By using TourneyBirdie, you agree to this
        policy.
      </p>
      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account information</strong> you provide when you sign up —
          your name, email address, phone number (if given), and password.
        </li>
        <li>
          <strong>Tournament information</strong> you and your group add —
          tournament names, teams, rounds, courses, and scores.
        </li>
        <li>
          <strong>Basic usage information</strong> needed to operate the service
          reliably and securely.
        </li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To run your tournaments and show live standings and results.</li>
        <li>
          To send you tournament-related messages, and marketing or SMS updates
          only if you have opted in.
        </li>
        <li>To keep the service secure and to improve how it works.</li>
      </ul>
      <h2>Sharing</h2>
      <p>
        We do not sell your personal information. We share it only with service
        providers that help us run TourneyBirdie (for example, hosting and
        email), and when required by law.
      </p>
      <h2>Your choices</h2>
      <ul>
        <li>You can opt out of marketing or SMS messages at any time.</li>
        <li>
          You can request a copy of your data or ask us to delete your account
          by contacting us.
        </li>
      </ul>
      <h2>Security</h2>
      <p>
        We take reasonable steps to protect your information, but no online
        service can be completely secure.
      </p>
      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. We&apos;ll post the new
        version here and update the date above.
      </p>
      <h2>Contact</h2>
      <p>
        Questions? Email{" "}
        <a href="mailto:hello@tourneybirdie.com">hello@tourneybirdie.com</a>.
      </p>
    </MarketingPage>
  );
}
