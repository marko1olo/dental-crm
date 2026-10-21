# Milestone M2: Comprehensive Analysis & DB Mock Eradication Blueprint

**Target Scope**: Milestone M2 (Clinical, Imaging & Patient Suites)  
**Working Directory**: `C:\Clinic_MVP\dental-crm\.agents\explorer_m2_1`  
**Date**: 2026-08-12  

---

## Executive Summary

This document provides a line-by-line audit and refactoring blueprint for eradicating database mocks (`t.mock.method(db, ...)`) across the 7 test files assigned to Milestone M2 in `@dental/api`.

All 7 test files currently utilize in-memory mocks of Drizzle ORM operations (`db.select`, `db.insert`, `db.update`, `db.delete`, `dbRaw.transaction`). These mocks decouple the tests from real PostgreSQL behaviour, hiding schema mismatches, type casting issues (e.g. `uuid` syntax errors), and RLS policy violations (`42501`).

The goal of Milestone M2 is to replace all DB mocks with real PostgreSQL 18 operations using native test helpers:
- `withFixtureTenant(orgId, seedFn)`: Executes queries inside the RLS tenant context (`app.current_tenant`).
- `withSuperuserBypass(fn)`: Bypasses RLS (`app.superuser_bypass = 'on'`) for root org/user setup.
- `fixtureUuid("m2.<filename>", index)`: Generates deterministic, collision-free UUIDv4s (`dce70000-...`) per test file.
- `purgeFixtureOrganizations([orgId])`: Safely purges tenant data while handling append-only audit tables.
- `createTenantTestApp()`: Fastify instance equipped with RLS tenant context hooks.

---

## 1. File-by-File Mock Inventory & Entity Dependencies

### File 1: `apps/api/src/routes/dicomweb.test.ts`
- **File Location**: `apps/api/src/routes/dicomweb.test.ts` (556 lines)
- **Mock Calls**:
  - Line 134: `t.mock.method(db, "select", select);` inside `mockDb(t, fixture)`
  - Lines 150–155: `t.mock.method(dbRaw, "transaction", async (callback) => callback({ execute: ..., select }))`
- **Mocked Methods & Tables**:
  - `db.select` intercepting queries on `schema.organizations`, `schema.imagingInstances`, `schema.imagingStudies`.
  - `dbRaw.transaction` intercepting transaction handling inside `withTenantCtx`.
- **Database Entity Dependencies**:
  - `organizations` (`id`, `name`)
  - `imaging_instances` (`id`, `organizationId`, `storagePath`, `studyInstanceUid`, `seriesInstanceUid`, `sopInstanceUid`, `createdAt`)
  - `imaging_studies` (`id`, `organizationId`, `storagePath`, `studyInstanceUid`, `patientId`, `createdAt`)
- **Required Fixture Strategy**:
  - Eradicate `mockDb(t, fixture)` function completely.
  - Generate deterministic UUIDs:
    - Primary Org: `fixtureUuid("m2.dicomweb.test", 1)`
    - Secondary Org: `fixtureUuid("m2.dicomweb.test", 2)`
    - Missing Org: `fixtureUuid("m2.dicomweb.test", 99)`
  - Use `withFixtureTenant(primaryOrgId, seedFn)` to insert real `organizations` row, and optionally `imaging_instances` / `imaging_studies` rows in PostgreSQL.
  - Setup Fastify using `buildApp()`.
  - Clean up via `purgeFixtureOrganizations([primaryOrgId, secondaryOrgId])` in `before`/`after` hooks.

---

### File 2: `apps/api/src/routes/tests/imaging.test.ts`
- **File Location**: `apps/api/src/routes/tests/imaging.test.ts` (178 lines)
- **Mock Calls**:
  - Line 88: `mock.method(db, "select", () => ({ from: () => ({ where: async () => [testPatientRow] }) }))`
  - Line 93: `mock.method(db, "insert", () => ({ values: (values) => ({ returning: async () => [...] }) }))`
  - Line 160: `mock.method(db, "insert", () => { insertCalls += 1; return { values: ... } })`
