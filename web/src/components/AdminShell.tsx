import Link from "next/link";

const NAV = [
  { href: "/admin", label: "Overview", icon: "dashboard" },
  { href: "/admin/users", label: "Users", icon: "group" },
  { href: "/admin/assessments", label: "Assessments", icon: "analytics" },
  { href: "/admin/stats", label: "Reference stats", icon: "database" },
  { href: "/admin/traces", label: "Agent traces", icon: "timeline" },
  { href: "/admin/system", label: "System", icon: "settings_heart" },
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
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              SihatQ Admin
            </p>
            <h1 className="font-headline text-2xl font-bold">
              Backend console
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                hasServiceRole
                  ? "bg-primary/10 text-primary"
                  : "bg-error-container text-on-error-container"
              }`}
            >
              {hasServiceRole ? "Service role connected" : "Limited mode"}
            </span>
            <span className="max-w-[16rem] truncate text-on-surface-variant">
              {email}
            </span>
            <Link
              href="/dashboard"
              className="font-semibold text-primary hover:underline"
            >
              Back to app
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 pb-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[18px]">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        {!hasServiceRole ? (
          <div className="mb-6 rounded-2xl border border-error/30 bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
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
