# 🗄️ DENTE Dental CRM — Database Engine & Schema

This document details the database architecture, migration mechanism, and table directory.

> **Corrected 2026-07-28.** Everything above the table registry previously described **PGlite** — an
> in-process, file-based engine with "no network ports (e.g. 5432)". That was wrong, and it was wrong in
> the most damaging way: an agent ordered to read this document complete was told not to look for a port
> that the application in fact requires. Every statement below was verified by reading
> `apps/api/src/db/client.ts` and `apps/api/src/scripts/migrate.ts` on disk, not recalled.
> Root `AGENTS.md:9`, `.cursorrules:30` and `.claude/rules/dente-database.md` already had this right.
> `.agents/AGENTS.md:7` still carries the stale PGlite claim and is the next line to fix.

---

## ⚙️ Core Engine: native PostgreSQL

DENTE runs against a **normal, network-connected PostgreSQL server** (PostgreSQL 18 on this host),
reached over TCP at `127.0.0.1:5432`.

*   **Client setup (`apps/api/src/db/client.ts`, 45 lines) — the actual code:**
    ```typescript
    import { drizzle } from "drizzle-orm/node-postgres";
    import pg from "pg";
    export const pool = new pg.Pool({ connectionString: requireDatabaseUrl() });
    export const db = drizzle(pool, { schema });
    ```
*   **`DATABASE_URL` is required and has NO default.** `requireDatabaseUrl()` throws at boot if it is
    unset or blank. This is deliberate: a hardcoded fallback connection string used to live here, which
    violated the anti-hardcode rule and made a misconfigured app fail late, on the first query, with a
    confusing "relation does not exist" instead of failing immediately with the real cause.
*   **Env loading is not `dotenv/config`.** `loadAdditionalServerEnv()` walks up to the repo root,
    because `DATABASE_URL` lives in the ROOT `.env`, not `apps/api/.env`. `db:migrate` uses the same
    loader, so the app and the migrator always agree on the target database.
*   **`registerMoneyTypeParsers()` runs BEFORE the pool is created.** Without it, `numeric` columns
    arrive as JavaScript strings: sums concatenate instead of adding, comparisons run as text, and
    `z.number()` schemas reject valid data. See `apps/api/src/db/moneyTypeParsers.ts`. Do not remove or
    reorder that call.

### 🚫 PGlite is NOT used and NOT installed
*   `@electric-sql/pglite` appears in **no `package.json`** in this monorepo (verified 2026-07-28).
*   `apps/api/drizzle.config.ts` still declares `driver: "pglite"`. It is stale and it is why
    `db:generate` must not be trusted — see below.
*   `apps/api/src/services/syncEngine.ts` imports `@electric-sql/pglite` and `@electric-sql/pglite-sync`,
    neither of which is installed. It is dead code, excluded from typecheck at `apps/api/tsconfig.json`.
*   **`apps/api/dente-db/postmaster.pid` is not evidence of anything.** It contains PID `-42` and the
    data directory `/pglite/data` — a leftover PGlite sentinel artifact, not a PostgreSQL pid file.
    Several documents have cited it as proof of the current setup. The conclusion those documents drew
    happened to be right; the evidence they cited is fake. Do not cite it.

---

## 🚀 Migrations

**The real migration runner is custom: `apps/api/src/scripts/migrate.ts`.** It reads `apps/api/drizzle/*.sql`
in numeric order, applies each in **its own transaction**, and records the filename plus a **sha256
checksum** in the ledger table **`_dente_migrations`**.

```bash
npm run db:migrate                  # apply pending migrations
npm run db:migrate:check            # dry run — show what WOULD be applied, change nothing
npm run db:migrate:baseline         # mark all files as applied (for an already-provisioned database)
npm run db:migrate -- --strict      # treat a changed checksum on an applied migration as an error
```

*   **Do NOT trust `npm run db:generate`.** `drizzle.config.ts` still targets the PGlite driver, and
    `apps/api/drizzle/meta/_journal.json` lists 28 tags that match **zero** actual `.sql` filenames —
    drizzle-kit's journal is dead in this repo. **Hand-write migration SQL.**
