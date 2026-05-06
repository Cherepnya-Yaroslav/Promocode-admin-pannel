# Evaluation Checklist

This checklist converts the test-task rubric and repository rules into concrete acceptance criteria. Every later stage should map its work back to these items.

## 1. Planning and repository hygiene

- `AGENTS.md` exists and defines staged delivery rules.
- Architecture, API, analytics schema, frontend design, and implementation docs exist in `docs/`.
- Repository structure follows the target monorepo layout.
- README startup guidance stays accurate as the repo evolves.

## 2. Monorepo and developer experience

- `pnpm` workspace is configured cleanly.
- `apps/api`, `apps/web`, and `packages/shared` are created.
- Root scripts support install, build, lint, test, seed, and local startup.
- Environment examples exist for root and app-specific configuration.
- `docker-compose.yml` boots MongoDB, ClickHouse, Redis, api, and web together.

## 3. Backend architecture quality

- NestJS modules are split by domain and infrastructure concern.
- TypeScript strict mode is enabled.
- Business logic avoids `any`.
- Shared DTOs/types are explicit and testable.
- Exception handling and validation are centralized.

## 4. Data architecture correctness

- MongoDB is the only command/write source of truth.
- ClickHouse is the only analytics/read model for frontend tables.
- Analytics services do not depend on MongoDB models.
- Redis is used both for locking and query caching.
- Data flow from writes to analytical read model is documented and implemented.

## 5. Infrastructure readiness

- MongoDB connection is healthy and configurable.
- ClickHouse client/provider is healthy and configurable.
- Redis provider is healthy and configurable.
- Health endpoint reports dependency readiness.
- Swagger is available for backend API exploration.

## 6. Authentication and security

- Register and login endpoints work.
- Passwords are hashed securely.
- `passwordHash` never appears in API responses.
- JWT auth protects non-public endpoints.
- DTO validation rejects malformed input.
- Sensitive operations can be rate-limited if bonus polish is attempted.

## 7. Users command flows

- Users can be created, listed, updated, and deactivated.
- User mutations persist to MongoDB first.
- User analytical data is synchronized to ClickHouse after mutation.
- Mutations invalidate relevant analytics cache entries.

## 8. Promocode command flows

- Promocodes can be created, listed, updated, and deactivated.
- Validation supports active window and usage limits.
- Promocode mutations persist to MongoDB first.
- Promocode analytical data is synchronized to ClickHouse after mutation.
- Mutations invalidate relevant analytics cache entries.

## 9. Order and promocode application flows

- Order creation is separate from promocode application.
- Orders are scoped to the authenticated user.
- Apply-promocode uses a Redis distributed lock.
- Promo usage is recorded exactly once for a successful apply.
- Discount amount is calculated deterministically and stored.
- Failed validations return clear errors.

## 10. Business-rule coverage

- Expired promocode is rejected.
- Inactive promocode is rejected.
- Not-started promocode is rejected.
- Total usage limit is enforced.
- Per-user usage limit is enforced.
- Applying the same promocode twice to one order is rejected.
- Applying a promocode to another user's order is rejected.
- Discount calculation is correct.

## 11. Analytics backend quality

- Endpoints exist for users, promocodes, and promo usages.
- Analytics use ClickHouse only.
- Pagination is server-side and returns `totalCount`.
- Sorting is server-side and sort columns are whitelisted.
- Filtering is server-side and filter columns are whitelisted.
- Date range filtering is supported.
- ClickHouse queries avoid unsafe interpolation.
- Query results are cached in Redis with a short TTL.

## 12. Frontend foundation

- React Vite SPA is configured with TypeScript.
- Routing, auth state, protected routes, and API client are implemented.
- TanStack Query powers server data fetching.
- Toasts, empty states, error states, and loading states are included.
- Design system matches a neobank-style fintech console rather than a generic admin dashboard.

## 13. Frontend analytics experience

- Users, promocodes, and promo usage tables read only from analytics endpoints.
- Pagination is server-side.
- Sorting is server-side.
- Column filtering is server-side.
- Date presets include Today, Last 7 days, Last 30 days, and Custom.
- No full dataset is loaded into the browser for in-memory pagination.

## 14. Frontend operational flows

- Users can register and log in.
- Operators can create, edit, and deactivate promocodes.
- Users can create orders and apply promocodes.
- API errors are surfaced clearly in the UI.
- Analytics refresh after writes or explicit invalidation/refetch.

## 15. Testing expectations

- Risky business logic has unit tests in the same stage it is added.
- Auth has unit tests.
- Password leakage is tested.
- Promocode validation/apply logic is tested.
- Analytics query parameter handling is tested.
- Build and typecheck commands remain green as features are added.

## 16. Final delivery quality

- A clean checkout can start with documented commands.
- Seed data populates a believable demo environment.
- README accurately describes startup and architecture.
- The repo can be audited against the checklist with clear evidence.
