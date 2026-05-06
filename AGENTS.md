# PromoCode Manager Delivery Instructions

You are the sole senior fullstack engineer for this project.

Your job is to implement the PromoCode Manager test task with maximum score, but in strict incremental stages. You must not implement everything at once.

## Project goals

- Maximize the score on the provided rubric.
- Build a clean monorepo.
- Backend: NestJS, TypeScript, MongoDB, ClickHouse, Redis.
- Frontend: React Vite SPA, TypeScript.
- Frontend visual direction: neobank-style fintech analytics console, not a generic AI dashboard.
- Codex should write the majority of the code, but must work like a disciplined engineer.

## Core architecture rules

- MongoDB is the command/write source of truth.
- ClickHouse is the query/read model for all analytical frontend tables.
- All frontend analytical tables must read from backend analytics endpoints backed only by ClickHouse.
- Do not use MongoDB in analytics services.
- Redis must be used for at least:
  1. distributed lock during apply-promocode
  2. short-TTL cache for ClickHouse analytics queries
- Order creation and promocode application are separate operations.
- Do not load all rows to the frontend and paginate in memory.
- All analytics tables must use server-side pagination, sorting, and filtering.
- ClickHouse queries must not interpolate user input unsafely.
- Sort columns must be whitelisted.
- Do not return `passwordHash` from any endpoint.
- Avoid `any` in business logic.
- Use strict TypeScript.
- Prefer simple, explicit, testable code over clever abstractions.
- Do not add Kafka, RabbitMQ, microservices, Next.js, GraphQL, or complex RBAC.

## Workflow rules

- Work in stages.
- Before each stage:
  1. Read relevant existing files.
  2. Restate the stage goal.
  3. List the exact files you expect to create/change.
  4. Identify verification commands for this stage.
- During a stage:
  1. Implement only the current stage.
  2. Do not start future stages.
  3. Keep changes focused.
- After each stage:
  1. Run relevant verification commands.
  2. Fix failures related to the current stage.
  3. Summarize changed files.
  4. Summarize what was verified.
  5. Summarize remaining risks.
  6. Mark the stage as complete only if checks pass or clearly explain why a check could not be run.

## Testing rules

- Tests are required during development for risky business logic, not only at the end.
- Add unit tests when implementing:
  - promocode validation
  - apply promocode
  - discount calculation
  - total usage limit
  - per-user usage limit
  - expired promocode
  - inactive promocode
  - applying promocode twice
  - applying promocode to another user's order
  - analytics query parameter handling
- Do not postpone all tests to the final stage.
- If a stage changes business logic, update or add tests in the same stage.

## Frontend design rules

- Build a neobank-style fintech console.
- Avoid generic admin-dashboard UI.
- Avoid random AI-style gradient blobs, oversized cards, meaningless icons, and fake visual noise.
- The interface should feel like a real fintech internal product for monitoring discount exposure, promo performance, revenue impact, user value, and usage risk.
- Use thoughtful states: loading, empty, error, success.
- Promo codes should feel like ticker-like financial instruments.
- Use compact, readable, table-first analytics.
- Use strong typography, calm premium surfaces, precise status badges, and clear risk indicators.

## Repository structure target

```text
promo-code-manager/
  apps/
    api/
    web/
  packages/
    shared/
  docs/
  docker-compose.yml
  AGENTS.md
  README.md
```

## Stages

### STAGE 0 - Planning and project instructions only

Create:

