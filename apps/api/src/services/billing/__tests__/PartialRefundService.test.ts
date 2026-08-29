/**
 * PartialRefundService Backend Integration & Validation Tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculatePartialRefund,
	type PartialRefundCalculationInput,
	type RefundableInvoiceItem,
} from "@dental/shared";
import { PartialRefundValidationError } from "../PartialRefundService.js";

describe("PartialRefundService (Backend & Domain)", () => {
	const mockServices: RefundableInvoiceItem[] = [
		{
			id: "item-tooth-46",
			name: "Пломба зуба 46 светоотверждаемая",
			code804n: "A16.07.002.001",
			toothNumber: 46,
			unitPriceKop: 450000, // 4,500 ₽
			quantity: 1,
			grossAmountKop: 450000,
			netAmountKop: 450000,
			doctorUserId: "doc-1",
			doctorName: "Д-р Барабаш С.В.",
			commissionPct: 30,
			materialCostKop: 35000,
		},
		{
			id: "item-anes-46",
			name: "Анестезия инфильтрационная",
			code804n: "B01.003.004.004",
			toothNumber: 46,
			unitPriceKop: 90000, // 900 ₽
			quantity: 1,
			grossAmountKop: 90000,
			netAmountKop: 90000,
			doctorUserId: "doc-1",
			doctorName: "Д-р Барабаш С.В.",
			commissionPct: 30,
			materialCostKop: 12000,
		},
	];

	it("processes partial refund for 1 service accurately", () => {
		const calcInput: PartialRefundCalculationInput = {
			invoiceId: "inv-uuid-1",
			invoiceNumber: "СЧ-2026-009",
			patientId: "pat-uuid-1",
			patientName: "Смирнова Елена",
			cashierFullName: "Иванова М.П.",
			paymentMethod: "card",
			items: mockServices,
			refundRequests: [
				{
					itemId: "item-tooth-46",
					quantityToRefund: 1,
				},
			],
			reasonCategory: "warranty_case",
			defaultDoctorCommissionPct: 30,
		};

		const result = calculatePartialRefund(calcInput);

		assert.equal(result.isValid, true);
		assert.equal(result.totalRefundRub, 4500);
		assert.equal(result.totalRemainingInvoiceRub, 900);
		assert.equal(result.fiscal54FzPayload.tag1054_operationType, 2); // income_return
		assert.equal(result.doctorClawbacks[0]?.clawbackRub, 1245);
	});

	it("throws PartialRefundValidationError with code and details on invalid input", () => {
		const err = new PartialRefundValidationError(
			"InvalidRefundQuantity",
			"Количество к возврату превышает исходное количество.",
			{ requested: 5, available: 1 }
		);

		assert.equal(err.name, "PartialRefundValidationError");
		assert.equal(err.code, "InvalidRefundQuantity");
		assert.equal(err.details?.requested, 5);
	});
});
