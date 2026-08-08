# SihatQ Prototype

Malaysia preventive health risk insight prototype.

## Two parts in this repo

1. **Static Stitch HTML** (root folders like `login_page/`, `profile_input_page/`)  
   Open with any static server for the original clickable mock.

2. **Full-stack MVP** in [`web/`](web/)  
   Next.js + Supabase Auth + Postgres + rule-based risk engine + NHMS reference stats + optional DOSM mortality seed.

## Data notes

- **NHMS 2023**: adult prevalence (diabetes, hypertension, cholesterol, obesity) for personalised risk comparison.
- **DOSM Causes of Death 2025 release (2024 deaths)**: national mortality context (e.g. ischaemic heart disease, pneumonia, diabetes mellitus, transport accidents). Prepared as a next-stage / AI-context dataset — not used as a diagnosis model.

## Quick start (recommended)

Follow the beginner guide:

👉 **[`web/README.md`](web/README.md)**

```bash
cd web
cp .env.local.example .env.local
# fill Supabase URL + anon key
npm install
npm run dev
```

Then open http://localhost:3000

## AI development workflow (optional)

Parallel **coding agents** (not the health chatbot) can use Git Worktrees:

👉 **[`devtools/multi-agent-worktree/`](devtools/multi-agent-worktree/)**

```bash
bash devtools/multi-agent-worktree/scripts/worktree-setup.sh
bash devtools/multi-agent-worktree/scripts/worktree-status.sh
```

Product runtime multi-agent still uses **Result Object** isolation inside `web/src/lib/agent/multi-agent/`.

## Static prototype (old)

```bash
python3 -m http.server 8080
```

Open http://localhost:8080/
