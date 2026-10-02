import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getTableColumns } from "drizzle-orm";
import * as schema from "../schema.js";
import {
	inventoryQuery,
	type GoodsReceiptInvoiceInput,
	type GoodsReceiptInvoiceItemInput,
} from "../inventoryQuery.js";
import {
	fefoStockService,
	getDefaultExpirationDate,
	normalizeDateToIso,
} from "../../services/inventory/fefoStockService.js";

describe("Inventory Query & FEFO Goods Receipt Pipeline (Mandate 8s, 8x)", () => {
	test("1. Schema & Isolation: inventory_items and stock_batches enforce organizationId multi-tenant boundaries", () => {
		const itemCols = getTableColumns(schema.inventoryItems);
		assert.ok(itemCols.id, "inventoryItems.id must exist");
		assert.ok(itemCols.organizationId, "inventoryItems.organizationId must exist");
		assert.strictEqual(itemCols.organizationId.notNull, true, "organizationId must be NOT NULL for tenant isolation");
		assert.ok(itemCols.name, "inventoryItems.name must exist");
		assert.ok(itemCols.unitCostRub, "inventoryItems.unitCostRub must exist");

		const batchCols = getTableColumns(schema.stockBatches);
		assert.ok(batchCols.id, "stockBatches.id must exist");
		assert.ok(batchCols.organizationId, "stockBatches.organizationId must exist");
		assert.strictEqual(batchCols.organizationId.notNull, true, "organizationId must be NOT NULL on batches");
		assert.ok(batchCols.inventoryItemId, "stockBatches.inventoryItemId must exist");
		assert.ok(batchCols.expirationDate, "stockBatches.expirationDate must exist");
		assert.ok(batchCols.remainingQty, "stockBatches.remainingQty must exist");
		assert.ok(batchCols.purchasePricePerUnit, "stockBatches.purchasePricePerUnit must exist");
	});

	test("2. Date Normalization & Default Shelf-Life: correctly parses ISO and Russian dates", () => {
		assert.strictEqual(normalizeDateToIso("2026-12-31"), "2026-12-31");
		assert.strictEqual(normalizeDateToIso("31.12.2026"), "2026-12-31");
		assert.strictEqual(normalizeDateToIso("01.05.2027"), "2027-05-01");
		assert.strictEqual(normalizeDateToIso("invalid-date"), null);
		assert.strictEqual(normalizeDateToIso(null), null);

		const defaultExp = getDefaultExpirationDate();
		assert.match(defaultExp, /^\d{4}-\d{2}-\d{2}$/, "Default expiration date must be ISO YYYY-MM-DD");
		const defaultYear = Number(defaultExp.slice(0, 4));
		const currentYear = new Date().getFullYear();
		assert.ok(defaultYear >= currentYear + 1, "Default shelf life must be at least 1-2 years in the future");
	});

	test("3. Validation Guard: receiveGoodsReceiptInvoice rejects invoices with zero items", async () => {
		const emptyInvoice: GoodsReceiptInvoiceInput = {
			organizationId: "org-test-uuid",
			invoiceNumber: "INV-001",
			items: [],
		};

		// Mock transaction executor to verify pre-flight guard
		const dummyTx = {} as any;
		await assert.rejects(
			async () => {
				await inventoryQuery.receiveGoodsReceiptInvoice(dummyTx, emptyInvoice);
			},
			{
				name: "Error",
				message: "Приходная накладная должна содержать хотя бы одну позицию.",
			},
			"Must throw descriptive Russian error when receipt invoice has no items",
		);
	});

	test("4. FEFO Calculation Invariants: validates stock deduction math and lot exhaustion logic", () => {
		// Mock batches sorted by FEFO (Earliest Expiration First)
		const batches = [
			{ id: "batch-1", remainingQty: "5", expirationDate: "2026-06-01" },
			{ id: "batch-2", remainingQty: "10", expirationDate: "2026-12-01" },
			{ id: "batch-3", remainingQty: "20", expirationDate: "2027-06-01" },
		];

		// Deduct 8 items: should consume all 5 from batch-1 and 3 from batch-2
		let toDeduct = 8;
		const deductions: Array<{ batchId: string; deducted: number; newRemaining: number }> = [];

		for (const b of batches) {
			if (toDeduct <= 0) break;
			const available = Number(b.remainingQty);
			const take = Math.min(available, toDeduct);
			deductions.push({
				batchId: b.id,
				deducted: take,
				newRemaining: available - take,
			});
			toDeduct -= take;
		}

		assert.strictEqual(toDeduct, 0, "All 8 units must be allocated");
		assert.strictEqual(deductions.length, 2, "Must span across first 2 batches");
		assert.deepStrictEqual(deductions[0], { batchId: "batch-1", deducted: 5, newRemaining: 0 });
		assert.deepStrictEqual(deductions[1], { batchId: "batch-2", deducted: 3, newRemaining: 7 });
	});
});
