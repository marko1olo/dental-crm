import { test, describe } from "node:test";
import assert from "node:assert";
import { paidAmountRubForDocument } from "../../documents/guards.js";
import type { CreateDocumentInput, Payment } from "@dental/shared";

describe("paidAmountRubForDocument", () => {
  const patientId = "00000000-0000-0000-0000-000000000000";
  const visitId = "11111111-1111-1111-1111-111111111111";

  const makePayment = (overrides: Partial<Payment> = {}): Payment => ({
    id: "22222222-2222-2222-2222-222222222222",
    organizationId: "33333333-3333-3333-3333-333333333333",
    patientId,
    visitId,
    documentId: null,
    amountRub: 1000,
    method: "card",
    status: "paid",
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
  });

  test("returns 0 for tax paid documents that need a year when taxYear is missing", () => {
    const input: CreateDocumentInput = { patientId, kind: "tax_deduction_certificate" };
    const amount = paidAmountRubForDocument("tax_deduction_certificate", input, []);
    assert.strictEqual(amount, 0);
  });

  test("returns 0 for KND tax documents when year is before 2024", () => {
    const input: CreateDocumentInput = { patientId, kind: "tax_deduction_certificate", taxYear: 2023 };
    const amount = paidAmountRubForDocument("tax_deduction_certificate", input, []);
    assert.strictEqual(amount, 0);
  });

  test("returns 0 for legacy tax documents when year is outside 2021-2023", () => {
    const input: CreateDocumentInput = { patientId, kind: "legacy_tax_deduction_certificate", taxYear: 2024 };
    const amount = paidAmountRubForDocument("legacy_tax_deduction_certificate", input, []);
    assert.strictEqual(amount, 0);
  });

  test("calculates amount for payment_refund_correction_request correctly", () => {
    const p1 = makePayment({ id: "p1", amountRub: 1000, status: "paid" });
    const p2 = makePayment({ id: "p2", amountRub: 2000, status: "paid" });
    const input: CreateDocumentInput = {
      patientId,
      visitId,
      kind: "payment_refund_correction_request",
      payload: {
        paymentRefundCorrection: {
          selectedPaymentIds: ["p1", "p2"],
          reason: "test",
          amountRub: 3000
        }
      } as any
    };

    const amount = paidAmountRubForDocument("payment_refund_correction_request", input, [p1, p2]);
    assert.strictEqual(amount, 3000); // 1000 + 2000
  });

  test("calculates amount for payment_receipt correctly", () => {
    const p1 = makePayment({ id: "p1", amountRub: 1000, status: "paid" });
    const p2 = makePayment({ id: "p2", amountRub: 2000, status: "paid" });
    const input: CreateDocumentInput = {
      patientId,
      visitId,
      kind: "payment_receipt",
      payload: {
        paymentReceipt: {
          selectedPaymentIds: ["p1", "p2"],
          cashierName: "John"
        }
      } as any
    };

    const amount = paidAmountRubForDocument("payment_receipt", input, [p1, p2]);
    assert.strictEqual(amount, 3000);
  });

  test("calculates amount for tax documents requiring payment selection correctly", () => {
    const p1 = makePayment({ id: "p1", amountRub: 1000, status: "paid", paidAt: "2024-05-01T10:00:00.000Z", payerInn: "123456789012" });
    const p2 = makePayment({ id: "p2", amountRub: 1500, status: "paid", paidAt: "2024-06-01T10:00:00.000Z", payerInn: "123456789012" });

    const input: CreateDocumentInput = {
      patientId,
      kind: "tax_deduction_certificate",
      taxYear: 2024,
      taxPayerInn: "123456789012",
      payload: {
        taxPaymentSelection: {
          selectedPaymentIds: ["p1", "p2"],
          taxYear: 2024,
          payerInn: "123456789012"
        }
      } as any
    };

    const amount = paidAmountRubForDocument("tax_deduction_certificate", input, [p1, p2]);
    assert.strictEqual(amount, 2500);
  });

  test("returns 0 if no selected payments match the scope for tax document", () => {
     const p1 = makePayment({ id: "p1", amountRub: 1000, status: "paid", paidAt: "2023-05-01T10:00:00.000Z", payerInn: "123456789012" }); // Wrong year for payment (2023 vs 2024 requested)

    const input: CreateDocumentInput = {
      patientId,
      kind: "tax_deduction_certificate",
      taxYear: 2024,
      taxPayerInn: "123456789012",
      payload: {
        taxPaymentSelection: {
          selectedPaymentIds: ["p1"],
          taxYear: 2024,
          payerInn: "123456789012"
        }
      } as any
    };

    const amount = paidAmountRubForDocument("tax_deduction_certificate", input, [p1]);
    assert.strictEqual(amount, 0);
  });

  test("calculates general document amount based on visit filtering", () => {
    // E.g. completed_works_act which falls to the last block
    const p1 = makePayment({ id: "p1", amountRub: 500, status: "paid", visitId });
    const p2 = makePayment({ id: "p2", amountRub: 700, status: "paid", visitId: "different-visit" });

    const input: CreateDocumentInput = {
      patientId,
      visitId,
      kind: "completed_works_act"
    };

    const amount = paidAmountRubForDocument("completed_works_act", input, [p1, p2]);
    assert.strictEqual(amount, 500); // only p1 matches the visitId
  });

});
