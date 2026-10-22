import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	compile54FzFiscalTags,
	compileFiscalDraftSummary,
	type FiscalItemDraft,
	type SplitTenderState,
} from "../fiscal54fzEngine";

describe("Fiscal Shift & Family Balance Tests", () => {
	it("1.1 compile54FzFiscalTags — Family balance offset (Tag 1215) and Card/SBP surcharge (Tag 1081)", () => {
		const mixedTenders: SplitTenderState = {
			cashRub: 1000.0,
			cardRub: 2450.0,
			sbpRub: 4000.75,
			advanceOffsetRub: 0,
			familyWalletRub: 5000.0,
			certificateRub: 0,
		};

		const expectedTotalKopecks = 1245075;
		const tags = compile54FzFiscalTags(mixedTenders, expectedTotalKopecks);

		assert.equal(tags.tag1031CashKopecks, 100000);
		assert.equal(tags.tag1031CashRub, 1000.0);
		assert.equal(tags.tag1081ElectronicKopecks, 645075);
		assert.equal(tags.tag1081ElectronicRub, 6450.75);
		assert.equal(tags.tag1215PrepaidKopecks, 500000);
		assert.equal(tags.tag1215PrepaidRub, 5000.0);
		assert.equal(tags.totalTenderKopecks, 1245075);
		assert.equal(tags.isBalanced, true);
	});

	it("1.2 compileFiscalDraftSummary — Mixed Family Balance and SBP QR allocation parity", () => {
		const items: FiscalItemDraft[] = [
			{
				id: "item-composite-1",
				name: "Профессиональная гигиена полости рта и AirFlow",
				priceRub: 7500.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
			{
				id: "item-composite-2",
				name: "Лечение глубокого кариеса с реставрацией Estelite Asteria",
				priceRub: 8500.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		];

		const tenders: SplitTenderState = {
			cashRub: 0,
			cardRub: 0,
			sbpRub: 6000.0,
			advanceOffsetRub: 0,
			familyWalletRub: 10000.0,
			certificateRub: 0,
		};

		const summary = compileFiscalDraftSummary(items, tenders);

		assert.equal(summary.totalKopecks, 1600000);
		assert.equal(summary.totalRub, 16000.0);
		assert.equal(summary.allocatedKopecks, 1600000);
		assert.equal(summary.remainingKopecks, 0);
		assert.equal(summary.isFullyAllocated, true);
		assert.equal(summary.isOverallocated, false);
	});
});
