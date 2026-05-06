# Frontend Design

## 1. Product direction

This document now acts as the current frontend direction reference for the shipped app, not only as an early-stage design brief.

The UI should look like an internal fintech console used by revenue and growth operators, not a generic admin template and not an AI-themed dashboard.

Target feeling:

- calm
- precise
- premium
- compact
- trustworthy
- operational

## 2. Design principles

- Table-first analytics over card-heavy marketing visuals
- Strong information hierarchy with disciplined spacing
- Calm surfaces and high legibility
- Dense but readable data presentation
- Meaningful status and risk encoding
- Real operational states for loading, empty, error, and success

## 3. What to avoid

- Random gradient blobs
- Loud purple-on-white AI styling
- Meaningless decorative icons
- Oversized cards that hide the actual data
- Consumer-finance gamification visuals
- Client-side fake analytics or placeholder numbers

## 4. Visual language

### Tone

- Slate, graphite, sand, muted ink, and selective accent colors
- Minimal but intentional motion
- Crisp borders and subtle elevation

### Accent system

- Positive: deep emerald or teal
- Warning: amber
- Negative/risk: brick red
- Info/highlight: electric blue used sparingly

### Surfaces

- Primary workspace surface for tables
- Slightly elevated panels for filters and forms
- Sticky headers where helpful for operational scanning

## 5. Typography

- Use a more distinctive sans-serif than the default browser/system fallback where reasonable
- Headings should feel editorial and controlled, not oversized
- Numeric cells should prioritize tabular alignment and quick scanning
- Promo code identifiers should feel like instrument tickers

Typography behavior:

- section headers: concise and strong
- metric values: tabular, high contrast
- table metadata: subdued
- badges: compact uppercase or semi-condensed label style

## 6. Layout

### App shell

- Left navigation or narrow rail for core sections
- Top command bar for date range, auth context, and quick actions
- Main content area optimized for tables and detail panels

### Suggested route layout

- auth screens: minimal centered shell
- analytics pages: filter toolbar + metrics strip + table
- management pages: split between primary table and create/edit side panel or modal
- orders page: creation form near the top, list below

Current route map:

- `/login`
- `/register`
- `/app/analytics/users`
- `/app/analytics/promocodes`
- `/app/analytics/promo-usages`
- `/app/operations/promocodes`
- `/app/operations/orders`

## 7. Core UI primitives

### `AppShell`

- navigation
- page title zone
- action slot
- content container

### `MetricCard`

- small footprint
- supports delta, label, value, optional risk tone
- no vanity charts unless data is real and meaningful

### `ServerDataTable`

- sticky header support
- sortable columns
- filter row or filter popovers
- loading skeleton
- empty state
- error retry state
- pagination footer with total count

### `DateRangeControl`

- presets: Today, Last 7 days, Last 30 days, Custom
- compact presentation suitable for top toolbar

### `PromoCodePill`

- visually distinct ticker-like code chip
- active/inactive/expired states
- concise metadata support

### `StatusBadge`

- active
- inactive
- expired
- scheduled
- applied
- locked/conflict

### `EmptyState`

- clean copy
- one primary action
- no cartoon illustration required

### `ErrorState`

- concise explanation
- retry action
- optional request context when useful

## 8. Page-specific direction

### Users analytics

- emphasize user value and discount exposure
- columns should highlight order count, gross revenue, discount total, promo usage count
- allow fast scanning for high-discount/high-value users

### Promocode analytics

- codes should feel like financial instruments or campaign tickers
- emphasize usage, discount spend, revenue touched, activity window, active status
- expired or overexposed campaigns should be visually obvious

### Promo usage ledger

- ledger-like history table
- time, user, code, order amount, discount, net amount
- emphasize trust and auditability

### Promocode management

- concise forms
- readable validation
- clear lifecycle state

### Orders page

- lightweight order creation flow
- clear separation between creating an order and applying a promocode
- resulting discount outcome should be obvious

## 9. Interaction guidelines

- All analytics controls should drive server requests, not in-memory transforms
- Loading states should preserve layout stability
- Toasts should be informative and short
- Destructive or risky actions should confirm intent when appropriate
- Token expiration should redirect or log out cleanly

## 10. Responsive behavior

- Desktop-first because this is an internal console
- Mobile should remain usable for inspection and simple actions
- Tables may collapse lower-priority columns or allow horizontal scrolling on smaller screens

## 11. Suggested design tokens

These are starting points, not mandatory exact values.

```text
Background: #f4f1ea
Surface: #fbfaf7
Surface Strong: #f0ece3
Border: #d8d1c4
Text Primary: #1d2430
Text Secondary: #5e6875
Positive: #0f8a6a
Warning: #c58a12
Negative: #b6453c
Info: #1463ff
```

## 12. UX acceptance checklist

- The app does not look like a generic starter dashboard.
- Tables are the primary analytical interface.
- Status and risk indicators are easy to scan.
- Every data view has loading, empty, and error states.
- Promo codes read as operational assets, not just plain text labels.