- **Mocked Methods & Tables**:
  - `db.select` returning fake patient row for `getPatientsFromDb`.
  - `db.insert` returning fake study row for `commitImagingImport`.
- **Database Entity Dependencies**:
  - `organizations` (`id`, `name`)
  - `patients` (`id`, `organizationId`, `fullName`, `phone`, `status`, `createdAt`, `updatedAt`)
  - `imaging_studies` (`id`, `organizationId`, `patientId`, `kind`, `title`, `toothCode`, `region`, `sourceKind`, `sourceName`, `storagePath`, `capturedAt`, `aiSummary`)
- **Required Fixture Strategy**:
  - Replace hardcoded UUID `123e4567-e89b-12d3-a456-4266141740ff` with `fixtureUuid("m2.imaging.test", 1)`.
  - Replace Patient ID with `fixtureUuid("m2.imaging.test", 2)`.
  - Seed real `organizations` and `patients` records into PostgreSQL inside `withFixtureTenant(orgId, seedFn)`.
  - Call `commitImagingImport(orgId, input)` inside `withFixtureTenant`.
  - Assert created `imaging_studies` row by querying PostgreSQL DB directly using Drizzle `db.select().from(schema.imagingStudies)...`.
  - Purge fixtures using `purgeFixtureOrganizations([orgId])`.

---

### File 3: `apps/api/src/tests/routes/clinical.test.ts`
- **File Location**: `apps/api/src/tests/routes/clinical.test.ts` (302 lines)
- **Mock Calls**:
  - Line 96: `mock.method(db, "select", () => ({ from: () => ({ where: async () => [] }) }))` in `POST /api/clinical/rules/evaluate succeeds`
  - Line 156: `mock.method(db, "insert", () => ({ values: () => ({ returning: async () => [...] }) }))` in `POST /api/clinical/rules succeeds`
  - Line 231: `mock.method(db, "select", () => ({ from: () => ({ where: () => ({ limit: async () => [...] }) }) }))` in `PATCH /api/clinical/rules/:ruleId succeeds`
  - Line 258: `mock.method(db, "update", () => ({ set: () => ({ where: () => ({ returning: async () => [...] }) }) }))` in `PATCH /api/clinical/rules/:ruleId succeeds`
- **Mocked Methods & Tables**:
  - `db.select` for `clinicalRules`.
  - `db.insert` for `clinicalRules`.
  - `db.update` for `clinicalRules`.
- **Database Entity Dependencies**:
  - `organizations` (`id`)
  - `clinical_rules` (`id`, `organizationId`, `title`, `category`, `specialty`, `action`, `severity`, `ownerRole`, `triggerServiceIdsJson`, `requiredServiceIdsJson`, `requiresCompletedServiceIdsJson`, `blockedServiceIdsJson`, `condition`, `warningText`, `patientText`, `isActive`)
- **Required Fixture Strategy**:
  - Switch Fastify creation to `createTenantTestApp()`.
  - Replace zero UUID `00000000-0000-0000-0000-000000000000` with `fixtureUuid("m2.clinical.routes.test", 1)`.
  - Seed real `organizations` row using `withFixtureTenant`.
  - For `POST /api/clinical/rules`, send request via Fastify `inject` and verify rule creation by reading PostgreSQL.
  - For `PATCH /api/clinical/rules/:ruleId`, seed `clinical_rules` in PostgreSQL first, execute request, and assert updated state in DB.
  - Purge fixtures using `purgeFixtureOrganizations([orgId])`.

---

### File 4: `apps/api/src/tests/routes/clinicalRuleDelete.test.ts`
- **File Location**: `apps/api/src/tests/routes/clinicalRuleDelete.test.ts` (314 lines)
- **Mock Calls**:
  - Lines 138–148: `mock.method(db, "delete", () => ({ where: (condition) => ({ returning: async () => ... }) }))`
  - Lines 150–155: `mock.method(db, "select", () => ({ from: () => ({ where: async (condition) => ... }) }))`
- **Mocked Methods & Tables**:
  - Custom `boundFilter` in-memory mock for `db.delete` and `db.select` on `clinicalRules`.
