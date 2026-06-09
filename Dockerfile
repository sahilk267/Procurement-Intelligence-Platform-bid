FROM node:24-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
RUN apk add --no-cache postgresql-client
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY . .
RUN pnpm install --no-frozen-lockfile

# Initialize database schema and seed data
RUN pnpm --filter @workspace/db run push || true
COPY database/seeders/seed.sql /tmp/seed.sql

EXPOSE 8080
CMD ["sh", "-c", "until pg_isready -h db -p 5432; do echo 'Waiting for database...'; sleep 1; done; pnpm --filter @workspace/db run push && psql \"$DATABASE_URL\" < /tmp/seed.sql && pnpm --filter @workspace/api-server run dev"]