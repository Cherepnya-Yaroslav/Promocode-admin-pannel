# Architecture

## 1. System overview

PromoCode Manager is a monorepo with a NestJS backend, a React Vite frontend, and a small shared package for cross-cutting types and utilities.

- MongoDB is the write model for transactional data.
- ClickHouse is the read model for all analytics tables shown in the frontend.
- Redis provides distributed coordination and short-lived analytics caching.
- The backend exposes both command endpoints and analytics endpoints.
- The frontend is a table-first fintech console for operations and analytics.

## 2. Monorepo layout

```text
/
  apps/
    api/        # NestJS API
    web/        # React Vite SPA
  packages/
    shared/     # shared TypeScript contracts, enums, helpers
  docs/
  docker-compose.yml
  AGENTS.md
  README.md
```

## 3. Backend module boundaries

### Core modules

- `AppModule`
  - composes all application modules
- `ConfigModule`
  - environment parsing and typed config access
- `HealthModule`
  - readiness/liveness endpoints for MongoDB, ClickHouse, Redis

### Infrastructure modules

- `MongoModule`
  - Nest/Mongoose connection and model registration
- `ClickHouseModule`
  - typed ClickHouse client provider and query helpers
- `RedisModule`
  - Redis client provider
- `AnalyticsSyncModule`
  - ClickHouse projection sync and analytics cache invalidation helpers
- `RateLimitModule`
  - Redis-backed endpoint throttling helpers

### Domain modules

- `AuthModule`
  - register, login, JWT issuance, auth guard, current-user decorator
- `UsersModule`
  - user CRUD/deactivate command flows
- `PromocodesModule`
  - promocode CRUD/deactivate command flows
- `OrdersModule`
  - create order, list current user orders, apply promocode
- `AnalyticsModule`
  - read-only ClickHouse analytics endpoints

### Supporting modules

- `AnalyticsSyncModule`
  - sync-on-write from Mongo command entities into ClickHouse tables
- `SeedModule` or scripts
  - demo data generation for local environments

## 4. Data ownership

### MongoDB collections

- `users`
- `promocodes`
- `orders`
- `promo_usages`

MongoDB stores canonical transactional state and is the only database used for command-side business validation and writes.

### MongoDB entity definitions

#### `User`

- `_id`
- `email`
- `passwordHash`
- `firstName`
- `lastName`
- `isActive`
- `country` for optional demo segmentation
- `segment` for optional demo segmentation
- `createdAt`
- `updatedAt`

#### `PromoCode`

- `_id`
- `code`
- `description`
- `discountType`
- `discountValue`
- `maxDiscountAmount`
- `minOrderAmount`
- `totalUsageLimit`
- `perUserUsageLimit`
- `dateFrom`
- `dateTo`
- `isActive`
- `createdAt`
- `updatedAt`

#### `Order`

- `_id`
- `userId`
- `amount`
- `currency`
- `status`
- `promocodeId`
- `promocodeCode`
- `discountAmount`
- `finalAmount`
- `appliedAt`
- `createdAt`
- `updatedAt`

#### `PromoUsage`

- `_id`
- `userId`
- `orderId`
- `promocodeId`
- `promocodeCode`
- `discountType`
- `discountValueSnapshot`
- `orderAmount`
- `discountAmount`
- `finalAmount`
- `currency`
- `usedAt`
- `createdAt`
- `updatedAt`

These fields are the command-side source of truth. ClickHouse projections may add denormalized labels and aggregates, but they should not redefine business ownership.

### ClickHouse tables

- `users`
- `promocodes`
- `orders`
- `promo_usages`

ClickHouse tables are denormalized for analytics and are the only source for analytical frontend tables. Analytics code must not read MongoDB.

### Redis responsibilities

- Distributed lock for `POST /orders/:id/apply-promocode`
- Cache for analytics query responses
- Rate limiting for login and apply-promocode

## 5. Request/response architecture

### Command flows

1. Request hits a NestJS controller.
2. DTO validation runs through the global validation pipe.
3. Domain service performs business validation using MongoDB.
4. Transaction-like sequence writes the canonical change into MongoDB.
5. Sync service projects the changed entity into ClickHouse.
6. Related Redis analytics cache keys are invalidated.
7. Sanitized response is returned to the client.

