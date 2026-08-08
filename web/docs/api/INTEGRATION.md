# SihatQ API Integration Guide

This project is a Next.js full-stack app, so frontend pages and backend API
routes run from the same local origin:

```txt
http://localhost:3000
```

## API Explorer

Open the local API catalog:

```txt
http://localhost:3000/api-docs
```

Useful machine-readable files:

```txt
http://localhost:3000/openapi.json
http://localhost:3000/postman/sihatq.postman_collection.json
```

## Postman Setup

1. Run the app.

```bash
cd web
npm run dev
```

2. Login in the browser.

3. Open DevTools -> Network and click any request to `localhost:3000`.

4. Copy the request header named `Cookie`.

5. Import this URL in Postman:

```txt
http://localhost:3000/postman/sihatq.postman_collection.json
```

6. Set the collection variable `cookie` to the copied browser cookie.

For `/api/assess`, make sure the browser has accepted privacy consent first.
That route also expects:

```txt
sihatq_privacy_consent=accepted
```

## Auth Rules

- Public docs: `/api-docs`, `/openapi.json`, `/postman/...`
- Assessment: requires privacy consent cookie
- AI chat: requires Supabase auth cookie
- Admin APIs: require Supabase auth cookie plus admin access
- Admin writes: require `SUPABASE_SERVICE_ROLE_KEY`

Admin access is granted through either:

```env
ADMIN_EMAILS=you@example.com
```

or a `user_roles` row with `role = admin`.

## Common Status Codes

- `200`: request succeeded
- `400`: invalid payload
- `401`: not logged in
- `403`: logged in but not allowed, or privacy consent missing
- `503`: service role key missing for admin write APIs

## Key Endpoints

```txt
POST /api/assess
POST /api/ai-chat
GET  /api/admin/evaluations
POST /api/admin/evaluations
GET  /api/admin/traces
GET  /api/admin/traces/{id}
POST /api/admin/traces/{id}/replay
POST /api/admin/stats
PATCH /api/admin/stats
DELETE /api/admin/stats?id={id}
POST /api/admin/users/role
```
