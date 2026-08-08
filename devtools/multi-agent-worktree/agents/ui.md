# UI Agent brief

**Branch:** `agent/ui`  
**Worktree:** `../sihatq-wt-ui`

## Goal
Chat / Plan / Admin Trace UX — thinking steps, plan approve/decline, trace readability.

## Own these paths
- `web/src/components/`
- `web/src/app/ai-assistant/`
- `web/src/app/admin/`
- `web/src/app/api/admin/traces/`
- `web/src/lib/ai/chat-client.ts`

## Do not touch
- safety gate logic
- retrieval algorithms
- agent runtime orchestration (unless wiring a new SSE field the UI must display)

## Done when
1. Commits on `agent/ui`
2. `worktree-validate.sh ui` passes
3. Manual check notes for `/ai-assistant` and `/admin/traces`
