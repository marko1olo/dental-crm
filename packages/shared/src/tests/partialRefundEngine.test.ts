/**
 * partialRefundEngine.test.ts — Unit tests for exact-kopeck partial refund and full position refund.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
	calculatePartialRefund,
	type PartialRefundCalculationInput,
} from "../finance/partialRefundEngine.js";

test("calculatePartialRefund: full position refund preserves exact remainder without losing 1 kopeck", () => {
	// 10.00 ₽ (1000 kopecks) split across 3 units: previously Math.round(1000/3)*3 = 333*3 = 999 kopecks (loss of 1 kopeck)
	const input: PartialRefundCalculationInput = {
		invoiceId: "inv-101",
		invoiceNumber: "СЧ-2026-001",
		patientId: "pat-1",
		patientName: "Пациент Тестовый",
		cashierFullName: "Кассир Анна",
		paymentMethod: "card",
		reasonCategory: "patient_request",
		items: [
			{
				id: "item-1",
				name: "Шлифовка и полировка пломбы",
				quantity: 3,
				unitPriceKop: 333,
				grossAmountKop: 1000,
				discountKop: 0,
				netAmountKop: 1000,
				alreadyRefundedKop: 0,
				commissionPct: 20,
			},
		],
		refundRequests: [
			{
				itemId: "item-1",
				quantityToRefund: 3, // Full position refund (3 of 3)
			},
		],
	};

	const result = calculatePartialRefund(input);

	assert.equal(result.isValid, true);
	assert.equal(result.validationErrors.length, 0);
	assert.equal(result.totalRefundKop, 1000, "Must be exactly 1000 kopecks without 1 kopeck loss");
	assert.equal(result.totalRefundRub, 10.0, "Must equal 10.00 ₽ exactly");
	assert.equal(result.fiscal54FzPayload.tag1081_electronicRub, 10.0);
});

test("calculatePartialRefund: partial refund calculates integer kopecks properly", () => {
	const input: PartialRefundCalculationInput = {
		invoiceId: "inv-102",
		invoiceNumber: "СЧ-2026-002",
		patientId: "pat-2",
		patientName: "Пациент Второй",
		cashierFullName: "Кассир Анна",
		paymentMethod: "cash",
		reasonCategory: "clinical_contraindication",
		items: [
			{
				id: "item-2",
				name: "Анестезия инфильтрационная Артикаин",
				quantity: 2,
				unitPriceKop: 10000,
				grossAmountKop: 20000,
				discountKop: 0,
				netAmountKop: 20000,
				commissionPct: 15,
			},
		],
		refundRequests: [
			{
				itemId: "item-2",
				quantityToRefund: 1, // 1 of 2
			},
		],
	};

	const result = calculatePartialRefund(input);

	assert.equal(result.isValid, true);
	assert.equal(result.totalRefundKop, 10000);
	assert.equal(result.totalRefundRub, 100.0);
	assert.equal(result.fiscal54FzPayload.tag1031_cashRub, 100.0);
});
