import { cookies } from "next/headers";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";
import { PrivacyConsentForm } from "@/components/PrivacyConsentForm";
import { brandImages } from "@/lib/brand-images";
import {
  parsePrivacyConsent,
  PRIVACY_CONSENT_COOKIE,
} from "@/lib/privacy-consent";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const cookieStore = await cookies();
  const initialStatus = parsePrivacyConsent(
    cookieStore.get(PRIVACY_CONSENT_COOKIE)?.value,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader backHref="/" />
      <main className="mx-auto w-full max-w-2xl flex-grow px-5 py-10">
        <h2 className="sihatq-fade-up font-headline text-3xl font-bold text-on-surface">
          Privacy Notice
        </h2>
        <p className="sihatq-fade-up sihatq-delay-1 mt-3 text-on-surface-variant">
          Please read this notice before building your health profile. No profile
          fields are shown until you give consent.
        </p>

        <div className="sihatq-fade-up sihatq-delay-2 mt-8 flex items-center gap-4 rounded-3xl border border-primary/12 bg-surface-container-lowest p-4 shadow-[var(--elevation-soft)]">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-surface-container-lowest shadow-[0_12px_28px_rgba(0,80,73,0.14)]">
            <Image
              src={brandImages.privacyDashboard.src}
              alt={brandImages.privacyDashboard.alt}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div>
            <p className="font-headline text-lg font-semibold text-primary">
              Full data control
            </p>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              Consent unlocks the profile form. You can withdraw later and stop
              further collection for this session.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-5 rounded-2xl bg-surface-container p-6">
          <section>
            <p className="font-semibold text-on-surface">What we collect</p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-on-surface-variant">
              <li>Age group (range only)</li>
              <li>Gender</li>
              <li>Malaysian state</li>
              <li>Self-reported lifestyle factors (e.g. smoking, exercise, sugar)</li>
              <li>
                Family history as broad condition categories only (e.g. diabetes)
              </li>
            </ul>
          </section>

          <section>
            <p className="font-semibold text-on-surface">Purpose of use</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Answers are used only to generate preventive health insight by
              comparing your responses with public Malaysian statistics (such as
              NHMS) through clear rules. This is for education and awareness — not
              clinical care, insurance underwriting, or marketing.
            </p>
          </section>

          <section>
            <p className="font-semibold text-on-surface">
              What we do not require
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-on-surface-variant">
              <li>NRIC / MyKad numbers</li>
              <li>Exact date of birth, full name, or home address</li>
              <li>Clinic laboratory results or medical diagnoses</li>
              <li>Identity of relatives for family history</li>
            </ul>
          </section>

          <section>
            <p className="font-semibold text-on-surface">How long we keep data</p>
            <p className="mt-2 text-sm text-on-surface-variant">
              For this prototype, profile and assessment answers are retained for
              up to <strong>30 days</strong> in the current session account, or
              until you withdraw consent or clear them — whichever comes first.
              After withdrawal, we stop collecting further information and remove
              profile data already saved for this session.
            </p>
          </section>

          <p className="text-sm text-on-surface-variant">
            Under Malaysia PDPA, health-related answers are sensitive. Results are
            rule-based comparisons with public statistics — not a clinical
            diagnosis.
          </p>
        </div>

        <PrivacyConsentForm initialStatus={initialStatus} />
        <Disclaimer className="mt-6" />
      </main>
    </div>
  );
}
