# Contributing

## Branches

- `main`: stable, only receives merges from `dev` after the full test suite passes. Never commit to it directly.
- `dev`: integration branch. Feature PRs target `dev`.
- `feature/auth-users`, `feature/projects-documents`, `feature/realtime-ai`: one per area. Create new branches as `feature/<topic>` or `fix/<topic>` from `dev`.

## Workflow

1. `git switch dev && git pull`, then branch off it.
2. Commit small, focused changes with [Conventional Commits](https://www.conventionalcommits.org/) (`feat(auth): add password reset`).
3. Run `pnpm lint && pnpm test && pnpm build` before pushing.
4. Open a PR into `dev`; the author reviews their own diff, resolves conflicts, and merges once checks pass.
5. When `dev` is verified end to end, open a PR `dev` → `main`.

## Identity

Commit with your own name and the email linked to your GitHub account, and push using your own account. Do not commit as someone else.

## Code rules

- Feature code lives in `src/module/<name>/` with a `dto/` folder (and `entities/` where needed).
- Validate every input with a DTO (class-validator) and document it with Swagger decorators.
- Never commit secrets; add new variables to `.env.example`, `env.validation.ts` and the README table.
- Schema changes need a migration.
- ESM project: relative imports end in `.js`; never `import type` a class that Nest injects.
