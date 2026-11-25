# Database Migration Policy

## 1. Purpose

Govern schema changes in the Prisma/PostgreSQL database.

## 2. Rules

- All schema changes go through Prisma migrations.
- Migration files must be reviewed before applying.
- Test migrations from clean and supported prior states.
- Never edit production data directly.

## 3. Migration Files

Stored in `packages/backend/prisma/migrations/`.
