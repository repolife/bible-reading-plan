# Supabase Configuration

This directory contains the Supabase CLI project, including database migrations, schema definitions, and edge functions.

## 📂 Structure

- `migrations/`: SQL migration files for database schema versioning.
- `functions/`: Supabase Edge Functions (Deno-based).
- `config.toml`: CLI configuration for local development.

## 🛠 Local Development

To start the local Supabase stack:

```bash
pnpm start
```

This requires Docker to be running. Once started, you can access the Supabase Studio locally (usually at `http://localhost:54323`).

## 🧪 Testing

Run the Supabase test suite:

```bash
pnpm test
```

## 🚀 Deployment

Migrations and functions are automatically deployed via CI/CD (usually linked to the `main` branch) or can be pushed manually via the CLI:

```bash
supabase db push
supabase functions deploy <function_name>
```

---

> [!IMPORTANT]
> Always run `pnpm test` before pushing new migrations to ensure schema integrity.
