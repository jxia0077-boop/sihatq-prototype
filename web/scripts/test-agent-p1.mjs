/**
 * P1 smoke: medical rules, plan draft (awaiting), decline (zero tools), approve (tools).
 * Usage: node --env-file=.env.local scripts/test-agent-p1.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = `agent-p1-test-${Date.now()}@sihatq.local`;
const password = "TestAgentP1!23456";

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

async function ensureSession() {
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

  await admin.from("risk_results").insert({
    user_id: created.user.id,
    risk_category: "Diabetes / metabolic signals",
    risk_level: "moderate",
    explanation: "P1 test assessment.",
    comparison_text: "NHMS 2023 diabetes ~15.6%.",
    recommendations: [
      { title: "Ask about screening", description: "Talk to a provider." },
    ],
    your_score: 62,
    national_benchmark: 50,
  });

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
  const { error: signErr } = await ssr.auth.signInWithPassword({
    email,
    password,
  });
  if (signErr) throw signErr;

  return {
    userId: created.user.id,
    cookie: [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; "),
    admin,
  };
}

async function callAi(cookie, body) {
  const res = await fetch(`${BASE}/api/ai-chat`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Cookie: cookie,
    },
    body: JSON.stringify({ stream: true, ...body }),
  });
  const text = await res.text();
  return { status: res.status, text, events: parseSse(text) };
}

async function cleanup(admin, userId) {
  try {
    await admin.from("risk_results").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  } catch (e) {
    console.warn("cleanup", e.message || e);
  }
}

async function main() {
  console.log("P1 agent test against", BASE);
  const session = await ensureSession();

  try {
    // 1) Medical rules — no tools
    {
      const { status, events } = await callAi(session.cookie, {
        message: "Do I have diabetes? Please diagnose me.",
        mode: "react",
      });
      assert(status === 200, `medical status ${status}`);
      const done = events.find((e) => e.type === "done");
      const tools = events.filter((e) => e.type === "tool_start");
      assert(done, "medical: missing done");
      assert(tools.length === 0, "medical: tools should not run");
      assert(
        /diagnos|prescribe|qualified doctor|medical/i.test(done.payload.reply),
        "medical: safety reply expected",
      );
      console.log("✓ medical input rule blocks tools");
    }

    // 2) Plan draft — awaiting, zero tools
    let plan;
    {
      const question =
        "Based on my assessment, explain my diabetes risk using NHMS and what screening I should consider";
      const { status, events } = await callAi(session.cookie, {
        message: question,
        mode: "plan",
      });
      assert(status === 200, `plan status ${status}`);
      const done = events.find((e) => e.type === "done");
      const planEvent = events.find((e) => e.type === "plan");
      const tools = events.filter((e) => e.type === "tool_start");
      assert(done?.payload?.awaiting_plan, "expected awaiting_plan");
      plan = done.payload.plan || planEvent?.plan;
      assert(plan?.steps?.length > 0, "missing plan steps");
      assert(tools.length === 0, "plan draft must not run tools");
      console.log("✓ plan draft returned with zero tools");
    }

    // 3) Decline — zero tools
    {
      const { status, events } = await callAi(session.cookie, {
        message: "Based on my assessment, explain my diabetes risk using NHMS",
        planDecision: "decline",
      });
      assert(status === 200, `decline status ${status}`);
      const done = events.find((e) => e.type === "done");
      const tools = events.filter((e) => e.type === "tool_start");
      assert(tools.length === 0, "decline must not run tools");
      assert(/cancel/i.test(done.payload.reply), "decline cancel message");
      console.log("✓ plan decline runs zero tools");
    }

    // 4) Approve — tools run (force react so we don't take multi-agent path without tool_start SSE)
    {
      const question =
        "Based on my assessment, explain my diabetes risk using NHMS and screening";
      const { status, events } = await callAi(session.cookie, {
        message: question,
        mode: "react",
        planDecision: "approve",
        approvedPlan: plan,
      });
      assert(status === 200, `approve status ${status}`);
      const done = events.find((e) => e.type === "done");
      const tools = events.filter((e) => e.type === "tool_start");
      const workerish = events.filter(
        (e) =>
          e.type === "thinking" &&
          /worker|multi-/i.test(e.step?.id || e.step?.label || ""),
      );
      assert(done, "approve missing done");
      assert(
        tools.length >= 1 || workerish.length >= 1,
        "approve should run tools or multi-agent workers",
      );
      assert(!done.payload.awaiting_plan, "approve should not await plan");
      console.log(
        "✓ plan approve ran:",
        tools.length
          ? `tools=${tools.map((t) => t.tool).join(", ")}`
          : `workers=${workerish.map((e) => e.step?.id).join(", ")}`,
      );
      console.log("mode:", done.payload.mode);
    }

    console.log("\nALL P1 CHECKS PASSED");
  } finally {
    await cleanup(session.admin, session.userId);
    console.log("✓ cleaned up", email);
  }
}

main().catch((err) => {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
});
