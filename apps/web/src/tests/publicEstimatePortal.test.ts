import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateEstimateItemNet,
	calculateEstimateTotals,
	computeEstimateDocumentHash,
	type PublicEstimateDetail,
	type PublicEstimateItem,
	type PublicEstimateMeta,
} from "@dental/shared";

describe("PublicEstimatePortal - Financial Totals, Discounts & 2FA Hashing", () => {
	it("correctly computes net line totals with discounts", () => {
		const itemWithoutDiscount: PublicEstimateItem = {
			id: "i1",
			title: "КЛКТ",
			tooth_number: null,
			quantity: 1,
			unit_price_rub: 4500,
			line_total_rub: 4500,
			discount_rub: 0,
			net_line_total_rub: 4500,
		};
		assert.equal(calculateEstimateItemNet(itemWithoutDiscount), 4500);

		const itemWithDiscount: PublicEstimateItem = {
			id: "i2",
			title: "Коронка ZrO2",
			tooth_number: 16,
			quantity: 2,
			unit_price_rub: 25000,
			line_total_rub: 50000,
			discount_rub: 5000,
			net_line_total_rub: 45000,
		};
		assert.equal(calculateEstimateItemNet(itemWithDiscount), 45000);
	});

	it("calculates multi-item estimate subtotal, discount and grand total", () => {
		const items: PublicEstimateItem[] = [
			{
				id: "i1",
				title: "Консультация",
				tooth_number: null,
				quantity: 1,
				unit_price_rub: 2000,
				line_total_rub: 2000,
				discount_rub: 500,
				net_line_total_rub: 1500,
			},
			{
				id: "i2",
				title: "Пломбирование",
				tooth_number: 24,
				quantity: 2,
				unit_price_rub: 7000,
				line_total_rub: 14000,
				discount_rub: 1000,
				net_line_total_rub: 13000,
			},
		];

		const totals = calculateEstimateTotals(items);
		assert.equal(totals.subtotal, 16000);
		assert.equal(totals.discount, 1500);
		assert.equal(totals.total, 14500);
	});

	it("generates deterministic tamper-proof SHA-256 document signature hash", () => {
		const estimate = {
			id: "est-123",
			estimate_number: "СМ-2026/001",
			total_rub: 14500,
			items: [
				{ id: "i1", net_line_total_rub: 1500 },
				{ id: "i2", net_line_total_rub: 13000 },
			],
		};

		const sig = {
			signed_by_name: "Иван Иванов",
			signed_at_iso: "2026-08-27T10:00:00.000Z",
			signature_png: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
		};

		const hash1 = computeEstimateDocumentHash(estimate, sig);
		const hash2 = computeEstimateDocumentHash(estimate, sig);

		assert.ok(hash1.length === 64);
		assert.equal(hash1, hash2);

		// Any modification changes hash
		const tamperedEstimate = {
			...estimate,
			total_rub: 10000,
		};
		const tamperedHash = computeEstimateDocumentHash(tamperedEstimate, sig);
		assert.notEqual(hash1, tamperedHash);
	});
});
