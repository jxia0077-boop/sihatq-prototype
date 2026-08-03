import Link from "next/link";

const NAV = [
  { href: "/admin", label: "Overview", icon: "dashboard" },
  { href: "/admin/users", label: "Users", icon: "group" },
  { href: "/admin/stats", label: "Reference stats", icon: "database" },
  { href: "/admin/assessments", label: "Assessments", icon: "analytics" },
];

export function AdminShell({
  email,
  children,
  hasServiceRole,
}: {
  email: string;
  children: React.ReactNode;
  hasServiceRole: boolean;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant/40 bg-surface-container-lowest">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              SihatQ Admin
            </p>
            <h1 className="font-headline text-xl font-bold">Backend console</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-on-surface-variant">{email}</span>
            <Link href="/dashboard" className="font-semibold text-primary hover:underline">
              Back to app
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5 pb-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[18px]">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {!hasServiceRole ? (
          <div className="mb-6 rounded-xl border border-error/30 bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
            <code>SUPABASE_SERVICE_ROLE_KEY</code> is missing. Overview counts
            and edits need this server-only key (Supabase → Settings → API).
            Pages still render with empty/limited data.
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
