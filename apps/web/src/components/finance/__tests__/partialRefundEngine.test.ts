/**
 * DENTE Dental CRM — Wave 23: Partial Refunds & Doctor Commission Clawback Unit Test Suite.
 *
 * Scenarios:
 * 1. 1-Click partial refund of 1 tooth filling (e.g. Tooth 46 composite filling 4,500 ₽) out of 5 services.
 * 2. Statutory 54-FZ "Возврат прихода" (Tag 1054 = 2) receipt generation with VAT 0% (Без НДС) and FFD 1.2 tags.
 * 3. Automatic doctor commission clawback deduction from piece-rate payroll.
 * 4. Kopeck-exact balance math preventing over-refunds and IEEE-754 drift.
 * 5. Full vs partial refund transitions and multi-tender return splits.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculatePartialRefund,
	generate54FzIncomeReturnQrPayload,
	generateThermalRefundReceiptText,
	type PartialRefundCalculationInput,
	type RefundableInvoiceItem,
	FFD12_TAG_1054_OPERATION_CODES,
	FFD12_TAG_1199_VAT_CODES,
	FFD12_TAG_1212_SUBJECT_CODES,
	FFD12_TAG_1214_METHOD_CODES,
	calculateDoctorPeriodPayroll,
	type DoctorPayrollCalculationInput,
} from "@dental/shared";

describe("Wave 23 — Domain 2: Partial Refunds, 54-FZ Income Return & Doctor Commission Clawback", () => {
	const sample5Services: RefundableInvoiceItem[] = [
		{
			id: "srv-1",
			name: "Восстановление зуба пломбой (Filtek Ultimate)",
			code804n: "A16.07.002.001",
			toothNumber: 46,
			unitPriceKop: 450000, // 4,500 ₽
			quantity: 1,
			grossAmountKop: 450000,
			netAmountKop: 450000,
			doctorUserId: "doc-barabash",
			doctorName: "Д-р Барабаш С.В.",
			commissionPct: 30, // 30%
			materialCostKop: 35000, // 350 ₽
		},
		{
			id: "srv-2",
			name: "Инфильтрационная анестезия (Убистезин Форте)",
			code804n: "B01.003.004.004",
			toothNumber: 46,
			unitPriceKop: 90000, // 900 ₽
			quantity: 1,
			grossAmountKop: 90000,
			netAmountKop: 90000,
			doctorUserId: "doc-barabash",
			doctorName: "Д-р Барабаш С.В.",
			commissionPct: 30,
			materialCostKop: 12000,
		},
		{
			id: "srv-3",
			name: "Изоляция операционного поля (Коффердам)",
			code804n: "A16.07.002",
			toothNumber: 46,
			unitPriceKop: 80000, // 800 ₽
			quantity: 1,
			grossAmountKop: 80000,
			netAmountKop: 80000,
			doctorUserId: "doc-barabash",
			doctorName: "Д-р Барабаш С.В.",
			commissionPct: 30,
			materialCostKop: 15000,
		},
		{
			id: "srv-4",
			name: "Прицельная внутриротовая радиовизиография",
			code804n: "A06.07.007",
			toothNumber: 46,
			unitPriceKop: 60000, // 600 ₽
			quantity: 1,
			grossAmountKop: 60000,
			netAmountKop: 60000,
			doctorUserId: "doc-barabash",
			doctorName: "Д-р Барабаш С.В.",
			commissionPct: 20,
			materialCostKop: 0,
		},
		{
			id: "srv-5",
			name: "Полировка реставрации пастой Prisma Gloss",
			code804n: "A16.07.025",
			toothNumber: 46,
			unitPriceKop: 70000, // 700 ₽
			quantity: 1,
			grossAmountKop: 70000,
			netAmountKop: 70000,
			doctorUserId: "doc-barabash",
			doctorName: "Д-р Барабаш С.В.",
			commissionPct: 30,
			materialCostKop: 8000,
		},
	];

	// Total act: 4500 + 900 + 800 + 600 + 700 = 7500 ₽ (750,000 kop)

	it("1. Correctly calculates 1-click partial refund for 1 composite filling out of 5 services", () => {
		const input: PartialRefundCalculationInput = {
			invoiceId: "inv-001",
			invoiceNumber: "АКТ-2026-8491",
			patientId: "pat-100",
			patientName: "Смирнова Елена Алексеевна",
			cashierFullName: "Кассир-администратор Иванова М.П.",
			paymentMethod: "card",
			items: sample5Services,
			refundRequests: [
				{
					itemId: "srv-1", // Refund only the 4,500 ₽ composite filling
					quantityToRefund: 1,
				},
			],
			reasonCategory: "warranty_case",
			customReasonDetailsRu: "Скол краевого прилегания пломбы зуба 46",
		};

		const result = calculatePartialRefund(input);

		assert.equal(result.isValid, true);
		assert.equal(result.totalOriginalInvoiceKop, 750000);
		assert.equal(result.totalOriginalInvoiceRub, 7500);

		// Refund amount must equal exactly 4,500 ₽
		assert.equal(result.totalRefundKop, 450000);
		assert.equal(result.totalRefundRub, 4500);

		// Remaining invoice amount must equal 3,000 ₽ (7,500 - 4,500)
		assert.equal(result.totalRemainingInvoiceKop, 300000);
		assert.equal(result.totalRemainingInvoiceRub, 3000);
		assert.equal(result.isFullRefund, false);
		assert.equal(result.remainingActiveItemsCount, 4);

		// Refunded positions check
		assert.equal(result.refundedItems.length, 1);
		const pos = result.refundedItems[0]!;
		assert.equal(pos.itemId, "srv-1");
		assert.equal(pos.code804n, "A16.07.002.001");
		assert.equal(pos.toothNumber, 46);
		assert.equal(pos.refundedNetRub, 4500);
		assert.equal(pos.tag1030_subjectName, "Зуб 46: Восстановление зуба пломбой (Filtek Ultimate) [A16.07.002.001]");
	});

	it("2. Formats 54-FZ Tag 1054 = 2 (Возврат прихода) with VAT exemption and tender breakdown", () => {
		const input: PartialRefundCalculationInput = {
			invoiceId: "inv-001",
			invoiceNumber: "АКТ-2026-8491",
			patientId: "pat-100",
			patientName: "Смирнова Елена Алексеевна",
			cashierFullName: "Кассир-администратор Иванова М.П.",
			paymentMethod: "card",
			items: sample5Services,
			refundRequests: [
				{
					itemId: "srv-1",
					quantityToRefund: 1,
				},
			],
			reasonCategory: "warranty_case",
		};

		const result = calculatePartialRefund(input);

		// 54-FZ Tag 1054 must be 2 (income_return)
		assert.equal(result.fiscal54FzPayload.tag1054_operationType, FFD12_TAG_1054_OPERATION_CODES.income_return);
		assert.equal(result.fiscal54FzPayload.operationLabelRu, "Возврат прихода");
		assert.equal(result.fiscal54FzPayload.totalRub, 4500);
		assert.equal(result.fiscal54FzPayload.tag1081_electronicRub, 4500);
		assert.equal(result.fiscal54FzPayload.tag1031_cashRub, 0);

		// VAT must be Tag 1199 = 6 (vat_none / Без НДС по ст. 149 НК РФ)
		assert.equal(result.vatSummary.vatRateCode, FFD12_TAG_1199_VAT_CODES.vat_none);
		assert.equal(result.vatSummary.vatRub, 0);
		assert.equal(result.vatSummary.baseRub, 4500);

		// QR code generation
		const qrString = generate54FzIncomeReturnQrPayload({
			result,
			fnSerial: "9999078900012345",
			fdNumber: 4892,
			fpdNumber: 389104812,
		});

		assert.match(qrString, /^t=\d{8}T\d{4}&s=4500\.00&fn=9999078900012345&i=4892&fp=389104812&n=2$/);

		// Thermal receipt text contains statutory return indicators
		const thermalText = generateThermalRefundReceiptText(result, {
			name: "ООО «СТОМАТОЛОГИЯ ДЕНТЕ»",
			inn: "7801234567",
		});

		assert.ok(thermalText.includes("КАССОВЫЙ ЧЕК / ВОЗВРАТ ПРИХОДА"));
		assert.ok(thermalText.includes("ИТОГО К ВОЗВРАТУ: 4500.00 ₽"));
		assert.ok(thermalText.includes("БЕЗНАЛИЧНЫМИ: 4500.00 ₽"));
	});

	it("3. Automatically deducts doctor piece-rate commission (clawback) to protect clinic margin", () => {
		const input: PartialRefundCalculationInput = {
			invoiceId: "inv-001",
			invoiceNumber: "АКТ-2026-8491",
			patientId: "pat-100",
			patientName: "Смирнова Елена Алексеевна",
			cashierFullName: "Кассир-администратор Иванова М.П.",
			paymentMethod: "card",
			items: sample5Services,
			refundRequests: [
				{
					itemId: "srv-1", // 4,500 ₽, 30% commission, 350 ₽ material cost
					quantityToRefund: 1,
				},
			],
			reasonCategory: "warranty_case",
			defaultDoctorCommissionPct: 30,
		};

		const result = calculatePartialRefund(input);

		// Base for clawback: 4,500 - 350 (material) = 4,150 ₽
		// Clawback amount: 4,150 * 30% = 1,245.00 ₽ (124,500 kop)
		assert.equal(result.doctorClawbacks.length, 1);
		const doc = result.doctorClawbacks[0]!;
		assert.equal(doc.doctorName, "Д-р Барабаш С.В.");
		assert.equal(doc.commissionPct, 30);
		assert.equal(doc.totalRefundedServiceRub, 4500);
		assert.equal(doc.materialAdjustmentKop, 35000);
		assert.equal(doc.clawbackKop, 124500);
		assert.equal(doc.clawbackRub, 1245);
		assert.equal(result.totalDoctorClawbackRub, 1245);
	});

	it("4. Deducts refunded tooth from Doctor Period Payroll calculation without paying salary for returned work", () => {
		const payrollInput: DoctorPayrollCalculationInput = {
			doctorId: "doc-barabash",
			doctorName: "Д-р Барабаш С.В.",
			specialtyId: "therapy",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services: [
				{
					id: "srv-1",
					dateIso: "2026-08-15",
					patientName: "Смирнова Е.А.",
					medicalCardNumber: "К-2026-04",
					serviceNameRu: "Пломба зуба 46 Filtek",
					category: "therapy",
					grossRevenueKop: 450000,
					labCostKop: 0,
					materialCostKop: 35000,
					isRefunded: true, // REFUNDED SERVICE
					refundedAmountKop: 450000,
				},
				{
					id: "srv-2",
					dateIso: "2026-08-15",
					patientName: "Смирнова Е.А.",
					medicalCardNumber: "К-2026-04",
					serviceNameRu: "Анестезия Убистезин",
					category: "therapy",
					grossRevenueKop: 90000,
					labCostKop: 0,
					materialCostKop: 12000,
				},
				{
					id: "srv-99",
					dateIso: "2026-08-16",
					patientName: "Кузнецов И.В.",
					medicalCardNumber: "К-2026-09",
					serviceNameRu: "Лечение пульпита зуба 16",
					category: "therapy",
					grossRevenueKop: 1200000, // 12,000 ₽
					labCostKop: 0,
					materialCostKop: 100000, // 1,000 ₽
				},
			],
			customBasePercentage: 30,
		};

		const payrollResult = calculateDoctorPeriodPayroll(payrollInput);

		// Refunded service (4,500 ₽) must be completely excluded from gross revenue and earned commission!
		// Total active gross = 900 + 12000 = 12,900 ₽ (1,290,000 kop)
		assert.equal(payrollResult.totalGrossRevenueKop, 1290000);
		assert.equal(payrollResult.refundedServicesCount, 1);
		assert.equal(payrollResult.totalRefundDeductionsKop, 450000);

		// Net base = 12,900 - 120 - 1000 = 11,780 ₽ (1,178,000 kop)
		assert.equal(payrollResult.totalNetBaseKop, 1178000);

		// Earned base commission = 11,780 * 30% = 3,534 ₽ (353,400 kop)
		assert.equal(payrollResult.earnedBaseCommissionKop, 353400);
	});

	it("5. Rejects over-refund exceeding original line amount", () => {
		const input: PartialRefundCalculationInput = {
			invoiceId: "inv-001",
			invoiceNumber: "АКТ-2026-8491",
			patientId: "pat-100",
			patientName: "Смирнова Елена Алексеевна",
			cashierFullName: "Кассир",
			paymentMethod: "card",
			items: [
				{
					id: "srv-1",
					name: "Консультация",
					unitPriceKop: 100000,
					quantity: 1,
					grossAmountKop: 100000,
					netAmountKop: 100000,
					alreadyRefundedKop: 100000, // already 100% refunded
				},
			],
			refundRequests: [
				{
					itemId: "srv-1",
					quantityToRefund: 1,
				},
			],
			reasonCategory: "patient_refusal",
		};

		const result = calculatePartialRefund(input);
		assert.equal(result.isValid, false);
		assert.ok(result.validationErrors.some((e) => e.includes("уже была полностью возвращена")));
	});
});
