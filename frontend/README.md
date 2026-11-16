# GCash Ledger Frontend

Responsive React application built with Vite and Tailwind CSS. The client calls the Express REST API through Vite's same-origin development proxy and never reads or stores the HttpOnly authentication cookie.

## Run locally

1. Configure the Express backend from `../backend/.env.example`, including its private Supabase PostgreSQL connection and JWT secret. Start it from `backend/` with `npm install` and `npm run dev`.
2. From `frontend/`, run `npm install` and `npm run dev`.
3. Open the URL printed by Vite. The proxy targets `http://localhost:8081` by default; set `VITE_API_TARGET` in `.env` only to override that API origin.

## Checks

- `npm test`
- `npm run lint`
- `npm run build`

API contracts and backend configuration are documented in [../backend/API.md](../backend/API.md) and [../backend/README.md](../backend/README.md).
