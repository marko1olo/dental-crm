import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildFiscalIdempotencyKey,
	calculateCashChange,
	compileFiscalDraftSummary,
	type FiscalItemDraft,
	getCashPresetSuggestions,
	type SplitTenderState,
	validateDataMatrixBarcode,
} from "./fiscal54fzEngine";

describe("Frontend 54-FZ (FFD 1.2) Fiscal Engine Tests", () => {
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

		// Total: 1500.50 + 1600.00 = 3100.50 RUB = 310,050 kopecks
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
		assert.equal(summary.totalRubFormatted, "3100.50");
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

		// Under-allocated: 3000 < 5000
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
		assert.equal(underSummary.isOverallocated, false);

		// Over-allocated: 6000 > 5000
		const overTenders: SplitTenderState = {
			cashRub: 6000.0,
			cardRub: 0,
			sbpRub: 0,
			advanceOffsetRub: 0,
			certificateRub: 0,
		};
		const overSummary = compileFiscalDraftSummary(items, overTenders);
		assert.equal(overSummary.isFullyAllocated, false);
		assert.equal(overSummary.isOverallocated, true);
		assert.equal(overSummary.remainingRub, -1000.0);
	});

	it("1.3 compileFiscalDraftSummary — Identifies Code 02 expensive treatment for dental implants", () => {
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

	it("1.4 validateDataMatrixBarcode — Validates and parses GS1 DataMatrix barcodes", () => {
		const validBarcode = "(01)03664798000016(21)1A2B3C4D5E6F7(91)ABCD(92)XYZ";
		const result = validateDataMatrixBarcode(validBarcode);

		assert.equal(result.isValid, true);
		assert.equal(result.gtin, "03664798000016");
		assert.equal(result.serialNumber, "1A2B3C4D5E6F7");
		assert.ok(result.matchedProduct);
		assert.ok(result.matchedProduct?.tradeName.includes("Ультракаин"));

		// Bad check digit
		const invalidGtinBarcode = "(01)03664798000019(21)1A2B3C4D5E6F7(91)ABCD(92)XYZ";
		const invalidResult = validateDataMatrixBarcode(invalidGtinBarcode);
		assert.equal(invalidResult.isValid, false);
		assert.ok(invalidResult.errorMessage?.includes("контрольная сумма"));
	});

	it("1.5 calculateCashChange & getCashPresetSuggestions — Fast Cashier change calculation", () => {
		// Change calculation: Required 2350 ₽, Patient tendered 3000 ₽ -> Change 650 ₽
		const changeResult = calculateCashChange(2350, 3000);
		assert.equal(changeResult.changeRub, 650);
		assert.equal(changeResult.changeKopecks, 65000);
		assert.equal(changeResult.isShortage, false);

		// Shortage calculation: Required 2350 ₽, Patient tendered 2000 ₽ -> Shortage 350 ₽
		const shortageResult = calculateCashChange(2350, 2000);
		assert.equal(shortageResult.changeRub, 0);
		assert.equal(shortageResult.isShortage, true);
		assert.equal(shortageResult.shortageRub, 350);

		// Cash preset suggestions
		const presets = getCashPresetSuggestions(2350);
		assert.ok(presets.includes(2350)); // Exact
		assert.ok(presets.includes(5000)); // Standard bill
		assert.ok(presets.includes(2500)); // Round to next 500
		assert.ok(presets.includes(3000)); // Round to next 1000

		// Composite Idempotency-Key
		const key = buildFiscalIdempotencyKey("uuid-123", { amount: 2350 });
		assert.ok(key.startsWith("uuid-123#"));
		assert.equal(key.split("#").length, 2);
	});
});

