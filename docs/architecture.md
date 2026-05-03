# Architecture

ProcureIntel is a monorepo with a React/Vite frontend and Express API backend.

## Components
- `artifacts/procurement-platform`: frontend app
- `artifacts/api-server`: backend API
- `lib/db`: shared database package
- `scripts`: workspace utility scripts

## Request Flow
1. Browser loads the Vite app
2. Frontend calls `/api/*`
3. Vite proxies API traffic to the Express server in development
4. API server reads from PostgreSQL via Drizzle ORM

## Notes
- Auth is token-based and stored in localStorage
- Secrets are read from environment variables
- PORT is mandatory for the API server
