/** Cookie used for AC 1.1.x privacy consent (guest-friendly, no login required). */
export const PRIVACY_CONSENT_COOKIE = "sihatq_privacy_consent";

export type PrivacyConsentStatus = "accepted" | "declined" | null;

export function parsePrivacyConsent(
  value: string | undefined | null,
): PrivacyConsentStatus {
  if (value === "accepted" || value === "declined") return value;
  return null;
}
