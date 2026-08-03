"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type AdminStatRow = {
  id: string;
  indicator: string;
  year: number;
  state: string | null;
  age_group: string | null;
  gender: string | null;
  value: number;
  unit: string;
  source_title: string;
  source_url: string | null;
};

const emptyForm = {
  indicator: "",
  year: String(new Date().getFullYear()),
  state: "",
  age_group: "",
  gender: "",
  value: "",
  unit: "percent",
  source_title: "",
  source_url: "",
};

export function AdminStatsManager({
  initialRows,
  canWrite,
}: {
  initialRows: AdminStatRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startEdit(row: AdminStatRow) {
    setEditingId(row.id);
    setForm({
      indicator: row.indicator,
      year: String(row.year),
      state: row.state || "",
      age_group: row.age_group || "",
      gender: row.gender || "",
      value: String(row.value),
      unit: row.unit,
      source_title: row.source_title,
      source_url: row.source_url || "",
    });
    setMessage(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite) {
      setMessage("Set SUPABASE_SERVICE_ROLE_KEY to enable writes.");
      return;
    }
    setBusy(true);
    setMessage(null);

    const payload = {
      id: editingId || undefined,
      indicator: form.indicator.trim(),
      year: Number(form.year),
      state: form.state.trim() || null,
      age_group: form.age_group.trim() || null,
      gender: form.gender.trim() || null,
      value: Number(form.value),
      unit: form.unit.trim() || "percent",
      source_title: form.source_title.trim(),
      source_url: form.source_url.trim() || null,
    };

    const response = await fetch("/api/admin/stats", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || "Save failed");
      return;
    }

    setMessage(editingId ? "Updated." : "Created.");
    resetForm();
    router.refresh();
    if (data.row) {
      setRows((prev) => {
        const without = prev.filter((r) => r.id !== data.row.id);
        return [data.row, ...without].sort(
          (a, b) => b.year - a.year || a.indicator.localeCompare(b.indicator),
        );
      });
    }
  }

  async function remove(id: string) {
    if (!canWrite) return;
    if (!confirm("Delete this reference stat?")) return;
    setBusy(true);
    const response = await fetch(`/api/admin/stats?id=${id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "Delete failed");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) resetForm();
    setMessage("Deleted.");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={submit}
        className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5"
      >
        <h3 className="font-headline text-lg font-semibold">
          {editingId ? "Edit stat" : "Add reference stat"}
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["indicator", "Indicator", "text"],
              ["year", "Year", "number"],
              ["value", "Value", "number"],
              ["unit", "Unit", "text"],
              ["state", "State (optional)", "text"],
              ["age_group", "Age group (optional)", "text"],
              ["gender", "Gender (optional)", "text"],
              ["source_title", "Source title", "text"],
              ["source_url", "Source URL", "text"],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="block text-sm sm:col-span-1">
              <span className="text-on-surface-variant">{label}</span>
              <input
                required={["indicator", "year", "value", "unit", "source_title"].includes(
                  key,
                )}
                type={type}
                step={key === "value" ? "any" : undefined}
                value={String(form[key])}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface px-3 py-2"
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={busy || !canWrite}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
          >
            {editingId ? "Save changes" : "Create"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-outline-variant px-5 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
          ) : null}
        </div>
        {message ? (
          <p className="mt-3 text-sm text-on-surface-variant">{message}</p>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-container text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-semibold">Indicator</th>
              <th className="px-4 py-3 font-semibold">Year</th>
              <th className="px-4 py-3 font-semibold">Value</th>
              <th className="px-4 py-3 font-semibold">Scope</th>
              <th className="px-4 py-3 font-semibold">Source</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-on-surface-variant"
                >
                  No reference stats loaded.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-outline-variant/20 align-top"
                >
                  <td className="px-4 py-3 font-medium">{row.indicator}</td>
                  <td className="px-4 py-3">{row.year}</td>
                  <td className="px-4 py-3">
                    {row.value}{" "}
                    <span className="text-xs text-on-surface-variant">
                      {row.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {[row.state, row.age_group, row.gender]
                      .filter(Boolean)
                      .join(" · ") || "national"}
                  </td>
                  <td className="max-w-[12rem] truncate px-4 py-3">
                    {row.source_url ? (
                      <a
                        href={row.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {row.source_title}
                      </a>
                    ) : (
                      row.source_title
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="text-sm font-semibold text-primary"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={!canWrite || busy}
                        onClick={() => remove(row.id)}
                        className="text-sm font-semibold text-error disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
