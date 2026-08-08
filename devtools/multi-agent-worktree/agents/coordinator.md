# Coordinator Agent brief

**Workspace:** main repo (`sihatq-prototype/`), usually on `main`

## Goal
Integrate parallel coding-agent branches safely.

## Checklist
1. `bash devtools/multi-agent-worktree/scripts/worktree-status.sh`
2. For each agent with commits:
   - `worktree-validate.sh <id>`
   - optional `worktree-validate.sh <id> --full`
3. Ensure main worktree is clean
4. `worktree-merge.sh --dry-run` then `worktree-merge.sh`
5. Run critical smokes if env available:
   - `cd web && npx tsc --noEmit`
   - `node --env-file=.env.local scripts/test-agent-p0.mjs` (etc.)
6. Write a short merge summary (which agents, conflicts, leftover risks)
7. Optional teardown: `worktree-teardown.sh`

## Rules
- Never skip allowlist violations
- Prefer merging in order: `rag` → `safety` → `ui` → `bench` (deps: tools before UI/tests)
- If conflict: stop, resolve in main, do not force overwrite agent work without review
