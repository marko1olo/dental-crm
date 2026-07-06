import { test } from "node:test";
import assert from "node:assert";
import { taxPaymentSelectionErrorForDocument } from "../../documents/guards.js";
import type { CreateDocumentInput, Payment } from "@dental/shared";

test("taxPaymentSelectionErrorForDocument", async (t) => {
  const baseInput: CreateDocumentInput = {
    patientId: "patient-1",
    kind: "medical_record_extract", // not a tax document
    payload: {},
  };

  const validPayment: Payment = {
    id: "payment-1",
    patientId: "patient-1",
    status: "paid",
    amountRub: 1000,
    paidAt: "2024-05-10T10:00:00Z",
    payerInn: "123456789012",
    createdAt: "2024-05-10T10:00:00Z",
    updatedAt: "2024-05-10T10:00:00Z",
  } as unknown as Payment; // Cast as Payment for partial mock

  await t.test("returns null for non-tax document kinds", () => {
    const error = taxPaymentSelectionErrorForDocument(baseInput, [validPayment]);
    assert.strictEqual(error, null);
  });

  const taxInput: CreateDocumentInput = {
    patientId: "patient-1",
    kind: "tax_deduction_certificate",
    taxYear: 2024,
    taxPayerInn: "123456789012",
    payload: {
      taxPaymentSelection: {
        selectedPaymentIds: [],
      },
    },
  };

  await t.test("returns error when no payments are selected for a tax document", () => {
    const error = taxPaymentSelectionErrorForDocument(taxInput, [validPayment]);
    assert.match(error!, /нужно явно выбрать фискальные чеки/);
  });

  await t.test("returns error for duplicate selected payment IDs", () => {
    const duplicateInput: CreateDocumentInput = {
      ...taxInput,
      payload: {
        taxPaymentSelection: {
          selectedPaymentIds: ["payment-1", "payment-1"],
        },
      },
    };
    const error = taxPaymentSelectionErrorForDocument(duplicateInput, [validPayment]);
    assert.match(error!, /В выбранных чеках есть дубли/);
  });

  const validTaxInput: CreateDocumentInput = {
    ...taxInput,
    payload: {
      taxPaymentSelection: {
        selectedPaymentIds: ["payment-1"],
      },
    },
  };

  await t.test("returns error when a selected payment is not found", () => {
    const error = taxPaymentSelectionErrorForDocument(validTaxInput, []);
    assert.match(error!, /Выбранный фискальный чек не найден/);
  });

  await t.test("returns error when a selected payment belongs to a different patient", () => {
    const otherPatientPayment = { ...validPayment, patientId: "patient-2" };
    const error = taxPaymentSelectionErrorForDocument(validTaxInput, [otherPatientPayment]);
    assert.match(error!, /относится к другому пациенту/);
  });

  await t.test("returns error when a selected payment is not paid", () => {
    const unpaidPayment = { ...validPayment, status: "pending" } as unknown as Payment;
    const error = taxPaymentSelectionErrorForDocument(validTaxInput, [unpaidPayment]);
    assert.match(error!, /только проведенные положительные оплаты/);
  });

  await t.test("returns error when a selected payment has zero amount", () => {
    const zeroAmountPayment = { ...validPayment, amountRub: 0 };
    const error = taxPaymentSelectionErrorForDocument(validTaxInput, [zeroAmountPayment]);
    assert.match(error!, /только проведенные положительные оплаты/);
  });

  await t.test("returns error when a selected payment is from a different tax year", () => {
    const pastYearPayment = { ...validPayment, paidAt: "2023-05-10T10:00:00Z" };
    const error = taxPaymentSelectionErrorForDocument(validTaxInput, [pastYearPayment]);
    assert.match(error!, /не относится к выбранному налоговому году/);
  });

  await t.test("returns error when a selected payment has a different taxpayer INN", () => {
    const differentInnPayment = { ...validPayment, payerInn: "098765432109" };
    const error = taxPaymentSelectionErrorForDocument(validTaxInput, [differentInnPayment]);
    assert.match(error!, /относится к другому ИНН плательщика/);
  });

  await t.test("returns null when all checks pass", () => {
    const error = taxPaymentSelectionErrorForDocument(validTaxInput, [validPayment]);
    assert.strictEqual(error, null);
  });

  await t.test("returns null for tax_deduction_application when all checks pass", () => {
    const applicationInput: CreateDocumentInput = {
      patientId: "patient-1",
      kind: "tax_deduction_application",
      payload: {
        taxDeductionApplication: {
          requestedTaxYear: 2024,
          taxpayerInn: "123456789012",
          selectedPaymentIds: ["payment-1"],
        },
      } as any, // Cast as any because we might not be providing all the required fields for the application payload mock
    };
    const error = taxPaymentSelectionErrorForDocument(applicationInput, [validPayment]);
    assert.strictEqual(error, null);
  });
import { test, describe } from "node:test";
import { paidAmountRubForDocument } from "../../documents/guards.js";

describe("paidAmountRubForDocument", () => {
  const patientId = "00000000-0000-0000-0000-000000000000";
  const visitId = "11111111-1111-1111-1111-111111111111";

  const makePayment = (overrides: Partial<Payment> = {}): Payment => ({
    id: "22222222-2222-2222-2222-222222222222",
    organizationId: "33333333-3333-3333-3333-333333333333",
    patientId,
    visitId,
    documentId: null,
    method: "card",
    createdAt: new Date().toISOString(),
    createdById: "44444444-4444-4444-4444-444444444444",
    paidAt: new Date().toISOString(),
    recordedAt: new Date().toISOString(),
    ...overrides
  } as Payment);

  test("returns 0 for non-tax document requiring paid record when visitId is missing", () => {
    const input: CreateDocumentInput = { patientId, kind: "payment_receipt" };
    const amount = paidAmountRubForDocument("payment_receipt", input, []);
    assert.strictEqual(amount, 0);

  test("returns 0 for tax paid documents that need a year when taxYear is missing", () => {
    const input: CreateDocumentInput = { patientId, kind: "tax_deduction_certificate" };
    const amount = paidAmountRubForDocument("tax_deduction_certificate", input, []);
    assert.strictEqual(amount, 0);

  test("returns 0 for KND tax documents when year is before 2024", () => {
    const input: CreateDocumentInput = { patientId, kind: "tax_deduction_certificate", taxYear: 2023 };
    const amount = paidAmountRubForDocument("tax_deduction_certificate", input, []);
    assert.strictEqual(amount, 0);

  test("returns 0 for legacy tax documents when year is outside 2021-2023", () => {
    const input: CreateDocumentInput = { patientId, kind: "legacy_tax_deduction_certificate", taxYear: 2024 };
    const amount = paidAmountRubForDocument("legacy_tax_deduction_certificate", input, []);
    assert.strictEqual(amount, 0);

  test("calculates amount for payment_refund_correction_request correctly", () => {
    const p1 = makePayment({ id: "p1", amountRub: 1000, status: "paid" });
    const p2 = makePayment({ id: "p2", amountRub: 2000, status: "paid" });
    const input: CreateDocumentInput = {
      patientId,
      visitId,
      kind: "payment_refund_correction_request",
        paymentRefundCorrection: {
          selectedPaymentIds: ["p1", "p2"],
          reason: "test",
          amountRub: 3000
        }
      } as any

    const amount = paidAmountRubForDocument("payment_refund_correction_request", input, [p1, p2]);
    assert.strictEqual(amount, 3000); // 1000 + 2000

  test("calculates amount for payment_receipt correctly", () => {
    const p1 = makePayment({ id: "p1", amountRub: 1000, status: "paid" });
    const p2 = makePayment({ id: "p2", amountRub: 2000, status: "paid" });
    const input: CreateDocumentInput = {
      patientId,
      visitId,
      kind: "payment_receipt",
        paymentReceipt: {
          selectedPaymentIds: ["p1", "p2"],
          cashierName: "John"
        }
      } as any

    const amount = paidAmountRubForDocument("payment_receipt", input, [p1, p2]);
    assert.strictEqual(amount, 3000);

  test("calculates amount for tax documents requiring payment selection correctly", () => {
    const p1 = makePayment({ id: "p1", amountRub: 1000, status: "paid", paidAt: "2024-05-01T10:00:00.000Z", payerInn: "123456789012" });
    const p2 = makePayment({ id: "p2", amountRub: 1500, status: "paid", paidAt: "2024-06-01T10:00:00.000Z", payerInn: "123456789012" });

    const input: CreateDocumentInput = {
      patientId,
          selectedPaymentIds: ["p1", "p2"],
          payerInn: "123456789012"
        }
      } as any

    const amount = paidAmountRubForDocument("tax_deduction_certificate", input, [p1, p2]);
    assert.strictEqual(amount, 2500);

  test("returns 0 if no selected payments match the scope for tax document", () => {
     const p1 = makePayment({ id: "p1", amountRub: 1000, status: "paid", paidAt: "2023-05-01T10:00:00.000Z", payerInn: "123456789012" }); // Wrong year for payment (2023 vs 2024 requested)

    const input: CreateDocumentInput = {
      patientId,
          selectedPaymentIds: ["p1"],
          payerInn: "123456789012"
        }
      } as any

    const amount = paidAmountRubForDocument("tax_deduction_certificate", input, [p1]);
    assert.strictEqual(amount, 0);

  test("calculates general document amount based on visit filtering", () => {
    // E.g. completed_works_act which falls to the last block
    const p1 = makePayment({ id: "p1", amountRub: 500, status: "paid", visitId });
    const p2 = makePayment({ id: "p2", amountRub: 700, status: "paid", visitId: "different-visit" });

    const input: CreateDocumentInput = {
      patientId,
      visitId,
      kind: "completed_works_act"

    const amount = paidAmountRubForDocument("completed_works_act", input, [p1, p2]);
    assert.strictEqual(amount, 500); // only p1 matches the visitId

});
