# Agents

## Cursor Cloud specific instructions

### Project overview

Tradie Toolbelt is a trade/construction business management SPA with two services:

| Service | Port | Stack | Purpose |
|---------|------|-------|---------|
| **Frontend** | 8080 | Vite + React + TypeScript + Tailwind + shadcn/ui | Main SPA (pipeline, CRM, quoting, invoicing) |
| **Backend** | 8000 | FastAPI (Python) | AI quote extraction (`/ai/quick-quote-extract`) and health check |

### Running services

- **Frontend dev server:** `npm run dev` (from repo root, serves on port 8080)
- **Backend dev server:** `uvicorn main:app --host 0.0.0.0 --port 8000` (from `backend/` directory)
- The app works in **demo mode** without any environment secrets — data is stored in browser `sessionStorage`.
- Production/authenticated mode requires Supabase credentials in `.env` (see `.env.example`).
- The backend AI endpoint requires `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_KEY` environment variables. Without them, the backend still starts and `/health` returns `{"status":"ok","db":"not_configured","ai":"not_configured"}`.

### Standard commands (see `package.json`)

- **Lint:** `npm run lint` (ESLint; pre-existing `@typescript-eslint/no-explicit-any` warnings exist in the codebase)
- **Test:** `npm run test` (Vitest, single test file at `src/test/example.test.ts`)
- **Build:** `npm run build` (Vite production build)

### Caveats

- The frontend Supabase client (`src/lib/supabase.ts`) has hardcoded fallback URL and anon key, so the app starts without `.env` values being set.
- The `bun.lock` file exists in the repo but npm is the canonical package manager (use `package-lock.json`).
- Vite dev server binds to `::` (IPv6 all interfaces) on port 8080.