*   Current state: **90 `.sql` files**, numbered `0000`–`0013` and then jumping to `0061`–`0132`, with
    four duplicated ordinals. Check the real maximum with `fd` or `ls` before choosing a new number;
    do not assume the count equals the highest ordinal.
*   **A migration is complete only as `.sql` + ledger entry + proof against the database**
    (`.agents/AGENTS.md` §8b). Run `db:migrate:check` before `db:migrate`, and quote both.

### Seeding / reset
```bash
npm run db:reset-seed               # apps/api/src/scripts/migrateStateToDb.ts
```
Requires `DENTAL_ALLOW_DESTRUCTIVE_DB_RESET="YES"` in the environment. **Never run it against anything
but a local throwaway database.**

---

## 📋 Core Table Registry (`apps/api/src/db/schema.ts`)

`schema.ts` is 2,505 lines and declares 122 `pgTable` + 44 `pgEnum`; with `communicationsSchema.ts` and
`patientsSchema.ts` the total is **125 tables**. It is a monolith — read the region you need, not the
whole file. This registry is an orientation aid, not the source of truth; `schema.ts` is.

| Table Name | Description | Key Fields / Relations |
| :--- | :--- | :--- |
| `organizations` | Tenant organizations (clinics group) | `id`, `name`, `loginId`, `passwordHash` |
| `clinics` | Individual physical clinic addresses | `id`, `organizationId` (ref `organizations`) |
| `users` | Staff members (doctors, admins, owners) | `id`, `role`, `pinCodeHash` (auth by pin code) |
| `patients` | Patient directory | `id`, `phone`, `firstName`, `lastName`, `status` |
| `appointments` | Scheduled patient visits on chairs | `id`, `patientId`, `clinicId`, `status` |
| `visit_diaries` | Medical diaries written by doctors | `id`, `patientId`, `visitStatus` (`draft` \| `signed`) |
| `payments` | Financial transactions recorded | `id`, `patientId`, `amount`, `paymentMethod` |
| `patient_invoices` | Patient bills generated for services | `id`, `patientId`, `totalAmount`, `status` |
| `treatment_plans` | Global dental treatment plans | `id`, `patientId`, `title` |
| `denteTelegramBotConfigs` | Chatbot credentials for organizations | `id`, `botToken`, `botUsername`, `status` |
| `denteTelegramLinkCodes` | Active codes for linking Telegram accounts | `code`, `patientId`, `status` |
| `imaging_studies` | DICOM/imaging metadata linked to patients | `id`, `patientId`, `studyInstanceUid` |
| `crm_leads` | Marketing / incoming request funnel leads | `id`, `phone`, `status`, `organizationId` |

---

## 🚨 Database Rules for Agents

1.  **Drizzle types:** use `eq`, `and`, `or`, `ilike` from `drizzle-orm` rather than raw SQL strings
    wherever possible. Never build a `WHERE` clause by string-interpolating ids.
2.  **Explicit organization gating:** every query MUST filter by `organizationId` (except global tenant
    authentication), or data leaks between clinics. This rule survived the engine correction unchanged
    and is the most frequently violated rule in this repo.
3.  **Money:** amounts are exact to the kopeck (`.agents/AGENTS.md` §8b). Check the column type before
    writing money code — the repo has been migrating integer-rouble columns toward kopeck precision
    (`apps/api/drizzle/0131_payments_amount_kopecks.sql`), so different tables may not agree yet.
    Confirm the live column type instead of assuming either representation.
4.  **Read-only tables are a known defect class, not a feature.** Roughly 65 `db/*Query.ts` modules are
    one-function SELECTs against tables that **nothing ever writes to**, so they return empty forever
    and the widgets above them render empty forever. Before building on such a module, grep for
    `db.insert(` on its table. If there is no writer, the honest options are to make it real or to
    delete it — never to ship a panel that cannot ever have data.
5.  **Never run `db:reset-seed` against a database you care about.** It is destructive by design.
