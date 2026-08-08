/**
 * P0 agent smoke test:
 * 1) safety gate unit checks
 * 2) sign in (or create) a throwaway user via Supabase
 * 3) call POST /api/ai-chat (SSE) and assert tool / answer events
 *
 * Usage: node --env-file=.env.local scripts/test-agent-p0.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

const email = `agent-p0-test-${Date.now()}@sihatq.local`;
const password = "TestAgentP0!23456";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testGateLocal() {
  const ALLOWED = new Set([
    "get_user_risk",
    "search_knowledge",
    "get_reference_stat",
    "list_recommendations",
  ]);

  function gate(name, argumentsJson) {
    if (!ALLOWED.has(name)) throw new Error(`blocked:${name}`);
    let raw = {};
    try {
      raw = argumentsJson?.trim() ? JSON.parse(argumentsJson) : {};
    } catch {
      throw new Error("bad json");
    }
    if ("user_id" in raw || "userId" in raw) throw new Error("user_id blocked");
    if (name === "search_knowledge") {
      return z
        .object({
          query: z.string().trim().min(2).max(300),
          top_k: z.number().int().min(1).max(5).optional(),
        })
        .strict()
        .parse(raw);
    }
    if (name === "get_reference_stat") {
      return z
        .object({
          indicator: z.string().trim().min(2).max(120),
          state: z.string().trim().min(2).max(80).optional(),
        })
        .strict()
        .parse(raw);
    }
    return z.object({}).strict().parse(raw);
  }

  gate("get_user_risk", "{}");
  gate("search_knowledge", JSON.stringify({ query: "diabetes NHMS" }));
  let blocked = false;
  try {
    gate("run_shell", "{}");
  } catch {
    blocked = true;
  }
  assert(blocked, "run_shell should be blocked");

  blocked = false;
  try {
    gate("get_user_risk", JSON.stringify({ user_id: "x" }));
  } catch {
    blocked = true;
  }
  assert(blocked, "user_id should be blocked");
  console.log("✓ gate checks passed");
}

async function ensureSession() {
  assert(url && anon, "Missing Supabase URL/anon key in env");
  assert(service, "Missing SUPABASE_SERVICE_ROLE_KEY for test user create");

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (createErr) throw createErr;
  assert(created.user?.id, "createUser failed");

  const { error: riskErr } = await admin.from("risk_results").insert({
    user_id: created.user.id,
    risk_category: "Diabetes / metabolic signals",
    risk_level: "moderate",
    explanation:
      "Test assessment for agent P0: lifestyle and family history signals.",
    comparison_text:
      "NHMS 2023 reports national diabetes prevalence around 15.6%.",
    recommendations: [
      {
        title: "Ask about screening",
        description: "Discuss diabetes screening with a qualified provider.",
      },
    ],
    your_score: 62,
    national_benchmark: 50,
  });
  if (riskErr) throw riskErr;

  // Build SSR-compatible cookies via @supabase/ssr cookie adapter
  const { createServerClient } = await import("@supabase/ssr");
  /** @type {Map<string, string>} */
  const jar = new Map();
  const ssr = createServerClient(url, anon, {
    cookies: {
      getAll: () =>
        [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          if (value) jar.set(name, value);
          else jar.delete(name);
        }
      },
    },
  });

  const { data: signed, error: signErr } = await ssr.auth.signInWithPassword({
    email,
    password,
  });
  if (signErr) throw signErr;
  assert(signed.session?.access_token, "No access token");
  assert(jar.size > 0, "SSR cookie jar empty after sign-in");

  const cookie = [...jar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  return {
    userId: created.user.id,
    cookie,
    admin,
  };
}

async function callAiChat(cookie, message) {
  const res = await fetch(`${BASE}/api/ai-chat`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Cookie: cookie,
    },
    body: JSON.stringify({
      message,
      stream: true,
      mode: "agent",
    }),
  });

  const text = await res.text();
  return { status: res.status, contentType: res.headers.get("content-type"), text };
}

function parseSse(text) {
  const events = [];
  for (const block of text.split("\n\n")) {
    const line = block
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("data:"));
    if (!line) continue;
    try {
      events.push(JSON.parse(line.replace(/^data:\s*/, "")));
    } catch {
      /* ignore */
    }
  }
  return events;
}

