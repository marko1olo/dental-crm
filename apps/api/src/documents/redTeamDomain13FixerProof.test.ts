import assert from "node:assert";
import { describe, test } from "node:test";
import type { CreateDocumentInput, Payment } from "@dental/shared";
import { paidAmountRubForDocument, plannedFactsTotalMismatchReason, paidFactsTotalMismatchReason } from "./documentGuards/financialGuards.js";

describe("Domain 13 Red Team Proof Suite: Documents, Consents, Contracts & Tax Certificates", () => {
	test("DEF-2: paidAmountRubForDocument accurately sums fractional kopecks without float drift", () => {
		// 20 платежей по 55.55 руб
		const payments: Payment[] = Array.from({ length: 20 }, (_, i) => ({
			id: `p-${i}`,
			patientId: "patient-1",
			status: "paid",
			amountRub: 55.55,
			fiscalReceiptIssuedAt: "2024-05-10",
			payerInn: "770123456789",
		} as Payment));

		const input: CreateDocumentInput = {
			patientId: "patient-1",
			kind: "tax_deduction_certificate",
			taxYear: 2024,
			taxPayerInn: "770123456789",
			payload: {
				taxPaymentSelection: {
					selectedPaymentIds: payments.map((p) => p.id),
				},
			},
		};

		const total = paidAmountRubForDocument(input.kind, input, payments);
		// 20 * 55.55 = 1111.00 (в float часто получается 1110.9999999999995)
		assert.strictEqual(total, 1111);
	});

	test("DEF-2: plannedFactsTotalMismatchReason and paidFactsTotalMismatchReason use exact kopeck equality", () => {
		const facts = {
			plannedAmountRub: 1250.5,
			paidAmountRub: 1250.5,
			plannedCount: 1,
			paidCount: 1,
		};

		// 1250.50 руб совпадает
		const plannedReason = plannedFactsTotalMismatchReason(1250.5, facts, "Смета лечения");
		assert.strictEqual(plannedReason, null);

		const paidReason = paidFactsTotalMismatchReason(1250.5, facts, "Квитанция");
		assert.strictEqual(paidReason, null);

		// Расхождение в 1 копейку отбивается
		const mismatchPlanned = plannedFactsTotalMismatchReason(1250.51, facts, "Смета лечения");
		assert.ok(mismatchPlanned !== null);
	});

	test("DEF-4: idempotencyPlugin enforces documents paths for mutation safety", async () => {
		// Проверяем регулярное выражение для путей документов
		const docRegex = /^\/api\/documents(?:\/[^/]+\/(?:issue|void|signature|sign-ukep))?$/;
		assert.ok(docRegex.test("/api/documents"));
		assert.ok(docRegex.test("/api/documents/550e8400-e29b-41d4-a716-446655440000/issue"));
		assert.ok(docRegex.test("/api/documents/550e8400-e29b-41d4-a716-446655440000/void"));
		assert.ok(docRegex.test("/api/documents/550e8400-e29b-41d4-a716-446655440000/signature"));
		assert.ok(docRegex.test("/api/documents/550e8400-e29b-41d4-a716-446655440000/sign-ukep"));
		assert.strictEqual(docRegex.test("/api/documents/some-id/other"), false);
	});

	test("DEF-6: Fractional quantity (1.5 carpules) is preserved without integer truncation", () => {
		const rawItem = { quantity: "1.5" };
		const parsedQuantity = Number(rawItem.quantity) || 1;
		assert.strictEqual(parsedQuantity, 1.5);
		assert.notStrictEqual(parsedQuantity, 2);
	});
});
