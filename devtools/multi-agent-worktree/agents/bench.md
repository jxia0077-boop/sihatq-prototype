# Benchmark Agent brief

**Branch:** `agent/bench`  
**Worktree:** `../sihatq-wt-bench`

## Goal
Keep reproducible metrics and smoke tests: MCP lazy-load savings, compression, multi-agent wall-clock, P0–P5 scripts.

## Own these paths
- `web/scripts/bench-*`
- `web/scripts/test-agent-*`
- `web/scripts/ask-agent-*`
- `web/README.md` (metrics / checklist sections only when possible)
- `devtools/`

## Do not touch
- production agent runtime behavior except via tests asserting it
- UI styling

## Done when
1. Commits on `agent/bench`
2. `npx tsx web/scripts/bench-agent-metrics.ts` (from worktree) still prints RESUME METRICS
3. `worktree-validate.sh bench` passes
