# RAG Agent brief

**Branch:** `agent/rag`  
**Worktree:** `../sihatq-wt-rag`

## Goal
Improve SihatQ retrieval quality and knowledge/stats tooling without touching unrelated UI/safety code.

## Own these paths
- `web/src/lib/ai/`
- `web/src/lib/agent/tools/`
- `web/scripts/seed-*`
- `web/db/`
- relevant Supabase migrations for knowledge/stats

## Do not touch
- `web/src/lib/agent/safety/`
- chatbot UI components (unless a tool contract change requires a tiny client type update — prefer leaving UI to UI Agent)
- benchmark scripts owned by Bench Agent

## Done when
1. `git status` clean after commit on `agent/rag`
2. `bash devtools/multi-agent-worktree/scripts/worktree-validate.sh rag` passes
3. Short note: what retrieval/stats behavior changed
