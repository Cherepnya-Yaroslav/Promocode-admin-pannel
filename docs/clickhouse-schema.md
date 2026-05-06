# ClickHouse Schema

This document defines the analytical read model. ClickHouse tables are intentionally denormalized so analytics endpoints can answer the frontend without joining MongoDB data.

## 1. Principles

- Analytics queries read from ClickHouse only.
- Each table receives projected data from MongoDB writes.
- Tables store human-readable fields needed by the UI.
- User input must be passed as parameters, not interpolated into SQL.
- Sort columns and filters are whitelisted in application code.

## 2. Engine choice

For this assignment, use `ReplacingMergeTree(updated_at)` with explicit primary sort keys. It keeps setup simple while allowing idempotent upserts from the API.

Current implementation uses both strategies:

- `users` and `promocodes` keep lifecycle state in columns such as `is_active`
- `orders` and `promo_usages` are physically removed from ClickHouse when a user deletes an order

## 3. Table: `users`

Purpose: user master data plus lightweight user-level aggregates for user analytics.

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | `String` | Mongo `_id` as string |
| `email` | `String` | lowercased for stable filtering |
| `first_name` | `String` | |
| `last_name` | `String` | |
| `full_name` | `String` | precomputed for UI |
| `is_active` | `UInt8` | 1 or 0 |
| `country` | `LowCardinality(String)` | optional seed/demo segmentation |
| `segment` | `LowCardinality(String)` | optional seed/demo segmentation |
| `total_orders_count` | `UInt32` | denormalized aggregate |
| `total_orders_amount` | `Decimal(12, 2)` | denormalized aggregate |
| `total_discount_amount` | `Decimal(12, 2)` | denormalized aggregate |
| `total_promo_usage_count` | `UInt32` | denormalized aggregate |
| `last_order_at` | `Nullable(DateTime64(3))` | |
| `created_at` | `DateTime64(3)` | |
| `updated_at` | `DateTime64(3)` | |

Suggested sort key:

```sql
ORDER BY (is_active, created_at, user_id)
```

## 4. Table: `promocodes`

Purpose: promocode master data and performance aggregates.

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `promocode_id` | `String` | Mongo `_id` as string |
| `code` | `String` | uppercase storage recommended |
| `description` | `String` | |
| `discount_type` | `LowCardinality(String)` | `PERCENT` or `FIXED` |
| `discount_value` | `Decimal(12, 2)` | |
| `max_discount_amount` | `Nullable(Decimal(12, 2))` | |
| `min_order_amount` | `Nullable(Decimal(12, 2))` | |
| `total_usage_limit` | `Nullable(UInt32)` | |
| `per_user_usage_limit` | `Nullable(UInt16)` | |
| `is_active` | `UInt8` | 1 or 0 |
| `date_from` | `DateTime64(3)` | |
| `date_to` | `DateTime64(3)` | |
| `total_usage_count` | `UInt32` | denormalized aggregate |
| `unique_users_count` | `UInt32` | denormalized aggregate |
| `total_discount_amount` | `Decimal(12, 2)` | denormalized aggregate |
| `total_revenue_affected` | `Decimal(12, 2)` | sum of original order amounts |
| `last_used_at` | `Nullable(DateTime64(3))` | |
| `created_at` | `DateTime64(3)` | |
| `updated_at` | `DateTime64(3)` | |

Suggested sort key:

```sql
ORDER BY (is_active, code, promocode_id)
```

## 5. Table: `orders`

Purpose: order read model and future operational analytics support.

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `order_id` | `String` | Mongo `_id` as string |
| `user_id` | `String` | |
| `user_email` | `String` | denormalized from user |
| `user_full_name` | `String` | denormalized from user |
| `amount` | `Decimal(12, 2)` | original order amount |
| `currency` | `LowCardinality(String)` | |
| `status` | `LowCardinality(String)` | `CREATED` or `PROMOCODE_APPLIED` |
| `promocode_id` | `Nullable(String)` | |
| `promocode_code` | `Nullable(String)` | human-readable |
| `discount_amount` | `Decimal(12, 2)` | |
| `final_amount` | `Decimal(12, 2)` | |
| `applied_at` | `Nullable(DateTime64(3))` | |
| `created_at` | `DateTime64(3)` | |
| `updated_at` | `DateTime64(3)` | |

Suggested sort key:

```sql
ORDER BY (created_at, order_id)
```

## 6. Table: `promo_usages`

Purpose: primary ledger table for analytical promo usage history.

This table must be self-contained enough for frontend analytics to render without external lookups.

Suggested columns:

| Column | Type | Notes |
| --- | --- | --- |
| `promo_usage_id` | `String` | Mongo `_id` as string |
| `used_at` | `DateTime64(3)` | event timestamp |
| `promocode_id` | `String` | |
| `promocode_code` | `String` | human-readable |
| `discount_type` | `LowCardinality(String)` | |
| `discount_value` | `Decimal(12, 2)` | copied from promocode at usage time |
| `user_id` | `String` | |
| `user_email` | `String` | human-readable |
| `user_full_name` | `String` | human-readable |
| `order_id` | `String` | |
| `order_amount` | `Decimal(12, 2)` | original amount |
| `discount_amount` | `Decimal(12, 2)` | actual applied discount |
| `final_amount` | `Decimal(12, 2)` | net charged amount |
| `currency` | `LowCardinality(String)` | |
| `order_created_at` | `DateTime64(3)` | useful for slicing |
| `created_at` | `DateTime64(3)` | sync row timestamp |
| `updated_at` | `DateTime64(3)` | sync row timestamp |

Suggested sort key:

```sql
ORDER BY (used_at, promocode_code, promo_usage_id)
```

## 7. Denormalization rules

### Users table

- May store aggregate fields updated after order and promo usage events.

### Promocodes table

- Stores current promocode configuration plus aggregated usage outcomes.

### Orders table

- Stores user identity fields and applied promocode label for operational readability.

### Promo usages table

- Stores both entity IDs and human-readable labels.
- Must preserve historical values at time of usage.
- Should not rely on current user/promocode names being looked up elsewhere.

## 8. Projection strategy

### On user create/update/deactivate

- Upsert one row into `users`
- If user name/status changed, optionally update denormalized user fields in `orders` and `promo_usages` only if the assignment expects current labels everywhere

### On promocode create/update/deactivate

- Upsert one row into `promocodes`

### On order create

- Upsert one row into `orders`
- Recompute and upsert the related `users` aggregate row

### On successful apply-promocode

- Upsert changed `orders` row
- Insert or upsert one `promo_usages` row
- Recompute and upsert related `users` aggregate row
- Recompute and upsert related `promocodes` aggregate row

### On order delete

- Delete the matching row from `orders`
- Delete the related row from `promo_usages` if one exists
- Recompute and upsert the related `users` aggregate row
- Recompute and upsert the related `promocodes` aggregate row if the order had an applied promocode

## 9. Retry-lite sync behavior

- Projection runs synchronously after MongoDB success.
- Retried in-process a small fixed number of times.
- Projection helpers should be idempotent.
- Cache invalidation occurs after successful projection.

## 10. Query safety guidance

- Maintain a map of API sort keys to SQL column names.
- Maintain per-endpoint allowed filters.
- Bind date values, code/email filters, pagination values, and booleans through query parameters.
- Never concatenate raw user-provided `sortBy`, `sortDir`, or filter names into SQL.

## 11. Seed data expectations

Seed data should create:

- users across multiple segments or countries
- active and inactive promocodes
- expired and future promocodes
- orders with and without applied promocodes
- promo usage history dense enough to exercise analytics pagination and sorting
