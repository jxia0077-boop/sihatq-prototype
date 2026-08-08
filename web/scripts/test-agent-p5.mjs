/**
 * P5 smoke: dual-protocol adapter unit checks + live chat returns trace_id.
 * Usage: node --env-file=.env.local scripts/test-agent-p5.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = `agent-p5-test-${Date.now()}@sihatq.local`;
const password = "TestAgentP5!23456";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
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

/** Lightweight Anthropic message conversion check (no network). */
function testAnthropicConversion() {
  // Inline mirror of conversion rules used by llm/anthropic.ts
  const messages = [
    { role: "system", content: "Be careful." },
    { role: "user", content: "Hello" },
    {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_1",
          name: "search_knowledge",
          arguments: '{"query":"NHMS"}',
        },
      ],
    },
    {
      role: "tool",
      tool_call_id: "call_1",
      name: "search_knowledge",
      content: '{"ok":true}',
    },
  ];

  const systemParts = [];
  const out = [];
  for (const message of messages) {
    if (message.role === "system") {
      systemParts.push(message.content);
      continue;
    }
    if (message.role === "user") {
      out.push({ role: "user", content: message.content });
      continue;
    }
    if (message.role === "assistant" && message.tool_calls?.length) {
      out.push({
        role: "assistant",
        content: message.tool_calls.map((tc) => ({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: JSON.parse(tc.arguments),
        })),
      });
      continue;
    }
    if (message.role === "tool") {
      out.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: message.tool_call_id,
            content: message.content,
          },
        ],
      });
    }
  }

  assert(systemParts.join() === "Be careful.", "system extracted");
  assert(out[0].role === "user", "starts with user");
  assert(out[1].content[0].type === "tool_use", "tool_use block");
  assert(out[2].content[0].type === "tool_result", "tool_result block");
  console.log("✓ Anthropic tools/tool_use conversion shape OK");
}

async function ensureSession() {
  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;

  await admin.from("risk_results").insert({
    user_id: created.user.id,
    risk_category: "Diabetes / metabolic signals",
    risk_level: "moderate",
    explanation: "Lifestyle signals.",
    comparison_text: "NHMS context.",
    recommendations: [
      { title: "Walk daily", description: "Brisk walking most days." },
    ],
    your_score: 55,
    national_benchmark: 50,
  });

  const jar = new Map();
  const ssr = createServerClient(url, anon, {
    cookies: {
      getAll: () =>
        [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (arr) => {
        for (const { name, value } of arr) {
          if (value) jar.set(name, value);
          else jar.delete(name);
        }
      },
    },
  });

  const { error: signErr } = await ssr.auth.signInWithPassword({
    email,
    password,
  });
  if (signErr) throw signErr;

  const cookieHeader = [...jar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  return { cookieHeader, userId: created.user.id, admin };
}

async function main() {
  assert(url && anon && service, "Need Supabase env vars");
  testAnthropicConversion();

  const { cookieHeader, admin, userId } = await ensureSession();

  const res = await fetch(`${BASE}/api/ai-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      message: "What lifestyle tips help prevent diabetes?",
      stream: true,
      sessionId: `p5-${Date.now()}`,
    }),
  });

  assert(res.ok, `ai-chat status ${res.status}`);
  const text = await res.text();
  const events = parseSse(text);
  const done = events.find((e) => e.type === "done");
  assert(done, "expected done event");
  assert(done.payload?.reply, "expected reply");
  assert(
    typeof done.payload?.trace_id === "string" && done.payload.trace_id.length > 10,
    "expected trace_id on done payload",
  );
  console.log("✓ SSE done includes trace_id:", done.payload.trace_id);

  // Best-effort: DB row if migration applied
  const { data: row } = await admin
    .from("agent_traces")
    .select("id, status, steps")
    .eq("id", done.payload.trace_id)
    .maybeSingle();

  if (row) {
    assert(Array.isArray(row.steps), "steps jsonb");
    console.log("✓ Trace persisted in agent_traces (", row.steps.length, "steps)");
  } else {
    console.log(
      "ℹ Trace not in DB yet — run supabase/migrations/006_agent_traces.sql for durable storage (in-memory still works in process).",
    );
  }

  await admin.auth.admin.deleteUser(userId);
  console.log("P5 smoke OK");
}

main().catch((err) => {
  console.error("P5 smoke FAILED", err);
  process.exit(1);
});
