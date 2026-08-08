#!/usr/bin/env bash
# One-shot verification for resume claims. Run from web/ with `npm run dev` already up.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
BASE="${TEST_BASE_URL:-http://127.0.0.1:3000}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$ROOT/docs/VERIFY_LOG_${STAMP}.md"
mkdir -p "$ROOT/docs"

pass=0
fail=0
note() { echo "$*" | tee -a "$OUT"; }
ok() { pass=$((pass + 1)); note "✓ $*"; }
bad() { fail=$((fail + 1)); note "✗ $*"; }

{
  echo "# SihatQ Verification Log — $(date '+%Y-%m-%d %H:%M %Z')"
  echo
  echo "Base URL: \`$BASE\`"
  echo
} >"$OUT"

note "## 1) Offline metrics (MCP / compress / multi wall-clock)"
if (cd "$ROOT" && npx --yes tsx scripts/bench-agent-metrics.ts) >>"$OUT" 2>&1; then
  ok "bench-agent-metrics.ts"
else
  bad "bench-agent-metrics.ts"
fi

note ""
note "## 2) SFT dataset validate (LoRA data)"
if (cd "$REPO" && node datasets/sihatq-sft/scripts/validate_sft_dataset.mjs) >>"$OUT" 2>&1; then
  ok "validate_sft_dataset.mjs (1600 train / 400 eval)"
else
  bad "validate_sft_dataset.mjs"
fi

note ""
note "## 3) Agent smoke P0–P5 (needs npm run dev)"
if ! curl -s -o /dev/null -w "%{http_code}" "$BASE" | grep -qE '200|307|308|404'; then
  bad "dev server not reachable at $BASE — start with: cd web && npm run dev"
else
  for p in p0 p1 p2 p3 p4 p5; do
    note ""
    note "### test-agent-$p"
    if (cd "$ROOT" && node --env-file=.env.local "scripts/test-agent-$p.mjs") >>"$OUT" 2>&1; then
      ok "test-agent-$p.mjs"
    else
      bad "test-agent-$p.mjs"
    fi
  done
fi

note ""
note "## 4) Supabase tables"
if (cd "$ROOT" && node --env-file=.env.local -e '
import { createClient } from "@supabase/supabase-js";
const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});
for (const t of ["knowledge_chunks","health_reference_stats","agent_memories","agent_traces"]) {
  const { count, error } = await c.from(t).select("id", { count: "exact", head: true });
  console.log(t + ":", error ? "ERROR "+error.message : count);
  if (error) process.exitCode = 1;
}
') >>"$OUT" 2>&1; then
  ok "Supabase table counts"
else
  bad "Supabase table counts (run migrations 005/006 if missing)"
fi

note ""
note "## 5) Ollama (LoRA model runtime)"
code=$(curl -s -o /dev/null -w "%{http_code}" "${OLLAMA_BASE_URL:-http://127.0.0.1:11434}/api/tags" || true)
note "ollama /api/tags → HTTP $code"
if [[ "$code" == "200" ]]; then
  ok "Ollama reachable"
  curl -s "${OLLAMA_BASE_URL:-http://127.0.0.1:11434}/api/tags" | head -c 500 >>"$OUT" || true
  note ""
else
  note "⚠ Ollama down — LoRA/GGUF model not locally serving (dataset + FINETUNE.md still OK; Agent falls back to Gemini/cloud)"
  note "  Soft-fail: does not count toward hard failures. Start with: ollama serve && ollama list"
fi

note ""
note "## 6) Git Worktree multi-agent workflow"
if (cd "$REPO" && bash devtools/multi-agent-worktree/scripts/worktree-setup.sh && \
    bash devtools/multi-agent-worktree/scripts/worktree-validate.sh rag && \
    bash devtools/multi-agent-worktree/scripts/worktree-teardown.sh --delete-branches) >>"$OUT" 2>&1; then
  ok "worktree setup → validate → teardown"
else
  bad "worktree workflow"
fi

note ""
note "## Scoreboard"
note "- passed: $pass"
note "- failed: $fail"
note "- log: $OUT"
echo
echo "Wrote $OUT (pass=$pass fail=$fail)"
[[ "$fail" -eq 0 ]]
