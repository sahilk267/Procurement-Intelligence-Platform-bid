FROM node:24-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY artifacts/procurement-platform/package.json artifacts/procurement-platform/tsconfig.json artifacts/procurement-platform/vite.config.ts artifacts/procurement-platform/index.html ./artifacts/procurement-platform/
COPY artifacts/procurement-platform/src ./artifacts/procurement-platform/src
COPY artifacts/procurement-platform/public ./artifacts/procurement-platform/public

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @workspace/procurement-platform run build

WORKDIR /app/artifacts/procurement-platform
EXPOSE 5173
CMD ["pnpm", "run", "serve"]
