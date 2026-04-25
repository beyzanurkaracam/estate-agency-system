# Design Document — Estate Agency Transaction System

This document explains the architecture, data modelling, and design decisions
behind the NestJS + Nuxt 3 + MongoDB Atlas implementation.

---

## 1. Problem Recap

The system manages the **post-agreement lifecycle** of real estate transactions
(earnest money → title deed → completion) and **automates commission
distribution** between the agency and its agents per a fixed policy.

Core requirements:

- Track a transaction through discrete stages.
- Distribute the service fee correctly (50% agency / 50% agents, with a split
  rule depending on whether one agent fills both roles).
- Provide an auditable financial breakdown per transaction.
- Expose both an API and a UI to operate and visualise the system.

---

## 2. High-Level Architecture

### 2.1 Runtime topology

```
┌──────────────────┐    HTTPS/JSON    ┌──────────────────────┐    Mongoose    ┌─────────────────┐
│  Nuxt 3 (Vercel) │ ───────────────► │  NestJS API (Railway)│ ─────────────► │ MongoDB Atlas   │
│  Pinia • Tailwind│ ◄─────────────── │  global ValidationPipe│ ◄───────────── │ agents          │
│  useApi/$fetch   │                  │  AllExceptionsFilter  │                │ properties      │
└──────────────────┘                  │  Swagger @ /api/docs  │                │ transactions    │
                                      └──────────┬────────────┘                └─────────────────┘
                                                 │
                                          CORS_ORIGIN, MONGODB_URI
                                          NUXT_PUBLIC_API_BASE
```

### 2.2 Backend internal layering

```
                ┌─────────────────────────────────────────────┐
   HTTP ──►     │  Controller   (DTO validation, routing)     │
                ├─────────────────────────────────────────────┤
                │  Application Service                        │
                │  ─ AgentsService                            │
                │  ─ PropertiesService                        │
                │  ─ TransactionsService  ───┐                │
                ├────────────────────────────┼────────────────┤
                │  Domain Services           │                │
                │  ─ StageTransitionService ◄┘                │
                │  ─ CommissionService                        │  ← pure, framework-free
                ├─────────────────────────────────────────────┤
                │  Persistence  (Mongoose schemas / models)   │
                └─────────────────────────────────────────────┘
                       │
                       ▼
                MongoDB Atlas
```

- **Backend:** NestJS modular monolith. Modules per aggregate
  (`AgentsModule`, `PropertiesModule`, `TransactionsModule`); domain services
  (`CommissionService`, `StageTransitionService`) are HTTP- and DB-agnostic so
  they are trivially unit-testable. Cross-cutting concerns — global
  `ValidationPipe`, `AllExceptionsFilter`, and Swagger docs — wrap every
  controller uniformly.
- **Frontend:** Nuxt 3 with SSR-capable pages, Pinia stores for shared state,
  and a thin `useApi` composable that wraps `$fetch`. No external HTTP client.
- **Persistence:** MongoDB Atlas via Mongoose. One collection per aggregate
  (`agents`, `properties`, `transactions`).
- **Deployment topology:** Frontend on Vercel, API on Railway, database on
  MongoDB Atlas — each independently scalable and configured purely through
  environment variables.

### Why a modular monolith (not microservices)

The problem is a single bounded context with three tightly-related aggregates.
Splitting them into services would introduce distributed-transaction concerns
for no functional benefit at this scale. Modules inside NestJS already provide
clean boundaries — if the system grew, `transactions` could be extracted
without a rewrite.

---

## 3. Data Model

### 3.1 `Agent`

```ts
{ id, name, email (unique), phone?, active, createdAt, updatedAt }
```

- `email` is unique and lowercased at schema level (`unique` index).
- `active` supports **soft delete**. We never hard-delete an agent because
  historical transactions reference them — hard deletion would break the
  breakdown audit trail.

### 3.2 `Property`

