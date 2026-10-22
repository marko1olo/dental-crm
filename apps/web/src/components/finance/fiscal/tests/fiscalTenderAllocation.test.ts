import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildFiscalIdempotencyKey,
	calculateAdvanceStagePrepayment,
	calculateCashChange,
	calculateFinalSettlementWithAdvanceOffset,
	type FiscalItemDraft,
	getCashPresetSuggestions,
	validateDataMatrixBarcode,
} from "../fiscal54fzEngine";

describe("Fiscal Tender Allocation Tests", () => {
	it("1.1 validateDataMatrixBarcode — Validates and parses GS1 DataMatrix barcodes", () => {
		const validBarcode = "(01)03664798000016(21)1A2B3C4D5E6F7(91)ABCD(92)XYZ";
		const result = validateDataMatrixBarcode(validBarcode);

		assert.equal(result.isValid, true);
		assert.equal(result.gtin, "03664798000016");
		assert.equal(result.serialNumber, "1A2B3C4D5E6F7");
		assert.ok(result.matchedProduct);
		assert.ok(result.matchedProduct?.tradeName.includes("Ультракаин"));

		const invalidGtinBarcode = "(01)03664798000019(21)1A2B3C4D5E6F7(91)ABCD(92)XYZ";
		const invalidResult = validateDataMatrixBarcode(invalidGtinBarcode);
		assert.equal(invalidResult.isValid, false);
	});

	it("1.2 calculateCashChange & getCashPresetSuggestions — Fast Cashier change calculation", () => {
		const changeResult = calculateCashChange(2350, 3000);
		assert.equal(changeResult.changeRub, 650);
		assert.equal(changeResult.changeKopecks, 65000);
		assert.equal(changeResult.isShortage, false);

		const shortageResult = calculateCashChange(2350, 2000);
		assert.equal(shortageResult.changeRub, 0);
		assert.equal(shortageResult.isShortage, true);
		assert.equal(shortageResult.shortageRub, 350);

		const presets = getCashPresetSuggestions(2350);
		assert.ok(presets.includes(2350));
		assert.ok(presets.includes(5000));

		const key = buildFiscalIdempotencyKey("uuid-123", { amount: 2350 });
		assert.ok(key.startsWith("uuid-123#"));
	});

	it("1.3 calculateAdvanceStagePrepayment — Tag 1214=2 partial prepayment calculation", () => {
		const result = calculateAdvanceStagePrepayment({
			stageName: "Аванс за ортопедический этап: Циркониевая коронка",
			stageTotalRub: 35000.0,
			prepaymentAmountRub: 15000.0,
			paymentMethod: "prepayment",
			tender: "card",
			taxDeductionCategory: "1",
		});

		assert.equal(result.itemDraft.priceRub, 15000.0);
		assert.equal(result.itemDraft.method, "prepayment");
		assert.equal(result.tenders.cardRub, 15000.0);
		assert.equal(result.remainingStageRub, 20000.0);
	});

	it("1.4 calculateFinalSettlementWithAdvanceOffset — Tag 1214=4 with Tag 1215 Advance Offset", () => {
		const stageItems: FiscalItemDraft[] = [
			{
				id: "item-crown",
				name: "Установка коронки из диоксида циркония",
				priceRub: 35000.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		];

		const settlement = calculateFinalSettlementWithAdvanceOffset({
			stageItems,
			previouslyPaidAdvanceRub: 15000.0,
			additionalPaymentTender: "sbp",
		});

		assert.equal(settlement.items[0]?.method, "full_payment");
		assert.equal(settlement.tag1215AdvanceOffsetKopecks, 1500000);
		assert.equal(settlement.tenders.advanceOffsetRub, 15000.0);
		assert.equal(settlement.tenders.sbpRub, 20000.0);
	});
});
