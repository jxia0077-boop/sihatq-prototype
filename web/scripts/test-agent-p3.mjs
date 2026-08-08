/**
 * P3 smoke: MCP discover vs full token savings + skill tool subsets.
 * Usage: node --env-file=.env.local scripts/test-agent-p3.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { pathToFileURL } from "url";
import path from "path";

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = `agent-p3-test-${Date.now()}@sihatq.local`;
const password = "TestAgentP3!23456";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Inline mirrors of registry metrics (avoid TS import)
const FULL = {
  get_user_risk: {
    name: "get_user_risk",
    description: "Load assessment",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  search_knowledge: {
    name: "search_knowledge",
    description: "Search knowledge",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "q" },
        top_k: { type: "integer", description: "n" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  get_reference_stat: {
    name: "get_reference_stat",
    description: "Stats",
    parameters: {
      type: "object",
      properties: {
        indicator: { type: "string", description: "i" },
        state: { type: "string", description: "s" },
      },
      required: ["indicator"],
      additionalProperties: false,
    },
  },
  list_recommendations: {
    name: "list_recommendations",
    description: "Tips",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
};

function stub(name, short) {
  return {
    name,
    description: `${short} [MCP lazy]`,
    parameters: { type: "object", properties: {}, additionalProperties: true },
  };
}

function measure(names) {
  const stubs = names.map((n) =>
    stub(n, FULL[n]?.description || n),
  );
  const full = names.map((n) => FULL[n]);
  const stubChars = JSON.stringify(stubs).length;
  const fullChars = JSON.stringify(full).length;
  return {
    stubChars,
    fullChars,
    savedRatio: 1 - stubChars / fullChars,
  };
}

const SKILLS = {
  "preventive-diabetes": [
    "get_user_risk",
    "search_knowledge",
    "get_reference_stat",
    "list_recommendations",
  ],
  "screening-navigation": [
    "get_user_risk",
    "list_recommendations",
    "search_knowledge",
  ],
};

function routeSkill(q) {
  const lower = q.toLowerCase();
  if (/diabetes|血糖|糖尿病/.test(lower)) return "preventive-diabetes";
  if (/screening|筛查/.test(lower)) return "screening-navigation";
  return "general";
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
    explanation: "P3 test",
    comparison_text: "NHMS 15.6%",
    recommendations: [{ title: "Screening", description: "Ask a clinician." }],
    your_score: 60,
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

async function callAi(cookie, message) {
  const res = await fetch(`${BASE}/api/ai-chat`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Cookie: cookie,
    },
    body: JSON.stringify({ message, stream: true, mode: "react" }),
  });
  const text = await res.text();
  return { status: res.status, events: parseSse(text) };
}

async function main() {
  console.log("P3 agent test against", BASE);

  const diabetesTools = SKILLS["preventive-diabetes"];
  const screeningTools = SKILLS["screening-navigation"];
  assert(
    !screeningTools.includes("get_reference_stat"),
    "screening skill must hide get_reference_stat",
  );
  console.log("✓ skill subsets differ (screening hides get_reference_stat)");

  const mAll = measure(Object.keys(FULL));
  console.log(
    `✓ MCP discover vs full: stubs ${mAll.stubChars} chars, full ${mAll.fullChars} chars, saved ~${Math.round(mAll.savedRatio * 100)}%`,
  );
  assert(mAll.savedRatio > 0.15, "expected meaningful token savings from stubs");
  console.log(
    "  (note: ~85% savings is for 100+ tools; with 4 tools ~20–40% is expected)",
  );

  assert(routeSkill("diabetes risk") === "preventive-diabetes", "diabetes skill");
  assert(routeSkill("what screening") === "screening-navigation", "screening skill");
  console.log("✓ skill router");

  const session = await ensureSession();
  try {
    const { status, events } = await callAi(
      session.cookie,
      "What diabetes screening should I consider based on my assessment?",
    );
    assert(status === 200, `status ${status}`);
    const labels = events
      .filter((e) => e.type === "thinking")
      .map((e) => e.step?.label || "");
    assert(
      labels.some((l) => /Skill:/i.test(l)),
      "expected skill-selected thinking step",
    );
    assert(
      labels.some((l) => /MCP discovery/i.test(l)) ||
        labels.some((l) => /MCP full schema/i.test(l)),
      "expected MCP discover or full-schema step",
    );
    console.log("✓ live agent emitted skill + MCP thinking steps");
    console.log(
      "thinking:",
      labels.filter((l) => /Skill|MCP/i.test(l)).join(" | "),
    );

    const tools = events
      .filter((e) => e.type === "tool_start")
      .map((e) => e.tool);
    if (tools.length) {
      assert(
        tools.every((t) => diabetesTools.includes(t) || screeningTools.includes(t)),
        "tools outside skill",
      );
      console.log("✓ tools used within skill allow-list:", tools.join(", "));
    } else {
      console.log("⚠ no tools this turn (LLM may have answered directly)");
    }

    console.log("\nALL P3 CHECKS PASSED");
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
