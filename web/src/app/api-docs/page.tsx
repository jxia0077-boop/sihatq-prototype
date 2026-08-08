"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OpenApiMedia = {
  example?: unknown;
  examples?: Record<string, { summary?: string; value?: unknown }>;
};

type OpenApiOperation = {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: {
    name: string;
    in: string;
    required?: boolean;
    schema?: unknown;
  }[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, OpenApiMedia>;
  };
  responses?: Record<string, { description?: string }>;
};

type OpenApiSpec = {
  info?: { title?: string; description?: string; version?: string };
  tags?: { name: string; description?: string }[];
  paths?: Record<string, Record<string, OpenApiOperation>>;
};

type EndpointRow = {
  key: string;
  path: string;
  method: string;
  tag: string;
  summary: string;
  description: string;
  parameters: OpenApiOperation["parameters"];
  requestBody?: OpenApiOperation["requestBody"];
  responses: Record<string, { description?: string }>;
};

const METHOD_CLASS: Record<string, string> = {
  GET: "bg-primary/10 text-primary",
  POST: "bg-[#e3f2ff] text-[#075985]",
  PATCH: "bg-[#fff1d6] text-[#925400]",
  DELETE: "bg-error-container text-on-error-container",
};

function firstExample(body?: OpenApiOperation["requestBody"]) {
  const json = body?.content?.["application/json"];
  if (!json) return "";
  if (json.example) return JSON.stringify(json.example, null, 2);
  const examples = Object.values(json.examples || {});
  const hit = examples.find((item) => item.value);
  return hit?.value ? JSON.stringify(hit.value, null, 2) : "";
}

function displayPath(path: string) {
  return path.replace("{id}", "{{trace_id}}");
}

function buildCurl(row: EndpointRow, origin: string) {
  const url = `${origin}${displayPath(row.path)}`;
  const lines = [`curl -i "${url}"`, `  -X ${row.method}`];
  const needsJson = row.requestBody?.content?.["application/json"];
  const needsCookie = row.parameters?.some(
    (param) => param.in === "header" && param.name.toLowerCase() === "cookie",
  );
  if (needsJson) lines.push(`  -H "Content-Type: application/json"`);
  if (needsCookie) {
    const consent =
      row.path === "/api/assess" ? "sihatq_privacy_consent=accepted; " : "";
    lines.push(`  -H "Cookie: ${consent}<PASTE_BROWSER_COOKIE>"`);
  }
  const example = firstExample(row.requestBody);
  if (example) lines.push(`  -d '${example.replace(/'/g, "'\\''")}'`);
  return lines.join(" \\\n");
}

