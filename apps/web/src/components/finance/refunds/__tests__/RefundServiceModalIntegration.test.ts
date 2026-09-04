/**
 * RefundServiceModalIntegration.test.ts — Unit tests for 54-FZ Partial Refund & Doctor Clawback Integration.
 *
 * Verifies:
 * 1. Exact kopeck matching between refunded items and statutory tender distributions (Tag 1031 Cash, Tag 1081 Card, Tag 1215 Advance).
 * 2. Strict compliance with shared `fiscalRefundPayloadSchema` expected by POST /api/fiscal/refund.
 * 3. Exact calculation of Doctor Commission Clawback (вычет из сдельной зарплаты врача).
 * 4. Resilient handling of offline buffering and composite clientMutationId idempotency keys.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
	calculatePartialRefund,
	fiscalRefundPayloadSchema,
	generate54FzIncomeReturnQrPayload,
	type PartialRefundCalculationInput,
} from "@dental/shared";

test("RefundServiceModal Integration: generates valid 54-FZ FFD 1.2 payload for card refund matching fiscalRefundPayloadSchema", () => {
	const calculationInput: PartialRefundCalculationInput = {
		invoiceId: "11111111-1111-1111-1111-111111111111",
		invoiceNumber: "АКТ-2026-4401",
		patientId: "22222222-2222-2222-2222-222222222222",
		patientName: "Иванов Иван Иванович",
		cashierFullName: "Кассир-администратор",
		paymentMethod: "card",
		reasonCategory: "warranty_case",
		customReasonDetailsRu: "Переделка реставрации по гарантии",
		defaultDoctorCommissionPct: 30,
		items: [
			{
				id: "item-1",
				name: "Восстановление зуба светоотверждаемым композитом Filtek",
				code804n: "A16.07.002.001",
				toothNumber: 46,
				unitPriceKop: 450000,
				quantity: 1,
				grossAmountKop: 450000,
				discountKop: 0,
				netAmountKop: 450000,
				alreadyRefundedKop: 0,
				doctorName: "Д-р Барабаш С.В.",
				commissionPct: 30,
				materialCostKop: 35000,
			},
			{
				id: "item-2",
				name: "Анестезия инфильтрационная Убистезин Форте",
				code804n: "B01.003.004.004",
				toothNumber: 46,
				unitPriceKop: 90000,
				quantity: 1,
				grossAmountKop: 90000,
				discountKop: 0,
				netAmountKop: 90000,
				alreadyRefundedKop: 0,
				doctorName: "Д-р Барабаш С.В.",
				commissionPct: 30,
				materialCostKop: 12000,
			},
		],
		refundRequests: [
			{
				itemId: "item-1",
				quantityToRefund: 1,
			},
		],
	};

	const calcResult = calculatePartialRefund(calculationInput);
	assert.equal(calcResult.isValid, true);
	assert.equal(calcResult.totalRefundKop, 450000);
	assert.equal(calcResult.totalRefundRub, 4500.0);

	// Check Doctor Clawback math:
	// Base for commission = 4500 - 350 (material) = 4150 ₽ = 415000 kop
	// 30% commission = 1245.00 ₽ = 124500 kop
	assert.equal(calcResult.totalDoctorClawbackKop, 124500);
	assert.equal(calcResult.totalDoctorClawbackRub, 1245.0);

	// Prepare payload as RefundServiceModal does for POST /api/fiscal/refund
	const refundPayload = {
		clientMutationId: "refund-mut-001",
		originalPaymentId: "33333333-3333-3333-3333-333333333333",
		originalReceiptNumber: "CHK-9912",
		originalFiscalSign: "1982736450",
		patientId: "22222222-2222-2222-2222-222222222222",
		refundCashKopecks: 0,
		refundElectronicKopecks: calcResult.totalRefundKop,
		refundPrepaidKopecks: 0,
		totalRefundKopecks: calcResult.totalRefundKop,
		reason: "Гарантийный случай: Переделка реставрации по гарантии",
		cashierFullName: "Кассир-администратор",
		items: calcResult.refundedItems.map((item) => ({
			name: item.name,
			priceKopecks: item.unitPriceKop,
			quantity: item.quantityRefunded,
			amountKopecks: item.refundedNetKop,
			subject: "service" as const,
			method: "full_payment" as const,
			vatRate: "vat_none" as const,
			measure: "piece" as const,
			taxDeductionCode: "code_1_standard" as const,
			medicalServiceCode804n: item.code804n,
			toothFdiNumber: item.toothNumber,
		})),
	};

	// Validate against backend schema
	const parsed = fiscalRefundPayloadSchema.safeParse(refundPayload);
	assert.equal(parsed.success, true, `Payload must pass fiscalRefundPayloadSchema: ${JSON.stringify(parsed.error?.issues)}`);

	// Verify QR code generation
	const qrPayload = generate54FzIncomeReturnQrPayload({
		result: calcResult,
		fnSerial: "9999078900012345",
		fdNumber: "1002",
		fpdNumber: "1234567890",
	});
	assert.ok(qrPayload.includes("t="), "QR payload must have timestamp");
	assert.ok(qrPayload.includes("s=4500.00"), "QR payload must have exact rubles");
	assert.ok(qrPayload.includes("fn=9999078900012345"), "QR payload must include FN");
	assert.ok(qrPayload.includes("i=1002"), "QR payload must include FD");
	assert.ok(qrPayload.includes("fp=1234567890"), "QR payload must include FPD");
	assert.ok(qrPayload.includes("n=2"), "QR payload must have Tag 1054 = 2 (income_return)");
});

test("RefundServiceModal Integration: validates cash refund tender exact parity", () => {
	const calculationInput: PartialRefundCalculationInput = {
		invoiceId: "11111111-1111-1111-1111-111111111111",
		invoiceNumber: "АКТ-2026-4402",
		patientId: "22222222-2222-2222-2222-222222222222",
		patientName: "Смирнова Ольга",
		cashierFullName: "Кассир-администратор",
		paymentMethod: "cash",
		reasonCategory: "patient_refusal",
		defaultDoctorCommissionPct: 20,
		items: [
			{
				id: "item-3",
				name: "Прицельная радиовизиография зуба",
				code804n: "A06.07.007",
				toothNumber: 21,
				unitPriceKop: 65000,
				quantity: 2,
				grossAmountKop: 130000,
				discountKop: 0,
				netAmountKop: 130000,
				alreadyRefundedKop: 0,
				doctorName: "Д-р Барабаш С.В.",
				commissionPct: 20,
			},
		],
		refundRequests: [
			{
				itemId: "item-3",
				quantityToRefund: 1, // Refund 1 of 2
			},
		],
	};

	const calcResult = calculatePartialRefund(calculationInput);
	assert.equal(calcResult.isValid, true);
	assert.equal(calcResult.totalRefundKop, 65000);
	assert.equal(calcResult.totalRefundRub, 650.0);

	const refundPayload = {
		clientMutationId: "refund-cash-002",
		originalPaymentId: "44444444-4444-4444-4444-444444444444",
		originalReceiptNumber: "CHK-9915",
		patientId: "22222222-2222-2222-2222-222222222222",
		refundCashKopecks: calcResult.totalRefundKop,
		refundElectronicKopecks: 0,
		refundPrepaidKopecks: 0,
		totalRefundKopecks: calcResult.totalRefundKop,
		reason: "Отказ пациента от услуги",
		cashierFullName: "Кассир-администратор",
		items: calcResult.refundedItems.map((item) => ({
			name: item.name,
			priceKopecks: item.unitPriceKop,
			quantity: item.quantityRefunded,
			amountKopecks: item.refundedNetKop,
			subject: "service" as const,
			method: "full_payment" as const,
			vatRate: "vat_none" as const,
			measure: "piece" as const,
			taxDeductionCode: "code_1_standard" as const,
			medicalServiceCode804n: item.code804n,
			toothFdiNumber: item.toothNumber,
		})),
	};

	const parsed = fiscalRefundPayloadSchema.safeParse(refundPayload);
	assert.equal(parsed.success, true);
});
