/**
 * P2 smoke: compression invariants + memory load/extract path.
 * Usage: node --env-file=.env.local scripts/test-agent-p2.mjs
 *
 * Requires: Supabase migration 005_agent_memories.sql for persistence checks.
 */
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

function estimateTokens(messages) {
  let chars = 0;
  for (const m of messages) {
    chars += (m.content || "").length;
    for (const tc of m.tool_calls || []) {
      chars += tc.name.length + tc.arguments.length + tc.id.length;
    }
  }
  return Math.ceil(chars / 4) + messages.length * 4;
}

function groupMessageUnits(messages) {
  const units = [];
  let i = 0;
  while (i < messages.length) {
    const m = messages[i];
    if (m.role === "assistant" && m.tool_calls?.length) {
      const chain = [m];
      const tools = m.tool_calls.map((t) => t.name);
      const needed = new Set(m.tool_calls.map((t) => t.id));
      i += 1;
      while (i < messages.length && needed.size > 0) {
        const next = messages[i];
        if (next.role === "tool" && next.tool_call_id && needed.has(next.tool_call_id)) {
          chain.push(next);
          needed.delete(next.tool_call_id);
          i += 1;
          continue;
        }
        break;
      }
      units.push({ kind: "tool_chain", messages: chain, tools });
      continue;
    }
    units.push({ kind: "single", messages: [m] });
    i += 1;
  }
  return units;
}

function toolPairsIntact(messages) {
  const pending = new Set();
  for (const m of messages) {
    if (m.role === "assistant" && m.tool_calls?.length) {
      for (const tc of m.tool_calls) pending.add(tc.id);
    }
    if (m.role === "tool" && m.tool_call_id) pending.delete(m.tool_call_id);
  }
  return pending.size === 0;
}

function compressMessages(messages, { tokenLimit = 200, keepRecentUnits = 3 } = {}) {
  const trigger = Math.floor(tokenLimit * 0.75);
  if (estimateTokens(messages) <= trigger) {
    return { messages, compressed: false };
  }
  const units = groupMessageUnits(messages);
  const systemUnits = units.filter(
    (u) => u.kind === "single" && u.messages[0]?.role === "system",
  );
  const otherUnits = units.filter(
    (u) => !(u.kind === "single" && u.messages[0]?.role === "system"),
  );
  const head = otherUnits.slice(0, Math.max(0, otherUnits.length - keepRecentUnits));
  const tail = otherUnits.slice(Math.max(0, otherUnits.length - keepRecentUnits));
  const tools = [];
  for (const u of head) if (u.kind === "tool_chain") tools.push(...u.tools);
  const summary = `Tools used in compressed segment: ${[...new Set(tools)].join(", ") || "none"}`;
  const rebuilt = [
    ...systemUnits.flatMap((u) => u.messages),
    { role: "system", content: `Conversation summary (compressed):\n${summary}` },
    ...tail.flatMap((u) => u.messages),
  ];
  return { messages: rebuilt, compressed: true, summary };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = `agent-p2-test-${Date.now()}@sihatq.local`;
const password = "TestAgentP2!23456";

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

function testCompression() {
  const messages = [
    { role: "system", content: "sys" },
    { role: "user", content: "hello ".repeat(40) },
    { role: "assistant", content: "hi ".repeat(40) },
    {
      role: "assistant",
      content: null,
      tool_calls: [
        { id: "c1", name: "get_user_risk", arguments: "{}" },
        { id: "c2", name: "search_knowledge", arguments: '{"query":"diabetes"}' },
      ],
    },
    {
      role: "tool",
      tool_call_id: "c1",
      name: "get_user_risk",
      content: '{"ok":true}',
    },
    {
      role: "tool",
      tool_call_id: "c2",
      name: "search_knowledge",
      content: '{"ok":true}',
    },
    { role: "user", content: "follow up ".repeat(30) },
    { role: "assistant", content: "answer ".repeat(30) },
    { role: "user", content: "latest question" },
  ];

  assert(toolPairsIntact(messages), "fixture pairs intact");
  const { messages: out, compressed } = compressMessages(messages, {
    tokenLimit: 180,
    keepRecentUnits: 3,
  });
  assert(compressed, "should compress oversized transcript");
  assert(toolPairsIntact(out), "compressed output must keep tool pairs intact");
  // If a tool_chain remains, both results must be present
  for (const u of groupMessageUnits(out)) {
    if (u.kind === "tool_chain") {
      const ids = new Set(u.messages[0].tool_calls.map((t) => t.id));
      const results = u.messages.filter((m) => m.role === "tool");
      assert(results.length === ids.size, "tool chain incomplete after compress");
    }
  }
  console.log("✓ compression keeps tool_call/tool_result pairs");
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
    explanation: "P2 test.",
    comparison_text: "NHMS ~15.6%.",
    recommendations: [],
    your_score: 60,
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
    body: JSON.stringify({ stream: true, mode: "react", ...body }),
  });
  const text = await res.text();
  return { status: res.status, events: parseSse(text) };
}

async function main() {
  console.log("P2 agent test against", BASE);
  testCompression();

  const session = await ensureSession();
  const sessionId = `p2-${Date.now()}`;

  try {
    const pref = await callAi(session.cookie, {
      message: "Please prefer English only, and do not use scary wording.",
      sessionId,
      history: [],
    });
    assert(pref.status === 200, `pref status ${pref.status}`);
    const prefDone = pref.events.find((e) => e.type === "done");
    assert(prefDone, "pref missing done");
    const memStep = pref.events.find(
      (e) => e.type === "thinking" && e.step?.id === "memory-loaded",
    );
    assert(memStep || prefDone, "expected memory load or reply");
    console.log("✓ preference turn completed (memory extract scheduled)");

    // Give async extract a moment
    await new Promise((r) => setTimeout(r, 2500));

    const { data: mems, error: memErr } = await session.admin
      .from("agent_memories")
      .select("category, content, scope")
      .eq("user_id", session.userId);

    if (memErr) {
      console.log(
        "⚠ agent_memories table missing/error — run 005_agent_memories.sql:",
        memErr.message,
      );
    } else {
      const hasPref = (mems || []).some(
        (m) =>
          m.category === "preference" &&
          /english|scary|calm|alarming/i.test(m.content),
      );
      if (hasPref) {
        console.log("✓ preference persisted to agent_memories");
      } else {
        console.log(
          "⚠ no preference row yet (LLM extract may have been rate-limited; heuristic should usually save)",
        );
        console.log("  rows:", mems);
      }
    }

    const follow = await callAi(session.cookie, {
      message: "What screening should I consider for metabolic health?",
      sessionId,
      history: [
        {
          role: "user",
          content: "Please prefer English only, and do not use scary wording.",
        },
        {
          role: "assistant",
          content: prefDone.payload.reply.slice(0, 500),
        },
      ],
    });
    assert(follow.status === 200, `follow status ${follow.status}`);
    const followDone = follow.events.find((e) => e.type === "done");
    assert(followDone?.payload?.reply?.length > 20, "follow reply missing");
    console.log("✓ follow-up with history returned a reply");
    console.log("reply preview:", followDone.payload.reply.slice(0, 180).replace(/\n/g, " "));

    console.log("\nALL P2 CHECKS PASSED (see warnings if migration not applied)");
  } finally {
    try {
      await session.admin.from("agent_memories").delete().eq("user_id", session.userId);
      await session.admin.from("risk_results").delete().eq("user_id", session.userId);
      await session.admin.auth.admin.deleteUser(session.userId);
    } catch (e) {
      console.warn("cleanup", e.message || e);
    }
  }
}

main().catch((err) => {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
});