### Analytics flows

1. Request hits an analytics controller with pagination, sorting, filtering, and date range params.
2. Query DTO normalizes and validates input.
3. Analytics service builds a whitelisted ClickHouse query.
4. A normalized query hash is used for Redis lookup.
5. Cache miss executes ClickHouse SQL and stores short-TTL result in Redis.
6. Typed response is returned to the frontend.

## 6. Sync-on-write strategy

The system does not attempt complex event streaming. It uses synchronous projection after successful MongoDB writes with a small retry-lite mechanism.

### Rules

- MongoDB write succeeds first or the request fails.
- After write success, the API attempts an upsert/delete-style sync into ClickHouse.
- Sync logic is explicit per aggregate type, not generic magic.
- If the first ClickHouse sync attempt fails, retry a small fixed number of times in-process with backoff.
- If sync still fails, return an error for mutation endpoints that must guarantee fresh analytics in this test task.
- Cache invalidation runs only after a successful ClickHouse sync.
- Order deletion removes the related `orders` and optional `promo_usages` projections before invalidating affected analytics resources.

### Retry-lite policy

- Initial attempt in request flow
- Two short retries with small delay
- Structured logging on each failure
- No background queue in this assignment

This keeps architecture simple while still acknowledging transient ClickHouse errors.

## 7. Redis cache strategy

### Scope

- Only analytics endpoints are cached.
- Command endpoints are never cached.

### Key shape

```text
analytics:{resource}:{sha256(normalized-query)}
```

### Normalization inputs

- endpoint resource name
- page
- pageSize
- sortBy
- sortDir
- normalized date range
- normalized column filters

### TTL

- Default: 15 to 60 seconds
- Enough to reduce repeated analytical load while staying fresh after invalidation

### Invalidation policy

- User mutations invalidate `analytics:users:*` and related cross-resource keys when needed
- Promocode mutations invalidate `analytics:promocodes:*`
- Order apply/create invalidates `analytics:promo-usages:*`, `analytics:promocodes:*`, and any order-derived future analytics keys

Implementation can start with coarse resource-level invalidation helpers and optimize later only if needed.

## 8. Redis lock strategy for apply-promocode

### Lock purpose

Prevent two concurrent apply requests from double-consuming usage limits or applying a promocode twice.

### Lock key

```text
lock:apply-promocode:order:{orderId}
```

### Lock behavior

- Acquire with `SET key value NX PX ttl`
- TTL should exceed worst-case business operation duration with modest buffer
- If lock acquisition fails, return a conflict-style error telling the client to retry
- Release lock only if the stored lock token matches the requester token

### Why order-scoped locking

- It directly protects the invariant "one order can receive at most one promocode"
- It is easy to reason about and test
- It avoids over-locking all promocode activity globally

## 9. Security and validation

- DTO validation on every write endpoint
- JWT protection on authenticated routes
- Password hashing using a modern hash library
- Response serialization or mapping that excludes `passwordHash`
- Whitelisted analytics sort/filter columns
- Parameter binding for ClickHouse query values

## 10. Frontend application structure

### Routes

- `/login`
- `/register`
- `/app/overview` or `/app/users`
- `/app/analytics/users`
- `/app/analytics/promocodes`
- `/app/analytics/promo-usages`
- `/app/promocodes`
- `/app/orders`

### Frontend layers

- `app/`
  - router, providers, auth bootstrap
- `features/`
  - auth, users, promocodes, orders, analytics
- `components/`
  - shared UI primitives and layouts
- `lib/`
  - API client, query helpers, formatters

## 11. Shared package boundaries

`packages/shared` should stay small and explicit.

Likely contents:

- enums
- simple DTO-compatible interfaces used by both apps
- query param types
- formatting or constant helpers that are framework-agnostic

Avoid placing Nest-only or React-only code in shared.

## 12. Non-goals

- No microservice split
- No event bus
- No GraphQL API
- No Kafka/RabbitMQ
- No client-side analytics aggregation
- No overly generic repository or CQRS framework
