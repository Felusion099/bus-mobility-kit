# Exclusive Lock Policy

## 1. Purpose

Govern shared-file edits to prevent concurrent modification conflicts.

## 2. Rules

- Protected shared files have named owners.
- Shared-file edits use an atomic lock service or serialized maintainer workflow.
- Define lock expiry, renewal, release and abandoned-lock recovery.

## 3. Lock Service

See `docs/LOCK_SERVICE_REQUIREMENTS.md`.
