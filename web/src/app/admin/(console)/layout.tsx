import { AdminShell } from "@/components/AdminShell";
import { hasServiceRoleKey, requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <AdminShell
      email={user.email || "unknown"}
      hasServiceRole={hasServiceRoleKey()}
    >
      {children}
    </AdminShell>
  );
}
