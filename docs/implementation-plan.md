# Implementation Plan

This is the historical delivery plan used to stage the implementation. The repository has already progressed through these stages, so this file should be read as a delivery record and audit reference, not as the source of truth for current runtime behavior.

This plan keeps delivery incremental and score-focused. Each stage has a narrow outcome, explicit dependencies, and verification gates.

## Stage 0 - Planning only

Goal:

- lock architecture, contracts, schema, and design before code

Outputs:

- `AGENTS.md`
- planning docs in `docs/`

Verification:

- docs exist
- major rubric categories represented
- later stages can follow docs without inventing architecture

## Stage 1 - Monorepo scaffold

Goal:

- establish workspace and local runtime foundation with no business logic

Create:

- pnpm workspace
- NestJS app in `apps/api`
- Vite React app in `apps/web`
- `packages/shared`
- root scripts
- `docker-compose.yml`
- `.env.example` files

Key decisions already locked:

- strict TypeScript
- monorepo layout from `docs/architecture.md`

## Stage 2 - Backend foundation and infrastructure

Goal:

- create a healthy backend shell that can talk to MongoDB, ClickHouse, and Redis

Implement:

- typed config
- database/client providers
- validation/exception baseline
- health endpoint
- Swagger base

Risk to watch:

- environment naming consistency across Docker and Nest config

## Stage 3 - Data models and ClickHouse initialization

Goal:

- define canonical Mongo models and analytical ClickHouse tables

Implement:

- Mongoose schemas
- ClickHouse initialization service
- projection row types
- seed script

Risk to watch:

- keeping analytical rows self-contained enough for frontend use

## Stage 4 - Auth

Goal:

- secure access and establish current-user context for later flows

Implement:

- register
- login
- JWT guard
- current user extraction
- password hashing and response sanitization

Risk to watch:

- accidental `passwordHash` leakage in serialized responses

## Stage 5 - Users and Promocodes command flows

Goal:

- implement CRUD/deactivate flows with Mongo writes and ClickHouse sync

Implement:

- user management endpoints
- promocode management endpoints
- sync after mutation
- cache invalidation

Risk to watch:

- forgetting to keep analytics cache invalidation aligned with resource mutations

## Stage 6 - Orders and apply-promocode

Goal:

- implement the highest-risk business flow with locking and validation

Implement:

- create order
- list current user orders
- apply promocode
- promo usage creation
- discount calculation
- ClickHouse sync

Required tests in this stage:

- expired/inactive/future promo rejection
- total/per-user limits
- double apply protection
- foreign-order rejection
- discount calculation

Risk to watch:

- concurrency around apply-promocode

## Stage 7 - Analytics endpoints

Goal:

- expose all frontend tables from ClickHouse only

Implement:

- users analytics endpoint
- promocodes analytics endpoint
- promo usage ledger endpoint
- normalized query hashing
- Redis cache
- sort/filter whitelists

Risk to watch:

- unsafe query construction
- accidental Mongo imports in analytics code

## Stage 8 - Frontend foundation

Goal:

- build the application shell, data layer, auth handling, and reusable UI primitives

Implement:

- routing
- auth state
- protected routes
- TanStack Query
- shared components
- design tokens and layout system

Risk to watch:

- falling into generic dashboard visuals instead of the fintech direction

## Stage 9 - Frontend analytics tables

Goal:

- connect the analytics UX to server-side data flows only

Implement:

- users analytics page
- promocodes analytics page
- promo usage ledger page
- date presets
- table loading/empty/error states

Risk to watch:

- accidental in-memory pagination/filtering

## Stage 10 - Frontend operations

Goal:

- complete end-to-end operational flows for promocodes and orders

Implement:

- create/edit/deactivate promocodes
- create order
- list my orders
- apply promocode
- form validation and toasts

Risk to watch:

- backend error handling not being translated into usable UI feedback

## Stage 11 - Bonus polish

Goal:

- improve score without destabilizing core flows

Possible items:

- richer Swagger docs
- Redis-backed rate limiting
- more filters
- safe optimistic UX
- README diagrams
- extra tests

Rule:

- skip any bonus work that threatens stability

## Stage 12 - Final audit and scoring

Goal:

- audit against rubric before adding anything new

Process:

1. score current implementation against the checklist
2. gather evidence by file
3. identify highest-impact gaps
4. implement only the smallest high-value fixes
5. run final verification from a clean-start perspective

## Cross-stage guardrails

- MongoDB remains the command source of truth
- ClickHouse remains the analytics source of truth
- Redis is used for lock and analytics cache
- No client-side full-data analytics pagination
- No unsafe ClickHouse SQL interpolation
- No risky scope jumps across stages
