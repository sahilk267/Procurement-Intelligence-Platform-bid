#!/bin/sh
set -e
cp -n .env.example .env 2>/dev/null || true
pnpm install
pnpm run typecheck
pnpm --filter @workspace/scripts run setup