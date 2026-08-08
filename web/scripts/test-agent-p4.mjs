/**
 * P4 smoke: multi-agent parallel workers + merged answer.
 * Usage: node --env-file=.env.local scripts/test-agent-p4.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = `agent-p4-test-${Date.now()}@sihatq.local`;
const password = "TestAgentP4!23456";

const QUESTION =
  "Compare my risk with NHMS public stats and give 3 lifestyle recommendations for prevention";

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
    explanation: "Lifestyle and family-history signals.",
    comparison_text: "NHMS 2023 diabetes prevalence about 15.6%.",
    recommendations: [
      { title: "Cut sugary drinks", description: "Choose water most days." },
      { title: "Walk daily", description: "Aim for brisk walking most days." },
      {
        title: "Ask about screening",
        description: "Discuss glucose screening with a clinician.",
      },
    ],
    your_score: 62,
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
  await ssr.auth.signInWithPassword({ email, password });
  return {
    userId: created.user.id,
    cookie: [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; "),
    admin,
  };
}

async function main() {
  console.log("P4 agent test against", BASE);
  const session = await ensureSession();

  try {
    const res = await fetch(`${BASE}/api/ai-chat`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Cookie: session.cookie,
      },
      body: JSON.stringify({
        message: QUESTION,
        stream: true,
        mode: "multi",
      }),
    });
    const text = await res.text();
    assert(res.status === 200, `status ${res.status}: ${text.slice(0, 300)}`);

    const events = parseSse(text);
    const labels = events
      .filter((e) => e.type === "thinking")
      .map((e) => e.step?.id || e.step?.label || "");

    console.log(
      "worker steps:",
      labels.filter((l) => /worker|multi|safety|merge|parallel/i.test(l)).join(" → "),
    );

    assert(
      labels.some((l) => /multi-start|Coordinator/i.test(l)),
      "expected coordinator start",
    );
    assert(
      labels.some((l) => /worker-research/i.test(l)),
      "expected research worker",
    );
    assert(
      labels.some((l) => /worker-personal/i.test(l)),
      "expected personalization worker",
    );
    assert(
      labels.some((l) => /multi-parallel|Parallel workers/i.test(l)),
      "expected parallel completion marker",
    );

    const done = events.find((e) => e.type === "done");
    assert(done?.payload?.reply?.length > 40, "missing merged reply");
    assert(!done.payload.awaiting_plan, "multi mode should not await plan");

    const reply = done.payload.reply;
    const lower = reply.toLowerCase();
    assert(
      lower.includes("not a medical") ||
        lower.includes("not medical") ||
        (lower.includes("preventive") && lower.includes("diagnosis")) ||
        lower.includes("clinician") ||
        lower.includes("doctor"),
      "disclaimer/safety signal missing",
    );
    assert(
      /nhms|15\.6|diabetes|lifestyle|walk|sugar|screening/i.test(reply),
      "expected merged research/personal content",
    );

    console.log("mode:", done.payload.mode);
    console.log("sources:", done.payload.sources);
    console.log("reply preview:", reply.slice(0, 280).replace(/\n/g, " "));
    console.log("\nALL P4 CHECKS PASSED");
  } finally {
    try {
      await session.admin.from("risk_results").delete().eq("user_id", session.userId);
      await session.admin.auth.admin.deleteUser(session.userId);
    } catch (e) {
      console.warn("cleanup", e.message || e);
    }
  }
}

main().catch((e) => {
  console.error("\nTEST FAILED:", e);
  process.exit(1);
});
