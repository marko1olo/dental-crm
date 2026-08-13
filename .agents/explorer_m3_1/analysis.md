# Milestone M3: Billing & Finance Queries Mock Eradication Analysis & Blueprint

**Target Test File**: `apps/api/src/db/tests/billingQuery.test.ts`  
**Target Query File**: `apps/api/src/db/billingQuery.ts`  
**Author**: Explorer M3 (`teamwork_preview_explorer`)  
**Date**: 2026-08-12  

---

## Executive Summary

The test file `apps/api/src/db/tests/billingQuery.test.ts` currently tests `createPaymentInDb` using Node's `node:test` `mock.method(db, "transaction", ...)` to stub database transactions. While these tests currently pass (`3 pass, 0 fail`), they do **not** interact with the live PostgreSQL database and rely entirely on mock objects (`stubTransaction`). Furthermore, `billingQuery.ts` exports 7 other database helper functions that currently have zero unit/integration test coverage.

This document outlines the catalogue of existing DB mocks, billing entity dependencies, PostgreSQL schema requirements, and the complete refactoring blueprint to eradicate all mocks in favor of real PostgreSQL 18 fixtures using `withFixtureTenant`, `withSuperuserBypass`, and `fixtureUuid`.

---

## 1. DB Mock Catalogue in `billingQuery.test.ts`

Inspection of `apps/api/src/db/tests/billingQuery.test.ts` (lines 1–133):

| Location | Mock Target | Method / Implementation | Purpose in Test | Real DB Flaw |
|---|---|---|---|---|
| Lines 47–76 | `db.transaction` | `stubTransaction()` stubbing `db.transaction` and returning a fake `tx` object | Fakes `tx.select(...).for("update")` (pessimistic lock) and `tx.insert(schema.payments)` | Completely bypasses PostgreSQL RLS, pessimistic row locking (`FOR UPDATE`), foreign keys (`patient_id`, `organization_id`), and trigger execution. |
| Line 72 | `db` | `mock.method(db, "transaction", async (callback) => callback(tx))` | Intercepts transaction calls in `createPaymentInDb` | Hides driver errors, transaction rollback behavior, and schema constraint failures. |
| Line 84 | `stubTransaction` | `stubTransaction({ insertedRows: [mockPaymentData] })` | Test 1: "successfully creates a payment" | Validates mock object interaction instead of real PostgreSQL record insertion. |
| Line 100 | `stubTransaction` | `stubTransaction({ insertedRows: [] })` | Test 2: "throws error when returning is empty" | Tests artificial mock return state impossible in normal PostgreSQL execution. |
| Line 116 | `stubTransaction` | `stubTransaction({ lockedPatients: [], insertedRows: [mockPaymentData] })` | Test 3: "не вставляет платёж..." | Verifies exception handling when patient `select...for update` returns empty, but via fake object rather than real database query. |

---

## 2. Billing Entity Dependencies & Schema Inventory

From `apps/api/src/db/billingQuery.ts` and `apps/api/src/db/schema.ts`:

### A. Entity Dependencies
1. **`organizations`** (`schema.organizations`):
   - Mandatory tenant anchor (`id`, `name`).
   - All tenant queries are isolated via PostgreSQL FORCE RLS on `organization_id`.
2. **`patients`** (`schema.patients`):
   - Required parent for payments (`payments.patient_id` FK -> `patients.id`).
   - `createPaymentInDb` executes `tx.select({ id: schema.patients.id }).from(schema.patients).where(...).for("update")`. If patient row does not exist for the current tenant, `createPaymentInDb` throws `"Patient <id> not found or locked by another transaction."`.
3. **`visits`** (`schema.visits`):
   - Optional reference (`payments.visit_id` FK -> `visits.id`).
   - Queried via `getVisitForBilling(organizationId, visitId)`.
4. **`generated_documents`** (`schema.generatedDocuments`):
   - Optional reference (`payments.document_id`).
   - Queried via `getDocumentForBilling(organizationId, documentId)`.
5. **`payments`** (`schema.payments`):
   - Primary table for billing transactions.
   - Column `amount_rub`: `numeric(12, 2)` mapped to JS `number` (`mode: "number"`).
   - Column `status`: `payment_status` enum (`"paid" | "refunded" | "planned" | "voided"`).
   - Column `tax_deductionCode`: `text` (narrowed at read boundary to `"1" | "2" | null`).
   - Column `client_mutation_id`: `text` (used for idempotency lookup).

### B. Functions in `billingQuery.ts` to be Tested Against Real DB:
1. `createPaymentInDb(organizationId, input)`
2. `getDefaultOrganizationId()`
3. `findPaymentByClientMutationIdInDb(organizationId, clientMutationId)`
4. `getPatientForBilling(organizationId, patientId)`
5. `getVisitForBilling(organizationId, visitId)`
6. `getDocumentForBilling(organizationId, documentId)`
7. `applyPaymentRefundSettlementsInDb(organizationId, settlements)`
8. `getPaymentsByPatientIdInDb(organizationId, patientId)`

