# LaTeX Collab Backend

Backend for a real-time collaborative LaTeX editor: accounts, projects and `.tex` documents, live co-editing (Yjs over Socket.IO), chat, an LLM-powered assistant, email invitations and notifications. The Next.js frontend lives in a separate repository.

**Stack:** NestJS 12 · TypeScript · PostgreSQL · TypeORM · Socket.IO · Yjs · Passport + JWT · `@nestjs-modules/mailer` · Swagger · class-validator · Vitest

## Getting started

Requirements: Node.js 22+, pnpm, PostgreSQL 14+ (Docker optional).

```bash
pnpm install
cp .env.example .env        # then fill in the values, see "Environment variables"
docker compose up -d        # PostgreSQL + MailHog (or use your own PostgreSQL)
pnpm migration:run          # create / update the schema
pnpm start:dev
```

- API: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api/docs`
- Liveness: `GET http://localhost:3000/health`
- Dev mailbox (MailHog): `http://localhost:8025`

## Database guide

TypeORM never auto-syncs the schema (`synchronize: false`). All changes go through migrations in `src/migrations/`:

```bash
pnpm migration:generate src/migrations/AddSomething   # diff entities vs. database
pnpm migration:run
pnpm migration:revert
```

Migration commands build the project first and read connection settings from `.env`. To create the database manually: `createdb -U <user> <DB_NAME>`.

## Environment variables

All variables are validated at startup (`src/config/env.validation.ts`); the app refuses to boot if one is missing or invalid. See `.env.example`.

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | no | `development` (default), `production`, `test` |
| `PORT` | no | HTTP port, default `3000` |
| `FRONTEND_URL` | yes | Frontend origin; used for CORS and links in emails |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | yes | PostgreSQL connection (port defaults to `5432`) |
| `JWT_SECRET` | yes | Signing secret, at least 32 characters |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | no | Token lifetimes, default `15m` / `7d` |
| `MAIL_HOST` `MAIL_PORT` `MAIL_FROM` | yes | SMTP server and sender |
| `MAIL_USER` `MAIL_PASSWORD` | no | SMTP credentials (omit for MailHog) |
| `LLM_API_KEY` | no | LLM provider key; AI endpoints are disabled without it |
| `LLM_BASE_URL` / `LLM_MODEL` | no | Provider endpoint and model |

## Architecture

```
src/
  main.ts            bootstrap: prefix /api, CORS, ValidationPipe, Swagger
  app.module.ts      root module
  config/            env validation, TypeORM options, migration data source
  common/            shared filters, guards, decorators
  module/<name>/     one folder per feature: controller, service, module,
                     entities/, dto/
    auth, users            accounts, JWT/Passport, email verification, password reset
    workspaces, projects,
    documents              project and .tex document management
    realtime, chat         Socket.IO gateway, Yjs sync, live chat
    ai                     LLM assistant
    notifications          persisted + pushed notifications
    mail                   shared mailer service
```

Conventions: controllers handle HTTP only, services hold the rules, DTOs validated with class-validator, every error returned in the same JSON shape (`statusCode`, `message`, `path`, `timestamp`).

## Team and ownership

| Area | Branch |
|---|---|
| Auth, users, JWT, verification, password reset | `feature/auth-users` |
| Workspaces, projects, documents, entities | `feature/projects-documents` |
| Realtime (Yjs), chat, AI, notifications | `feature/realtime-ai` |

Shared: mailer, Swagger, validation/error handling, integration tests, environment configuration.

## Scripts

`pnpm start:dev` · `pnpm build` · `pnpm lint` · `pnpm test` · `pnpm test:e2e` · `pnpm migration:run`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
