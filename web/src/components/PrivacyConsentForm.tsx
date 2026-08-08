"use client";

import { useState, type FormEvent } from "react";
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
  const [error, setError] = useState<string | null>(null);

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
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-sm transition hover:border-primary/35">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            setChecked(e.target.checked);
            if (e.target.checked) setError(null);
          }}
          className="mt-1 h-5 w-5 rounded border-outline text-primary focus:ring-primary"
          // Explicit consent must not be pre-selected (AC 1.1.2).
        />
        <span className="text-sm text-on-surface">
          I have read this privacy notice and I consent to SihatQ collecting the
          listed non-identifying answers for preventive insight only.
        </span>
      </label>

      {error ? (
        <p className="rounded-xl bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
          {error}
        </p>
      ) : null}

      <form
        action={acceptPrivacyConsent}
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          if (checked) return;
          event.preventDefault();
          setError("Please tick the consent checkbox before continuing.");
        }}
      >
        <button
          type="submit"
          aria-disabled={!checked}
          className={`flex w-full items-center justify-center rounded-full py-4 font-semibold transition ${
            checked
              ? "bg-primary text-on-primary hover:bg-primary-container"
              : "border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-error hover:text-on-error-container"
          }`}
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