---

## 3. PostgreSQL Fixture Strategy

### A. Fixture Namespacing & UUID Generation
Using `fixtureUuid(namespace, slot)` from `apps/api/src/tests/support/fixtureOrganizations.ts`:

```ts
const NAMESPACE = "m3.billingQuery.test.ts";

const ORG_ID = fixtureUuid(NAMESPACE, 1);
const FOREIGN_ORG_ID = fixtureUuid(NAMESPACE, 2);

const PATIENT_1_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_2_ID = fixtureUuid(NAMESPACE, 11);
const FOREIGN_PATIENT_ID = fixtureUuid(NAMESPACE, 12);

const VISIT_1_ID = fixtureUuid(NAMESPACE, 20);
const DOC_1_ID = fixtureUuid(NAMESPACE, 30);
```

### B. Lifecycle Setup & Teardown
- **`before()` hook**:
  1. Purge any leftover fixture data: `await purgeFixtureOrganizations([ORG_ID, FOREIGN_ORG_ID]);`
  2. Insert organizations under superuser bypass:
     ```ts
     await withSuperuserBypass(async (tx) => {
       await tx.insert(schema.organizations).values([
         { id: ORG_ID, name: "M3 Billing Primary Clinic" },
         { id: FOREIGN_ORG_ID, name: "M3 Billing Foreign Clinic" },
       ]);
     });
     ```
  3. Seed tenant entity fixtures inside tenant context:
     ```ts
     await withFixtureTenant(ORG_ID, async (tx) => {
       await tx.insert(schema.patients).values([
         { id: PATIENT_1_ID, organizationId: ORG_ID, fullName: "Ivanov Ivan" },
         { id: PATIENT_2_ID, organizationId: ORG_ID, fullName: "Petrov Petr" },
       ]);
       await tx.insert(schema.visits).values([
         { id: VISIT_1_ID, organizationId: ORG_ID, patientId: PATIENT_1_ID },
       ]);
       await tx.insert(schema.generatedDocuments).values([
         { id: DOC_1_ID, organizationId: ORG_ID, patientId: PATIENT_1_ID, kind: "act", title: "Act #101" },
       ]);
     });
     await withFixtureTenant(FOREIGN_ORG_ID, async (tx) => {
       await tx.insert(schema.patients).values([
         { id: FOREIGN_PATIENT_ID, organizationId: FOREIGN_ORG_ID, fullName: "Sidorov Sidor" },
       ]);
     });
     ```
- **`after()` hook**:
  ```ts
  await purgeFixtureOrganizations([ORG_ID, FOREIGN_ORG_ID]);
  ```

---

## 4. Test Suite Design Blueprint

The refactored `billingQuery.test.ts` will replace all mock calls with live database assertions under `withFixtureTenant`:

