"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function acceptPrivacy() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Soft marker: privacy acceptance is also stamped when profile is saved.
  // Keep a lightweight user metadata flag for routing UX.
  await supabase.auth.updateUser({
    data: { privacy_accepted: true },
  });

  redirect("/profile");
}
