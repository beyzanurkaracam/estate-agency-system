# Backend — Estate Agency API (NestJS)

REST API for the transaction lifecycle and commission distribution.

- **Stack:** NestJS 11 · TypeScript · Mongoose · MongoDB Atlas · Swagger · Jest
- **Docs:** `GET /api/docs` (Swagger UI once running)

## Setup

```bash
cp .env.example .env
# edit .env — at minimum set MONGODB_URI to your Atlas connection string
npm install
npm run start:dev
```

The server listens on `http://localhost:${PORT}` (default `3000`), mounts the
API under `/api`, and exposes Swagger at `/api/docs`.

### Seed demo data

```bash
npm run seed
```

Inserts a few agents, properties, and a couple of transactions so the dashboard
has something to display.

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | |
| `PORT` | no | `3000` | HTTP port |
| `API_PREFIX` | no | `api` | Global route prefix |
| `MONGODB_URI` | **yes** | — | MongoDB Atlas connection string |
| `CORS_ORIGIN` | no | `http://localhost:3001` | Comma-separated list of allowed origins |

## Scripts

- `npm run start:dev` — watch mode (recommended for local dev)
- `npm run build && npm run start:prod` — production build
- `npm test` — unit tests (commission, stage transitions, service)
- `npm run test:cov` — coverage report
- `npm run seed` — insert demo data

## Project layout

```
src/
├── main.ts                     # Bootstrap (CORS, ValidationPipe, Swagger)
├── app.module.ts
├── config/env.validation.ts    # Joi schema for env vars
├── common/
│   ├── filters/                # AllExceptionsFilter
│   └── pipes/                  # ParseObjectIdPipe
└── modules/
    ├── agents/
    ├── properties/
    ├── transactions/
    │   ├── services/
    │   │   ├── commission.service.ts      # 50/50 split logic
    │   │   ├── stage-transition.service.ts # state machine
    │   │   └── transactions.service.ts
    │   └── ...
    └── health/
```

## API summary

See [DESIGN.md](../DESIGN.md#5-api-design) for the full endpoint table. Highlights:

- `POST /api/transactions` — create (starts in `agreement`)
- `PATCH /api/transactions/:id/stage` — advance
- `POST /api/transactions/:id/cancel` — cancel with reason
- `GET /api/transactions/:id/breakdown` — 404 until completed

## Deployment (Railway)

`railway.json` and `Procfile` are included. Railway auto-detects Node, runs
`npm ci && npm run build`, then starts `node dist/main`.

Required env vars in Railway: `MONGODB_URI`, `CORS_ORIGIN` (your Vercel URL).
