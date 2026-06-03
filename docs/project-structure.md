# Project Structure

This app keeps the Next.js `app` directory focused on routing and framework files. Page UI belongs in `src/sections`, while reusable shared UI belongs in `src/components`.

## Route Files

Use `src/app` only for route segments, layouts, route handlers, and thin page wrappers.

```text
src/app/
  (auth)/login/page.tsx
  (auth)/register/page.tsx
  (protected)/page.tsx
  (protected)/home/page.tsx
  auth/callback/route.ts
```

Route groups such as `(auth)` and `(protected)` organize layouts without changing the URL.

## Sections

Put page-specific UI in `src/sections/<section>`.

```text
src/sections/
  auth/
    views/login.tsx
    views/register.tsx
  home/
    views/index.tsx
```

The main page container for a section goes in that section's `views` folder. Use `index.tsx` for the section's main screen, and descriptive names for other screens such as `login.tsx`, `register.tsx`, `edit.tsx`, or `list.tsx`.

If a component is only used by one section, place it directly in that section folder:

```text
src/sections/home/post-card.tsx
src/sections/home/feed-composer.tsx
```

## Shared Components

Use `src/components` for reusable app components. Keep shadcn/ui generated primitives in `src/components/ui`.

```text
src/components/
  app-logo.tsx
  user-menu.tsx
  ui/
    button.tsx
    card.tsx
```

## Auth And Services

Server actions and shared service logic should live outside `app` when they are reused across routes.

```text
src/lib/auth/actions.ts
src/lib/supabase/server.ts
src/lib/supabase/client.ts
```

Protected route access should happen in the page or data-loading helper that needs it, close to the route/data being protected. The root route `/` is the protected home screen, and `/home` redirects back to `/` so the browser URL stays clean.
