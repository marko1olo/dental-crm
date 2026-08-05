---
paths:
  - "apps/api/src/db/**"
  - "apps/api/drizzle/**"
  - "apps/api/src/scripts/**"
---

# DENTE database layer

Canonical law is `.agents/AGENTS.md`; schema registry is `.agents/DATABASE.md`.

Engine reality. The engine facts below were verified 2026-07-27 and **re-verified 2026-08-06**; the
data-directory line was found wrong on 2026-08-06 and is corrected here. Trust this over any doc that
says otherwise, and note which claim carries which date:

- Native **PostgreSQL 18.4** over TCP on `127.0.0.1:5432` (version read from the running server
  2026-08-06). `apps/api/src/db/client.ts` uses `drizzle-orm/node-postgres` with
  `new pg.Pool({connectionString: DATABASE_URL})`.
- `DATABASE_URL` comes from the repo-root `.env` and is mandatory — the client throws if unset. Never
  reintroduce a hardcoded connection-string default; that is both an anti-hardcode violation and the
  reason a missing env used to fail late with a confusing "relation does not exist".
  **One such default still exists**: `apps/api/src/scripts/migrateStateToDb.ts:16`. It is a defect, not a
  precedent, and it sits in the destructive seeder.
- **CORRECTED 2026-08-06 — `apps/api/dente-db` is NOT the data directory.** This rule previously called
  it "that server's DATA DIRECTORY (`PG_VERSION` 18, live `postmaster.pid`)". It is a leftover PGlite
  directory: its `postmaster.pid` holds PID `-42` and the path `/pglite/data`, both literal PGlite
  constants, and its `base/` contains only the three template OIDs — `dental_crm` was never there. The
  `PG_VERSION` file reading `18` is what let the wrong claim survive review. **The live data directory is
  `.data/pg18`** at the repo root: its `postmaster.pid` PID matches the process `netstat` shows listening
  on 5432, and its `base/` holds the extra OID that is `dental_crm`.
- `@electric-sql/pglite` is not installed and is in no `package.json`. `node_modules/@electric-sql/`
  exists but is an **empty directory, 0 files** — not an installation.
- **The server binaries are undeclared and `npm ci` removes them.** PostgreSQL 18.4 `postgres.exe` /
  `initdb.exe` / `pg_ctl.exe` come from `node_modules/@embedded-postgres/windows-x64/native/bin/`, but
  `embedded-postgres` is in no `package.json` and not in `package-lock.json` (`npm ls` → `extraneous`).
  `npm ci` rebuilds from the lockfile and will delete it, leaving no way to start the database. Prefer
  `npm install`. There is **no `psql.exe`** in that package — run SQL through `node` + the `pg` package.
- Stale alternates that are NOT the live path: the `postgres:16-alpine` service in `docker-compose.yml`
  (different major version — do not start it against this data dir). `src/scripts/seedPglite.ts` stood
  here too; it and `src/scripts/setup-fresh-db.ts` were **deleted 2026-08-06** as dead PGlite-era code
  (zero `package.json` entries, zero importers, excluded from the build).

**Row-Level Security is live (measured 2026-08-06).** 148 tables in `public`, 147 with `rowsecurity`,
147 with `relforcerowsecurity`, 147 `tenant_isolation` policies, none with a NULL `WITH CHECK`; only the
`_dente_migrations` ledger is outside the perimeter. `FORCE` is load-bearing: the app connects as role
`dental`, which owns all 148 tables, and a table owner bypasses RLS without it. Tenant context arrives as
`set_config('app.current_tenant', …)` inside the request transaction (`apps/api/src/db/rls.ts`). `USING`
honours an `app.superuser_bypass` escape; `WITH CHECK` does not, so writes can never cross tenants. A new
table needs `ENABLE` + `FORCE` + a policy with both clauses **in the same migration**. Full detail:
`.agents/DATABASE.md`.

Migrations: a migration is complete only as `.sql` + ledger entry + proof against the database. The
runner is custom (`apps/api/src/scripts/migrate.ts`), globs `apps/api/drizzle/*.sql` and sorts on the
leading ordinal; it **does not read `meta/_journal.json`** (that journal is a stale partial index — 34
entries, 17 matching a real file, 113 files absent from it, measured 2026-08-06). Counts move daily —
measure with `fd` rather than quoting a number. Schema changes go through migrations, never a live
hand-edit. Enforce tenant/organization isolation on every query and index every foreign key.
