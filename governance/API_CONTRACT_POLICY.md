# API Contract Policy

## 1. Purpose

Govern changes to OpenAPI 3.1.0 contracts in `schemas/contracts/`.

## 2. Rules

- All contracts must be valid OpenAPI 3.1.0.
- Breaking changes require a major version bump.
- `pnpm contract:check` must pass on every PR.
- Frontend and backend must use the same canonical contract.

## 3. Enforcement

CI runs `pnpm contract:check` on all PRs and pushes to `main`.
