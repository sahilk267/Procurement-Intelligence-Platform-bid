# Procurement Intelligence Platform Migration Guide

This migration guide documents how to move the Procurement Intelligence Platform to a new machine, container environment, or server without missing anything.

## 1. What is included

- Backend API: `artifacts/api-server`
- Frontend app: `artifacts/procurement-platform`
- Shared database schema and ORM: `lib/db`
- Database migrations and seed data: `database/migrations`, `database/seeders`
- Docker support: `Dockerfile`, `Dockerfile.frontend`, `docker-compose.yml`
- Environment configuration and runtime requirements

## 2. Preconditions

Required software:

- `pnpm` (recommended)
- `Node.js` 18+
- `PostgreSQL` 14+ for local/non-Docker deployment
- `Docker` & `Docker Compose` for container-based migration
- `git` for cloning the repository

> The workspace root uses a `preinstall` hook that enforces `pnpm`.

## 3. Architecture overview

- Root workspace is a pnpm monorepo
- `artifacts/api-server` is an Express + TypeScript API server
- `artifacts/procurement-platform` is a React + Vite frontend
- Database models and schema definitions live in `lib/db`
- Production build uses Docker images for frontend and backend

## 4. Migration options

### Option A: Docker Compose migration (recommended)

This is the safest migration path if the target environment supports Docker.

1. Copy repository to the target machine.
2. On the target machine, run:
   ```bash
   docker compose up --build
   ```
3. Confirm services:
   - API: `http://localhost:8080`
   - Frontend: `http://localhost`

#### Notes

- `docker-compose.yml` defines:
  - `app` service using `Dockerfile`
  - `frontend` service using `Dockerfile.frontend`
  - `db` service using `postgres:16`
- Default database URL inside containers:
  `postgresql://postgres:postgres@db:5432/procureintel`
- Default JWT secret in compose is `replace-me`; change this before production.

### Option B: Local machine migration without Docker

1. Install dependencies at repository root:
   ```bash
   pnpm install
   ```
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and set values for:
   - `PORT`
   - `NODE_ENV`
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `VITE_API_BASE_URL`
   - `INGESTION_CRON_SCHEDULE` = `0 13 * * *` for 6:30 PM IST on a UTC server (optional)
4. Initialize database and seed data.
   - Apply the schema migrations in `database/migrations`, including `0005_add_ingestion_runs.sql`.
   - If you have Drizzle push/ORM scripts configured, run the project-specific command.
   - Otherwise use SQL seed file directly:
     ```bash
     psql "$DATABASE_URL" -f database/seeders/seed.sql
     ```
5. Start backend API server:
   ```bash
   cd artifacts/api-server
   pnpm run dev
   ```
6. Start frontend app:
   ```bash
   cd artifacts/procurement-platform
   pnpm run dev
   ```
7. Open browser to the frontend URL shown by Vite.

## 5. Required environment variables

The project expects these environment variables during runtime.

### Minimum required for backend

- `NODE_ENV` = `development` or `production`
- `PORT` = e.g. `8080`
- `DATABASE_URL` = PostgreSQL connection string
- `JWT_SECRET` = a secure random secret

### Optional and recommended backend variables

- `LOG_LEVEL` = `info`, `debug`, etc.
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `FROM_EMAIL`
- `FRONTEND_URL` = URL used inside email notifications
- `INGESTION_CRON_SCHEDULE` = cron expression for daily tender ingestion; default is `0 13 * * *` for 6:30 PM IST when the server is using UTC

### Frontend environment variables

- `VITE_API_BASE_URL` = base API URL for the frontend

> `artifacts/procurement-platform/vite.config.ts` uses `PORT` and `BASE_PATH` if set.

## 6. Database migration and seeding

### Existing migration support

- SQL migrations are in `database/migrations`
- Seed data is in `database/seeders/seed.sql`

### Manual initialization

1. Ensure PostgreSQL is running.
2. Create database if needed:
   ```bash
   createdb -h <host> -p <port> -U <user> procureintel
   ```
3. Apply schema migrations or the SQL seed file.
   - Make sure the new migration `database/migrations/0005_add_ingestion_runs.sql` is applied so ingestion history is tracked.
4. Load seed data:
   ```bash
   psql "$DATABASE_URL" -f database/seeders/seed.sql
   ```

### Verification

Use `test-db.js` to verify connectivity:

```bash
node test-db.js
```

## 7. Build and deploy details

### Backend build

- `artifacts/api-server/package.json` contains:
  - `pnpm run dev`
  - `pnpm run build`
  - `pnpm run start`
- `Dockerfile` builds the root workspace and then starts the API service.

### Frontend build

- `artifacts/procurement-platform/package.json` contains:
  - `pnpm run dev`
  - `pnpm run build`
- `Dockerfile.frontend` builds the React app and serves it with nginx.
- The frontend includes an admin page with a manual ingestion button and ingestion status panel.
- Manual ingestion is available via the backend endpoint `POST /api/data-management/tenders/ingest` and status via `GET /api/data-management/tenders/ingestion-status`.

### Production notes

- Use secure values for `JWT_SECRET`.
- Use an external Postgres endpoint rather than local disk in production.
- Configure SMTP settings before sending real emails.
- If running in Kubernetes or another orchestrator, mount PostgreSQL storage and secrets securely.
- Configure `INGESTION_CRON_SCHEDULE` for the target timezone or container timezone if you want the platform to ingest at a specific daily time.
- Verify the new ingestion table and schema migration are present before manual ingestion or scheduled ingestion occurs.