```ts
{
  id, address: { street, district, city, postalCode? },
  type: 'apartment' | 'house' | 'office' | 'land',
  listingPrice: number,       // integer, in the currency's minor unit
  currency: string,           // ISO 4217, e.g. 'TRY', 'EUR', 'USD', 'JPY'
  listedBy: ObjectId → Agent,
  createdAt, updatedAt
}
```

- `address` is embedded (no separate collection) because it belongs 1-to-1 to
  the property and is never queried independently.
- `listedBy` is a reference. Populated at query time.

### 3.3 `Transaction` (aggregate root)

```ts
{
  id,
  property: ObjectId → Property,
  listingAgent: ObjectId → Agent,
  sellingAgent: ObjectId → Agent,   // may equal listingAgent
  totalServiceFee: number,          // integer, in the currency's minor unit
  currency: string,                 // ISO 4217, inherited from the property
  stage: 'agreement' | 'earnest_money' | 'title_deed' | 'completed' | 'cancelled',
  stageHistory: [{ stage, changedAt, note? }],
  financialBreakdown: null | {      // snapshot, only populated at completion
    calculatedAt,
    agencyShare,
    agents: [{ agentId, agentName, roles[], amount, percentage }],
    totalDistributed,
  },
  cancelledAt: Date | null,
  cancelReason: string | null,
  createdAt, updatedAt,
}
```

**Embedded vs. separate collection for `stageHistory` and `financialBreakdown`:**
Both are conceptually inseparable from the transaction — you never query a
stage history without its transaction, nor report on breakdowns independently
of transactions. Embedding avoids joins and keeps the aggregate consistent.
MongoDB's 16 MB document limit is not a concern: even with 1,000 stage changes
the document stays well under 10 KB.

**Why snapshot the breakdown at completion (instead of computing on read):**

1. **Auditability.** If an agent becomes inactive or is renamed, the breakdown
   at the time of completion must remain frozen. Snapshotting `agentName`
   inside the breakdown preserves accounting immutability.
2. **Policy changes.** If the company later changes the split (e.g. 55/45),
   historical transactions must still report what actually happened.
3. **Performance.** Reports become pure reads — no recalculation on every
   dashboard load.

The trade-off: a bug in the calculation can't be retroactively fixed by
recomputing. We accept this in exchange for the above.

---

## 4. Business Rules

### 4.1 Stage Machine

```
  agreement ──► earnest_money ──► title_deed ──► completed  (terminal)
      │                │                │
      └───────────────▼────────────────▼
                        cancelled  (terminal)
```

Implemented in [`StageTransitionService`](backend/src/modules/transactions/services/stage-transition.service.ts):

- Forward-only progression. No skipping stages, no going back.
- `cancelled` is reachable from any **non-terminal** stage.
- `completed` and `cancelled` are terminal — no further transitions allowed.

**Why enforce transitions server-side?** A transaction is a financial record;
the stage gates real-world actions (receipts, title transfer). Allowing a UI
bug or malformed API call to skip the earnest-money stage would break audit
trails. The cost is a single lookup in a static transition table — trivial.

Cancellation is a **separate endpoint** (`POST /transactions/:id/cancel`) that
requires a `reason`. This prevents accidental cancellation via a misused
`PATCH /stage` call and makes cancellations easy to audit.

### 4.2 Commission Policy

Implemented in [`CommissionService`](backend/src/modules/transactions/services/commission.service.ts).

| Scenario | Agency | Listing Agent | Selling Agent |
| --- | --- | --- | --- |
| Same agent both roles | 50% | 50% (100% of agent pool) | — |
| Different agents | 50% | 25% | 25% |

**Integer-math invariant:** the sum of all distributed amounts must equal
`totalServiceFee` exactly. The service asserts this on every calculation and
throws if broken (a canary, not an expected runtime error).