- **Database Entity Dependencies**:
  - `organizations` (`ORG_A`, `ORG_B`)
  - `clinical_rules` (`RULE_IN_ORG_A`, `organizationId`, `title`, `category`, `specialty`, `action`, `severity`, `ownerRole`, `triggerServiceIdsJson`, `warningText`, `patientText`, `isActive`)
- **Required Fixture Strategy**:
  - Replace hardcoded `ORG_A` (`1111...`), `ORG_B` (`2222...`), and `RULE_IN_ORG_A` (`3333...`) with:
    - `ORG_A`: `fixtureUuid("m2.clinicalRuleDelete.test", 1)`
    - `ORG_B`: `fixtureUuid("m2.clinicalRuleDelete.test", 2)`
    - `RULE_IN_ORG_A`: `fixtureUuid("m2.clinicalRuleDelete.test", 10)`
  - Use `createTenantTestApp()` forFastify app setup.
  - Seed `organizations` for `ORG_A` and `ORG_B`, and seed `clinical_rules` for `RULE_IN_ORG_A` under `ORG_A` in PostgreSQL.
  - Execute `DELETE /api/clinical/rules/:ruleId` requests against Fastify app.
  - Verify tenant isolation in real DB: `ORG_B` request gets `404` and rule remains in DB; `ORG_A` request gets `200` and rule is deleted from DB.
  - Purge fixtures using `purgeFixtureOrganizations([ORG_A, ORG_B])`.

---

### File 5: `apps/api/src/db/tests/clinicalQuery.test.ts`
- **File Location**: `apps/api/src/db/tests/clinicalQuery.test.ts` (209 lines)
- **Mock Calls**:
  - Lines 16–26: `mockDbResponse(records)` mocking `db.select` for `evaluateClinicalRulesInDb`.
- **Mocked Methods & Tables**:
  - `db.select` on `clinicalRules`.
- **Database Entity Dependencies**:
  - `organizations` (`id`)
  - `clinical_rules` (`id`, `organizationId`, `title`, `category`, `specialty`, `action`, `severity`, `ownerRole`, `triggerServiceIdsJson`, `requiredServiceIdsJson`, `requiresCompletedServiceIdsJson`, `blockedServiceIdsJson`, `condition`, `warningText`, `patientText`, `isActive`)
- **Required Fixture Strategy**:
  - Replace `"org-1"` with `fixtureUuid("m2.db.clinicalQuery.test", 1)`.
  - Seed `organizations` row using `withFixtureTenant`.
  - For each test case, seed specific `clinical_rules` records directly in PostgreSQL inside `withFixtureTenant`.
  - Execute `evaluateClinicalRulesInDb(orgId, payload)` inside `withFixtureTenant(orgId, ...)`.
  - Purge fixtures using `purgeFixtureOrganizations([orgId])`.

---

### File 6: `apps/api/src/tests/db/clinicalQuery.test.ts`
- **File Location**: `apps/api/src/tests/db/clinicalQuery.test.ts` (58 lines)
- **Mock Calls**:
  - Line 12: `t.mock.method(db, "select", () => ({ from: () => ({ where: async () => [] }) }))`
  - Line 23: `t.mock.method(db, "select", () => ({ from: () => ({ where: async () => [{ ... }] }) }))`
- **Mocked Methods & Tables**:
  - `db.select` on `clinicalRules` in `getClinicalRules(orgId)`.
- **Database Entity Dependencies**:
  - `organizations` (`id`)
  - `clinical_rules` (`id`, `organizationId`, `title`, `category`, `specialty`, `action`, `severity`, `ownerRole`, `triggerServiceIdsJson`, `requiredServiceIdsJson`, `requiresCompletedServiceIdsJson`, `blockedServiceIdsJson`, `condition`, `warningText`, `patientText`, `isActive`)
- **Required Fixture Strategy**:
  - Replace `"org1"` with `fixtureUuid("m2.tests.db.clinicalQuery.test", 1)`.
  - Seed `organizations` row using `withFixtureTenant`.
  - Seed `clinical_rules` rows in PostgreSQL (including testing null/invalid JSON fields in DB).
  - Execute `getClinicalRules(orgId)` within `withFixtureTenant(orgId, ...)`.
  - Purge fixtures using `purgeFixtureOrganizations([orgId])`.

