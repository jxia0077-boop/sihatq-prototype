import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { getAdminEmails } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminForbiddenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const configured = getAdminEmails().length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-lg flex-grow px-5 py-12">
        <h2 className="font-headline text-2xl font-bold">Admin access denied</h2>
        <p className="mt-3 text-on-surface-variant">
          Signed in as <strong>{user?.email || "unknown"}</strong>. This account
          is not on the admin allowlist.
        </p>
        {!configured ? (
          <p className="mt-4 rounded-xl bg-surface-container px-4 py-3 text-sm">
            <code>ADMIN_EMAILS</code> is empty. Add your email in{" "}
            <code>web/.env.local</code>, then restart{" "}
            <code>npm run dev</code>:
            <br />
            <code className="mt-2 block">ADMIN_EMAILS=you@example.com</code>
          </p>
        ) : null}
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-semibold text-on-primary"
        >
          Back to dashboard
        </Link>
      </main>
    </div>
  );
}
