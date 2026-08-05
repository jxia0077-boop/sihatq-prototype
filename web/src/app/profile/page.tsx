import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";
import { ProfileForm } from "@/components/ProfileForm";
import {
  parsePrivacyConsent,
  PRIVACY_CONSENT_COOKIE,
} from "@/lib/privacy-consent";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const consent = parsePrivacyConsent(
    cookieStore.get(PRIVACY_CONSENT_COOKIE)?.value,
  );

  // AC 1.1.1 / 1.1.2 — no profile inputs until consent is recorded.
  if (consent !== "accepted") {
    redirect("/privacy");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader backHref="/privacy" />
      <main className="mx-auto w-full max-w-3xl flex-grow px-4 py-8">
        <h2 className="font-headline text-3xl font-bold">Your Health Profile</h2>
        <p className="mt-2 text-on-surface-variant">
          Answer a few non-sensitive questions. We compare them with NHMS
          national statistics using clear rules.
        </p>
        <p className="mt-3 text-sm text-on-surface-variant">
          You can{" "}
          <a href="/privacy" className="font-semibold text-primary hover:underline">
            withdraw consent
          </a>{" "}
          at any time from the privacy notice.
        </p>
        <div className="mt-8">
          <ProfileForm />
        </div>
        <Disclaimer className="mt-8 pb-8" />
      </main>
    </div>
  );
}
