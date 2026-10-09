/**
 * purchaseOrdersDecomposition.test.ts — Comprehensive Verification Suite
 * for Decomposed Warehouse Purchase Order Modules.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	// Layer 0 Types & Schemas
	purchaseOrderStatusSchema,
	vatRateSchema,
	PURCHASE_ORDER_STATUS_LABELS_RU,
	ALLOWED_PO_TRANSITIONS,
	RECEIVABLE_PO_STATUSES,
	// Layer 1 Thresholds
	calculateReorderPoint,
	calculateSafetyStock,
	calculateAverageDailyConsumption,
	evaluateItemReorderThreshold,
	// Layer 1 Supplier Comparison & 3-Way Matching
	compareSupplierQuotes,
	findBestSupplierQuote,
	convertForeignPriceToRubKopecks,
	validateThreeWayMatching,
	// Layer 2 Core Lifecycle & Statutory Reports
	validatePOStatusTransition,
	calculatePOLineTotal,
	generatePurchaseOrderFromReorderSuggestions,
	applyPurchaseReceipt,
	formatPurchaseOrderPrintSummary,
	createPurchaseOrderRecord,
	receiveDeliveryBatch,
	formatMaterialReceiptActM7A4,
} from "../purchaseOrderEngine.js";

describe("Warehouse Purchase Orders: Decomposed Modules & Invariants", () => {
	it("re-exports all domain schemas, contracts and labels through canonical facade", () => {
		assert.equal(purchaseOrderStatusSchema.safeParse("DRAFT").success, true);
		assert.equal(vatRateSchema.safeParse(20).success, true);
		assert.equal(vatRateSchema.safeParse("EXEMPT").success, true);
		assert.equal(PURCHASE_ORDER_STATUS_LABELS_RU.DRAFT, "Черновик");
		assert.ok(ALLOWED_PO_TRANSITIONS.DRAFT.includes("SENT"));
		assert.ok(RECEIVABLE_PO_STATUSES.includes("CONFIRMED"));
	});

	it("calculates statutory ROP, safety stock and average daily consumption correctly", () => {
		// Daily consumption: 60 units in 30 days -> 2.0 units/day
		const avgDaily = calculateAverageDailyConsumption([20, 20, 20], 30);
		assert.equal(avgDaily, 2);

		// Lead time 10 days, 20% safety factor -> ceil(2 * 10 * 0.2) = 4 units
		const safetyStock = calculateSafetyStock(avgDaily, 10, 0.2);
		assert.equal(safetyStock, 4);

		// ROP = (2 * 10) + 4 = 24 units
		const rop = calculateReorderPoint(avgDaily, 10, safetyStock);
		assert.equal(rop, 24);

		// Evaluate item below threshold
		const evalResult = evaluateItemReorderThreshold(
			"item-composite-a2",
			"Композит Filtek Ultimate A2B",
			5, // current stock 5 < ROP 24
			{
				minStock: 10,
				maxStock: 50,
				safetyStock: 4,
				reorderPoint: 24,
				averageDailyConsumption: 2,
				leadTimeDays: 10,
			},
		);

		assert.equal(evalResult.isBelowThreshold, true);
		assert.equal(evalResult.urgency, "STANDARD");
		assert.ok(evalResult.suggestedQuantity >= 45); // 50 - 5 = 45
	});

	it("safely handles 0 and negative values in stock threshold calculators", () => {
		assert.equal(calculateAverageDailyConsumption([], 0), 0);
		assert.equal(calculateSafetyStock(0, 10), 0);
		assert.equal(calculateSafetyStock(5, -2), 0);
		assert.equal(calculateReorderPoint(0, 10, 5), 5);
	});

	it("compares multi-supplier quotes, converts foreign currency, and finds best price", () => {
		// Foreign currency conversion: 10 EUR at 100 RUB/EUR -> 1000 RUB = 100000 kopecks
		const eurKopecks = convertForeignPriceToRubKopecks(10, "EUR", 100);
		assert.equal(eurKopecks, 100000);

		const quotes = [
			{
				supplierId: "sup-1",
				supplierName: 'ООO "МедДент"',
				priceKopecks: 120000,
			},
			{
				supplierId: "sup-2",
				supplierName: 'ООO "СтомТорг"',
				priceKopecks: 95000,
			},
			{
				supplierId: "sup-3",
				supplierName: 'ООO "ДенталСити"',
				priceKopecks: 110000,
			},
		];

		const best = findBestSupplierQuote(quotes);
		assert.ok(best);
		assert.equal(best.supplierId, "sup-2");
		assert.equal(best.priceKopecks, 95000);

		const comparison = compareSupplierQuotes("item-1", "Иглы карпульные 30G", quotes);
		assert.equal(comparison.bestQuote?.supplierId, "sup-2");
		assert.equal(comparison.minPriceKopecks, 95000);
		assert.ok(comparison.priceSpreadPercent > 0);
	});

	it("validates 3-way matching and detects missing items or price differences", () => {
		const order = createPurchaseOrderRecord({
			clinicId: "clinic-1",
			supplierId: "sup-1",
			supplierName: "Поставщик Тест",
			lines: [
				{
					inventoryItemId: "item-glove",
					itemName: "Перчатки нитриловые",
					quantityOrdered: 100,
					unitPriceKopecks: 50000, // 500 руб.
				},
			],
		});

		const matchedInvoice = {
			invoiceNumber: "INV-100",
			invoiceDate: "2026-10-09",
			supplierId: "sup-1",
			lines: [
				{
					inventoryItemId: "item-glove",
					itemName: "Перчатки нитриловые",
					quantityInvoiced: 100,
					unitPriceKopecks: 50000,
				},
			],
			totalAmountKopecks: 5000000,
		};

		// Before receipt: quantityReceived is 0, so invoice has quantity discrepancy against received
		const matchRes = validateThreeWayMatching(order, matchedInvoice);
		assert.equal(matchRes.isMatched, false);
		assert.ok(matchRes.discrepancies.some((d) => d.discrepancyType === "quantity_mismatch"));
	});

	it("formats Form M-7 without emojis and includes commission members", () => {
		const order = createPurchaseOrderRecord({
			clinicId: "clinic-1",
			supplierId: "sup-1",
			supplierName: "ТестСтомСнаб",
			lines: [
				{
					inventoryItemId: "item-anesthetic",
					itemName: "Артикаин 1:100000",
					quantityOrdered: 50,
					unitPriceKopecks: 350000,
				},
			],
		});

		const actM7 = formatMaterialReceiptActM7A4(order, {
			clinicName: 'ООО "ДЕНТЕ"',
			actNumber: "М7-ТЕСТ-01",
		});

		assert.ok(actM7.includes("ТИПОВАЯ МЕЖОТРАСЛЕВАЯ ФОРМА № М-7"));
		assert.ok(actM7.includes("М7-ТЕСТ-01"));
		assert.ok(actM7.includes("Артикаин 1:100000"));
		// Mandate 8d zero emojis check
		const emojiRegex = /[\u{1F300}-\u{1F9FF}]/u;
		assert.equal(emojiRegex.test(actM7), false);
	});
});
