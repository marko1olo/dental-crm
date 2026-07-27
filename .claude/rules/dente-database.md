---
paths:
  - "apps/api/src/db/**"
  - "apps/api/drizzle/**"
  - "apps/api/src/scripts/**"
---

# DENTE database layer

Canonical law is `.agents/AGENTS.md`; schema registry is `.agents/DATABASE.md`.

Engine reality, verified 2026-07-27 — trust this over any doc that says otherwise:

- Native **PostgreSQL 18** over TCP on `127.0.0.1:5432`. `apps/api/src/db/client.ts` uses
  `drizzle-orm/node-postgres` with `new pg.Pool({connectionString: DATABASE_URL})`.
- `DATABASE_URL` comes from the repo-root `.env` and is mandatory — the client throws if unset. Never
  reintroduce a hardcoded connection-string default; that is both an anti-hardcode violation and the
  reason a missing env used to fail late with a confusing "relation does not exist".
- `apps/api/dente-db` is that server's DATA DIRECTORY (`PG_VERSION` 18, live `postmaster.pid`), not an
  in-process store. `@electric-sql/pglite` is not installed and is in no `package.json`.
- Stale alternates that are NOT the live path: `src/scripts/seedPglite.ts`, and the `postgres:16-alpine`
  service in `docker-compose.yml` (different major version — do not start it against this data dir).

Migrations: a migration is complete only as `.sql` + journal + snapshot, proven against a clean database.
Schema changes go through migrations, never a live hand-edit. Enforce tenant/organization isolation on
every query and index every foreign key.
