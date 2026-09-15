# Plugin Project Manager

Internal app for Plugin to move work through teams and sub-teams with readable IDs and file handoffs.

## Apps

- `apps/api` — NestJS API (`http://127.0.0.1:3001/api/v1`)
- `apps/web` — Next.js app (`http://localhost:3000`)

## Local setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
docker compose up -d
pnpm --filter @plugin/api prisma:migrate
pnpm --filter @plugin/api seed:admin
pnpm dev
```

PostgreSQL runs on `localhost:5433` so it does not collide with a local Postgres on 5432.

Swagger: `http://127.0.0.1:3001/api/v1/docs`
