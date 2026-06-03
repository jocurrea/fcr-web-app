# Git Workflow

This project uses two long-lived branches.

```text
main      production-ready code
staging   active integration and testing branch
```

New feature work should be built from `staging` and merged back into `staging` first. After changes have been tested and are ready to go live, merge `staging` into `main`.

## Typical Flow

```bash
git switch staging
git switch -c feature/my-feature
```

After the feature is ready:

```bash
git switch staging
git merge feature/my-feature
```

After staging is approved for release:

```bash
git switch main
git merge staging
```

Environment variables still control which Supabase project the app talks to. Branches are for development workflow; `.env.staging`, `.env.production`, and deployment platform settings decide the runtime environment.
