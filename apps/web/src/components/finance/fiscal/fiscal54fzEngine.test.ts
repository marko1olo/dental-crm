import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateThreeSourceSplit,
	compile54FzShiftCloseZReport,
	generate54FzZReportReceiptTapeText,
} from "./fiscal54fzEngine";

describe("Frontend Fiscal Engine Core Suite", () => {
	it("1.1 compile54FzShiftCloseZReport — Daily Shift Close balancing", () => {
		const shiftReceipts = [
			{
				id: "rec-1",
				operationType: "income" as const,
				totalRub: 5000.0,
				tenders: { cashRub: 5000.0, cardRub: 0, sbpRub: 0, advanceOffsetRub: 0, certificateRub: 0 },
			},
			{
				id: "rec-2",
				operationType: "income" as const,
				totalRub: 20000.0,
				tenders: { cashRub: 0, cardRub: 12000.0, sbpRub: 8000.0, advanceOffsetRub: 0, certificateRub: 0 },
			},
			{
				id: "rec-3",
				operationType: "income" as const,
				totalRub: 20000.0,
				tenders: { cashRub: 0, cardRub: 0, sbpRub: 5000.0, advanceOffsetRub: 15000.0, certificateRub: 0 },
			},
			{
				id: "rec-4",
				operationType: "income" as const,
				totalRub: 10000.0,
				tenders: { cashRub: 3000.0, cardRub: 0, sbpRub: 0, advanceOffsetRub: 0, familyWalletRub: 7000.0, certificateRub: 0 },
			},
			{
				id: "rec-5",
				operationType: "income_return" as const,
				totalRub: 2000.0,
				tenders: { cashRub: 2000.0, cardRub: 0, sbpRub: 0, advanceOffsetRub: 0, certificateRub: 0 },
			},
			{
				id: "rec-6",
				operationType: "income_return" as const,
				totalRub: 4000.0,
				tenders: { cashRub: 0, cardRub: 4000.0, sbpRub: 0, advanceOffsetRub: 0, certificateRub: 0 },
			},
		];

		const zReport = compile54FzShiftCloseZReport(shiftReceipts, 42);

		assert.equal(zReport.shiftNumber, 42);
		assert.equal(zReport.incomeCount, 4);
		assert.equal(zReport.incomeCashRub, 8000.0);
		assert.equal(zReport.incomeCashKopecks, 800000);
		assert.equal(zReport.incomeElectronicRub, 25000.0);
		assert.equal(zReport.incomeElectronicKopecks, 2500000);
		assert.equal(zReport.incomeAdvanceOffsetRub, 22000.0);
		assert.equal(zReport.incomeAdvanceOffsetKopecks, 2200000);
		assert.equal(zReport.incomeTotalRub, 55000.0);
		assert.equal(zReport.incomeTotalKopecks, 5500000);
		assert.equal(zReport.incomeReturnCount, 2);
	});

	it("1.2 calculateThreeSourceSplit — 3-Source multi-tender payment", () => {
		const split = calculateThreeSourceSplit(10000, { cardPercent: 50, sbpPercent: 25, cashPercent: 25 });
		assert.equal(split.cardRub, 5000);
		assert.equal(split.sbpRub, 2500);
		assert.equal(split.cashRub, 2500);
		assert.equal(split.totalKopecks, 1000000);
	});

	it("1.3 generate54FzZReportReceiptTapeText — Thermal receipt tape generation", () => {
		const shiftReceipts = [
			{
				id: "rec-1",
				operationType: "income" as const,
				totalRub: 8000.0,
				tenders: { cashRub: 8000.0, cardRub: 0, sbpRub: 0, advanceOffsetRub: 0, certificateRub: 0 },
			},
			{
				id: "rec-2",
				operationType: "income" as const,
				totalRub: 25000.0,
				tenders: { cashRub: 0, cardRub: 15000.0, sbpRub: 10000.0, advanceOffsetRub: 0, certificateRub: 0 },
			},
			{
				id: "rec-3",
				operationType: "income_return" as const,
				totalRub: 2000.0,
				tenders: { cashRub: 2000.0, cardRub: 0, sbpRub: 0, advanceOffsetRub: 0, certificateRub: 0 },
			},
		];

		const summary = compile54FzShiftCloseZReport(shiftReceipts, 42);

		const tape58 = generate54FzZReportReceiptTapeText({
			summary,
			clinicLegalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			clinicInn: "7701234567",
			cashierFullName: "Сидорова А.П.",
			tapeWidth: "58mm",
		});

		assert.ok(tape58.includes("ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ"));
		assert.ok(tape58.includes("СМЕНА:"));
		assert.ok(tape58.includes("№ 42"));
	});
});
