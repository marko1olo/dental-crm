import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	processOfflineFiscalBatch,
	type OfflineQueueFiscalItem,
	type BankRegistryTransaction,
	calculateFiscalPeriodStatementTotals,
	generateFiscalPeriodStatementHtml,
	exportFiscalPeriodStatementToCsv,
	DEFAULT_CLINIC_FISCAL_REQUISITES,
} from "./index.js";

describe("54-FZ (FFD 1.2) Offline Fiscal Batch Reconciler & Accounting Exports", () => {
	const sampleQueueItems: readonly OfflineQueueFiscalItem[] = [
		{
			id: "q-rec-1",
			paymentId: "pay-101",
			patientId: "pat-1",
			patientFullName: "Иванов Иван Иванович",
			timestampIso: "2026-08-20T09:15:00.000Z",
			operationType: "income",
			items: [
				{
					name: "Прием (осмотр, консультация) врача-стоматолога",
					priceRub: 2500,
					quantity: 1,
				},
			],
			tenders: {
				cashRub: 2500,
			},
		},
		{
			id: "q-rec-2",
			paymentId: "pay-102",
			patientId: "pat-2",
			patientFullName: "Петрова Анна Сергеевна",
			timestampIso: "2026-08-20T14:30:00.000Z",
			operationType: "income",
			items: [
				{
					name: "Лечение кариеса с пломбированием светоотверждаемым композитом",
					priceRub: 7800,
					quantity: 1,
				},
			],
			tenders: {
				cardRub: 7800,
			},
		},
		{
			id: "q-rec-3",
			paymentId: "pay-103",
			patientId: "pat-3",
			patientFullName: "Сидоров Михаил Павлович",
			timestampIso: "2026-08-20T18:45:00.000Z",
			operationType: "income",
			items: [
				{
					name: "Профессиональная гигиена полости рта AirFlow",
					priceRub: 4500,
					quantity: 1,
				},
			],
			tenders: {
				sbpRub: 4500,
			},
		},
		// Next day (> 24h from first receipt: 2026-08-20T09:15 to 2026-08-21T11:00 is ~25.75 hours)
		{
			id: "q-rec-4",
			paymentId: "pay-104",
			patientId: "pat-4",
			patientFullName: "Кузнецова Ольга Владимировна",
			timestampIso: "2026-08-21T11:00:00.000Z",
			operationType: "income",
			items: [
				{
					name: "Установка дентального имплантата Straumann",
					priceRub: 45000,
					quantity: 1,
				},
			],
			tenders: {
				advanceOffsetRub: 15000,
				cardRub: 30000,
			},
		},
		{
			id: "q-rec-5",
			paymentId: "pay-105",
			patientId: "pat-5",
			patientFullName: "Смирнов Алексей Викторович",
			timestampIso: "2026-08-21T16:20:00.000Z",
			operationType: "income_return",
			items: [
				{
					name: "Возврат за отмененную процедуру отбеливания",
					priceRub: 5000,
					quantity: 1,
				},
			],
			tenders: {
				cardRub: 5000,
			},
		},
	];

	it("1.1 processOfflineFiscalBatch — Exact kopeck arithmetic across multiple offline receipts", () => {
		const result = processOfflineFiscalBatch(sampleQueueItems, {
			cashierFullName: "Сидорова А. П.",
			clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		});

		assert.equal(result.totalItemsCount, 5);
		assert.equal(result.processedCount, 5);
		assert.equal(result.duplicateCount, 0);
		assert.equal(result.failedCount, 0);

		// Income: 2500 + 7800 + 4500 + 45000 = 59800 ₽ (5 980 000 kop)
		// Return: 5000 ₽ (500 000 kop)
		// Net Revenue: 59800 - 5000 = 54800 ₽ (5 480 000 kop)
		assert.equal(result.totalGrossRub, 59800);
		assert.equal(result.totalGrossKopecks, 5980000);
		assert.equal(result.totalNetRub, 54800);
		assert.equal(result.totalNetKopecks, 5480000);

		// Cash: 2500 ₽ (250 000 kop)
		assert.equal(result.totalCashRub, 2500);
		assert.equal(result.totalCashKopecks, 250000);

		// Electronic (Card + SBP - Return Card): (7800 + 4500 + 30000) - 5000 = 37300 ₽
		assert.equal(result.totalElectronicRub, 37300);
		assert.equal(result.totalElectronicKopecks, 3730000);

		// Advance Offset: 15000 ₽
		assert.equal(result.totalAdvanceOffsetRub, 15000);
		assert.equal(result.totalAdvanceOffsetKopecks, 1500000);
	});

	it("1.2 Automatic 24-hour shift partitioning according to 54-FZ (Art. 4.3)", () => {
		const result = processOfflineFiscalBatch(sampleQueueItems, {
			startingShiftNumber: 10,
			startingFiscalDocNumber: 501,
		});

		// Receipts 1..3 belong to Shift 10 (2026-08-20); Receipts 4..5 belong to Shift 11 (2026-08-21)
		assert.equal(result.shifts.length, 2);

		const shift1 = result.shifts[0]!;
		assert.equal(shift1.shiftNumber, 10);
		assert.equal(shift1.receipts.length, 3);
		assert.equal(shift1.zReport.incomeCount, 3);
		assert.equal(shift1.zReport.incomeTotalRub, 14800); // 2500 + 7800 + 4500
		assert.equal(shift1.zReport.incomeCashRub, 2500);
		assert.equal(shift1.zReport.incomeCardRub, 7800);
		assert.equal(shift1.zReport.incomeSbpRub, 4500);
		assert.equal(shift1.zReport.netRevenueRub, 14800);
		assert.equal(shift1.zReport.cashInDrawerRub, 2500);
		assert.equal(shift1.zReport.isBalanced, true);
		assert.ok(shift1.zReport.zReportTapeText58mm.includes("ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ"));
		assert.ok(shift1.zReport.zReportTapeText80mm.includes("ШИРОКАЯ ЛЕНТА 80 ММ"));

		const shift2 = result.shifts[1]!;
		assert.equal(shift2.shiftNumber, 11);
		assert.equal(shift2.receipts.length, 2);
		assert.equal(shift2.zReport.incomeCount, 1);
		assert.equal(shift2.zReport.incomeReturnCount, 1);
		assert.equal(shift2.zReport.incomeTotalRub, 45000);
		assert.equal(shift2.zReport.incomeReturnTotalRub, 5000);
		assert.equal(shift2.zReport.netRevenueRub, 40000);
		assert.equal(shift2.zReport.isBalanced, true);
	});

	it("1.3 Deduplication & Idempotency: duplicate IDs and identical signatures are safely skipped", () => {
		const itemsWithDuplicates: readonly OfflineQueueFiscalItem[] = [
			sampleQueueItems[0]!,
			sampleQueueItems[0]!, // Exact duplicate item ID
			sampleQueueItems[1]!,
			{
				...sampleQueueItems[1]!,
				id: "q-rec-duplicate-payment",
				paymentId: sampleQueueItems[1]!.paymentId, // Same payment ID
			},
			{
				...sampleQueueItems[2]!,
				id: "q-rec-new-unique",
				paymentId: "pay-unique-new",
			},
		];

		const result = processOfflineFiscalBatch(itemsWithDuplicates);
		assert.equal(result.totalItemsCount, 5);
		assert.equal(result.processedCount, 3);
		assert.equal(result.duplicateCount, 2);
		assert.equal(result.skippedDuplicates.length, 2);
		assert.equal(result.skippedDuplicates[0]?.status, "skipped_duplicate");
	});

	it("1.4 Banking Reconciliation (Acquiring & SBP) matches exact kopecks", () => {
		// Electronic income: 7800 + 4500 + 30000 = 42300 ₽; return: 5000 ₽; Net electronic = 37300 ₽ (Cards: 32800 ₽, SBP: 4500 ₽)
		const bankRegistry: readonly BankRegistryTransaction[] = [
			{
				transactionId: "tx-bank-1",
				dateIso: "2026-08-20T14:30:05.000Z",
				amountRub: 7800,
				type: "card",
				rrn: "608200192831",
			},
			{
				transactionId: "tx-bank-2",
				dateIso: "2026-08-20T18:45:10.000Z",
				amountRub: 4500,
				type: "sbp",
				rrn: "608200192832",
			},
			{
				transactionId: "tx-bank-3",
				dateIso: "2026-08-21T11:00:15.000Z",
				amountRub: 30000,
				type: "card",
				rrn: "608210192833",
			},
			{
				transactionId: "tx-bank-4",
				dateIso: "2026-08-21T16:20:20.000Z",
				amountRub: -5000,
				type: "card",
				rrn: "608210192834",
			},
		];

		const result = processOfflineFiscalBatch(sampleQueueItems, {
			bankRegistry,
		});

		assert.equal(result.reconciliation.status, "reconciled_exact");
		assert.equal(result.reconciliation.isMatched, true);
		assert.equal(result.reconciliation.discrepancyKopecks, 0);
		assert.equal(result.reconciliation.discrepancyRub, 0);
		assert.ok(result.reconciliation.summaryText.includes("100% совпадение"));
	});

	it("1.5 Banking Reconciliation flags discrepancies when terminal amount does not match", () => {
		const bankRegistryWithGap: readonly BankRegistryTransaction[] = [
			{
				transactionId: "tx-bank-1",
				dateIso: "2026-08-20T14:30:05.000Z",
				amountRub: 7800,
				type: "card",
			},
		];

		const result = processOfflineFiscalBatch(sampleQueueItems, {
			bankRegistry: bankRegistryWithGap,
		});

		assert.equal(result.reconciliation.status, "discrepancy_detected");
		assert.equal(result.reconciliation.isMatched, false);
		assert.notEqual(result.reconciliation.discrepancyKopecks, 0);
		assert.ok(result.reconciliation.summaryText.includes("Обнаружено расхождение"));
	});

	it("1.6 generateFiscalPeriodStatementHtml — Generates valid A4 Landscape print statement", () => {
		const html = generateFiscalPeriodStatementHtml({
			statementNumber: "ВЕД-2026-08/1",
			periodStart: "2026-08-01",
			periodEnd: "2026-08-31",
			shifts: [
				{
					shiftNumber: 10,
					date: "2026-08-20",
					cashierFullName: "Сидорова А. П.",
					receiptsCount: 3,
					cashIncomeRub: 2500,
					cashIncomeKopecks: 250000,
					cardIncomeRub: 7800,
					cardIncomeKopecks: 780000,
					sbpIncomeRub: 4500,
					sbpIncomeKopecks: 450000,
					advanceOffsetIncomeRub: 0,
					advanceOffsetIncomeKopecks: 0,
					returnsTotalRub: 0,
					returnsTotalKopecks: 0,
					shiftRevenueTotalRub: 14800,
					shiftRevenueTotalKopecks: 1480000,
				},
				{
					shiftNumber: 11,
					date: "2026-08-21",
					cashierFullName: "Сидорова А. П.",
					receiptsCount: 2,
					cashIncomeRub: 0,
					cashIncomeKopecks: 0,
					cardIncomeRub: 30000,
					cardIncomeKopecks: 3000000,
					sbpIncomeRub: 0,
					sbpIncomeKopecks: 0,
					advanceOffsetIncomeRub: 15000,
					advanceOffsetIncomeKopecks: 1500000,
					returnsTotalRub: 5000,
					returnsTotalKopecks: 500000,
					shiftRevenueTotalRub: 40000,
					shiftRevenueTotalKopecks: 4000000,
				},
			],
			bankStatementTotalRub: 42300,
			bankAcquiringFeeRub: 634.50,
			cashierFullName: "Сидорова А. П.",
			chiefAccountantFullName: "Кузнецова Е. И.",
			chiefExecutiveFullName: "Смирнов А. В.",
		});

		assert.ok(html.includes("Сводная ведомость фискальных операций"));
		assert.ok(html.includes("ВЕД-2026-08/1"));
		assert.ok(html.includes("Смена № 10"));
		assert.ok(html.includes("Смена № 11"));
		assert.ok(html.includes("ИТОГО ЗА ПЕРИОД"));
		assert.ok(html.includes("Главный бухгалтер"));
		assert.ok(html.includes("Кузнецова Е. И."));
		assert.ok(html.includes("Смирнов А. В."));
		assert.ok(html.includes("size: A4 landscape"));
	});

	it("1.7 exportFiscalPeriodStatementToCsv — Exports RFC 4180 CSV with UTF-8 BOM", () => {
		const csv = exportFiscalPeriodStatementToCsv({
			statementNumber: "101",
			periodStart: "2026-08-20",
			periodEnd: "2026-08-21",
			shifts: [
				{
					shiftNumber: 10,
					date: "2026-08-20",
					cashierFullName: "Сидорова А. П.",
					receiptsCount: 3,
					cashIncomeRub: 2500,
					cashIncomeKopecks: 250000,
					cardIncomeRub: 7800,
					cardIncomeKopecks: 780000,
					sbpIncomeRub: 4500,
					sbpIncomeKopecks: 450000,
					advanceOffsetIncomeRub: 0,
					advanceOffsetIncomeKopecks: 0,
					returnsTotalRub: 0,
					returnsTotalKopecks: 0,
					shiftRevenueTotalRub: 14800,
					shiftRevenueTotalKopecks: 1480000,
				},
			],
		});

		// Must start with UTF-8 BOM for 1C/Excel
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("СВОДНАЯ ВЕДОМОСТЬ ФИСКАЛЬНЫХ ОПЕРАЦИЙ"));
		assert.ok(csv.includes("Сидорова А. П."));
		assert.ok(csv.includes("14800.00"));
		assert.ok(csv.includes("ИТОГО ЗА ПЕРИОД"));
		assert.ok(csv.includes("РАСШИФРОВКА СВЕРКИ С БАНКОВСКОЙ ВЫПИСКОЙ"));
	});
});
