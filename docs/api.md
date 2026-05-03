# API Documentation

## Base URL
`/api`

## Key endpoints
- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/tenders`
- `GET /api/tenders/watchlist`
- `POST /api/tenders/watchlist`
- `POST /api/tenders/:id/track`
- `POST /api/tenders/:id/untrack`
- `GET /api/notifications`

## Auth
Send `Authorization: Bearer <token>` on protected routes.