## 8. Minimal migration checklist

- [ ] Copy full repository to target environment
- [ ] Install `pnpm` and `Node.js` (or use Docker)
- [ ] Set `.env` or container environment variables
- [ ] Configure `DATABASE_URL` for the new database host
- [ ] Secure `JWT_SECRET`
- [ ] Build backend and frontend or start Docker compose
- [ ] Apply database schema and load seed data
- [ ] Apply migration `database/migrations/0005_add_ingestion_runs.sql` for ingestion history
- [ ] Verify API health and frontend access
- [ ] Verify manual ingestion works via the Admin UI
- [ ] Check email/smtp if alerts are required

## 9. Common migration issues

### 1. `pnpm` not installed

- Install `pnpm` before running `pnpm install`
- root `package.json` blocks npm/yarn via `preinstall`

### 2. Database connection fails

- Confirm `DATABASE_URL` is valid
- Confirm PostgreSQL is reachable from the host/container
- Confirm the database user/password have access

### 3. JWT errors

- Set a valid `JWT_SECRET`
- Do not use `replace-me` in production

### 4. Frontend cannot reach API

- Ensure frontend base API URL is correct
- In Docker, `app` and `frontend` services are linked through compose

### 5. Email notifications fail

- Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- Confirm `FROM_EMAIL` or default sender address

## 10. Fast migration command set

### Docker-based rapid migration

```bash
git clone <repo>
cd Procurement-Intelligence-Platform-bid
docker compose up --build
```

### Local manual migration

```bash
git clone <repo>
cd Procurement-Intelligence-Platform-bid
pnpm install
cp .env.example .env
# edit .env values, including INGESTION_CRON_SCHEDULE if required
psql "$DATABASE_URL" -f database/seeders/seed.sql
# apply the new ingestion runs migration if using migrations directly
# psql "$DATABASE_URL" -f database/migrations/0005_add_ingestion_runs.sql
cd artifacts/api-server && pnpm run dev
cd artifacts/procurement-platform && pnpm run dev
```

## 11. Next steps after migration

- Verify login and tenant creation on the frontend
- Confirm tender CRUD endpoints work
- Confirm supplier and bid workflows
- Confirm manual ingestion via the Admin UI and ingestion status endpoint
- Confirm scheduled ingestion runs if `INGESTION_CRON_SCHEDULE` is configured
- Confirm alerts and notifications if email is configured
- Run any additional tests you need for your deployment environment

## 12. Cloud migration guidance

This section gives a quick reference for cloud-hosted deployments.

### 12.1 AWS

Recommended AWS path:
- Use `Amazon RDS for PostgreSQL` for the database.
- Build backend and frontend containers and deploy to `Amazon ECS` or `AWS App Runner`.
- Use `AWS Secrets Manager` for `DATABASE_URL`, `JWT_SECRET`, and SMTP credentials.
- Use `Elastic Load Balancer` or App Runner default HTTPS endpoint.
- Optional: store documents in `Amazon S3` and mount S3 bucket access in the app.
- Example service environment values:
  - `DATABASE_URL=postgresql://user:pass@rds-host:5432/procureintel`
  - `JWT_SECRET=<secure-secret>`
  - `SMTP_HOST=smtp.example.com`
  - `FRONTEND_URL=https://app.example.com`

### 12.2 Azure

Recommended Azure path:
- Use `Azure Database for PostgreSQL` for the database.
- Deploy the backend container with `Azure App Service` or `Azure Container Instances`.
- Deploy the frontend container to `Azure App Service` or use static site hosting with `Azure Static Web Apps`.
- Use `Azure Key Vault` for secrets and environment values.
- Optional: use `Azure Blob Storage` for file storage.
- Example service environment values:
  - `DATABASE_URL=postgresql://user:pass@azure-postgres:5432/procureintel`
  - `JWT_SECRET=<secure-secret>`
  - `SMTP_HOST=smtp.example.com`
  - `FRONTEND_URL=https://app.example.com`

### 12.3 GCP

Recommended GCP path:
- Use `Cloud SQL for PostgreSQL` for the database.
- Deploy backend and frontend containers to `Cloud Run` or `Google Kubernetes Engine (GKE)`.
- Store secrets in `Secret Manager` for `DATABASE_URL`, `JWT_SECRET`, SMTP and token values.
- Optional: use `Cloud Storage` for documents and asset uploads.
- Example values:
  - `DATABASE_URL=postgresql://user:pass@cloudsql-host:5432/procureintel`
  - `JWT_SECRET=<secure-secret>`
  - `SMTP_HOST=smtp.example.com`
  - `FRONTEND_URL=https://app.example.com`

### 12.4 Cloud deployment checklist

- [ ] Choose cloud provider and service type (App Service / App Runner / Cloud Run / ECS / GKE)
- [ ] Provision managed PostgreSQL
- [ ] Provision secret store for application values
- [ ] Configure environment variables in the service
- [ ] Build and publish Docker images or use Docker Compose conversion
- [ ] Enable HTTPS and set correct `FRONTEND_URL`
- [ ] Run database schema/seed initialization after deployment
- [ ] Verify health endpoints and frontend connectivity

---

For any cloud provider you choose, the key migration steps remain the same: move repository, configure environment variables, connect to Postgres, seed data, and verify the app.
