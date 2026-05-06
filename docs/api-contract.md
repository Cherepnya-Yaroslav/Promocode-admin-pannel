# API Contract

This document defines the current HTTP contract for the NestJS backend. DTO field names are intentionally explicit to keep frontend integration predictable.

## 1. Conventions

- Base URL: `/api/v1`
- Auth: `Authorization: Bearer <accessToken>`
- Content type: `application/json`
- Dates in payloads: ISO 8601 strings
- Monetary values: decimal numbers in request, persisted with explicit precision strategy in implementation
- Error shape:

```json
{
  "statusCode": 400,
  "timestamp": "2026-05-06T12:00:00.000Z",
  "path": "/api/v1/auth/register",
  "method": "POST",
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

## 2. Health

### `GET /api/v1/health`

Returns dependency status for MongoDB, ClickHouse, and Redis.

Response:

```json
{
  "status": "ok",
  "services": {
    "mongo": "up",
    "clickhouse": "up",
    "redis": "up"
  },
  "timestamp": "2026-05-05T12:00:00.000Z"
}
```

## 3. Auth

### `POST /api/v1/auth/register`

Request:

```json
{
  "email": "alex@example.com",
  "password": "StrongPass123!",
  "firstName": "Alex",
  "lastName": "Morgan"
}
```

Response:

```json
{
  "user": {
    "id": "user_123",
    "email": "alex@example.com",
    "firstName": "Alex",
    "lastName": "Morgan",
    "isActive": true,
    "createdAt": "2026-05-05T12:00:00.000Z",
    "updatedAt": "2026-05-05T12:00:00.000Z"
  },
  "accessToken": "jwt"
}
```

### `POST /api/v1/auth/login`

Request:

```json
{
  "email": "alex@example.com",
  "password": "StrongPass123!"
}
```

Response matches register.

Notes:

- Redis-backed rate limiting is applied to login attempts.
- repeated rapid attempts can return `429 Too Many Requests`.

### `GET /api/v1/auth/me`

Protected route returning the current user without `passwordHash`.

## 4. Users command endpoints

### `GET /api/v1/users`

Admin/operator listing for command-side management. This is separate from analytics tables.

Query params:

- `page`
- `pageSize`
- `search`
- `isActive`

Response:

```json
{
  "items": [
    {
      "id": "user_123",
      "email": "alex@example.com",
      "firstName": "Alex",
      "lastName": "Morgan",
      "isActive": true,
      "createdAt": "2026-05-05T12:00:00.000Z",
      "updatedAt": "2026-05-05T12:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 1
}
```

### `POST /api/v1/users`

Creates a user.

### `GET /api/v1/users/:id`

Gets one user.

### `PATCH /api/v1/users/:id`

Editable fields:

- `firstName`
- `lastName`
- `isActive`

### `POST /api/v1/users/:id/deactivate`

Marks user inactive.

## 5. Promocode command endpoints

### `GET /api/v1/promocodes`

Command-side listing for management.

Query params:

- `page`
- `pageSize`
- `search`
- `isActive`

### `POST /api/v1/promocodes`

Request:

```json
{
  "code": "SPRING25",
  "description": "25 percent seasonal campaign",
  "discountType": "PERCENT",
  "discountValue": 25,
  "maxDiscountAmount": 100,
  "minOrderAmount": 50,
  "totalUsageLimit": 5000,
  "perUserUsageLimit": 1,
  "dateFrom": "2026-05-01T00:00:00.000Z",
  "dateTo": "2026-05-31T23:59:59.999Z",
  "isActive": true
}
```

Response:

```json
{
  "id": "promo_123",
  "code": "SPRING25",
  "description": "25 percent seasonal campaign",
  "discountType": "PERCENT",
  "discountValue": 25,
  "maxDiscountAmount": 100,
  "minOrderAmount": 50,
  "totalUsageLimit": 5000,
  "perUserUsageLimit": 1,
  "dateFrom": "2026-05-01T00:00:00.000Z",
  "dateTo": "2026-05-31T23:59:59.999Z",
  "isActive": true,
  "createdAt": "2026-05-05T12:00:00.000Z",
  "updatedAt": "2026-05-05T12:00:00.000Z"
}
```

### `GET /api/v1/promocodes/:id`

Get one promocode.

### `PATCH /api/v1/promocodes/:id`

Editable fields:

- `description`
- `discountValue`
- `maxDiscountAmount`
- `minOrderAmount`
- `totalUsageLimit`
- `perUserUsageLimit`
- `dateFrom`
- `dateTo`
- `isActive`

### `POST /api/v1/promocodes/:id/deactivate`

Marks promocode inactive.

## 6. Orders and promo application

### `POST /api/v1/orders`

Request:

```json
{
  "amount": 240,
  "currency": "USD"
}
```

Response:

```json
{
  "id": "order_123",
  "userId": "user_123",
  "amount": 240,
  "currency": "USD",
  "status": "CREATED",
  "promocodeId": null,
  "promocodeCode": null,
  "discountAmount": 0,
  "finalAmount": 240,
  "createdAt": "2026-05-05T12:00:00.000Z",
  "updatedAt": "2026-05-05T12:00:00.000Z"
}
```

### `GET /api/v1/orders/my`

Returns the authenticated user's orders.

Query params:

- `page`
- `pageSize`

### `DELETE /api/v1/orders/:id`

Deletes an order owned by the current authenticated user.

Notes:

- if the order already has an applied promocode, the related `PromoUsage` record is also removed
- analytics projections for `orders`, `promo_usages`, `users`, and the related promocode are refreshed

### `POST /api/v1/orders/:id/apply-promocode`

Request:

```json
{
  "code": "SPRING25"
}
```

Success response:

```json
{
  "order": {
    "id": "order_123",
    "userId": "user_123",
    "amount": 240,
    "currency": "USD",
    "status": "PROMOCODE_APPLIED",
    "promocodeId": "promo_123",
    "promocodeCode": "SPRING25",
    "discountAmount": 60,
    "finalAmount": 180,
    "appliedAt": "2026-05-05T12:05:00.000Z",
    "createdAt": "2026-05-05T12:00:00.000Z",
    "updatedAt": "2026-05-05T12:05:00.000Z"
  },
  "promoUsage": {
    "id": "usage_123",
    "userId": "user_123",
    "orderId": "order_123",
    "promocodeId": "promo_123",
    "promocodeCode": "SPRING25",
    "discountAmount": 60,
    "usedAt": "2026-05-05T12:05:00.000Z"
  }
}
```

Possible business errors:

- `404` order not found
- `403` order belongs to another user
- `409` order already has promocode
- `404` promocode not found
- `400` promocode inactive
- `400` promocode not started
- `400` promocode expired
- `400` total usage limit exceeded
- `400` per-user usage limit exceeded
- `409` promocode application already in progress
- `429` apply-promocode rate limit exceeded

## 7. Analytics query conventions

Analytics endpoints share a common query shape:

- `page`: number, default 1
- `pageSize`: number, default 20, max 100
- `sortBy`: string, endpoint-specific whitelist
- `sortDir`: `asc` or `desc`
- `dateFrom`: ISO string, optional
- `dateTo`: ISO string, optional
- endpoint-specific filters

All responses share:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalCount": 0
}
```

## 8. Users analytics

### `GET /api/v1/analytics/users`

Source of truth: ClickHouse only.

Allowed sort columns:

- `createdAt`
- `email`
- `totalOrdersCount`
- `totalOrdersAmount`
- `totalDiscountAmount`
- `totalPromoUsageCount`
- `lastOrderAt`

Allowed filters:

- `email`
- `isActive`
- `country`
- `segment`

Row shape:

```json
{
  "userId": "user_123",
  "email": "alex@example.com",
  "fullName": "Alex Morgan",
  "isActive": true,
  "createdAt": "2026-05-01T10:00:00.000Z",
  "totalOrdersCount": 12,
  "totalOrdersAmount": 980,
  "totalDiscountAmount": 140,
  "totalPromoUsageCount": 4,
  "lastOrderAt": "2026-05-05T12:05:00.000Z"
}
```

## 9. Promocodes analytics

### `GET /api/v1/analytics/promocodes`

Source of truth: ClickHouse only.

Allowed sort columns:

- `createdAt`
- `code`
- `isActive`
- `totalUsageCount`
- `totalDiscountAmount`
- `totalRevenueAffected`
- `conversionRate`
- `dateTo`

Allowed filters:

- `code`
- `isActive`
- `state`
- `discountType`
- `minUsageCount`

Row shape:

```json
{
  "promocodeId": "promo_123",
  "code": "SPRING25",
  "discountType": "PERCENT",
  "discountValue": 25,
  "isActive": true,
  "dateFrom": "2026-05-01T00:00:00.000Z",
  "dateTo": "2026-05-31T23:59:59.999Z",
  "totalUsageCount": 220,
  "totalDiscountAmount": 8450,
  "totalRevenueAffected": 49200,
  "uniqueUsersCount": 205,
  "lastUsedAt": "2026-05-05T11:59:00.000Z"
}
```

## 10. Promo usage analytics

### `GET /api/v1/analytics/promo-usages`

Source of truth: ClickHouse only.

Allowed sort columns:

- `usedAt`
- `discountAmount`
- `orderAmount`
- `finalAmount`
- `userEmail`
- `promocodeCode`

Allowed filters:

- `promocodeCode`
- `userEmail`
- `currency`
- `discountType`
- `minDiscountAmount`
- `maxDiscountAmount`

Row shape:

```json
{
  "promoUsageId": "usage_123",
  "usedAt": "2026-05-05T12:05:00.000Z",
  "promocodeId": "promo_123",
  "promocodeCode": "SPRING25",
  "userId": "user_123",
  "userEmail": "alex@example.com",
  "userFullName": "Alex Morgan",
  "orderId": "order_123",
  "orderAmount": 240,
  "discountAmount": 60,
  "finalAmount": 180,
  "currency": "USD",
  "discountType": "PERCENT"
}
```

## 11. Internal contract notes

- Command-side list endpoints may use MongoDB because they are not the analytical frontend tables defined by the task.
- Frontend analytics pages must consume only `/api/v1/analytics/*`.
- The backend exposes Swagger docs with DTO metadata, operation summaries, and example payloads.
