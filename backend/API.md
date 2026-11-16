# GCash Ledger API

Base URL: `http://localhost:8081`. Money values are integer centavos; timestamps are UTC ISO-8601. Report business dates use `Asia/Manila`. Application errors use `{ "timestamp": "...", "status": 400, "message": "..." }`; security errors use `{ "status": 401, "message": "..." }` or `{ "status": 403, "message": "..." }`.

## Authentication and CSRF

All routes except `GET /auth/csrf` and `POST /auth/login` require authentication. The session is an HttpOnly `auth_token` cookie with `SameSite=Strict`; it is Secure in production. Keep cookies enabled (`withCredentials: true`). First call `GET /auth/csrf`; submit the returned token in its `headerName` (`X-XSRF-TOKEN`) for every state-changing request. Login body: `{ "username": "...", "password": "..." }`. `GET /auth/me` returns `{ "username": "..." }` for the authenticated session. `POST /auth/logout` invalidates the session. `POST /auth/change-password` takes `{ "currentPassword": "...", "newPassword": "...", "confirmPassword": "..." }`; the server verifies the current bcrypt hash, rejects reuse, then invalidates the current session after success. An incorrect current password returns `400` without ending the session. There is no public registration or password recovery.

## Endpoints

### Customers

- `POST /customers` — `{ "name": "optional", "phoneNumber": "09171234567" }`; returns `201` and `{id,name,phoneNumber,createdAt}`. Phone numbers are normalized and unique.
- `GET /customers?page=0&size=20` — paginated list; filters `phoneNumber`, `name`, or generic `search` (name and phone).
- `GET /customers/{id}` — customer details.
- `PUT /customers/{id}` — update name and phone using the create body; duplicate normalized number returns `409`.
- `GET /customers/{id}/transactions` — paginated history; optional `from`, `to` ISO instants, `type`, and `status`.

### Balances and transfers

- `GET /balances` — expected balances derived from the ledger. Historical `opening_balances` values remain part of the calculation when present; otherwise balances start at zero.
- `GET /balances/opening` — legacy read-only opening snapshot, when one exists.
- `POST /balances/fundings` — requires `Idempotency-Key`; body `{ "account": "CASH", "amountCentavos": 10000, "notes": "optional" }`. `GCASH` is also supported. Additions are separate, auditable ledger events and do not count as earnings.
- `GET /balances/fundings?page=0&size=8` — paginated additions with account, amount, note, administrator, and timestamp.
- `POST /balances/transfers` — requires `Idempotency-Key`; body `{ "direction": "CASH_TO_GCASH", "amountCentavos": 50000, "notes": "optional" }`. `GCASH_TO_CASH` is also supported. Transfers are fee-free and require sufficient source balance.
- `GET /balances/transfers?page=0&size=20`, `GET /balances/transfers/{id}` — paginated history and details.
- `POST /balances/transfers/{id}/reverse` — requires `Idempotency-Key`; body `{ "reason": "required reason" }`. A transfer can be reversed once if ledger balance rules permit.

### Transactions

- `GET /transactions/fee-preview?amountCentavos=10000` — server-calculated fee `{amountCentavos,feeCentavos}`.
- `POST /transactions` — requires `Idempotency-Key`; body `{ "customerId": 1, "type": "CASH_IN", "amountCentavos": 10000, "feeMode": "ON_TOP", "referenceCode": "required", "notes": "optional" }`. `customerId` is optional and may be `null`; no customer record is created by transaction submission. Types: `CASH_IN`, `CASH_OUT`, `LOAD`; modes: `ON_TOP`, `DEDUCTED`. Fees are calculated on the server.
- `GET /transactions` — paginated history; optional `from`, `to`, `type`, `customerId`, `status`, and free-text `search` (customer name/phone/reference).
- `GET /transactions/{id}` — current transaction details.
- `POST /transactions/{id}/void` — body `{ "reason": "..." }`; void succeeds only if ledger replay remains valid.

### Reconciliation

- `POST /balances/reconciliations` — requires `Idempotency-Key`; body `{ "actualCashCentavos": 95000, "actualGcashCentavos": 105000, "notes": "optional" }`. Returns expected/actual balances, signed differences, and `SHORTAGE`, `EXCESS`, or `BALANCED`; never changes expected balances.
- `GET /balances/reconciliations?page=0&size=20` — paginated history.

### Reports

- `GET /reports/today` — Manila business date, earnings, transaction count/volume, per-type totals, expected balances, latest reconciliation, recent transfers.
- `GET /reports/earnings?from=2026-01-01&to=2026-01-31&groupBy=day` — inclusive date range, grouped by `day`, `month`, or `year`, with `CASH_IN`, `CASH_OUT`, and `LOAD` breakdown. Voided transactions are excluded.

## Idempotency

Supply a unique `Idempotency-Key` (8–128 ASCII letters, digits, `.`, `_`, `:`, or `-`) for transaction creation, balance funding, transfer creation, transfer reversal, and reconciliation creation. Keys are scoped by authenticated admin and operation. Repeating the same key and request returns the original response; reusing a key with a different request returns `409`. The idempotency record and financial operation commit or roll back together.

## Status and errors

Common responses: `400` validation/input error, `401` unauthenticated, `403` CSRF/access denied, `404` missing resource, `409` duplicate phone, idempotency mismatch, or balance conflict, `429` login throttling. Paginated responses include `{content,page,size,totalElements,totalPages}`.

## Configuration and run

Use Node.js 20 or newer. From `backend/`, install npm dependencies and run `npm run dev` or `npm start`. Configure Supabase PostgreSQL access using the server-only `DATABASE_URL` and `DATABASE_SSL`; configure `JWT_SECRET_BASE64` with Base64 encoding of at least 32 random bytes. Set `AUTH_COOKIE_SECURE` only when overriding the production default. `FEE_STEP_CENTAVOS` defaults to 50000 and `FEE_RATE_CENTAVOS` to 500. Optional first-account bootstrap uses `ADMIN_BOOTSTRAP_USERNAME` and `ADMIN_BOOTSTRAP_PASSWORD` and never replaces an existing administrator.

The versioned SQL schema is in `migrations/`. Apply pending migrations, including `002_balance_fundings.sql`, through the Supabase migration workflow selected for the project; starting the API does not apply schema changes. Keep all Supabase credentials and JWT secrets on the Express server. For Vite development, proxy `/auth`, `/customers`, `/balances`, `/transactions`, and `/reports` to `http://localhost:8081` (or set `VITE_API_TARGET`). Browser requests use cookie credentials and CSRF headers.