function responseText(responses: EndpointRow["responses"]) {
  return Object.entries(responses)
    .map(([code, value]) => `${code}: ${value.description || "Response"}`)
    .join(" · ");
}

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/openapi.json", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load /openapi.json (${response.status})`);
        }
        return response.json() as Promise<OpenApiSpec>;
      })
      .then((data) => {
        if (!cancelled) setSpec(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load spec");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const endpoints = useMemo<EndpointRow[]>(() => {
    if (!spec?.paths) return [];
    const rows: EndpointRow[] = [];
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        const upperMethod = method.toUpperCase();
        rows.push({
          key: `${upperMethod}:${path}`,
          path,
          method: upperMethod,
          tag: operation.tags?.[0] || "Other",
          summary: operation.summary || operation.operationId || "",
          description: operation.description || "",
          parameters: operation.parameters || [],
          requestBody: operation.requestBody,
          responses: operation.responses || {},
        });
      }
    }
    return rows.sort((a, b) => a.tag.localeCompare(b.tag) || a.path.localeCompare(b.path));
  }, [spec]);

  const tags = useMemo(() => {
    return ["All", ...Array.from(new Set(endpoints.map((row) => row.tag)))];
  }, [endpoints]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return endpoints.filter((row) => {
      const tagOk = activeTag === "All" || row.tag === activeTag;
      const text = `${row.method} ${row.path} ${row.summary} ${row.description} ${row.tag}`.toLowerCase();
      return tagOk && (!q || text.includes(q));
    });
  }, [activeTag, endpoints, query]);

  async function copyCurl(row: EndpointRow) {
    const origin =
      typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
    await navigator.clipboard.writeText(buildCurl(row, origin));
    setCopiedKey(row.key);
    window.setTimeout(() => setCopiedKey(null), 1400);
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                health_and_safety
              </span>
              <span className="font-headline text-xl font-bold text-primary">
                SihatQ
              </span>
            </Link>
            <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-primary">
              API Explorer
            </p>
            <h1 className="mt-2 font-headline text-3xl font-bold">
              {spec?.info?.title || "SihatQ API Docs"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-on-surface-variant">
              像 Swagger 一样查看接口，也可以把 OpenAPI 或 Postman
              Collection 导入 Postman。受保护接口使用浏览器里的 Supabase
              Cookie，不是 Java 后端常见的 Bearer token。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/openapi.json"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-primary"
            >
              <span className="material-symbols-outlined text-[18px]">
                data_object
              </span>
              OpenAPI JSON
            </a>
            <a
              href="/postman/sihatq.postman_collection.json"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
            >
              <span className="material-symbols-outlined text-[18px]">
                download
              </span>
              Postman Collection
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-5 shadow-sm">
            <h2 className="font-headline text-lg font-semibold">
              How to debug like Postman
            </h2>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
              <li>1. Start local app: <code>cd web && npm run dev</code></li>
              <li>2. Login in browser, then copy Cookie from DevTools Network.</li>
              <li>3. Import Postman Collection and set variable <code>cookie</code>.</li>
              <li>4. Admin APIs also require <code>ADMIN_EMAILS</code> or <code>user_roles=admin</code>.</li>
            </ol>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
            <h2 className="font-headline text-lg font-semibold text-primary">
              Local URLs
            </h2>
            <div className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
              <p><code>http://localhost:3000/api-docs</code></p>
              <p><code>http://localhost:3000/openapi.json</code></p>
              <p><code>http://localhost:3000/postman/sihatq.postman_collection.json</code></p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search method, path, tag, summary..."
              className="min-h-11 w-full rounded-xl border border-outline-variant/35 bg-surface px-4 text-sm outline-none focus:border-primary"
            />
            <div className="flex gap-2 overflow-x-auto">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                    activeTag === tag
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error ? (
          <div className="mt-6 rounded-2xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container">
            {error}
          </div>
        ) : null}

        {!error && !spec ? (
          <p className="mt-6 text-sm text-on-surface-variant">
            Loading OpenAPI spec...
          </p>
        ) : null}

        {spec ? (
          <p className="mt-6 text-sm text-on-surface-variant">
            Showing <strong>{filtered.length}</strong> of{" "}
            <strong>{endpoints.length}</strong> operations · version{" "}
            {spec.info?.version || "n/a"}
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          {filtered.map((row) => {
            const expanded = openKey === row.key;
            const methodClass =
              METHOD_CLASS[row.method] || "bg-surface-container text-on-surface";
            const curl = buildCurl(
              row,
              typeof window === "undefined"
                ? "http://localhost:3000"
                : window.location.origin,
            );
            const example = firstExample(row.requestBody);

            return (
              <article
                key={row.key}
                className="overflow-hidden rounded-2xl border border-outline-variant/25 bg-surface-container-lowest shadow-sm"
              >
                <button
                  type="button"
                  className="flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-surface-container sm:flex-row sm:items-center"
                  onClick={() =>
                    setOpenKey((current) =>
                      current === row.key ? null : row.key,
                    )
                  }
                >
                  <span
                    className={`w-fit rounded-lg px-2.5 py-1 text-xs font-bold ${methodClass}`}
                  >
                    {row.method}
                  </span>
                  <code className="text-sm font-semibold">{row.path}</code>
                  <span className="text-sm text-on-surface-variant sm:ml-auto">
                    {row.summary}
                  </span>
                </button>

                {expanded ? (
                  <div className="border-t border-outline-variant/20 px-4 py-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                      <section>
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                          Detail
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
                          {row.description || "No description."}
                        </p>
                        <p className="mt-3 text-xs text-on-surface-variant">
                          Tag: {row.tag} · Responses: {responseText(row.responses)}
                        </p>

                        {row.parameters?.length ? (
                          <div className="mt-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                              Parameters
                            </p>
                            <div className="mt-2 overflow-x-auto rounded-xl bg-surface-container">
                              <table className="min-w-full text-left text-xs">
                                <thead className="text-on-surface-variant">
                                  <tr>
                                    <th className="px-3 py-2">Name</th>
                                    <th className="px-3 py-2">In</th>
                                    <th className="px-3 py-2">Required</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.parameters.map((param) => (
                                    <tr key={`${param.in}-${param.name}`}>
                                      <td className="border-t border-outline-variant/15 px-3 py-2 font-mono">
                                        {param.name}
                                      </td>
                                      <td className="border-t border-outline-variant/15 px-3 py-2">
                                        {param.in}
                                      </td>
                                      <td className="border-t border-outline-variant/15 px-3 py-2">
                                        {param.required ? "yes" : "no"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : null}
                      </section>

                      <section>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                            Curl
                          </p>
                          <button
                            type="button"
                            onClick={() => copyCurl(row)}
                            className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-primary"
                          >
                            {copiedKey === row.key ? "Copied" : "Copy curl"}
                          </button>
                        </div>
                        <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-[#101815] p-4 text-xs leading-5 text-[#d8f2e7]">
                          {curl}
                        </pre>
                      </section>
                    </div>

                    {example ? (
                      <section className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                          Request JSON example
                        </p>
                        <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-surface-container p-4 text-xs leading-5">
                          {example}
                        </pre>
                      </section>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
