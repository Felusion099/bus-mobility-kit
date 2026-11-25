# Dependency Policy

## 1. Purpose

Govern package dependency changes in this monorepo.

## 2. Rules

- Use pnpm (v12 workspaces) as the package manager.
- Lockfile (`pnpm-lock.yaml`) must be committed with dependency changes.
- Run `pnpm install` after adding/removing dependencies.
- Review new dependencies for license and security.

## 3. Python

Use `uv` for offline batch data pipelines (reserved).
