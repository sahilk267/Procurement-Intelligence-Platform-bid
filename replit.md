# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Application: ProcureIntel

Procurement Intelligence Platform — React+Vite frontend, Node.js+Express backend, PostgreSQL+Drizzle ORM.

### Authentication
- JWT auth (base64-encoded JSON, custom sha256 hash — NOT bcrypt)
- Roles: `company_owner`, `viewer` (DB schema); UI admin check uses `["company_owner","admin","super_admin","manager"]`
- Demo login: `admin@demo.com` / `demo1234`
- API server: port 8080; Vite proxies `/api`

### Important Notes
- `lib/api-client-react` is generated — do NOT re-run codegen
- Pre-existing TS errors (TS6305, TS7006) from generated API client do not affect Vite build
- Settings page uses fields: `companyName`, `gstNumber`, `panNumber`, `yearsOfExperience`, `certifications`, `categories`

### Pages & Features

| Route | Description |
|---|---|
| `/dashboard` | KPI overview, pipeline summary |
| `/notifications` | Alert center: tender deadlines, doc expiry, stale bids |
| `/tenders` | Tender discovery and pipeline |
| `/bids` | Bid pipeline with stage tracking |
| `/bids/compare` | 5-dimension bid scoring + radar chart + recommendation |
| `/proposals` | Proposal management |
| `/analysis` | AI analysis |
| `/eligibility` | Tender eligibility checker |
| `/boq` | Bill of Quantities intel |
| `/competitors` | Competitor tracking |
| `/clarifications` | Tender clarifications |
| `/documents` | Document vault with expiry alerts |
| `/knowledge` | Knowledge base |
| `/calendar` | Procurement calendar |
| `/vendors` | Vendor/OEM directory |
| `/suppliers` | Supplier matching with scoring algorithm |
| `/admin` | Admin panel (role-gated: company_owner/admin/super_admin/manager) |
| `/settings` | Company/profile settings |

### API Routes (Express — `/api/*`)

| Route | Description |
|---|---|
| `/api/auth` | Login, register, profile |
| `/api/tenders` | Tender CRUD |
| `/api/bids` | Bid pipeline CRUD |
| `/api/documents` | Document vault with expiry enrichment |
| `/api/notifications` | Aggregated alerts: tender deadlines (7d), doc expiry (30d), stale bids (14d) |
| `/api/vendors` | Vendor/OEM directory |
| `/api/analytics` | Dashboard analytics |
| `/api/admin` | Admin panel data (role-gated) |
| `/api/proposals`, `/api/boq`, `/api/eligibility` | Feature-specific routes |
| `/api/analysis`, `/api/competitors`, `/api/clarifications` | Intelligence routes |
| `/api/calendar`, `/api/knowledge`, `/api/amendments` | Resource routes |

### Notifications System
- **Backend** (`/api/notifications`): Aggregates 3 alert types per tenant:
  - Tender deadlines: open tenders closing within 7 days → severity: urgent (≤2d), warning (≤5d), info (≤7d)
  - Document expiry: expired docs → urgent; expiring within 30d → urgent (≤7d), warning (≤14d), info (≤30d)
  - Stale bids: non-terminal bids (not won/lost/no_bid) unchanged for 14+ days → warning (21+d), info
- **Frontend**: Notification bell in header with red badge count, 5-item preview dropdown; full `/notifications` page with tabs (All/Urgent/Tenders/Documents/Bids) + 4 summary cards
- **Documents page**: Updated to show expiry alerts correctly using actual API fields (`name`, `fileName`, `category`, `expiryDate`)
- Polls every 60 seconds via `useNotifications` hook

### Bid Comparison (`/bids/compare`)
- Select up to 3 bids to compare
- 5-dimension scoring engine: Price (30pts), Timeline (25pts), Risk (20pts), Opportunity (15pts), Readiness (10pts)
- Radar chart overlay, detailed score table, winner recommendation with confidence level
- "Compare Bids" button on `/bids` page; "Bid Comparison" in sidebar

### Supplier Matching (`/suppliers`)
- Algorithm scores vendors: category match (50pts), OEM type (20pts), rating (20pts), contact completeness (10pts)
- 3 tabs: Smart Matching, Directory, By Category

### Admin Panel (`/admin`)
- Role-gated; 8 KPI cards, 4 analytics charts, 4 management tabs (Tenders, Vendors, Bids, Analytics)

### Seeded Data
- 6 bids (stages: lost, identification, won, submitted, evaluation, bid_prep)
- Multiple documents with various expiry dates (some expiring soon for alert testing)
