import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader backHref="/dashboard" />
      <main className="mx-auto w-full max-w-2xl flex-grow px-5 py-10">
        <h2 className="font-headline text-3xl font-bold text-on-surface">
          Privacy Notice
        </h2>
        <p className="mt-3 text-on-surface-variant">
          SihatQ is a preventive insight prototype for learning and
          presentation. Before you continue, please review how we handle
          health-related answers.
        </p>

        <div className="mt-8 space-y-4 rounded-2xl bg-surface-container p-6">
          <p className="font-semibold text-on-surface">We collect</p>
          <ul className="list-disc space-y-2 pl-5 text-on-surface-variant">
            <li>Account email (via Supabase Auth)</li>
            <li>Age group, gender, and Malaysian state</li>
            <li>Lifestyle checkboxes and family-history chips</li>
          </ul>

          <p className="pt-2 font-semibold text-on-surface">We do not collect</p>
          <ul className="list-disc space-y-2 pl-5 text-on-surface-variant">
            <li>NRIC / MyKad numbers</li>
            <li>Exact birthday or home address</li>
            <li>Clinic lab results or diagnoses</li>
          </ul>

          <p className="pt-2 text-sm text-on-surface-variant">
            Under Malaysia PDPA, health-related data is sensitive. You can ask
            to delete your profile later. Results are rule-based comparisons
            with public NHMS statistics — not a clinical diagnosis.
          </p>
        </div>

        <Link
          href="/profile"
          className="mt-8 flex w-full items-center justify-center rounded-full bg-primary py-4 font-semibold text-on-primary transition hover:bg-primary-container"
        >
          I Agree — Continue to Profile
        </Link>
        <Disclaimer className="mt-6" />
      </main>
    </div>
  );
}
