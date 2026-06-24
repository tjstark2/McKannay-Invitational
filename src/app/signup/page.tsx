import { AuthShell } from "@/features/auth/AuthShell";
import { SignUpForm } from "@/features/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <AuthShell>
      <SignUpForm />
    </AuthShell>
  );
}