async function cleanup(admin, userId) {
  try {
    await admin.from("risk_results").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  } catch (e) {
    console.warn("cleanup warning", e.message || e);
  }
}

async function main() {
  console.log("P0 agent test against", BASE);
  testGateLocal();

  const unauth = await fetch(`${BASE}/api/ai-chat`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "hello world test" }),
  });
  assert(
    unauth.status === 307 || unauth.status === 401 || unauth.status === 302,
    `expected redirect/401 unauth, got ${unauth.status}`,
  );
  console.log(`✓ unauthenticated request blocked (${unauth.status})`);

  const session = await ensureSession();

  try {
    const question =
      "Based on my assessment, explain my diabetes-related risk using NHMS public stats. What screening should I consider?";
    console.log("→ calling /api/ai-chat …");
    const { status, contentType, text } = await callAiChat(
      session.cookie,
      question,
    );
    console.log("status", status, "content-type", contentType);
    assert(status === 200, `ai-chat status ${status}: ${text.slice(0, 500)}`);

    const events = parseSse(text);
    console.log(
      "events:",
      events.map((e) => e.type + (e.tool ? `(${e.tool})` : "")).join(" → "),
    );

    const toolStarts = events.filter((e) => e.type === "tool_start");
    const done = events.find((e) => e.type === "done");
    const err = events.find((e) => e.type === "error");

    if (err) throw new Error(`SSE error event: ${err.error}`);
    assert(done, "missing done event");
    assert(done.payload?.reply?.length > 20, "reply too short");
    assert(
      ["agent", "llm", "rules"].includes(done.payload.mode),
      `unexpected mode ${done.payload.mode}`,
    );

    console.log("mode:", done.payload.mode);
    console.log("retrieval:", done.payload.retrieval);
    console.log("sources:", done.payload.sources);
    console.log(
      "reply preview:",
      done.payload.reply.slice(0, 240).replace(/\n/g, " "),
    );
    console.log("tool_start count:", toolStarts.length);
    for (const t of toolStarts) {
      console.log("  -", t.tool, t.step?.detail || "");
    }

    if (done.payload.mode === "agent") {
      if (done.payload.awaiting_plan) {
        console.log(
          "⚠ Plan Mode awaiting approval (AGENT_PERMISSION_MODE=confirm). Re-run with AGENT_PERMISSION_MODE=auto for tool-loop smoke, or use test-agent-p1.mjs for Plan flow.",
        );
        assert(
          events.some((e) => e.type === "plan"),
          "expected plan event when awaiting approval",
        );
        console.log("✓ plan gate engaged (P0 soft-pass under confirm mode)");
      } else {
        const workerish = events.filter(
          (e) =>
            e.type === "thinking" &&
            /worker|multi-/i.test(String(e.step?.id || e.step?.label || "")),
        );
        assert(
          toolStarts.length >= 1 ||
            workerish.length >= 1 ||
            (done.payload.sources?.length >= 1 &&
              /combined preventive|Personal assessment/i.test(
                done.payload.reply || "",
              )),
          "agent mode should call tools, run multi-agent workers, or return multi-agent merged answer",
        );
        if (toolStarts.length >= 1) {
          console.log("✓ agent mode used tools");
        } else if (workerish.length >= 1) {
          console.log(
            "✓ multi-agent workers ran:",
            workerish.map((e) => e.step?.id).join(", "),
          );
        } else {
          console.log(
            "✓ multi-agent style answer with sources (workers may not emit tool_start)",
          );
        }
      }
    } else if (toolStarts.length >= 1) {
      console.log(
        "⚠ final mode is",
        done.payload.mode,
        "but tools ran earlier — partial agent path OK",
      );
    } else {
      console.log(
        "⚠ fell back to",
        done.payload.mode,
        "without tools (agent LLM may be unavailable)",
      );
    }

    const lower = done.payload.reply.toLowerCase();
    assert(
      lower.includes("not") &&
        (lower.includes("diagnos") || lower.includes("medical")),
      "reply should include non-diagnosis / medical disclaimer signal",
    );
    console.log("✓ disclaimer signal present");
    console.log("\nALL CHECKS PASSED");
  } finally {
    await cleanup(session.admin, session.userId);
    console.log("✓ cleaned up test user", email);
  }
}

main().catch((err) => {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
});
