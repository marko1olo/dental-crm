/**
 * order804nFiscalEngine.test.ts — Тесты фискализации 54-ФЗ, раздельной оплаты, чеков возврата прихода,
 * коррекционных чеков ФФД 1.2 и разделения кодов налогового вычета (Код 01 / Код 02).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	ANNUAL_TAX_DEDUCTION_LIMIT_RUB,
	calculateDenominationsTotalRub,
	calculateProportionalRefundAllocation,
	calculateSplitPaymentAllocation,
	calculateTaxDeductionBreakdown,
	formatFiscalItemName,
	generateFiscalCorrectionReceipt54Fz,
	generateFiscalReceipt54Fz,
	generateFiscalRefundReceipt54Fz,
	generateSbpPaymentQr,
	generateShiftCloseZReport54Fz,
	generateTaxDeductionCertificate,
	mapTreatmentItemsToFiscalReceipt,
	resolveTaxDeductionCategory,
	TAX_DEDUCTION_RELATIONSHIP_CODES,
} from "../order804nFiscalEngine";
import type { TreatmentPlanItem } from "../../treatment-plans/types";
import { parseKopecks } from "@dental/shared";
import {
	DEFAULT_TREATMENT_STAGES,
	generate54FzFiscalPayload,
	validateCheckoutSplit,
} from "../../payments/checkout/fastCheckoutEngine";

describe("order804nFiscalEngine — 54-FZ & SBP QR Fiscalization", () => {
	const sampleTreatmentItems: TreatmentPlanItem[] = [
		{
			id: "proc-1",
			toothNumber: 16,
			code804n: "A16.07.002.001",
			name: "Лечение глубокого кариеса",
			category: "Терапия",
			unitPriceRub: 4500,
			priceRub: 4000,
			quantity: 1,
			discountRub: 500,
			phase: 1,
			stageKind: "stage_1_therapy",
		},
		{
			id: "proc-2",
			toothNumber: 36,
			code804n: "A16.07.054.001",
			name: "Дентальная имплантация",
			category: "Хирургия",
			unitPriceRub: 45000,
			priceRub: 45000,
			quantity: 1,
			discountRub: 0,
			phase: 2,
			stageKind: "stage_2_surgery",
		},
		{
			id: "proc-3",
			toothNumber: 11,
			code804n: "A16.07.004.001",
			name: "Коронка из диоксида циркония",
			category: "Ортопедия",
			unitPriceRub: 25000,
			priceRub: 45000,
			quantity: 2,
			discountRub: 5000,
			phase: 3,
			stageKind: "stage_3_orthopedics",
		},
	];

	it("resolves tax deduction category: Code 02 for implants/bone graft, Code 01 for standard therapy/orthopedics", () => {
		assert.equal(resolveTaxDeductionCategory("A16.07.054.001"), "2"); // Имплантация -> Дорогостоящее
		assert.equal(resolveTaxDeductionCategory("A16.07.041"), "2"); // Костная пластика -> Дорогостоящее
		assert.equal(resolveTaxDeductionCategory("A16.07.041.002"), "2"); // Синус-лифтинг -> Дорогостоящее
		assert.equal(resolveTaxDeductionCategory(undefined, "Операция синус-лифтинга закрытый"), "2");
		assert.equal(resolveTaxDeductionCategory(undefined, "Установка дентального имплантата Straumann"), "2");
		assert.equal(resolveTaxDeductionCategory("A16.07.002.001"), "1"); // Кариес -> Стандартное
		assert.equal(resolveTaxDeductionCategory("A16.07.004.001"), "1"); // Коронка -> Стандартное
		assert.equal(resolveTaxDeductionCategory(undefined, "Профессиональная гигиена полости рта"), "1");
	});

	it("formats fiscal item name with tooth number and 804n code within 128 chars limit", () => {
		const name = formatFiscalItemName("Лечение кариеса", "A16.07.002.001", 16);
		assert.equal(name, "Лечение кариеса (зуб №16) [A16.07.002.001]");

		// Long name truncation
		const longName = "A".repeat(150);
		const truncated = formatFiscalItemName(longName, "A16.07.002.001", 16);
		assert.ok(truncated.length <= 128);
		assert.ok(truncated.endsWith("..."));
	});

	it("maps treatment plan items to compliant 54-FZ FFD 1.2 fiscal receipt items with kopeck-exact totals", () => {
		const result = mapTreatmentItemsToFiscalReceipt(sampleTreatmentItems);

		assert.equal(result.items.length, 3);
		// proc 1: (4500 * 1 - 500) = 4000 rub = 400000 kopecks (gross 450000)
		// proc 2: (45000 * 1 - 0) = 45000 rub = 4500000 kopecks (gross 4500000)
		// proc 3: (25000 * 2 - 5000) = 45000 rub = 4500000 kopecks (gross 5000000)
		// Total net: 4000 + 45000 + 45000 = 94000 rub = 9400000 kopecks
		// Total gross: 4500 + 45000 + 50000 = 99500 rub = 9950000 kopecks
		assert.equal(result.totalRub, 94000);
		assert.equal(result.totalKopecks, 9400000);
		assert.equal(result.grossRub, 99500);
		assert.equal(result.grossKopecks, 9950000);
		assert.equal(result.taxRateKopecks, 0); // Без НДС (ст. 149 НК РФ)
		assert.equal(result.hasExpensiveTreatment, true);
		assert.equal(result.taxDeductionSummaryCode, "2");

		// Check FFD 1.2 item invariants
		const item0 = result.items[0]!;
		assert.ok(item0);
		assert.equal(item0.vatRate, "vat_none");
		assert.equal(item0.taxRateKopecks, 0);
		assert.equal(item0.grossKopecks, 450000);
		assert.equal(item0.discountKopecks, 50000);
		assert.equal(item0.amountKopecks, 400000);
		assert.equal(item0.paymentSubject, "service");
		assert.equal(item0.paymentMethod, "full_payment");
		assert.equal(item0.quantityMeasure, "piece");
		assert.equal(item0.taxDeductionCategory, "1");

		const item1 = result.items[1]!;
		assert.ok(item1);
		assert.equal(item1.taxDeductionCategory, "2");
		assert.equal(item1.isMarkedItem, true); // Имплантация -> MDLP маркированный товар
		assert.equal(item1.paymentSubject, "goods_with_marking");
	});

	it("calculates split payment allocations with exact kopeck balance across Cash, Card, SBP, and Deposit", () => {
		const totalKopecks = parseKopecks(94000); // 94 000 ₽

		// Case 1: 100% Card
		const alloc1 = calculateSplitPaymentAllocation(totalKopecks, { cardRub: 94000 });
		assert.equal(alloc1.isFullyAllocated, true);
		assert.equal(alloc1.isOverallocated, false);
		assert.equal(alloc1.cardKopecks, 9400000);
		assert.equal(alloc1.remainingKopecks, 0);

		// Case 2: Split 4-ways (Cash 14000, Card 30000, SBP 40000, Deposit 10000)
		const alloc2 = calculateSplitPaymentAllocation(totalKopecks, {
			cashRub: 14000,
			cardRub: 30000,
			sbpRub: 40000,
			depositRub: 10000,
		});
		assert.equal(alloc2.isFullyAllocated, true);
		assert.equal(alloc2.isOverallocated, false);
		assert.equal(alloc2.cashRub, 14000);
		assert.equal(alloc2.cardRub, 30000);
		assert.equal(alloc2.sbpRub, 40000);
		assert.equal(alloc2.depositRub, 10000);
		assert.equal(alloc2.allocatedKopecks, 9400000);
		assert.equal(alloc2.remainingKopecks, 0);

		// Case 3: Incomplete allocation
		const alloc3 = calculateSplitPaymentAllocation(totalKopecks, {
			cashRub: 20000,
			cardRub: 30000,
		});
		assert.equal(alloc3.isFullyAllocated, false);
		assert.equal(alloc3.isOverallocated, false);
		assert.equal(alloc3.remainingKopecks, parseKopecks(44000));

		// Case 4: Overallocation
		const alloc4 = calculateSplitPaymentAllocation(totalKopecks, {
			cardRub: 100000,
		});
		assert.equal(alloc4.isFullyAllocated, false);
		assert.equal(alloc4.isOverallocated, true);
	});

	it("generates valid NSPK SBP dynamic QR payload with CRC16 checksum", () => {
		const sbp = generateSbpPaymentQr({
			amountKopecks: parseKopecks(40000), // 40 000 ₽ = 4000000 коп
			orderNumber: "CHK-2026-99123",
			bankMemberId: "100000000111",
		});

		assert.ok(sbp.payloadUrl.startsWith("https://qr.nspk.ru/CHK202699123?type=02&bank=100000000111&sum=4000000&cur=RUB&crc="));
		assert.equal(sbp.crc16.length, 4);
		assert.ok(/^[0-9A-F]{4}$/.test(sbp.crc16));
	});

	it("generates full 54-FZ fiscal receipt with all mandatory requisites and OFD verification url", () => {
		const receipt = generateFiscalReceipt54Fz({
			items: sampleTreatmentItems,
			splitPayment: {
				cardRub: 54000,
				sbpRub: 40000,
			},
			patientId: "patient-42",
			patientName: "Иванов Иван Иванович",
			customerContact: "+7 (999) 123-45-67",
			cashierFullName: "Сидорова Анна Павловна",
			clinicLegalName: "ООО «ДЕНТЕ КЛИНИКА»",
			clinicInn: "7701234567",
		});

		assert.equal(receipt.totalRub, 94000);
		assert.equal(receipt.totalKopecks, 9400000);
		assert.equal(receipt.grossRub, 99500);
		assert.equal(receipt.taxDeductionCategory, "2"); // Had implant
		assert.equal(receipt.operationType, "income");
		assert.equal(receipt.operationTypeName, "Приход");
		assert.equal(receipt.payments.isFullyAllocated, true);
		assert.equal(receipt.payments.cardRub, 54000);
		assert.equal(receipt.payments.sbpRub, 40000);
		assert.ok(receipt.sbpPayloadUrl?.includes("https://qr.nspk.ru/"));
		assert.ok(receipt.ofdUrl.startsWith("https://ofd.ru/check?fn="));
		assert.equal(receipt.fnSerial.length, 16);
		assert.equal(receipt.cashierFullName, "Сидорова Анна Павловна");
	});

	it("calculates tax deduction breakdown: Code 01 standard limit 150k vs Code 02 expensive unlimited", () => {
		const breakdown = calculateTaxDeductionBreakdown(sampleTreatmentItems, 0);

		// Code 01: proc 1 (4 000 ₽) + proc 3 (45 000 ₽) = 49 000 ₽
		// Code 02: proc 2 (45 000 ₽) = 45 000 ₽
		assert.equal(breakdown.code01Rub, 49000);
		assert.equal(breakdown.code01Kopecks, 4900000);
		assert.equal(breakdown.code02Rub, 45000);
		assert.equal(breakdown.code02Kopecks, 4500000);
		assert.equal(breakdown.totalRub, 94000);
		assert.equal(breakdown.hasCode01, true);
		assert.equal(breakdown.hasCode02, true);
		assert.equal(breakdown.dominantCode, "2");

		// Code 01 (49 000 ₽ <= 150 000 ₽ limit) -> 13% = 6 370 ₽
		assert.equal(breakdown.code01Refund13Rub, 6370);
		// Code 02 (45 000 ₽ unlimited) -> 13% = 5 850 ₽
		assert.equal(breakdown.code02Refund13Rub, 5850);
		// Total 13%: 6 370 + 5 850 = 12 220 ₽
		assert.equal(breakdown.refund13EstimateRub, 12220);

		// With existing claimed limit of 140 000 ₽: only 10 000 ₽ remaining for Code 01
		const limitedBreakdown = calculateTaxDeductionBreakdown(sampleTreatmentItems, 140000);
		assert.equal(limitedBreakdown.code01UsedFromLimitRub, 10000);
		assert.equal(limitedBreakdown.code01RemainingLimitRub, 0);
		assert.equal(limitedBreakdown.code01Refund13Rub, 1300); // 13% of 10 000 ₽
		assert.equal(limitedBreakdown.code02Refund13Rub, 5850); // Code 02 still full 45 000 ₽
		assert.equal(limitedBreakdown.refund13EstimateRub, 7150); // 1 300 + 5 850
	});

	it("generates tax deduction certificate KND 1151156 with payer relationships", () => {
		const receipt = generateFiscalReceipt54Fz({
			items: sampleTreatmentItems,
			splitPayment: { cardRub: 94000 },
			patientId: "pat-100",
			patientName: "Петров Петр Сергеевич",
			customerContact: "+7 (999) 000-00-00",
		});

		const certSpouse = generateTaxDeductionCertificate({
			receipt,
			payerFullName: "Петрова Елена Васильевна",
			payerInn: "770198765432",
			payerRelationship: "spouse",
			taxYear: 2026,
		});

		assert.equal(certSpouse.taxYear, 2026);
		assert.equal(certSpouse.payerFullName, "Петрова Елена Васильевна");
		assert.equal(certSpouse.payerInn, "770198765432");
		assert.equal(certSpouse.payerRelationship, "spouse");
		assert.equal(certSpouse.payerRelationshipCode, "2");
		assert.equal(certSpouse.payerRelationshipLabel, "Супруг / супруга");
		assert.equal(certSpouse.patientFullName, "Петров Петр Сергеевич");
		assert.equal(certSpouse.breakdown.code01Rub, 49000);
		assert.equal(certSpouse.breakdown.code02Rub, 45000);
		assert.equal(certSpouse.breakdown.refund13EstimateRub, 12220);
		assert.equal(certSpouse.receipts.length, 1);
		assert.equal(certSpouse.receipts[0]!.amountRub, 94000);
	});

	it("generates 54-FZ refund receipt upon cancellation of orthodontic/orthopedic stage with exact kopeck math", () => {
		// Patient refuses the 2 zirconium crowns (proc-3 = 45 000 ₽) from original 94 000 ₽ receipt
		const originalReceipt = generateFiscalReceipt54Fz({
			items: sampleTreatmentItems,
			splitPayment: {
				cashRub: 14000,
				cardRub: 40000,
				sbpRub: 40000,
			},
			patientId: "pat-100",
			patientName: "Иванов Иван",
			customerContact: "+7 999 111-22-33",
		});

		const refusedItems = [sampleTreatmentItems[2]!]; // proc-3: 45 000 ₽ (gross 50 000 ₽, discount 5 000 ₽)

		const refundReceipt = generateFiscalRefundReceipt54Fz({
			items: refusedItems,
			originalReceipt,
			refundReason: "Отказ пациента от ортопедического этапа (2 коронки)",
		});

		assert.equal(refundReceipt.operationType, "income_return");
		assert.equal(refundReceipt.operationTypeName, "Возврат прихода");
		assert.equal(refundReceipt.totalRub, 45000);
		assert.equal(refundReceipt.totalKopecks, 4500000);
		assert.equal(refundReceipt.grossRub, 50000);
		assert.equal(refundReceipt.grossKopecks, 5000000);
		assert.equal(refundReceipt.originalReceiptNumber, originalReceipt.receiptNumber);
		assert.equal(refundReceipt.refundReason, "Отказ пациента от ортопедического этапа (2 коронки)");
		assert.ok(refundReceipt.receiptNumber.startsWith("CHK-RET-"));
		assert.ok(refundReceipt.ofdUrl.includes("&n=2")); // ФФД 1.2 Возврат прихода = n=2

		// Verify proportional multi-tender refund allocation
		assert.equal(refundReceipt.payments.isFullyAllocated, true);
		assert.equal(
			refundReceipt.payments.cashKopecks +
				refundReceipt.payments.cardKopecks +
				refundReceipt.payments.sbpKopecks +
				refundReceipt.payments.depositKopecks,
			4500000,
		);
	});

	it("generates FFD 1.2 correction fiscal receipt with statutory base document tags (1173, 1178, 1179)", () => {
		const correctionReceipt = generateFiscalCorrectionReceipt54Fz({
			items: [sampleTreatmentItems[0]!], // 4 000 ₽
			splitPayment: { cashRub: 4000 },
			operationType: "income",
			correctionType: "self_initiated",
			correctionDocDate: "2026-08-24",
			correctionDocNumber: "АКТ-2026/08",
			correctionReason: "Коррекция неприменения ККТ при сбое питания",
			patientId: "pat-100",
			patientName: "Смирнов Алексей",
			customerContact: "+7 999 555-44-33",
		});

		assert.equal(correctionReceipt.isCorrection, true);
		assert.equal(correctionReceipt.operationType, "income");
		assert.equal(correctionReceipt.correctionType, "self_initiated");
		assert.equal(correctionReceipt.correctionTypeName, "Самостоятельно");
		assert.equal(correctionReceipt.correctionDocDate, "2026-08-24");
		assert.equal(correctionReceipt.correctionDocNumber, "АКТ-2026/08");
		assert.equal(correctionReceipt.correctionReason, "Коррекция неприменения ККТ при сбое питания");
		assert.equal(correctionReceipt.totalRub, 4000);
		assert.equal(correctionReceipt.totalKopecks, 400000);
		assert.equal(correctionReceipt.grossRub, 4500);
		assert.equal(correctionReceipt.grossKopecks, 450000);
		assert.ok(correctionReceipt.receiptNumber.startsWith("CHK-COR-"));
	});

	it("calculates instant cash change and shortage correctly for cash tender", () => {
		const totalKopecks = parseKopecks(3500); // 3 500 ₽

		// Case 1: Paid 5000 ₽ for 3500 ₽ cash portion -> Change 1500 ₽
		const alloc1 = calculateSplitPaymentAllocation(totalKopecks, {
			cashRub: 3500,
			receivedCashRub: 5000,
		});

		assert.equal(alloc1.cashRub, 3500);
		assert.equal(alloc1.receivedCashRub, 5000);
		assert.equal(alloc1.changeRub, 1500);
		assert.equal(alloc1.changeKopecks, parseKopecks(1500));
		assert.equal(alloc1.isCashShortage, false);

		// Case 2: Exact payment 3500 ₽ -> Change 0 ₽
		const alloc2 = calculateSplitPaymentAllocation(totalKopecks, {
			cashRub: 3500,
			receivedCashRub: 3500,
		});
		assert.equal(alloc2.changeRub, 0);
		assert.equal(alloc2.isCashShortage, false);

		// Case 3: Shortage (patient gave 3000 ₽ instead of 3500 ₽)
		const alloc3 = calculateSplitPaymentAllocation(totalKopecks, {
			cashRub: 3500,
			receivedCashRub: 3000,
		});
		assert.equal(alloc3.changeRub, 0);
		assert.equal(alloc3.isCashShortage, true);
		assert.equal(alloc3.cashShortageRub, 500);
	});

	it("handles DMS insurance split with patient co-payment across cash and card", () => {
		const totalKopecks = parseKopecks(50000); // 50 000 ₽ total bill

		// DMS Insurance covers 35 000 ₽, Patient co-pays 15 000 ₽ (10 000 card + 5 000 cash)
		const alloc = calculateSplitPaymentAllocation(totalKopecks, {
			insuranceRub: 35000,
			guaranteeLetterNumber: "ГП-2026/8412",
			cardRub: 10000,
			cashRub: 5000,
			receivedCashRub: 5000,
		});

		assert.equal(alloc.isFullyAllocated, true);
		assert.equal(alloc.isOverallocated, false);
		assert.equal(alloc.insuranceRub, 35000);
		assert.equal(alloc.patientCoPayRub, 15000);
		assert.equal(alloc.cardRub, 10000);
		assert.equal(alloc.cashRub, 5000);
		assert.equal(alloc.totalRub, 50000);
		assert.equal(alloc.remainingKopecks, 0);
		assert.equal(
			alloc.insuranceKopecks + alloc.patientCoPayKopecks,
			totalKopecks,
		);
	});

	it("generates 54-FZ receipt with DMS guarantee letter reference and co-pay information", () => {
		const receipt = generateFiscalReceipt54Fz({
			items: sampleTreatmentItems,
			splitPayment: {
				insuranceRub: 60000,
				guaranteeLetterNumber: "ГП-2026/9001",
				cardRub: 34000,
			},
			patientId: "patient-42",
			patientName: "Иванов Иван Иванович",
			customerContact: "+7 (999) 123-45-67",
			cashierFullName: "Сидорова Анна Павловна",
		});

		assert.equal(receipt.totalRub, 94000);
		assert.equal(receipt.insuranceCoveredRub, 60000);
		assert.equal(receipt.guaranteeLetterNumber, "ГП-2026/9001");
		assert.equal(receipt.patientCoPayRub, 34000);
		assert.equal(receipt.payments.isFullyAllocated, true);
	});

	it("handles family wallet deduction with kopeck-exact precision and 54-FZ Tag 1215 advance mapping", () => {
		// Total bill: 4 000.00 ₽ (Proc 1: Санация полости рта)
		const singleProcItems = sampleTreatmentItems.slice(0, 1);
		const mapped = mapTreatmentItemsToFiscalReceipt(singleProcItems);
		assert.equal(mapped.totalKopecks, 400000); // 4 000.00 ₽

		// Split payment: Family wallet 1 500.50 ₽ + Card 2 499.50 ₽
		const alloc = calculateSplitPaymentAllocation(mapped.totalKopecks, {
			familyWalletRub: 1500.50,
			cardRub: 2499.50,
		});

		assert.equal(alloc.familyWalletKopecks, 150050);
		assert.equal(alloc.cardKopecks, 249950);
		assert.equal(alloc.allocatedKopecks, 400000);
		assert.equal(alloc.isFullyAllocated, true);
		assert.equal(alloc.isOverallocated, false);
		assert.equal(alloc.remainingKopecks, 0);

		// Generate 54-FZ receipt with family wallet split
		const receipt = generateFiscalReceipt54Fz({
			items: singleProcItems,
			splitPayment: {
				familyWalletRub: 1500.50,
				cardRub: 2499.50,
			},
			patientId: "pat-family-1",
			patientName: "Смирнов Алексей Викторович",
			customerContact: "+7 (999) 555-44-33",
		});

		assert.equal(receipt.totalKopecks, 400000);
		assert.equal(receipt.payments.familyWalletKopecks, 150050);
		assert.equal(receipt.payments.cardKopecks, 249950);
		assert.equal(receipt.payments.isFullyAllocated, true);
	});

	it("calculates exact cash drawer amount from bill denominations and fractional coins breakdown", () => {
		const total = calculateDenominationsTotalRub({
			b5000: 3, // 15 000 ₽
			b2000: 2, // 4 000 ₽
			b1000: 5, // 5 000 ₽
			b500: 4,  // 2 000 ₽
			b200: 5,  // 1 000 ₽
			b100: 8,  // 800 ₽
			b50: 3,   // 150 ₽
			c10: 4,   // 40 ₽
			c5: 6,    // 30 ₽
			c2: 3,    // 6 ₽
			c1: 4,    // 4 ₽
			coinsFractionalRub: 0.50, // 0.50 ₽
		});

		// 15000 + 4000 + 5000 + 2000 + 1000 + 800 + 150 + 40 + 30 + 6 + 4 + 0.50 = 28 030.50 ₽
		assert.equal(total, 28030.50);
	});

	it("generates statutory 54-FZ shift close Z-report (Tag 1038) with POS acquirer, SBP QR, and advance offset reconciliation", () => {
		const zReport = generateShiftCloseZReport54Fz({
			shiftNumber: 42,
			cashierFullName: "Сидорова Анна Павловна",
			clinicLegalName: "ООО «ДЕНТЕ КЛИНИКА»",
			clinicInn: "7701234567",
			summary: {
				receivedRub: 145000.50,
				receivedCount: 6,
				cashRub: 25000.50,
				advanceRub: 10000,
				familyWalletRub: 15000,
				refundedRub: 5000,
				refundedCount: 1,
				byMethod: [
					{ method: "cash", amountRub: 25000.50, count: 2 },
					{ method: "card", amountRub: 80000, count: 3 },
					{ method: "online", amountRub: 40000, count: 1 },
				],
			},
		});

		assert.equal(zReport.shiftNumber, 42);
		assert.equal(zReport.incomeCount, 6);
		// Income total = 145 000.50 + 15 000 (family wallet advance offset) = 160 000.50 ₽
		assert.equal(zReport.incomeTotalRub, 160001); // Math.round(160000.50)
		assert.equal(zReport.incomeTotalKopecks, 16000050);
		assert.equal(zReport.incomeCashRub, 25000.50);
		assert.equal(zReport.incomeCashKopecks, 2500050);
		assert.equal(zReport.incomeCardRub, 80000);
		assert.equal(zReport.incomeSbpRub, 40000);
		assert.equal(zReport.incomeAdvanceOffsetRub, 15000);
		assert.equal(zReport.incomeReturnCount, 1);
		assert.equal(zReport.incomeReturnTotalRub, 5000);
		assert.equal(zReport.totalRevenueKopecks, 15500050);
		assert.equal(zReport.cashInDrawerCalculatedRub, 25000.50);
		assert.equal(zReport.unprintedDocumentsCount, 0);
		assert.equal(zReport.isShiftExpired24h, false);
		assert.ok(zReport.fnSerial.length >= 16);
		assert.ok(zReport.fiscalDocumentNumber.length > 0);
		assert.ok(zReport.fiscalSign.length > 0);
		assert.ok(zReport.ofdUrl.startsWith("https://ofd.ru/check?fn="));
	});

	it("handles 1-click stage checkout with exact kopeck allocation across all payment methods", () => {
		const stage1 = DEFAULT_TREATMENT_STAGES[1]!; // Stage 1 Therapy: 4 000.00 ₽ (400 000 kop)
		assert.equal(stage1.amountKop, 400000);

		// 1-Click SBP QR 100%
		const sbpValidation = validateCheckoutSplit({
			orderId: "CHK-STG-1",
			totalBillKop: stage1.amountKop,
			payments: [{ method: "sbp_qr", amountKop: stage1.amountKop }],
		});
		assert.equal(sbpValidation.isValid, true);
		assert.equal(sbpValidation.remainingDueKop, 0);

		// 1-Click Cash with 5 000 ₽ bill -> 1 000 ₽ change
		const cashValidation = validateCheckoutSplit({
			orderId: "CHK-STG-2",
			totalBillKop: stage1.amountKop,
			payments: [{ method: "cash", amountKop: stage1.amountKop }],
			cashTenderedKop: 500000,
		});
		assert.equal(cashValidation.isValid, true);
		assert.equal(cashValidation.cashChangeDueKop, 100000); // 1 000.00 ₽

		// FFD 1.2 payload generation
		const payload = generate54FzFiscalPayload({
			orderId: "CHK-STG-2",
			totalBillKop: stage1.amountKop,
			payments: [{ method: "cash", amountKop: stage1.amountKop }],
			patientPhone: "+7 (999) 777-66-55",
		});
		assert.equal(payload.ffdVersion, "1.2");
		assert.equal(payload.totalSumKop, 400000);
		assert.equal(payload.paymentsDistribution.cashKop, 400000);
		assert.equal(payload.paymentsDistribution.electronicKop, 0);
		assert.equal(payload.clientContact, "+7 (999) 777-66-55");
	});
});


