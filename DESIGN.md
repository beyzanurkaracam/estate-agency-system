# Estate Agency Transaction System — Design Document

This document explains the architectural decisions, data model, and business
logic of the Estate Agency Transaction System. It is intended both as a
reference for future development and as a transparent record of the
trade-offs made during the initial implementation.

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Scope & Assumptions](#2-scope--assumptions)
3. [Tech Stack](#3-tech-stack)
4. [Architecture Overview](#4-architecture-overview)
5. [Data Model](#5-data-model)
6. [Business Logic](#6-business-logic)
7. [Financial Breakdown Storage Strategy](#7-financial-breakdown-storage-strategy)
8. [API Design](#8-api-design)
9. [Frontend State Management](#9-frontend-state-management)
10. [Testing Strategy](#10-testing-strategy)
11. [Trade-offs & Decisions Log](#11-trade-offs--decisions-log)
12. [Future Improvements](#12-future-improvements)

---

## 1. Problem Statement

An estate agency consultancy manages the post-agreement lifecycle of every
property sale or rental manually, using a mix of spreadsheets and ad-hoc
tools. The process covers the earnest money stage, title deed procedures,
and payment tracking. Once the transaction is completed, the total service
fee (commission) must be distributed between the agency and the agents
involved, following rules that depend on whether the listing agent and the
selling agent are the same person.

Handling this workflow manually introduces two classes of problems:

1. **Lack of traceability.** There is no single source of truth for where
   each transaction stands, when it moved between stages, and who is
   responsible.
2. **Calculation errors.** Commission distribution is rule-driven, and
   manual arithmetic is error-prone — especially at scale.

The system described in this document addresses both problems by providing
a backend that enforces the transaction lifecycle and computes commissions
deterministically, together with a frontend that lets operators drive and
visualize these transactions.

---

## 2. Scope & Assumptions

### In Scope (v1)

- Managing agents, properties, and transactions via a REST API.
- Enforcing the transaction stage lifecycle with traceable history.
- Deterministic commission distribution following the documented rules.
- A Nuxt 3 dashboard to create transactions, advance stages, and inspect
  financial breakdowns.
- Unit tests for all business logic (commission rules, stage transitions).
- Live deployment: API on Railway, frontend on Vercel, DB on MongoDB Atlas.

### Out of Scope (deferred to v2)

- **Authentication & authorization.** The API is open for the purpose of
  this exercise. Production would require JWT-based auth and role-based
  access control (admin, agent, accountant).
- **Multi-currency support.** All amounts are assumed to be in Turkish Lira
  (TRY). Adding foreign exchange would require snapshotting rates at each
  transaction.
- **Notifications.** No email or SMS on stage transitions.
- **File attachments.** Title deed documents, contracts, and similar
  artifacts are not uploaded or stored.
- **Reporting & analytics beyond per-transaction breakdowns.** Aggregated
  reports (e.g. monthly agency revenue) are a v2 concern.

### Key Assumptions

- A property is associated with one active transaction at a time.
  Re-listing after a cancellation creates a new transaction record.
- Commission rules are global to the agency and identical for every
  transaction (not per-agent contracts).
- The listing agent and selling agent can be the same person; this is a
  first-class case, not an exception.
- Monetary precision: all amounts are stored as **integer minor units**
  (kuruş — 1 TRY = 100 kuruş). See §5.5 for rationale.
- Agents are not permanently deleted while they have historical
  transactions; they are deactivated via a soft-delete flag.

---

## 3. Tech Stack

### Backend

- **Node.js** (LTS) with **TypeScript** for type safety across the codebase.
- **NestJS** for its modular, opinionated architecture — a good fit for
  business-logic-heavy applications where single-responsibility and
  testability matter.
- **MongoDB Atlas** (M0 free tier) as the managed database.
- **Mongoose** as the ODM — schema validation, middleware, and clean
  population of referenced documents.
- **Jest** for unit testing; ships with NestJS by default.
- **class-validator** + **class-transformer** for DTO-level validation.
- **Swagger (OpenAPI)** via `@nestjs/swagger` for live API documentation.

### Frontend

- **Nuxt 3** for file-based routing, auto-imports, SSR-capable pages, and
  a strong developer experience.
- **Pinia** for state management — the official Vue 3 store, composition-API
  friendly and TypeScript-first.
- **Tailwind CSS** for utility-first styling and rapid UI iteration.

### Deployment

- **Backend** → Railway (GitHub integration, automatic deploys on push).
- **Frontend** → Vercel (zero-config Nuxt 3 support).
- **Database** → MongoDB Atlas M0 cluster with IP allowlist open to
  deployment provider ranges.

---

## 4. Architecture Overview

### Backend Module Structure

The backend follows a **feature-based module layout**. Each domain concept
(agents, properties, transactions) has its own module with clear internal
separation between controller, service, schema, and DTOs.

```
src/
├── config/               # env validation, mongoose connection config
├── common/               # cross-cutting: filters, interceptors, pipes
│   ├── filters/          # global HttpException filter
│   └── interceptors/     # response shape interceptor
├── modules/
│   ├── agents/
│   ├── properties/
│   └── transactions/
│       ├── dto/
│       ├── schemas/
│       ├── services/
│       │   ├── transactions.service.ts       # orchestration / CRUD
│       │   ├── commission.service.ts         # pure business logic
│       │   └── stage-transition.service.ts   # state machine
│       ├── transactions.controller.ts
│       └── transactions.module.ts
└── main.ts
```

### Separation of Concerns

Within the `transactions` module, three distinct services coexist:

- **`CommissionService`** is a pure computation unit. It takes amounts and
  agent identifiers and returns a breakdown object. It knows nothing about
  the database or HTTP. This makes it trivial to unit-test exhaustively.
- **`StageTransitionService`** owns the state machine. It answers two
  questions: *"is this transition valid?"* and *"what does the new stage
  history look like?"*. Also database-agnostic.
- **`TransactionsService`** is the orchestrator. It talks to Mongoose,
  invokes the two services above, and handles the lifecycle events
  (e.g. "on transition to `completed`, compute the breakdown and persist").

This layering means the most error-prone code (money math, state machine)
is the easiest to test, and the database-adjacent code is kept thin.

### Request Flow — Advancing a Transaction Stage

```
PATCH /transactions/:id/stage
        │
        ▼
TransactionsController
        │   (validate DTO, delegate)
        ▼
TransactionsService.advanceStage()
        │
        ├──► StageTransitionService.assertValid(currentStage, nextStage)
        │
        ├──► if nextStage === 'completed':
        │        CommissionService.calculate(fee, listing, selling)
        │
        ├──► update transaction: stage, stageHistory[], breakdown?
        │
        └──► return updated transaction (with breakdown if present)
```

---

## 5. Data Model

The system is organized around three entities: **Agent**, **Property**,
and **Transaction**. Agents and properties are long-lived, independent
records; transactions reference them and carry their own lifecycle state
and financial snapshot.

### 5.1 Entity Relationships

```
┌──────────┐          ┌──────────────────┐          ┌──────────┐
│  Agent   │◄─── ref ─│   Transaction    │── ref ──►│ Property │
└──────────┘          │                  │          └──────────┘
                      │  stageHistory[]  │  ◄── embedded
                      │  breakdown       │  ◄── embedded (nullable)
                      └──────────────────┘
```

Agents and Properties are stored in their own collections because they
exist independently of any single transaction and are reused across many
transactions. Embedding them would duplicate data and turn simple updates
(like fixing an agent's phone number) into collection-wide rewrites.

In contrast, `stageHistory` and `financialBreakdown` only make sense
*inside* a transaction — they have no identity or use of their own, and
they are always read together with the transaction. Embedding them keeps
reads to a single document and guarantees atomic updates.

### 5.2 Collection: `agents`

| Field     | Type     | Notes                                              |
|-----------|----------|----------------------------------------------------|
| _id       | ObjectId | Primary key, auto-generated.                       |
| name      | string   | Required, trimmed.                                 |
| email     | string   | Required, unique, lowercase, email-format validated. |
| phone     | string?  | Optional.                                          |
| active    | boolean  | Default `true`. Used for soft deletion.            |
| createdAt | Date     | Auto-managed via Mongoose `timestamps: true`.      |
| updatedAt | Date     | Auto-managed via Mongoose `timestamps: true`.      |

**Indexes:** unique index on `email`.

**Soft-delete rationale.** Agents are referenced from historical
transactions. Hard-deleting an agent would leave dangling references and
potentially break the financial breakdown of past transactions. Flipping
`active` to `false` removes the agent from selection UIs while preserving
referential integrity.

### 5.3 Collection: `properties`

| Field         | Type                               | Notes                                |
|---------------|------------------------------------|--------------------------------------|
| _id           | ObjectId                           | Primary key.                         |
| address       | sub-document                       | Embedded — see below.                |
| type          | enum: apartment, house, office, land | Required.                          |
| listingPrice  | integer (kuruş)                    | Required, ≥ 0.                       |
| currency      | string                             | Default `'TRY'`. Reserved for v2.    |
| listedBy      | ObjectId (ref → Agent)             | Required.                            |
| createdAt     | Date                               | Auto-managed.                        |
| updatedAt     | Date                               | Auto-managed.                        |

`address` sub-document:

| Field       | Type    | Notes                         |
|-------------|---------|-------------------------------|
| street      | string  | Required.                     |
| district    | string  | Required.                     |
| city        | string  | Required.                     |
| postalCode  | string? | Optional.                     |

**Indexes:** `listedBy`, `address.city` (for filtering listings by city).

**Why embed the address.** The address has no identity outside the
property, is never queried independently, and is always read together
with the property. A separate collection here would add a join without
any benefit.

### 5.4 Collection: `transactions`

| Field              | Type                                                    | Notes |
|--------------------|---------------------------------------------------------|-------|
| _id                | ObjectId                                                | Primary key. |
| property           | ObjectId (ref → Property)                               | Required. |
| listingAgent       | ObjectId (ref → Agent)                                  | Required. |
| sellingAgent       | ObjectId (ref → Agent)                                  | Required. May equal `listingAgent`. |
| totalServiceFee    | integer (kuruş)                                         | Required, > 0. |
| currency           | string                                                  | Default `'TRY'`. |
| stage              | enum: `agreement`, `earnest_money`, `title_deed`, `completed`, `cancelled` | Default `'agreement'`. |
| stageHistory       | array of `{ stage, changedAt, note? }`                  | Embedded. Append-only. |
| financialBreakdown | embedded sub-document (see §7)                          | `null` until `completed`. |
| cancelledAt        | Date?                                                   | Set when `stage` becomes `cancelled`. |
| cancelReason       | string?                                                 | Set alongside `cancelledAt`. |
| createdAt          | Date                                                    | Auto-managed. |
| updatedAt          | Date                                                    | Auto-managed. |

**Indexes:** `stage` (filter the active pipeline), `listingAgent`,
`sellingAgent`, and a descending `createdAt` (default list order).

**Why `listingAgent` and `sellingAgent` are separate fields.** This models
Scenario 1 (same person in both roles) cleanly: the two fields simply
point to the same ObjectId. An alternative — storing an `agents: [...]`
array — would force every consumer to inspect roles to figure out who did
what. Separate fields make the domain explicit.

**Why `stage` is an enum.** The state machine's valid values are enforced
at two layers: at the Mongoose schema level (which rejects writes with
invalid values) and at the `StageTransitionService` level (which validates
transitions). Defense in depth.

**Why `financialBreakdown` is nullable.** It is only meaningful once the
transaction reaches `completed`. A nullable embedded document makes the
invariant explicit — consumers must handle the "not yet completed" case.

### 5.5 Monetary Precision

All monetary values in this system — `totalServiceFee`, `listingPrice`,
and every amount inside `financialBreakdown` — are stored as **integers
representing kuruş**, the minor unit of Turkish Lira (1 TRY = 100 kuruş).
So a service fee of 250.75 TRY is persisted as `25075`.

This convention avoids the floating-point rounding errors that are
inherent to binary floats. The canonical JavaScript example is
`0.1 + 0.2 === 0.30000000000000004`. In accounting contexts, this is
unacceptable: repeated additions drift, totals stop matching, and
reconciliation becomes painful.

Integer math is exact, trivially serializable, and maps cleanly to what
accounting systems actually use internally. Formatting to a human-readable
string (`"250,75 ₺"`) is a presentation-layer concern, handled in the
frontend via a composable.

Mongoose's `Decimal128` was considered and rejected for v1: it solves the
precision problem but introduces BSON-specific types that complicate
serialization and testing. Integer minor units are simpler and sufficient.

### 5.6 Embedding vs Referencing — Decisions at a Glance

| What                             | Strategy     | Why                                                              |
|----------------------------------|--------------|------------------------------------------------------------------|
| Agent ↔ Transaction              | Reference    | Agents live independently and are reused across many transactions. |
| Property ↔ Transaction           | Reference    | Same reasoning as agents.                                        |
| Address ↔ Property               | Embed        | Only meaningful within the property; never queried alone.        |
| stageHistory ↔ Transaction       | Embed        | Private to the transaction and always read together with it.     |
| financialBreakdown ↔ Transaction | Embed        | Snapshot; must remain immutable with the transaction.            |
| agentName inside breakdown       | Denormalize  | Accounting immutability — changes to the agent record must not rewrite history. |

---

## 6. Business Logic

### 6.1 Stage Transition State Machine

A transaction moves through a linear sequence of stages, with `cancelled`
acting as an escape hatch available from any non-terminal state:

```
agreement ──► earnest_money ──► title_deed ──► completed
     │              │                  │
     └──────────────┴──────────────────┴──────► cancelled
```

**Valid transitions:**

| From            | Allowed next stages      |
|-----------------|--------------------------|
| `agreement`     | `earnest_money`, `cancelled` |
| `earnest_money` | `title_deed`, `cancelled`    |
| `title_deed`    | `completed`, `cancelled`     |
| `completed`     | — (terminal)                 |
| `cancelled`     | — (terminal)                 |

**Decision — invalid transitions are rejected.** An attempt to jump
stages (e.g. `agreement → title_deed`) or to move backward
(e.g. `title_deed → earnest_money`) returns `400 Bad Request` with a
descriptive message.

**Rationale.** In the real world, the legal and financial process does
not flow backward: once earnest money has been exchanged or a title deed
filed, reverting to an earlier stage is not a state change but a
cancellation followed by a new transaction. Enforcing the state machine
in the backend guarantees domain integrity regardless of frontend
behavior — any future UI, import script, or third-party integration
inherits the same guarantees.

**Auditability.** Every stage change appends an entry to `stageHistory`
with the new stage, a timestamp, and an optional note. This provides a
complete audit trail without introducing a separate event store — a
deliberate simplification for v1, documented for future migration to
event sourcing if the need arises.

### 6.2 Commission Calculation

Commission distribution is deterministic and depends on exactly two
inputs: the total service fee and whether the listing and selling agents
are the same person.

**Formula (in kuruş):**

```
agencyShare = floor(totalServiceFee * 0.50)
agentPool   = totalServiceFee - agencyShare

if listingAgent.id === sellingAgent.id:
    // Scenario 1 — single agent earns the entire agent pool
    agents = [
        {
            agentId: listingAgent.id,
            roles:   ['listing', 'selling'],
            amount:  agentPool,
            percentage: 50
        }
    ]
else:
    // Scenario 2 — equal split between the two agents
    half = floor(agentPool / 2)
    remainder = agentPool - (half * 2)   // 0 or 1 kuruş
    agents = [
        { agentId: listingAgent.id, roles: ['listing'], amount: half + remainder, percentage: 25 },
        { agentId: sellingAgent.id, roles: ['selling'], amount: half,             percentage: 25 }
    ]
```

**Rounding policy.** Because amounts are integer kuruş, the 50/50 split
may leave a 1 kuruş remainder on odd totals. The remainder is assigned
deterministically to the listing agent. The resulting invariant
— `agencyShare + Σ agent.amount === totalServiceFee` — is asserted at
runtime as a sanity check.

**Implementation notes.**

- The calculation lives in a dedicated `CommissionService`, written as
  a pure function. It has no database access, no HTTP concerns, and no
  side effects. This makes it trivial to unit-test exhaustively.
- The service is invoked automatically when a transaction transitions to
  `completed`. The result is frozen onto the transaction document as a
  snapshot (see §7).
- Cancelled transactions never trigger the calculation. `financialBreakdown`
  remains `null` on cancelled transactions.

---

## 7. Financial Breakdown Storage Strategy

**Decision: embed the breakdown inside the transaction document as a
snapshot taken at the moment of completion.**

### Alternatives Considered

| Approach              | Rejected because                                                                 |
|-----------------------|----------------------------------------------------------------------------------|
| Separate collection   | Splits the transaction's source of truth across two documents; adds a join for every read; no benefit for our access patterns, since the breakdown is always read together with the transaction. |
| Computed on the fly   | Breaks accounting immutability. If an agent's data changed or commission rules evolved, historical transactions would silently change — unacceptable for financial records. |

### Why Embedded Snapshot Wins

- **Accounting immutability.** Once a transaction is completed, the
  financial record it produced must not change. Snapshotting agent names
  and amounts at completion time achieves this without locking the rest
  of the system.
- **Single-read access.** The breakdown is always consumed alongside the
  transaction (in detail views, reports, exports). Embedding eliminates
  a join.
- **Simplicity.** One collection, one document, one source of truth per
  transaction.

### What Exactly Is Snapshotted

```
financialBreakdown: {
  calculatedAt:     Date,
  agencyShare:      integer (kuruş),
  agents: [
    {
      agentId:      ObjectId,
      agentName:    string,        // denormalized — name at completion time
      roles:        string[],      // subset of ['listing', 'selling']
      amount:       integer (kuruş),
      percentage:   number         // 25 or 50
    }
  ],
  totalDistributed: integer (kuruş)  // agencyShare + Σ agent.amount — sanity check
}
```

The breakdown is `null` until the transaction enters the `completed`
stage. Cancelled transactions never receive a breakdown. Once written,
the breakdown is never modified.

---

## 8. API Design

The API follows REST conventions with resource-oriented URLs. All
responses are JSON. Errors follow a consistent shape produced by the
global exception filter:

```json
{
  "statusCode": 400,
  "message": "Invalid stage transition: earnest_money → agreement",
  "error": "Bad Request",
  "timestamp": "2026-04-20T10:15:30.000Z",
  "path": "/transactions/65f.../stage"
}
```

### Endpoint Summary

| Method | Path                              | Purpose                                       |
|--------|-----------------------------------|-----------------------------------------------|
| POST   | `/agents`                         | Create an agent.                              |
| GET    | `/agents`                         | List active agents. Supports `?active=false`. |
| GET    | `/agents/:id`                     | Retrieve a single agent.                      |
| PATCH  | `/agents/:id`                     | Update agent fields.                          |
| DELETE | `/agents/:id`                     | Soft-delete (sets `active=false`).            |
| POST   | `/properties`                     | Create a property.                            |
| GET    | `/properties`                     | List properties. Supports `?city=`, `?type=`. |
| GET    | `/properties/:id`                 | Retrieve a single property.                   |
| POST   | `/transactions`                   | Create a transaction (starts in `agreement`). |
| GET    | `/transactions`                   | List. Supports `?stage=`, `?agentId=`.        |
| GET    | `/transactions/:id`               | Retrieve with populated agents/property.      |
| PATCH  | `/transactions/:id/stage`         | Advance stage. Body: `{ nextStage, note? }`.  |
| POST   | `/transactions/:id/cancel`        | Cancel. Body: `{ reason }`.                   |
| GET    | `/transactions/:id/breakdown`     | Return the breakdown (404 if not completed).  |
| GET    | `/reports/agent/:agentId`         | Per-agent earnings across completed txns.     |

### Conventions

- **Validation.** Every request body is validated via a DTO decorated
  with `class-validator` rules. The global `ValidationPipe` runs in
  `whitelist: true, forbidNonWhitelisted: true` mode.
- **IDs.** Path parameters are validated as Mongo `ObjectId` via a custom
  pipe; malformed IDs return `400` before hitting the service.
- **Pagination.** List endpoints accept `?page=` and `?limit=` (defaults
  `1` and `20`, cap at `100`).
- **Documentation.** Every controller method is annotated for Swagger;
  the live docs are served at `/api/docs`.

---

## 9. Frontend State Management

### Pinia Store Organization

Three domain stores mirror the backend resources, plus one UI store:

```
stores/
├── agents.ts          // list + CRUD of agents
├── properties.ts      // list + CRUD of properties
├── transactions.ts    // list, detail, stage advance, cancel, breakdown
└── ui.ts              // toasts, global modals, navigation loading state
```

Each domain store exposes:

- `items` — the currently loaded list.
- `current` — the currently opened detail record (or `null`).
- `loading`, `error` — request state.
- Actions: `fetchAll`, `fetchById`, and domain-specific actions
  (e.g. `advanceStage`, `cancel`).

Stores are defined with the **composition API** setup-function style
(`defineStore('name', () => { ... })`) for better TypeScript inference
and a more natural match with Nuxt's auto-imports.

### Data Flow

```
  Page (pages/transactions/[id].vue)
       │
       │ onMounted → transactionsStore.fetchById(id)
       ▼
  Pinia store
       │
       │ useApi().get(...)
       ▼
  $fetch composable (useApi)
       │
       ▼
  NestJS API
```

- **Pages orchestrate, components display.** Pages call store actions;
  components receive data via props or `storeToRefs`.
- **`useApi` composable** centralizes the base URL, error handling,
  and toast emission for failures. No component ever calls `$fetch`
  directly.
- **Optimistic UI updates** are used for stage transitions: the store
  updates `current.stage` immediately, rolls back on error, and
  re-fetches on success to capture server-computed fields like
  `financialBreakdown`.

### Caching & Invalidation

v1 keeps this simple: every list-page visit refetches. A more elaborate
cache (e.g. `useFetch` with keys, or a dedicated query library) was
deemed premature given the dataset size expected at this stage of the
product.

---

## 10. Testing Strategy

Testing priority is **business logic first, plumbing second**. The test
suite is structured as follows.

### Unit Tests (mandatory, high coverage)

**`CommissionService`** covers every documented scenario plus edge
cases:

- Scenario 1 (same agent) — full pool to a single agent, both roles
  recorded.
- Scenario 2 (different agents) — equal 25% / 25% split.
- Odd-fee rounding — the 1 kuruş remainder is assigned to the listing
  agent and the total reconciles.
- Zero or negative fees are rejected at the DTO layer; the service
  still asserts non-negative inputs as a defensive check.
- Invariant `agencyShare + Σ agent.amount === totalServiceFee` is
  verified in every test.

**`StageTransitionService`** covers the full transition matrix:

- Every valid transition succeeds.
- Every invalid transition throws `BadRequestException` with a helpful
  message.
- Terminal states (`completed`, `cancelled`) reject all further
  transitions.
- `stageHistory` is correctly appended on each transition.

**`TransactionsService`** (with a mocked Mongoose model):

- Creating a transaction persists the initial `agreement` stage and an
  initial entry in `stageHistory`.
- Advancing to `completed` invokes `CommissionService` and writes the
  breakdown snapshot.
- Cancelling sets `cancelledAt` and `cancelReason` and does **not**
  produce a breakdown.
- Attempting to cancel an already-completed transaction is rejected.

### Integration Tests (selected happy paths)

- Full-lifecycle flow: `POST /transactions` → `PATCH .../stage` advanced
  through every stage → `GET .../breakdown` returns correct amounts
  and the `agencyShare + Σ agent.amount` invariant holds.

### Coverage Targets

- Business logic (`commission.service.ts`, `stage-transition.service.ts`): **≥ 95 %**.
- Services and controllers overall: **≥ 80 %**.
- DTOs and schemas: covered indirectly via integration tests.

### Explicitly Not Covered in v1

- End-to-end tests against a real MongoDB instance would require
  `mongodb-memory-server` and additional setup. Unit tests plus a
  handful of integration tests are judged sufficient for the scope of
  this exercise.
- Frontend tests are out of scope for v1 given the deliverable's focus
  on backend correctness.

---

## 11. Trade-offs & Decisions Log

A running log of significant decisions made during implementation. Each
entry records what was decided, the alternative considered, and why the
chosen path won.

| Date       | Decision                                                       | Alternative                          | Rationale                                                                 |
|------------|----------------------------------------------------------------|--------------------------------------|---------------------------------------------------------------------------|
| 2026-04-20 | Store money as integer kuruş                                   | Mongoose `Decimal128`                | Simpler, cleaner JSON serialization, avoids BSON type in test fixtures.   |
| 2026-04-20 | Embed `financialBreakdown` in transaction                      | Separate `breakdowns` collection     | Accounting immutability, single-read access, no cross-document joins.     |
| 2026-04-20 | Enforce stage transition rules in backend                      | Let frontend handle validation       | Domain integrity must not depend on any single client.                    |
| 2026-04-20 | Soft-delete agents via `active` flag                           | Hard delete                          | Preserves referential integrity with historical transactions.             |
| 2026-04-20 | Separate `listingAgent` and `sellingAgent` fields              | Single `agents: []` array with roles | Models "same agent in both roles" as pointer equality — no special case.  |
| 2026-04-20 | Feature-based module layout in NestJS                          | Layer-based (all controllers/, all services/) | Feature modules scale better as the domain grows.                |

---

## 12. Future Improvements

- **Authentication.** JWT-based auth with role-based access control
  (admin, agent, accountant). Per-role visibility of breakdowns.
- **Audit log collection.** Capture every write with actor, before/after
  snapshots, and request metadata. Required for most compliance regimes.
- **Multi-currency.** Per-transaction currency with FX rate snapshot at
  completion; reporting layer aggregates to a base currency.
- **Event-sourced stage history.** Move `stageHistory` to a dedicated
  events collection; derive the transaction's current state from the
  event stream. Enables time-travel debugging and better analytics.
- **Webhooks.** Notify external systems on stage transitions
  (e.g. accounting software on `completed`).
- **Bulk import.** Endpoint for importing historical transactions from
  spreadsheets during migration.
- **Archive policy.** `archivedAt` field and a periodic job to move old
  terminal-state transactions to cold storage.
- **Frontend tests.** Component tests with Vitest + Vue Test Utils;
  critical-path E2E tests with Playwright.
- **Rate limiting & request logging.** Production-hardening concerns
  deferred from v1.