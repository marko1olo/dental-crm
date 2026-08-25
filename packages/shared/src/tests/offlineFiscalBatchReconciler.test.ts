import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	processOfflineFiscalBatch,
	type OfflineQueueFiscalItem,
	type BankRegistryTransaction,
} from "../fiscal/offlineFiscalBatchReconciler.js";

describe("Shared 54-FZ Offline Fiscal Batch Reconciler Suite", () => {
	it("1.1 Batch processes multi-tender receipts with exact integer kopecks and generates Z-reports", () => {
		const baseDate = new Date("2026-08-20T10:00:00.000Z");

		const queue: OfflineQueueFiscalItem[] = [
			{
				id: "item-1",
				paymentId: "pay-1",
				patientId: "patient-1",
				patientFullName: "Иванов И.И.",
				timestampIso: new Date(baseDate.getTime() + 1000 * 60 * 10).toISOString(),
				operationType: "income",
				items: [
					{
						id: "line-1",
						name: "Лечение кариеса",
						priceRub: 4500,
						quantity: 1,
					},
				],
				tenders: {
					cashRub: 4500,
				},
			},
			{
				id: "item-2",
				paymentId: "pay-2",
				patientId: "patient-2",
				patientFullName: "Петрова А.С.",
				timestampIso: new Date(baseDate.getTime() + 1000 * 60 * 60).toISOString(),
				operationType: "income",
				items: [
					{
						id: "line-2",
						name: "Профгигиена полости рта",
						priceRub: 6000,
						quantity: 1,
					},
				],
				tenders: {
					cardRub: 4000,
					sbpRub: 2000,
				},
			},
			{
				id: "item-3",
				paymentId: "pay-3",
				patientId: "patient-3",
				patientFullName: "Сидоров М.П.",
				timestampIso: new Date(baseDate.getTime() + 1000 * 60 * 120).toISOString(),
				operationType: "income",
				items: [
					{
						id: "line-3",
						name: "Установка коронки E-Max",
						priceRub: 15000,
						quantity: 1,
					},
				],
				tenders: {
					advanceOffsetRub: 5000,
					cardRub: 10000,
				},
			},
		];

		const result = processOfflineFiscalBatch(queue, {
			clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			clinicInn: "7701234567",
			cashierFullName: "Сидорова А.П.",
			startingShiftNumber: 10,
		});

		assert.equal(result.totalItemsCount, 3);
		assert.equal(result.processedCount, 3);
		assert.equal(result.duplicateCount, 0);
		assert.equal(result.failedCount, 0);

		// Total Gross & Net: 4500 + 6000 + 15000 = 25500 ₽
		assert.equal(result.totalGrossRub, 25500);
		assert.equal(result.totalGrossKopecks, 2550000);
		assert.equal(result.totalNetRub, 25500);

		// Tenders breakdown
		assert.equal(result.totalCashRub, 4500);
		assert.equal(result.totalElectronicRub, 16000); // 4000 (card) + 2000 (sbp) + 10000 (card)
		assert.equal(result.totalAdvanceOffsetRub, 5000);

		// Exactly 1 shift created (all within 2 hours < 24h limit)
		assert.equal(result.shifts.length, 1);
		const shift = result.shifts[0]!;
		assert.equal(shift.shiftNumber, 10);
		assert.equal(shift.receipts.length, 3);
		assert.equal(shift.zReport.incomeCount, 3);
		assert.equal(shift.zReport.incomeTotalRub, 25500);
		assert.equal(shift.zReport.incomeCashRub, 4500);
		assert.equal(shift.zReport.incomeElectronicRub, 16000);
		assert.equal(shift.zReport.incomeAdvanceOffsetRub, 5000);
		assert.equal(shift.zReport.isBalanced, true);
		assert.ok(shift.zReport.zReportTapeText58mm.includes("ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ"));
	});

	it("1.2 Enforces strict idempotency and skips duplicate IDs and identical payload signatures", () => {
		const baseDate = new Date("2026-08-20T12:00:00.000Z");

		const queue: OfflineQueueFiscalItem[] = [
			{
				id: "item-dup-1",
				paymentId: "pay-100",
				patientId: "patient-1",
				timestampIso: baseDate.toISOString(),
				operationType: "income",
				items: [{ name: "Осмотр и консультация", priceRub: 1000, quantity: 1 }],
				tenders: { cashRub: 1000 },
			},
			// Exact duplicate by ID
			{
				id: "item-dup-1",
				paymentId: "pay-100",
				patientId: "patient-1",
				timestampIso: baseDate.toISOString(),
				operationType: "income",
				items: [{ name: "Осмотр и консультация", priceRub: 1000, quantity: 1 }],
				tenders: { cashRub: 1000 },
			},
			// Duplicate by paymentId
			{
				id: "item-dup-2",
				paymentId: "pay-100",
				patientId: "patient-1",
				timestampIso: baseDate.toISOString(),
				operationType: "income",
				items: [{ name: "Осмотр и консультация", priceRub: 1000, quantity: 1 }],
				tenders: { cashRub: 1000 },
			},
			// Unique item
			{
				id: "item-unique-3",
				paymentId: "pay-101",
				patientId: "patient-2",
				timestampIso: new Date(baseDate.getTime() + 1000 * 60).toISOString(),
				operationType: "income",
				items: [{ name: "Прицельный снимок", priceRub: 500, quantity: 1 }],
				tenders: { cashRub: 500 },
			},
		];

		const result = processOfflineFiscalBatch(queue, {
			existingProcessedIds: ["prior-processed-pay-001"],
		});

		assert.equal(result.totalItemsCount, 4);
		assert.equal(result.processedCount, 2); // 1st and 4th
		assert.equal(result.duplicateCount, 2); // 2nd and 3rd
		assert.equal(result.skippedDuplicates.length, 2);
		assert.equal(result.skippedDuplicates[0]?.reason, "duplicate_id");
		assert.equal(result.totalNetRub, 1500); // 1000 + 500
	});

	it("1.3 Automatically partitions into multiple 24-hour fiscal shifts under 54-FZ", () => {
		const day1 = new Date("2026-08-20T09:00:00.000Z");
		const day2 = new Date("2026-08-21T11:00:00.000Z"); // 26 hours later (>24h limit)
		const day3 = new Date("2026-08-23T10:00:00.000Z"); // 2 days later

		const queue: OfflineQueueFiscalItem[] = [
			{
				id: "day1-rec",
				patientId: "pat-1",
				timestampIso: day1.toISOString(),
				operationType: "income",
				items: [{ name: "Пломба", priceRub: 5000, quantity: 1 }],
				tenders: { cardRub: 5000 },
			},
			{
				id: "day2-rec",
				patientId: "pat-2",
				timestampIso: day2.toISOString(),
				operationType: "income",
				items: [{ name: "Удаление зуба", priceRub: 3000, quantity: 1 }],
				tenders: { cashRub: 3000 },
			},
			{
				id: "day3-rec",
				patientId: "pat-3",
				timestampIso: day3.toISOString(),
				operationType: "income",
				items: [{ name: "Имплантация", priceRub: 40000, quantity: 1 }],
				tenders: { sbpRub: 40000 },
			},
		];

		const result = processOfflineFiscalBatch(queue, {
			startingShiftNumber: 1,
		});

		assert.equal(result.processedCount, 3);
		// 3 distinct shifts created
		assert.equal(result.shifts.length, 3);

		// Shift 1
		assert.equal(result.shifts[0]?.shiftNumber, 1);
		assert.equal(result.shifts[0]?.zReport.incomeElectronicRub, 5000);

		// Shift 2
		assert.equal(result.shifts[1]?.shiftNumber, 2);
		assert.equal(result.shifts[1]?.zReport.incomeCashRub, 3000);

		// Shift 3
		assert.equal(result.shifts[2]?.shiftNumber, 3);
		assert.equal(result.shifts[2]?.zReport.incomeElectronicRub, 40000);
	});

	it("1.4 Reconciles bank acquiring & SBP registry with exact zero-discrepancy confirmation", () => {
		const baseDate = new Date("2026-08-20T14:00:00.000Z");

		const queue: OfflineQueueFiscalItem[] = [
			{
				id: "item-card-1",
				patientId: "pat-1",
				timestampIso: baseDate.toISOString(),
				operationType: "income",
				items: [{ name: "Терапия", priceRub: 12000, quantity: 1 }],
				tenders: { cardRub: 12000 },
			},
			{
				id: "item-sbp-2",
				patientId: "pat-2",
				timestampIso: new Date(baseDate.getTime() + 1000 * 60 * 30).toISOString(),
				operationType: "income",
				items: [{ name: "Ортопедия", priceRub: 8000, quantity: 1 }],
				tenders: { sbpRub: 8000 },
			},
		];

		// Bank transactions matching exactly 12000 (card) + 8000 (sbp) = 20000 ₽
		const bankRegistry: BankRegistryTransaction[] = [
			{
				transactionId: "bank-tx-01",
				dateIso: baseDate.toISOString(),
				amountRub: 12000,
				type: "card",
				rrn: "123456789012",
			},
			{
				transactionId: "bank-tx-02",
				dateIso: new Date(baseDate.getTime() + 1000 * 60 * 30).toISOString(),
				amountRub: 8000,
				type: "sbp",
				rrn: "987654321098",
			},
		];

		const result = processOfflineFiscalBatch(queue, { bankRegistry });

		assert.equal(result.reconciliation.isMatched, true);
		assert.equal(result.reconciliation.status, "reconciled_exact");
		assert.equal(result.reconciliation.discrepancyRub, 0);
		assert.ok(result.reconciliation.summaryText.includes("Сверка без расхождений: 0.00 ₽"));
	});

	it("1.5 Detects bank registry discrepancies with exact kopeck variance reporting", () => {
		const baseDate = new Date("2026-08-20T14:00:00.000Z");

		const queue: OfflineQueueFiscalItem[] = [
			{
				id: "item-card-1",
				patientId: "pat-1",
				timestampIso: baseDate.toISOString(),
				operationType: "income",
				items: [{ name: "Терапия", priceRub: 10000, quantity: 1 }],
				tenders: { cardRub: 10000 },
			},
		];

		// Bank registry has 11500 ₽ (+1500 ₽ discrepancy)
		const bankRegistry: BankRegistryTransaction[] = [
			{
				transactionId: "bank-tx-01",
				dateIso: baseDate.toISOString(),
				amountRub: 11500,
				type: "card",
			},
		];

		const result = processOfflineFiscalBatch(queue, { bankRegistry });

		assert.equal(result.reconciliation.isMatched, false);
		assert.equal(result.reconciliation.status, "discrepancy_detected");
		assert.equal(result.reconciliation.discrepancyRub, 1500);
		assert.ok(/Обнаружено расхождение:\s*\+1[\s\u00a0\u202f]?500[,.]00\s*₽/.test(result.reconciliation.summaryText));
	});
});
