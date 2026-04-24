# Frontend — Estate Agency (Nuxt 3)

Nuxt 3 + Pinia + Tailwind CSS UI for the transaction and commission system.

## Setup

```bash
cp .env.example .env
# edit .env if your backend runs on a different URL
npm install
npm run dev
```

App runs on http://localhost:3000 by default. If the backend is also on :3000, run the backend on a different port and update `NUXT_PUBLIC_API_BASE`.

## Scripts

- `npm run dev` — dev server with HMR
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run typecheck` — type check

## Environment

| Variable | Description | Default |
| --- | --- | --- |
| `NUXT_PUBLIC_API_BASE` | Backend API base URL (with `/api` prefix) | `http://localhost:3000/api` |

## Structure

```
frontend/
├── app.vue              # Root layout + nav
├── assets/css/          # Tailwind entry
├── components/          # Reusable UI
├── composables/         # useApi, formatters
├── pages/               # Route pages
├── stores/              # Pinia stores
├── types/               # Shared API types
└── nuxt.config.ts
```