**Rounding rule for odd totals:** when `agentPool / 2` is fractional (e.g.
`1_000_001` minor units → pool `500_001` → half `250_000`, remainder `1`),
the 1-unit remainder is deterministically assigned to the **listing agent**.
Chosen over "random" or "round-robin" because:

- It's deterministic — the same inputs always produce the same breakdown.
- The listing agent is the one who brings the property, a reasonable
  tiebreaker that matches industry practice.

### 4.3 Money Representation

All monetary fields are stored as **integers in the currency's minor unit**
(kuruş for TRY, cents for EUR/USD, yen for JPY since it has zero decimals).
The `currency` field is an ISO 4217 code and travels with every amount —
amounts are never compared or summed across currencies. Rationale:

- **No float drift.** IEEE-754 cannot represent `0.1 + 0.2` exactly —
  unacceptable for money. Integer minor units make the commission invariant
  (`agency + agents = total`) provable.
- **Currency-agnostic.** Hard-coding `'TRY'` or kuruş would lock the agency to
  a single market. Pairing an integer amount with an ISO 4217 code lets the
  same engine handle TRY (2 decimals), EUR (2), JPY (0), or any other
  currency without code changes.
- **Decimal128 alternative rejected** — it solves precision but not the
  per-currency decimal-count problem, and adds driver-specific types on both
  the API boundary (JSON serialization) and the frontend.
- The frontend `MoneyInput` component and `formatMoney` composable convert
  between minor units and the display string using
  `Intl.NumberFormat(locale, { style: 'currency', currency })`, which knows
  each currency's decimal count automatically.

---

## 5. API Design

- **Prefix:** all routes live under `/api` (`app.setGlobalPrefix('api')`).
- **Validation:** a global `ValidationPipe` with `whitelist`,
  `forbidNonWhitelisted`, and `transform` enforces DTO shape. Any extra field
  in a request body is rejected with 400.
- **Errors:** uniform shape via `AllExceptionsFilter`:
  ```json
  {
    "statusCode": 400,
    "message": "...",
    "error": "BadRequestException",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "path": "/api/transactions"
  }
  ```
- **Docs:** Swagger available at `/api/docs` with `@ApiOperation` summaries on
  every route.

### Endpoint summary

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness probe |
| `POST` | `/agents` | Create agent |
| `GET` | `/agents?active=false` | List agents (active-only by default) |
| `GET` | `/agents/:id` | Get agent |
| `PATCH` | `/agents/:id` | Update agent |
| `DELETE` | `/agents/:id` | Soft-delete (sets `active=false`) |
| `POST` | `/properties` | Create property |
| `GET` | `/properties?city&type&listedBy` | List properties |
| `GET` | `/properties/:id` | Get property |
| `PATCH` | `/properties/:id` | Update property |
| `POST` | `/transactions` | Create transaction (starts in `agreement`) |
| `GET` | `/transactions?stage&agentId` | List transactions |
| `GET` | `/transactions/:id` | Get transaction |
| `PATCH` | `/transactions/:id/stage` | Advance to next stage |
| `POST` | `/transactions/:id/cancel` | Cancel (requires `reason`) |
| `GET` | `/transactions/:id/breakdown` | Get frozen breakdown (404 if not completed) |

### Why `PATCH` for stage, `POST` for cancel?

Advancing stage is idempotent only in its success shape — you can't advance
twice — but logically it's a partial update to the resource. `POST /cancel`
is not a partial update; it triggers a terminal transition with required
side-effects (audit fields), hence the action-style endpoint.

---

## 6. Frontend Architecture

### 6.1 Route structure

```
/                       Dashboard (stage counts, totals, leaderboard, recent)
/transactions           List with stage/agent filters
/transactions/new       Creation form
/transactions/:id       Detail: stepper + actions + breakdown + history
/agents                 CRUD (inline table)
/properties             CRUD (inline form + table)
```

### 6.2 State management (Pinia)

Three stores, one per aggregate:

