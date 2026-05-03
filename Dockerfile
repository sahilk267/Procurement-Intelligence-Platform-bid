FROM node:24-alpine
WORKDIR /app
COPY . .
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate && pnpm install
EXPOSE 8080
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "dev"]