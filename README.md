# SihatQ Prototype

Malaysia preventive health risk insight prototype.

## Two parts in this repo

1. **Static Stitch HTML** (root folders like `login_page/`, `profile_input_page/`)  
   Open with any static server for the original clickable mock.

2. **Full-stack MVP** in [`web/`](web/)  
   Next.js + Supabase Auth + Postgres + rule-based risk engine + NHMS reference stats.

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

## Static prototype (old)

```bash
python3 -m http.server 8080
```

Open http://localhost:8080/
