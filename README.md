# Estate Agency Transaction System

A full-stack system that manages the **post-agreement lifecycle** of real
estate transactions (earnest money → title deed → completion) and
**automates commission distribution** between the agency and its agents.

## Stack

- **Backend:** NestJS 11 · TypeScript · Mongoose · MongoDB Atlas · Jest · Swagger
- **Frontend:** Nuxt 3 · Pinia · Tailwind CSS · TypeScript
- **Deployment:** Railway (API) · Vercel (Web) · MongoDB Atlas (DB)

## Live URLs

- **API:** https://estate-agency-system-production.up.railway.app/api
- **API docs (Swagger):** https://estate-agency-system-production.up.railway.app/api/docs
- **API health check:** https://estate-agency-system-production.up.railway.app/api/health
- **Frontend:** https://estate-agency-system.vercel.app

## Repository layout

```
.
├── backend/      # NestJS API
├── frontend/     # Nuxt 3 web app
├── DESIGN.md     # Architecture and design decisions
└── README.md
```

## Quick start (local)

### 1. MongoDB Atlas

Create a free cluster at https://cloud.mongodb.com. Whitelist your IP (or
`0.0.0.0/0` for dev) and create a database user. Copy the connection string.

### 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env — set MONGODB_URI
npm install
npm run start:dev         # http://localhost:3000/api
npm run seed              # (optional) insert demo data
```

Swagger UI is at http://localhost:3000/api/docs.

### 3. Frontend

In a **separate terminal**:

```bash
cd frontend
cp .env.example .env      # NUXT_PUBLIC_API_BASE defaults to http://localhost:3000/api
npm install
npm run dev -- --port 3001
```

Open http://localhost:3001.

> The frontend must run on a different port from the backend (default 3000).
> `CORS_ORIGIN` in `backend/.env` defaults to `http://localhost:3001` to match.

## Tests

```bash
cd backend
npm test                  # unit tests
npm run test:cov          # with coverage
```

Business logic is covered in:

- `modules/transactions/services/commission.service.spec.ts`
- `modules/transactions/services/stage-transition.service.spec.ts`
- `modules/transactions/services/transactions.service.spec.ts`

## Deployment

### Backend → Railway

1. New project → deploy from GitHub → pick `/backend` as the root.
2. Railway auto-detects Node (`railway.json` is committed).
3. Set environment variables:
   - `MONGODB_URI` — Atlas connection string
   - `CORS_ORIGIN` — your Vercel URL (e.g. `https://estate-agency.vercel.app`)
   - `NODE_ENV=production`
4. Railway exposes a public URL. Verify `GET /api/health` returns 200.

### Frontend → Vercel

1. Import the repo → Vercel detects Nuxt → pick `/frontend` as the root
   directory (`vercel.json` is committed).
2. Set `NUXT_PUBLIC_API_BASE` to your Railway URL + `/api`
   (e.g. `https://estate-agency.up.railway.app/api`).
3. Deploy.

After the frontend URL is live, update `CORS_ORIGIN` on Railway and redeploy
the backend (or add the URL to the comma-separated list).

## Design

All architectural decisions, data-model trade-offs, and business-rule
justifications are in [DESIGN.md](./DESIGN.md).
