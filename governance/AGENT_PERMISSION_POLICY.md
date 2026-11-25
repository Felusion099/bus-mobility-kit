# Agent Permission Policy

## 1. Purpose

Define what agents may and may not do in this repository.

## 2. Allowed

- Read any file in the repository.
- Create commits on non-protected branches.
- Open pull requests against `main`.
- Run CI checks locally.

## 3. Restricted

- No direct pushes to `main` (branch protection).
- No force pushes.
- No modifying governance files without approval.
- No committing secrets, tokens, or credentials.

## 4. File Ownership

See `coordination/FILE_OWNERSHIP.md` for per-file ownership rules.