---

### File 7: `apps/api/src/tests/db/patientsQuery.test.ts`
- **File Location**: `apps/api/src/tests/db/patientsQuery.test.ts` (263 lines)
- **Mock Calls**:
  - Line 51: `t.mock.method(db, "select", ...)` (DB failure fault injection)
  - Line 66: `t.mock.method(db, "insert", ...)` (DB failure fault injection)
  - Line 81: `t.mock.method(db, "update", ...)` (DB failure fault injection)
  - Line 101: `t.mock.method(db, "update", ...)` (DB failure fault injection)
  - Line 121: `t.mock.method(db, "select", ...)` (Control test: happy path returning patient row)
  - Line 148: `t.mock.method(db, "update", ...)` (Control test: update returning patient row)
  - Line 179: `t.mock.method(db, "update", ...)` (Control test: update cross-tenant returning empty `[]`)
- **Mocked Methods & Tables**:
  - `db.select`, `db.insert`, `db.update` on `patients` table.
- **Database Entity Dependencies**:
  - `organizations` (`id`)
  - `patients` (`id`, `organizationId`, `fullName`, `phone`, `status`, `createdAt`, `updatedAt`)
- **Required Fixture Strategy**:
  - Replace hardcoded `ORG` and `PATIENT` UUIDs with:
    - Org 1 ID: `fixtureUuid("m2.patientsQuery.test", 1)`
    - Org 2 ID: `fixtureUuid("m2.patientsQuery.test", 2)`
    - Patient ID: `fixtureUuid("m2.patientsQuery.test", 10)`
  - Tests 1–4 (DB Failure Fault Injection): Retain `t.mock.method(db, ...)` as explicitly authorized network/DB fault injection testing error propagation.
  - Tests 5–7 (Integration Control Tests): Eradicate `t.mock.method` completely. Seed real `organizations` and `patients` in PostgreSQL using `withFixtureTenant`, and call `getPatientsFromDb`, `updatePatientInDb` directly against PostgreSQL DB.
  - Tests 8–9 (`rowToPatient` unit tests): No DB calls required.
  - Purge fixtures using `purgeFixtureOrganizations([org1, org2])`.

---

## 2. Refactoring Patterns & Blueprints

### Pattern A: Test Fixture Lifecycle Setup
```typescript
import {
    fixtureUuid,
    purgeFixtureOrganizations,
    withFixtureTenant,
    withSuperuserBypass,
} from "../../support/fixtureOrganizations.js";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";

const ORG_ID = fixtureUuid("m2.filename", 1);

before(async () => {
    await purgeFixtureOrganizations([ORG_ID]);
    await withFixtureTenant(ORG_ID, async (tx) => {
        await tx.insert(schema.organizations).values({
            id: ORG_ID,
            name: "Test Organization M2",
        });
    });
});

after(async () => {
    await purgeFixtureOrganizations([ORG_ID]);
});
```

### Pattern B: Fastify Route Testing with Tenant Context
```typescript
import { createTenantTestApp } from "../../support/tenantTestApp.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { authTokenSecret } from "../../security/authSecret.js";

const app = createTenantTestApp();
// Register routes on app...

const authHeaders = {
    "x-dente-clinic-token": signToken({ organizationId: ORG_ID }, authTokenSecret()),
};
```

---

## 3. Verification Method

Each refactored test file must be individually verified using:
```bash
node --import tsx --import ./src/tests/support/poolTeardown.ts --test apps/api/src/<path_to_file>
```

And full Milestone M2 suite check:
```bash
npm run test -w @dental/api
```

Zero DB mock check across M2 files:
```bash
rg "t\.mock\.method\(db" apps/api/src/routes/dicomweb.test.ts apps/api/src/routes/tests/imaging.test.ts apps/api/src/tests/routes/clinical.test.ts apps/api/src/tests/routes/clinicalRuleDelete.test.ts apps/api/src/db/tests/clinicalQuery.test.ts apps/api/src/tests/db/clinicalQuery.test.ts
```
Expected output: 0 matches (except fault injection tests in `patientsQuery.test.ts`).
