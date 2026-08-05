"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PRIVACY_CONSENT_COOKIE } from "@/lib/privacy-consent";
import { createClient } from "@/lib/supabase/server";

const CONSENT_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function setConsentCookie(value: "accepted" | "declined") {
  const cookieStore = await cookies();
  cookieStore.set(PRIVACY_CONSENT_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CONSENT_MAX_AGE,
  });
}

async function clearConsentCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(PRIVACY_CONSENT_COOKIE);
}

/** Delete any profile / risk rows for the current session user (AC 1.1.3). */
async function clearSessionProfileData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("risk_results").delete().eq("user_id", user.id);
  await supabase.from("profiles").delete().eq("user_id", user.id);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearConsentCookie();
  redirect("/");
}

/** AC 1.1.2 — deliberate accept only after unchecked-by-default consent. */
export async function acceptPrivacyConsent() {
  await setConsentCookie("accepted");
  redirect("/profile");
}

/** AC 1.1.3 — decline: no further collection; clear session data; browse general content. */
export async function declinePrivacyConsent() {
  await clearSessionProfileData();
  await setConsentCookie("declined");
  redirect("/");
}

/** AC 1.1.3 — withdraw consent later: same clear + return to general browsing. */
export async function withdrawPrivacyConsent() {
  await clearSessionProfileData();
  await setConsentCookie("declined");
  redirect("/");
}
