# GCash Ledger API

The backend is an Express.js service using Node.js ES modules and `pg` to connect to Supabase PostgreSQL. Database access and authentication secrets stay on the server; the React frontend calls the REST API through Vite during local development.

## Local development

1. Configure `backend/.env` from `.env.example` with the Supabase PostgreSQL connection string, TLS setting, a Base64 encoded `JWT_SECRET_BASE64` containing at least 32 random bytes, and optional first administrator bootstrap credentials. Keep `.env` private.
2. From `backend/`, run `npm install` and `npm run dev`.
3. From `frontend/`, run `npm install` and `npm run dev`. The Vite proxy targets `http://localhost:8081`; override `VITE_API_TARGET` only if the Express server uses another address.

The versioned PostgreSQL schema is in `migrations/`. Back up the target database, verify the project and current schema, and apply pending migrations through the Supabase migration workflow chosen by the operator. This repository does not include or run a migration tool, does not verify which migration version is applied, and does not automatically migrate a remote database during server startup. Do not apply the initial schema to a populated project without a separately reviewed migration plan.

## Configuration

See `.env.example` for server variables. When the Supabase root CA is not already trusted by Node, download the certificate from the project's Database Settings → SSL Configuration and set `DATABASE_SSL_CA_FILE` to that actual local certificate file. The pool loads that CA and continues to enforce `rejectUnauthorized: true`; it does not disable certificate or hostname verification. Never expose database credentials, JWT secrets, or bootstrap passwords to the frontend.

For production, set `NODE_ENV=production`, `DATABASE_SSL=true`, and `CORS_ORIGINS` to the deployed frontend's HTTPS origin(s). Production startup rejects disabled PostgreSQL TLS, explicitly disabled secure cookies, or non-HTTPS CORS origins. `AUTH_COOKIE_SECURE` defaults to true in production and must not be overridden to false.

## Security and API

- `auth_token` is an HttpOnly, `SameSite=Strict`, one-day cookie; production cookies are Secure. State-changing requests require the CSRF cookie/header pair from `GET /auth/csrf`.
- JWTs use HS256 and an administrator authentication version. Logout and password changes invalidate prior tokens.
- Passwords use bcrypt. Bootstrap inserts an administrator only when no administrator exists. There is no public registration or recovery endpoint.
- Login attempts are limited by username and IP. Configure `TRUST_PROXY_HOPS` only for the actual trusted proxy chain.
- Money is integer centavos. Values are returned as JSON numbers within JavaScript's safe range and digit strings when larger. Timestamps are UTC; reporting uses `Asia/Manila` business dates.

Endpoint and request details are documented in [API.md](./API.md).

## Recover administrator access

There is no public password recovery endpoint. If locked out, run `npm run reset-admin-password` from `backend/`. The script prompts locally for the admin username and new password, updates only that admin's bcrypt hash, invalidates existing sessions, and clears only that username's failed-login lockout entries. It requires the configured Supabase connection and does not print the password.

## Checks

Run backend unit tests with `npm test` from `backend/`. Run frontend checks with `npm test`, `npm run lint`, and `npm run build` from `frontend/`. A database connection check requires valid Supabase credentials and should use the intended project.
