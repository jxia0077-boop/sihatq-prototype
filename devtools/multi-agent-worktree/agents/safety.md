# Safety Agent brief

**Branch:** `agent/safety`  
**Worktree:** `../sihatq-wt-safety`

## Goal
Hardening preventive-only behavior: medical rules, tool gate, permission modes, and safety-focused tests.

## Own these paths
- `web/src/lib/agent/safety/`
- `web/scripts/test-agent-*` (safety-related cases)
- `web/skills/` (skill prompts that encode safety constraints)

## Do not touch
- retrieval/pgvector internals
- admin/chat UI layout
- unrelated benchmark metrics unless asserting a safety invariant

## Done when
1. Commits on `agent/safety`
2. `worktree-validate.sh safety` passes
3. Note which unsafe prompts are now blocked / soft-failed
