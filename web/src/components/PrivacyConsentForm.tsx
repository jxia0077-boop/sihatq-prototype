"use client";

import { useState } from "react";
import {
  acceptPrivacyConsent,
  declinePrivacyConsent,
  withdrawPrivacyConsent,
} from "@/app/actions";

type PrivacyConsentFormProps = {
  initialStatus: "accepted" | "declined" | null;
};

export function PrivacyConsentForm({ initialStatus }: PrivacyConsentFormProps) {
  const [checked, setChecked] = useState(false);

  if (initialStatus === "accepted") {
    return (
      <div className="mt-8 space-y-4">
        <p className="rounded-xl bg-primary-container/30 px-4 py-3 text-sm text-on-surface">
          You have already consented. You may continue to your health profile, or
          withdraw consent at any time.
        </p>
        <a
          href="/profile"
          className="flex w-full items-center justify-center rounded-full bg-primary py-4 font-semibold text-on-primary transition hover:bg-primary-container"
        >
          Continue to Profile
        </a>
        <form action={withdrawPrivacyConsent}>
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-full border border-outline-variant py-4 font-semibold text-on-surface-variant transition hover:bg-surface-container"
          >
            Withdraw consent
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-outline text-primary focus:ring-primary"
          // Explicit consent must not be pre-selected (AC 1.1.2).
        />
        <span className="text-sm text-on-surface">
          I have read this privacy notice and I consent to SihatQ collecting the
          listed non-identifying answers for preventive insight only.
        </span>
      </label>

      <form action={acceptPrivacyConsent}>
        <button
          type="submit"
          disabled={!checked}
          className="flex w-full items-center justify-center rounded-full bg-primary py-4 font-semibold text-on-primary transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
        >
          I Agree — Continue to Profile
        </button>
      </form>

      <form action={declinePrivacyConsent}>
        <button
          type="submit"
          className="flex w-full items-center justify-center rounded-full border border-outline-variant py-4 font-semibold text-on-surface-variant transition hover:bg-surface-container"
        >
          Decline — Browse without a profile
        </button>
      </form>
    </div>
  );
}
