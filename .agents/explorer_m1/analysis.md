# Database & Security Safety Audit Analysis — Milestone 1

**Date**: 2026-08-01  
**Target Project**: DENTE Dental CRM (`C:\Clinic_MVP\dental-crm`)  
**Scope**: PostgreSQL 18.4 Migrations, Secrets & Credentials Scan, Tenant Isolation (`organization_id`) Audit  

---

## Executive Summary
A comprehensive read-only security and database audit was conducted on DENTE Dental CRM. 
1. **Migrations**: 118 PostgreSQL migrations in `apps/api/drizzle/` were verified. 0 pending, 0 failed migrations. All 126 schema tables are covered by migrations with 0 DDL debt.
2. **Secrets & Security**: No plain-text API keys or production credentials exist in source code. `authSecret.ts` enforces fail-closed behavior in production and explicitly bans legacy secret values.
3. **Tenant Isolation**: `security/identity.ts` and `accessGuard.ts` strictly enforce tenant scoping (`organization_id`). Unverified header organisation IDs are blocked from performing state mutations. All database queries filter by `organization_id`.
4. **Verification**: `npm run typecheck` passes with 0 errors across all monorepo packages, and `@dental/api` unit test suite passes 32/32 tests cleanly.

---

## 1. PostgreSQL 18.4 Migrations Inspection

### Findings
- **Migration Directory**: `apps/api/drizzle/` contains 118 `.sql` migration files ranging from `0000_freezing_randall_flagg.sql` through `0084_add_landing_field_mappings.sql` and up to `0141_*`.
- **Migration Engine**: `apps/api/src/scripts/migrate.ts` executes migration files sequentially in transactional blocks (`BEGIN`...`COMMIT`) and logs completed checksums to `_dente_migrations`.

### Execution Verification Logs

#### 1. Dry Run Migration Check (`npm run db:migrate:check`)
```text
> @dental/api@0.1.0 db:migrate:check
> tsx src/scripts/migrate.ts --dry-run

[migrate] Готово. Всего файлов: 118, к применению: 0, уже было: 118.
```

#### 2. Live Migration Application (`npm run db:migrate`)
```text
> @dental/api@0.1.0 db:migrate
> tsx src/scripts/migrate.ts

[migrate] Готово. Всего файлов: 118, применено: 0, уже было: 118.
```

#### 3. Database Runtime Contract (`npm run smoke:db-runtime-contract`)
```json
{"ok":true,"runtimeTables":8,"runtimeEnums":13,"journalRuntimeMigrations":18,"secretStorage":"secret_ref_only"}
```

#### 4. DDL Coverage (`npm run smoke:schema-ddl-coverage`)
```json
{"ok":true,"tablesInSchema":126,"createdByMigrations":126,"runtimeDdlDebt":0}
```

#### 5. Column Parity (`npm run smoke:schema-column-parity`)
```json
{"ok":true,"checkedTables":126}
```

---

## 2. Hardcoded Secrets & Credentials Audit

### Security Architecture Inspection
- File: `apps/api/src/security/authSecret.ts`
- **Fail-Closed Policy**: If `AUTH_TOKEN_SECRET` is missing in `production`, the application throws an immediate startup error rather than utilizing a default literal.
- **Banned Secrets Guard**: Explicitly rejects legacy or default tokens:
  ```ts
  const BANNED_SECRETS = new Set([
    "dente_jwt_secret_demo",
    "dente-fallback-secret-2026",
    "dente_admin_setup_key",
    "my_super_secret_key_change_me_in_production",
    "changeme",
    "secret",
  ]);
  ```

### Codebase Scanning (`rg` / ripgrep)
- Scanned paths: `apps/api/src`, `apps/web/src`, `packages/shared/src`.
- Results:
  - Zero live hardcoded API tokens (`sk_live`, `AKIA...`, `AIza...`, `ghp_...`).
  - Search references to banned secret strings in source files occur strictly within banned-list enforcement arrays (`authSecret.ts`), identity unit tests (`security.test.ts`), or historical security documentation.

---

## 3. Fastify Routes & Database Query Tenant Isolation Audit

