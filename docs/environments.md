# Environments

This app uses separate Supabase environments for staging and production. The environment files with real values are intentionally ignored by git.

```text
.env.staging
.env.production
.env.local
```

Tracked examples live at the project root:

```text
.env.staging.example
.env.production.example
.env.example
```

## Switching Locally

Use these scripts to copy the target environment into `.env.local`:

```bash
npm run env:staging
npm run env:production
```

Run the app with the active `.env.local`:

```bash
npm run dev
```

Or switch and run in one command:

```bash
npm run dev:staging
npm run dev:production
```

## Local Auth Redirects

For current local development, the staging Supabase project should be configured for localhost first.

```text
Site URL:
http://localhost:3000
```

Redirect URLs:

```text
http://localhost:3000/auth/callback
http://localhost:3000/*
flightcrew://*
```

The root route `/` is the protected home screen. `/home` is supported as an alias, but redirects back to `/` after authentication so the browser URL stays clean.

## Hosted Auth Redirects

When the staging and production web domains are finalized, add their callback URLs to Supabase.

```text
https://your-staging-domain/auth/callback
https://your-production-domain/auth/callback
```

If this app takes over password reset or email-change flows, add those URLs for each deployed domain too.
