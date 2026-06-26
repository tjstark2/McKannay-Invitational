import { MarketingPage } from "@/features/marketing/MarketingPage";

export default function PrivacyPage() {
  return (
    <MarketingPage title="Privacy Policy" subtitle="Last Updated: June 25, 2026">
      <p>
        At TourneyBirdie, we respect your privacy and believe your information
        should be used only to provide and improve the service you trust us with.
      </p>
      <p>
        This Privacy Policy explains what information we collect, how we use it,
        and the choices you have regarding your data. By using TourneyBirdie, you
        agree to the practices described below.
      </p>

      <h2>Information We Collect</h2>
      <p className="font-bold text-ink">Account Information</p>
      <p>When you create an account, we may collect:</p>
      <ul>
        <li>Name</li>
        <li>Email address</li>
        <li>Phone number (if provided)</li>
        <li>Account credentials</li>
      </ul>
      <p className="font-bold text-ink">Tournament Information</p>
      <p>
        To power tournaments and competitions, we collect information you and
        your group choose to add, including:
      </p>
      <ul>
        <li>Tournament names</li>
        <li>Team assignments</li>
        <li>Matchups and pairings</li>
        <li>Golf courses and rounds</li>
        <li>Scores, standings, and tournament results</li>
      </ul>
      <p className="font-bold text-ink">Usage Information</p>
      <p>
        We may collect basic technical and usage information to help operate,
        maintain, and secure TourneyBirdie, including device, browser, and
        application activity data.
      </p>

      <h2>How We Use Your Information</h2>
      <p>We use information collected through TourneyBirdie to:</p>
      <ul>
        <li>Create and manage tournaments</li>
        <li>Display scores, standings, and results</li>
        <li>Provide customer support</li>
        <li>Improve features, performance, and reliability</li>
        <li>Protect the security and integrity of the platform</li>
        <li>Communicate important account or tournament updates</li>
      </ul>
      <p>
        If you choose to opt in, we may also send product updates, promotional
        content, or SMS communications. You can unsubscribe at any time.
      </p>

      <h2>Information Sharing</h2>
      <p>We do not sell your personal information.</p>
      <p>
        We may share information only with trusted service providers that help us
        operate TourneyBirdie, such as cloud hosting, analytics, email delivery,
        and customer support providers.
      </p>
      <p>
        We may also disclose information if required by law, regulation, legal
        process, or to protect the rights, safety, and security of TourneyBirdie
        and its users.
      </p>

      <h2>Your Choices</h2>
      <p>You have control over your information.</p>
      <p>You may:</p>
      <ul>
        <li>Opt out of marketing emails or SMS communications</li>
        <li>Request access to the personal information we hold about you</li>
        <li>Request correction of inaccurate information</li>
        <li>
          Request deletion of your account and associated personal information,
          subject to legal or operational requirements
        </li>
      </ul>
      <p>
        To make any of these requests, contact us using the email address below.
      </p>

      <h2>Data Security</h2>
      <p>
        We take reasonable administrative, technical, and organizational measures
        to protect your information from unauthorized access, disclosure, or
        misuse.
      </p>
      <p>
        While we work hard to protect your data, no online service can guarantee
        absolute security.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time as TourneyBirdie
        evolves. When changes are made, we will update the “Last Updated” date
        above and post the revised policy on this page.
      </p>

      <h2>Contact Us</h2>
      <p>
        Questions about this Privacy Policy or how your information is handled?
      </p>
      <p>
        Email: <a href="mailto:hello@tourneybirdie.com">hello@tourneybirdie.com</a>
      </p>
      <p>We’re happy to help.</p>
    </MarketingPage>
  );
}
