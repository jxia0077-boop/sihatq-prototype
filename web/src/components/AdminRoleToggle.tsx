"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminRoleToggle({
  userId,
  email,
  isAdmin,
  isSelf,
}: {
  userId: string;
  email: string;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setRole(role: "admin" | "user") {
    if (isSelf && role === "user") {
      setError("You cannot remove your own admin access.");
      return;
    }
    setBusy(true);
    setError(null);
    const response = await fetch("/api/admin/users/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "Update failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            isAdmin
              ? "bg-primary/15 text-primary"
              : "bg-surface-container text-on-surface-variant"
          }`}
        >
          {isAdmin ? "admin" : "user"}
        </span>
        {isAdmin ? (
          <button
            type="button"
            disabled={busy || isSelf}
            onClick={() => setRole("user")}
            className="text-xs font-semibold text-error disabled:opacity-40"
            title={isSelf ? "Cannot demote yourself" : `Remove admin from ${email}`}
          >
            Remove admin
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setRole("admin")}
            className="text-xs font-semibold text-primary disabled:opacity-40"
          >
            Make admin
          </button>
        )}
      </div>
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
