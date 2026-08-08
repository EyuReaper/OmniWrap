// Server Component: the error code comes from the query string, which the
// server already has — no need to ship the whole page to read one param.
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import Reveal from '@/components/motion/Reveal';
import { Button } from '@/components/ui/Button';

const errorMessages = {
  Configuration: "There was a problem with the authentication configuration.",
  AccessDenied: "You do not have permission to sign in.",
  OAuthSignin: "Error signing in with the provider.",
  OAuthCallback: "Callback error from the provider (check redirect URI).",
  OAuthCreateAccount: "Could not create account with provider.",
  EmailCreateAccount: "Could not create account with email.",
  Callback: "Error during callback — try again.",
  OAuthAccountNotLinked: "Account is not linked — sign in with the original provider.",
  default: "An unexpected error occurred. Please try again.",
};

export default async function AuthError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = errorMessages[error as keyof typeof errorMessages] || errorMessages.default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <Reveal
        variant="up"
        duration={0.8}
        className="max-w-lg w-full text-center bg-surface/80 backdrop-blur-xl border border-danger/30 rounded-3xl p-12 shadow-2xl"
      >
        <div className="mb-8">
          <span className="text-8xl" role="img" aria-label="Confused face">😕</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
          Oops! Authentication Error
        </h1>

        <p className="text-xl text-text-muted mb-10">
          {message}
        </p>

        <div className="space-y-4">
          <BackButton className="w-full !bg-danger/90 !text-white !border-transparent hover:!bg-danger">
            Go Back
          </BackButton>

          <Link href="/dashboard" className="block">
            <Button variant="secondary" size="lg" className="w-full">
              Return to Dashboard
            </Button>
          </Link>
        </div>

        <p className="mt-10 text-sm text-text-subtle">
          If the problem persists, <Link href="/support" className="underline hover:text-foreground">contact support</Link> or check your connection settings.
        </p>
      </Reveal>
    </div>
  );
}
