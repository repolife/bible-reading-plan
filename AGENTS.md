# Repository Guidelines

## Project Structure & Module Organization
- Root uses `pnpm` workspaces with Turborepo; core packages live under `packages/`.
- `packages/frontend`: Vite + React app, Tailwind styles in `src/index.css`, shared components under `src/components`, state in `src/store`, utilities in `src/utils`.
- `packages/supabase`: Supabase CLI project; SQL migrations in `packages/supabase/migrations` and edge functions in `packages/supabase/functions`. Local config sits in `packages/supabase/config.toml`.
- `.env`/`env.example` files sit per package; keep secrets out of version control.

## Build, Test, and Development Commands
- Install: `pnpm install` (run at repo root).
- Dev (all): `pnpm dev` via Turbo.
- Dev (frontend only): `pnpm --filter frontend dev` serves via Vite with HMR.
- Build: `pnpm build` (or scoped `pnpm --filter frontend build` for `dist/`).
- Lint: `pnpm lint` or scoped `pnpm --filter frontend lint`.
- Supabase: from `packages/supabase`, run `pnpm start` for local stack; `pnpm test` for Supabase test suite.

## Coding Style & Naming Conventions
- JavaScript/React with ESM; ESLint (`.eslintrc.cjs`) enforces `eslint:recommended`, React, and Hooks rules. Keep components functional and hooks at top.
- Prefer 2-space indentation, double quotes (matches existing files), and descriptive names (`useAuthStore`, `FilteredReadingPlan`).
- Organize React files by feature folders; co-locate styles/assets with components when practical.
- Tailwind utilities live in markup; extract repeated combos to components instead of custom classes unless necessary.

## Testing Guidelines
- Supabase: use `pnpm --filter supabase test` before shipping migrations or functions; add SQL test cases alongside migration changes when possible.
- Frontend: automated tests are not set up yet; run lint and manual smoke via `pnpm --filter frontend dev`. Future tests should live as `*.test.jsx` under `src/**/__tests__/`.

## Commit & Pull Request Guidelines
- Follow existing conventional prefixes: `feat:`, `fix:`, `task:`, plus a short, imperative summary (`feat: add backend`, `fix: delete button to work for event page`).
- Keep commits scoped and include schema changes/migration filenames in the message when relevant.
- PRs should explain intent, list key changes, reference issues, and call out migrations or env var additions. Attach screenshots or short videos for UI work.
- Ensure lint/test checks pass and describe any remaining risks or follow-ups in the PR description.

## Security & Configuration Tips
- Never commit secrets; use `.env`/`env.local` from `env.example`, and store Supabase keys in local env or secret manager.
- When altering Supabase schema, document breaking changes and keep migrations reversible; back up shared environments first.
