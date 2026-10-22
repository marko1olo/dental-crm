import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	compileFiscalDraftSummary,
	type FiscalItemDraft,
	type SplitTenderState,
} from "../fiscal54fzEngine";

describe("Fiscal Receipt Calculation Tests", () => {
	it("1.1 compileFiscalDraftSummary — Exact kopeck arithmetic and tender balancing", () => {
		const items: FiscalItemDraft[] = [
			{
				id: "item-1",
				name: "Консультация стоматолога-терапевта",
				priceRub: 1500.5,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
			{
				id: "item-2",
				name: "Ультракаин Д-С форте 1.7 мл",
				priceRub: 800.0,
				quantity: 2,
				subject: "goods_with_marking",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
				markingCode: "(01)03664798000016(21)1A2B3C4D5E6F7(91)ABCD(92)XYZ",
			},
		];

		const balancedTenders: SplitTenderState = {
			cashRub: 1000.0,
			cardRub: 1100.5,
			sbpRub: 1000.0,
			advanceOffsetRub: 0,
			certificateRub: 0,
		};

		const summary = compileFiscalDraftSummary(items, balancedTenders);
		assert.equal(summary.totalKopecks, 310050);
		assert.equal(summary.totalRub, 3100.5);
		assert.equal(summary.allocatedKopecks, 310050);
		assert.equal(summary.remainingKopecks, 0);
		assert.equal(summary.isFullyAllocated, true);
		assert.equal(summary.isOverallocated, false);
		assert.equal(summary.markedItemsCount, 1);
		assert.equal(summary.itemsCount, 2);
	});

	it("1.2 compileFiscalDraftSummary — Detects remaining due and overallocation", () => {
		const items: FiscalItemDraft[] = [
			{
				id: "item-1",
				name: "Лечение кариеса",
				priceRub: 5000.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		];

		const underTenders: SplitTenderState = {
			cashRub: 3000.0,
			cardRub: 0,
			sbpRub: 0,
			advanceOffsetRub: 0,
			certificateRub: 0,
		};
		const underSummary = compileFiscalDraftSummary(items, underTenders);
		assert.equal(underSummary.isFullyAllocated, false);
		assert.equal(underSummary.remainingRub, 2000.0);

		const overTenders: SplitTenderState = {
			cashRub: 6000.0,
			cardRub: 0,
			sbpRub: 0,
			advanceOffsetRub: 0,
			certificateRub: 0,
		};
		const overSummary = compileFiscalDraftSummary(items, overTenders);
		assert.equal(overSummary.isOverallocated, true);
	});

	it("1.3 compileFiscalDraftSummary — Detects Code 02 expensive treatment", () => {
		const items: FiscalItemDraft[] = [
			{
				id: "item-1",
				name: "Установка дентального имплантата Nobel Biocare",
				priceRub: 45000.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		];
		const summary = compileFiscalDraftSummary(items, {
			cashRub: 45000.0,
			cardRub: 0,
			sbpRub: 0,
			advanceOffsetRub: 0,
			certificateRub: 0,
		});
		assert.equal(summary.overallTaxDeductionCategory, "2");
	});
});