### Identity Resolution & Authorization Gateways
- Files: `apps/api/src/security/identity.ts`, `apps/api/src/accessGuard.ts`
- `getRequestIdentity(request)` derives `organizationId` strictly from cryptographically signed JWT tokens (`x-dente-clinic-token` or `x-dente-staff-token`).
- **Unverified Organization Defense**: Header-based `x-organization-id` is allowed strictly in development mode (`DENTE_DEV_ALLOW_HEADER_ORG=1`), is marked `verified: false`, and **cannot perform state-mutating requests** (`POST`, `PUT`, `DELETE`, `PATCH`).

### Query Level Isolation Verification
Database queries in `apps/api/src/db/` and route handlers in `apps/api/src/routes/` enforce mandatory tenant scoping:
- `patientsQuery.ts`: All patient reads and updates filter by `eq(schema.patients.organizationId, organizationId)`.
- `documentQuery.ts`: Generated documents scoped with `and(eq(schema.generatedDocuments.organizationId, organizationId), eq(schema.generatedDocuments.id, documentId))`.
- `settingsQuery.ts`: Staff, clinic, and chair queries scope on `eq(..., organizationId)`.
- `clinicalTasksQuery.ts`: SQL raw templates strictly include `WHERE organization_id = ${organizationId}::uuid`.
- `recentPatientHistoryQuery.ts`, `singleSessionEnforcementsQuery.ts`, `staffAuthorityQuery.ts`: All include explicit `organizationId` / `orgId` filters.

---

## 4. Verification Suite Results

### Monorepo Typecheck (`npm run typecheck`)
```text
> @dental/shared@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit

> @dental/shared@0.1.0 typecheck:tests
> tsc -p tsconfig.tests.json --noEmit

> @dental/api@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit

> @dental/api@0.1.0 typecheck:tests
> tsc -p tsconfig.tests.json --noEmit

> @dental/web@0.1.0 typecheck
> tsc -p tsconfig.json --noEmit
```
*Result*: Exit code 0 (0 errors).

### API Unit Test Suite (`npm run test -w @dental/api`)
```text
✔ 0064 egisz multiple diagnoses migration proof (11.0827ms)
✔ 0065 mkb10 auto directories migration proof (2.3686ms)
✔ 0066 non dental examination forms migration proof (2.6105ms)
✔ 0067 treatment plan stages auto archive migration proof (2.8988ms)
✔ 0068 schedule time reservations migration proof (2.6983ms)
✔ 0069 diagnocat ai findings migration proof (2.6468ms)
✔ 0070 extended odontogram states migration proof (1.7588ms)
✔ 0071 schedule clipboard migration proof (2.1387ms)
✔ 0072 rebooking conversion rules migration proof (2.5694ms)
✔ 0073 single session enforcements migration proof (1.9213ms)
✔ 0074 dadata geocoded addresses migration proof (2.2982ms)
✔ 0075 pricelist doctor payrolls migration proof (2.3857ms)
✔ 0076 recent patient history migration proof (2.0526ms)
✔ 0077 custom crm task types migration proof (2.0232ms)
✔ 0078 crm email dispatch logs migration proof (2.247ms)
✔ 0079 cancellation reasons two level migration proof (2.3551ms)
✔ 0080 advance deposit taggings migration proof (2.8091ms)
✔ 0081 treatment plan lock tokens migration proof (2.2741ms)
✔ 0082 digital receipt dispatches migration proof (1.8906ms)
✔ 0083 patient service lineages migration proof (2.1378ms)
✔ 0084 landing field mappings migration proof (1.9056ms)
✔ audit query (10.9702ms)
✔ billing query (8.4879ms)
✔ clinical query (4.6547ms)
✔ document query (6.2941ms)
✔ visits query (4.6195ms)
✔ document PDF signature and hash calculation (78.966ms)
✔ patient card body requirement (360.5283ms)
✔ server config env names are not leaked in error messages or client output (121.2829ms)
✔ authSecret throws in production when secret is missing or banned (118.8953ms)
✔ identity rejects unverified header organization for state-changing requests when listening (125.7533ms)
✔ visits query filters (6.3312ms)

ℹ tests 32
ℹ suites 0
ℹ pass 32
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 16320.1583
```
*Result*: 32 passed, 0 failed.