- `AGENTS.md`
- `docs/evaluation-checklist.md`
- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/clickhouse-schema.md`
- `docs/frontend-design.md`
- `docs/implementation-plan.md`

Requirements:

- Convert the original rubric into an implementation checklist.
- Define module boundaries.
- Define API contracts.
- Define MongoDB entities.
- Define ClickHouse tables and denormalized columns.
- Define sync-on-write strategy with retry-lite and cache invalidation.
- Define Redis lock/cache strategy.
- Define frontend routes, table behavior, and design system.
- Do not implement application code in this stage.

Verification:

- Check that docs exist.
- Check that every major rubric category is represented.
- Check that future stages can be implemented from docs without inventing architecture.

### STAGE 1 - Monorepo scaffold

Create:

- pnpm workspace
- apps/api NestJS app
- apps/web Vite React app
- packages/shared
- root scripts
- `docker-compose.yml` with MongoDB, ClickHouse, Redis, api, web
- `.env.example` files
- basic README startup section

Requirements:

- TypeScript strict mode where applicable.
- No business logic yet.

Verification:

- `pnpm install`
- `pnpm build` or equivalent
- `docker compose config`

### STAGE 2 - Backend foundation and infrastructure

Implement:

- `ConfigModule`
- MongoDB connection
- ClickHouse client provider
- Redis provider
- global `ValidationPipe`
- standard exception filter
- health endpoint checking MongoDB, ClickHouse, Redis
- Swagger base setup

Verification:

- backend typecheck/build
- backend tests if present
- health endpoint works when services are running

### STAGE 3 - Data models and ClickHouse initialization

Implement:

- Mongo schemas for `User`, `PromoCode`, `Order`, `PromoUsage`
- ClickHouse table creation on startup or init service
- typed ClickHouse row interfaces
- seed script with realistic demo data

ClickHouse tables:

- `users`
- `promocodes`
- `orders`
- `promo_usages`

Requirements:

- ClickHouse rows must be denormalized enough for analytics.
- `promo_usages` must contain human-readable fields like user email/name and promocode code.
- ClickHouse data must be self-contained for analytics.
- No frontend yet.

Verification:

- backend build
- seed script can run
- ClickHouse tables are created automatically
- no TypeScript errors

### STAGE 4 - Auth

Implement:

- register
- login
- JWT access token
- JWT guard
- current user decorator
- password hashing
- passwordHash hidden from responses
- protected route example
- DTO validation
- Swagger decorators

Optional only if simple:

- refresh token stored in Redis
- logout invalidates refresh token

Verification:

- auth unit tests
- passwordHash leakage test
- backend build
- Swagger generated without errors

### STAGE 5 - Users and Promocodes command flows

Implement:

- users CRUD/deactivate
- promocodes CRUD/deactivate
- DTO validation
- MongoDB writes
- sync to ClickHouse after create/update/deactivate
- analytics cache invalidation after mutations
- Swagger decorators

Requirements:

- Mutations go to MongoDB.
- ClickHouse is updated after mutation.
- Deactivation is supported.

Verification:

- backend build
- relevant unit tests
- manual API examples or Swagger examples

### STAGE 6 - Orders and apply-promocode

Implement:

- `POST /orders`
- `GET /orders/my`
- `POST /orders/:id/apply-promocode`

Requirements:

- Creating order and applying promocode are separate actions.
- Order belongs to current user.
- Validate:
  - order exists
  - order belongs to current user
  - order does not already have a promocode
  - promocode exists
  - promocode is active
  - promocode `dateFrom`/`dateTo`
  - total usage limit
  - per-user usage limit
- Use Redis distributed lock with TTL around apply-promocode.
- Calculate and store discount amount.
- Create promo usage record.
- Sync changed order and promo usage to ClickHouse.
- Invalidate analytics cache.

Required tests:

- expired promocode rejected
- inactive promocode rejected
- not-started promocode rejected
- total limit exceeded
- per-user limit exceeded
- cannot apply promocode twice
- cannot apply to another user's order
- discount calculation correct
- lock behavior tested or documented if hard to unit test

Verification:

- backend build
- all backend tests
- manual API flow works

### STAGE 7 - Analytics endpoints from ClickHouse only

Implement:

- `GET /analytics/users`
- `GET /analytics/promocodes`
- `GET /analytics/promo-usages`

Requirements:

- Use only ClickHouse.
- Do not import Mongoose models in `AnalyticsModule`.
- Support:
  - `page`
  - `pageSize`
  - `totalCount`
  - `sortBy`
  - `sortDir`
  - `dateFrom`
  - `dateTo`
  - column filters
- Use Redis cache with normalized query hash.
- Whitelist sortable/filterable columns.
- Do not interpolate user input unsafely.
- Return typed DTOs.

Verification:

- backend build
- analytics query tests
- grep or structural check that analytics does not use Mongo models
- manual query examples

### STAGE 8 - Frontend foundation and design system

Implement:

- Vite React SPA foundation
- routing
- API client
- auth state
- protected routes
- TanStack Query setup
- toast system
- neobank fintech layout
- reusable UI primitives:
  - `AppShell`
  - `MetricCard`
  - `ServerDataTable`
  - `DateRangeControl`
  - `PromoCodePill`
  - `StatusBadge`
  - `EmptyState`
  - `ErrorState`

Requirements:

- No analytical pages yet unless needed for layout.
- Visual design must follow `docs/frontend-design.md`.

Verification:

- frontend typecheck/build
- no console-breaking errors
- basic routes render

### STAGE 9 - Frontend analytics tables

Implement pages:

- users analytics table
- promocodes performance table
- promo usages ledger/history table

Requirements:

- All tables use backend analytics endpoints.
- Server-side pagination.
- Server-side sorting.
- Server-side column filtering.
- Global date filter with presets:
  - Today
  - Last 7 days
  - Last 30 days
  - Custom
- Loading, empty, error states.
- Total count and page size selector.
- No client-side full-data loading.

Verification:

- frontend build/typecheck
- inspect API requests to confirm query params are sent
- no in-memory pagination over full dataset

### STAGE 10 - Frontend operations

Implement pages:

- promocode management create/edit/deactivate
- orders page
- create order form
- my orders table/list
- apply promocode flow

Requirements:

- React Hook Form + Zod validation.
- Toasts for success/error/warning.
- API errors displayed with useful messages.
- Route protection.
- Token expiration handling or automatic logout if implemented.

Verification:

- frontend build/typecheck
- manual user flow:
  1. register/login
  2. create promocode
  3. create order
  4. apply promocode
  5. see analytics update after cache invalidation/refetch

### STAGE 11 - Bonus polish

Implement if core app is stable:

- Swagger examples and full DTO documentation
- rate limiting for login/apply-promocode using Redis
- more column filters
- optimistic UI where safe
- improved README diagrams
- extra tests

Do not add risky large features.

Verification:

- backend tests
- frontend build
- `docker compose up` path still works

### STAGE 12 - Final audit and scoring

Do not add new features at first.
Review the repository against the original rubric.

Produce:

- estimated score out of 78
- score per criterion
- evidence from files
- gaps
- top fixes by score impact

Then implement only the smallest high-impact fixes needed to improve score.

Final verification:

- `docker compose up` works from clean checkout
- backend build/test passes
- frontend build/typecheck passes
- seed data works
- README launch instructions are accurate