```ts
describe("billingQuery integration tests (Real PostgreSQL 18)", () => {
  before(async () => { /* seed fixtures */ });
  after(async () => { /* purge fixtures */ });

  describe("createPaymentInDb", () => {
    test("successfully creates a payment in real PostgreSQL DB", async () => {
      const payment = await withFixtureTenant(ORG_ID, async () => {
        return createPaymentInDb(ORG_ID, {
          patientId: PATIENT_1_ID,
          visitId: VISIT_1_ID,
          documentId: DOC_1_ID,
          amountRub: 2500.75,
          method: "card",
          clientMutationId: "mut-m3-001",
          taxDeductionCode: "1",
          payerFullName: "Ivanov Ivan",
        });
      });

      assert.ok(payment.id);
      assert.strictEqual(payment.organizationId, ORG_ID);
      assert.strictEqual(payment.patientId, PATIENT_1_ID);
      assert.strictEqual(payment.amountRub, 2500.75);
      assert.strictEqual(payment.status, "paid");
      assert.strictEqual(payment.taxDeductionCode, "1");
    });

    test("throws error when patient does not exist", async () => {
      const NON_EXISTENT_PATIENT = fixtureUuid(NAMESPACE, 999);
      await assert.rejects(
        () => withFixtureTenant(ORG_ID, async () => {
          return createPaymentInDb(ORG_ID, {
            patientId: NON_EXISTENT_PATIENT,
            amountRub: 1000,
            method: "cash",
          });
        }),
        /not found or locked by another transaction/
      );
    });

    test("prevents creating payment for a patient belonging to another organization (RLS isolation)", async () => {
      await assert.rejects(
        () => withFixtureTenant(ORG_ID, async () => {
          return createPaymentInDb(ORG_ID, {
            patientId: FOREIGN_PATIENT_ID,
            amountRub: 1000,
            method: "cash",
          });
        }),
        /not found or locked by another transaction/
      );
    });
  });

  describe("billing read & lookup queries", () => {
    test("getDefaultOrganizationId returns an existing organization ID", async () => {
      const defaultOrgId = await getDefaultOrganizationId();
      assert.ok(defaultOrgId);
      assert.strictEqual(typeof defaultOrgId, "string");
    });

    test("findPaymentByClientMutationIdInDb finds payment idempotently", async () => {
      const found = await withFixtureTenant(ORG_ID, async () => {
        return findPaymentByClientMutationIdInDb(ORG_ID, "mut-m3-001");
      });
      assert.ok(found);
      assert.strictEqual(found?.clientMutationId, "mut-m3-001");

      const notFound = await withFixtureTenant(ORG_ID, async () => {
        return findPaymentByClientMutationIdInDb(ORG_ID, "non-existent-mut");
      });
      assert.strictEqual(notFound, null);
    });

    test("getPatientForBilling, getVisitForBilling, getDocumentForBilling return entities correctly", async () => {
      await withFixtureTenant(ORG_ID, async () => {
        const p = await getPatientForBilling(ORG_ID, PATIENT_1_ID);
        assert.ok(p);
        assert.strictEqual(p.fullName, "Ivanov Ivan");

        const v = await getVisitForBilling(ORG_ID, VISIT_1_ID);
        assert.ok(v);

        const d = await getDocumentForBilling(ORG_ID, DOC_1_ID);
        assert.ok(d);

        // Foreign tenant checks return null
        const foreignP = await getPatientForBilling(ORG_ID, FOREIGN_PATIENT_ID);
        assert.strictEqual(foreignP, null);
      });
    });

    test("getPaymentsByPatientIdInDb returns all payments for a patient", async () => {
      const patientPayments = await withFixtureTenant(ORG_ID, async () => {
        return getPaymentsByPatientIdInDb(ORG_ID, PATIENT_1_ID);
      });
      assert.ok(patientPayments.length >= 1);
      assert.strictEqual(patientPayments[0].patientId, PATIENT_1_ID);
    });
  });

  describe("applyPaymentRefundSettlementsInDb", () => {
    test("updates payment status to refunded and restores back to paid", async () => {
      // 1. Create a payment to refund
      const paymentToRefund = await withFixtureTenant(ORG_ID, async () => {
        return createPaymentInDb(ORG_ID, {
          patientId: PATIENT_2_ID,
          amountRub: 500,
          method: "cash",
          clientMutationId: "mut-m3-refund-test",
        });
      });

      // 2. Apply refund settlement (fullyRefunded: true)
      const refundResult = await withFixtureTenant(ORG_ID, async () => {
        return applyPaymentRefundSettlementsInDb(ORG_ID, [
          { paymentId: paymentToRefund.id, fullyRefunded: true },
        ]);
      });
      assert.deepStrictEqual(refundResult.refunded, [paymentToRefund.id]);
      assert.deepStrictEqual(refundResult.restored, []);

      // Verify status in DB
      const refundedPayment = await withFixtureTenant(ORG_ID, async () => {
        const [p] = await getPaymentsByPatientIdInDb(ORG_ID, PATIENT_2_ID);
        return p;
      });
      assert.strictEqual(refundedPayment.status, "refunded");

      // 3. Restore payment settlement (fullyRefunded: false)
      const restoreResult = await withFixtureTenant(ORG_ID, async () => {
        return applyPaymentRefundSettlementsInDb(ORG_ID, [
          { paymentId: paymentToRefund.id, fullyRefunded: false },
        ]);
      });
      assert.deepStrictEqual(restoreResult.refunded, []);
      assert.deepStrictEqual(restoreResult.restored, [paymentToRefund.id]);

      // Verify status restored to paid
      const restoredPayment = await withFixtureTenant(ORG_ID, async () => {
        const [p] = await getPaymentsByPatientIdInDb(ORG_ID, PATIENT_2_ID);
        return p;
      });
      assert.strictEqual(restoredPayment.status, "paid");
    });
  });
});
```

---

## 5. Verification & Execution Blueprint

To verify the refactored test suite:
1. **Single Test File Command**:
   ```bash
   node --import tsx --import ./src/tests/support/poolTeardown.ts --test src/db/tests/billingQuery.test.ts
   ```
2. **Static Mock Eradication Check**:
   ```bash
   rg "t\.mock\.method\(db" apps/api/src/db/tests/billingQuery.test.ts
   ```
   Must return **0 matches**.
3. **Full API Test Suite Run**:
   ```bash
   npm run test -w @dental/api
   ```
