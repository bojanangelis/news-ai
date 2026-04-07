# NewsPlus

Apple News-style news reader. Turborepo monorepo with pnpm workspaces.

## Architecture

```
apps/
  web/        # Next.js 16 reader app — port 3000
  admin/      # Next.js 16 CMS/dashboard — port 3001
  api/        # NestJS 11 REST API — port 4000
packages/
  database/   # Prisma schema + generated client (@repo/database)
  types/      # Shared TypeScript types (@repo/types)
  ui/         # Shared React component library (@repo/ui)
```

## Commands

```bash
# Infrastructure (run first)
pnpm docker:up              # Start Postgres, Redis, MinIO

# Database
pnpm db:migrate             # Run Prisma migrations
pnpm db:generate            # Regenerate Prisma client after schema changes
pnpm db:seed                # Seed database
pnpm db:studio              # Open Prisma Studio

# Development
pnpm dev                    # Start all apps concurrently (turbo)
pnpm --filter web dev       # Start only web app
pnpm --filter api dev       # Start only API
pnpm --filter admin dev     # Start only admin

# Build / Lint
pnpm build
pnpm lint
pnpm check-types
pnpm format
```

## Environment Setup

Copy and fill in env files before first run:
- `.env.example` → `.env` (root, Docker credentials)
- `apps/api/.env.example` → `apps/api/.env`
- `apps/web/.env.example` → `apps/web/.env`
- `apps/admin/.env.example` → `apps/admin/.env`

JWT uses **RSA keypair** (not HS256). Generate:
```bash
openssl genrsa -out private.key 2048
openssl rsa -in private.key -pubout -out public.key
```
Paste keys as `\n`-escaped strings in the env file.

## API Modules

`apps/api/src/modules/`: auth, users, articles, categories, topics, authors, bookmarks, search, media, homepage, analytics, admin, stories, ads, subscription, summary, briefing

## Key Gotchas

- Prisma client output is non-standard: `packages/database/src/generated/client` (not `node_modules`)
- Import Prisma client as `@repo/database` from anywhere in the monorepo
- `apps/api` loads `.env.local` then `.env` (NestJS ConfigModule)
- Anthropic SDK (`@anthropic-ai/sdk`) is used for AI article summarization and briefings
- Meilisearch is commented out in docker-compose — not active yet (Phase 3)
- Stripe is not yet integrated (Phase 2)