- `useAgentsStore` — caches active+inactive agents, exposes `active` getter.
- `usePropertiesStore` — caches properties with filter awareness.
- `useTransactionsStore` — holds both list (`items`) and currently-viewed
  transaction (`current`). Derived getters compute dashboard metrics:
  - `countsByStage`
  - `totalCompletedFee`
  - `totalAgencyEarnings`
  - `agentEarnings` (reduces breakdowns into a leaderboard)

Each store handles its own `loading`/`error` state, normalises error messages
from `$fetch` (unpacks `error.data.message` arrays from class-validator), and
updates its cache optimistically after mutations (no extra refetch).

**Why compute dashboard metrics client-side** instead of adding a `/stats`
endpoint? The dashboard needs the transactions list anyway for the "recent"
section, and the computation is trivial over the page's worth of records. A
dedicated aggregation endpoint is worth adding once pagination is introduced
and the list no longer contains all completed transactions.

### 6.3 API layer

[`composables/useApi.ts`](frontend/composables/useApi.ts) is a single
composable that returns an object grouped by resource (`agents`, `properties`,
`transactions`) with one method per endpoint. Each method is typed against
`types/api.ts`, which mirrors the backend DTO shapes.

No external HTTP library — Nuxt's `$fetch` handles JSON, query strings, and
baseURL. Switching to another provider would only require changing the
`request` helper.

### 6.4 UI components

- **`StageBadge`** — colored pill per stage.
- **`StageStepper`** — horizontal timeline showing current + completed stages.
- **`MoneyInput`** — two-way binding on a major-unit decimal; emits integer
  minor units. Symbol and decimal count are derived from the bound currency
  via `Intl.NumberFormat` (the `useCurrency` composable), so any ISO 4217
  code works without a hard-coded symbol/decimals table.
- **`LoadingState`**, **`EmptyState`**, **`ErrorAlert`** — consistent zero/
  loading/error presentation.

Styling is Tailwind with a handful of semantic classes
(`.btn-primary`, `.card`, `.input`, `.badge`) defined in
[`assets/css/main.css`](frontend/assets/css/main.css).

---

## 7. Testing Strategy

Unit tests are colocated next to the services they test
(`*.spec.ts`).

- **`commission.service.spec.ts`** — covers both scenarios, odd-fee rounding,
  the invariant that agency + agents = total, and input validation.
- **`stage-transition.service.spec.ts`** — covers every legal and illegal
  transition in the state machine.
- **`transactions.service.spec.ts`** — integrates the above with mocked
  dependencies to verify the full lifecycle (create → advance → complete →
  breakdown snapshot, and cancel path).

What we deliberately don't test:

- **Mongoose schema internals** — trusting the driver here.
- **Controller wiring** — DTOs and the global `ValidationPipe` are
  declaratively correct; testing them adds no confidence.
- **Frontend components** — out of scope for this deliverable; the critical
  business rules are all in the backend services and exhaustively covered.

---

## 8. Deployment

- **API** → Railway (long-lived Node process; reads `MONGODB_URI` and `CORS_ORIGIN`
  from environment).
- **Frontend** → Vercel (Nuxt preset; reads `NUXT_PUBLIC_API_BASE`).
- **Database** → MongoDB Atlas (shared cluster is sufficient for this
  workload).

Live URLs and step-by-step deployment are in [README.md](README.md).

---

## 9. What's Intentionally Not Included

- **Authentication / RBAC** — the spec scopes the problem to transaction
  management, not to identity. Adding JWT + guards is a 1-day extension.
- **Pagination** — the transactions list endpoint returns the full result
  set. Fine for the case-study data volume; `limit`/`skip` or cursor
  pagination is trivial to add.
- **File attachments** (receipts, deeds) — not in the core rules.
- **Email/SMS notifications** on stage transitions — would be a natural next
  iteration; `StageTransitionService` is the single hook point.
- **Audit log of *who* performed each transition** — requires authentication
  first. `stageHistory.note` is the current free-form substitute.
