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

## Auth Redirects

Supabase Google authentication must allow the callback URL for each environment.

```text
http://localhost:3000/auth/callback
https://staging--flightcrew.netlify.app/auth/callback
https://flightcrew.netlify.app/auth/callback
```

The root route `/` is the protected home screen. `/home` is supported as an alias, but redirects back to `/` after authentication so the browser URL stays clean.
