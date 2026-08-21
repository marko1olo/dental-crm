/**
 * order804nFiscalEngine.test.ts — Тесты фискализации 54-ФЗ, раздельной оплаты и СБП QR.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateSplitPaymentAllocation,
	formatFiscalItemName,
	generateFiscalReceipt54Fz,
	generateSbpPaymentQr,
	mapTreatmentItemsToFiscalReceipt,
	resolveTaxDeductionCategory,
} from "../order804nFiscalEngine";
import type { TreatmentPlanItem } from "../../treatment-plans/types";
import { parseKopecks } from "@dental/shared";

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
		assert.equal(resolveTaxDeductionCategory("A16.07.002.001"), "1"); // Кариес -> Стандартное
		assert.equal(resolveTaxDeductionCategory("A16.07.004.001"), "1"); // Коронка -> Стандартное
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
		// proc 1: (4500 * 1 - 500) = 4000 rub = 400000 kopecks
		// proc 2: (45000 * 1 - 0) = 45000 rub = 4500000 kopecks
		// proc 3: (25000 * 2 - 5000) = 45000 rub = 4500000 kopecks
		// Total: 4000 + 45000 + 45000 = 94000 rub = 9400000 kopecks
		assert.equal(result.totalRub, 94000);
		assert.equal(result.totalKopecks, 9400000);
		assert.equal(result.hasExpensiveTreatment, true);
		assert.equal(result.taxDeductionSummaryCode, "2");

		// Check FFD 1.2 item invariants
		const item0 = result.items[0]!;
		assert.ok(item0);
		assert.equal(item0.vatRate, "vat_none");
		assert.equal(item0.paymentSubject, "service");
		assert.equal(item0.paymentMethod, "full_payment");
		assert.equal(item0.quantityMeasure, "piece");
		assert.equal(item0.taxDeductionCategory, "1");

		const item1 = result.items[1]!;
		assert.ok(item1);
		assert.equal(item1.taxDeductionCategory, "2");
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
		assert.equal(receipt.taxDeductionCategory, "2"); // Had implant
		assert.equal(receipt.payments.isFullyAllocated, true);
		assert.equal(receipt.payments.cardRub, 54000);
		assert.equal(receipt.payments.sbpRub, 40000);
		assert.ok(receipt.sbpPayloadUrl?.includes("https://qr.nspk.ru/"));
		assert.ok(receipt.ofdUrl.startsWith("https://ofd.ru/check?fn="));
		assert.equal(receipt.fnSerial.length, 16);
		assert.equal(receipt.cashierFullName, "Сидорова Анна Павловна");
	});
});
