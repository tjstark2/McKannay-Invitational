import { AuthShell } from "@/features/auth/AuthShell";
import { SignInForm } from "@/features/auth/SignInForm";

export default function SignInPage() {
  return (
    <AuthShell>
      <SignInForm />
    </AuthShell>
  );
}
