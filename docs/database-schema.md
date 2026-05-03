# Database Schema

## Core tables
- `tenants`
- `users`
- `tenders`
- `bids`
- `documents`
- `notifications`
- `vendors`
- `activity_logs`

## Important tender fields
- `isTracked`
- `status`
- `source`
- `category`
- `closingDate`
- `openingDate`
- `riskScore`

## Tracking flow
- Track tender: sets `isTracked = true`
- Watchlist: returns only tracked tenders
- Untrack: sets `isTracked = false`
