import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import type { FastifyReply } from "fastify";
import { fefoStockService } from "../../services/inventory/fefoStockService.js";
import {
	allocateFefoBatches,
	calculateWriteOffCostKopecks,
	compareFefoBatches,
	kopecksToRubString,
	rubToKopecks,
} from "../../routes/inventory/consumables/consumableFefoAllocator.js";
import {
	handleCreateInventoryItem,
	handleUpdateInventoryItem,
} from "../../routes/inventory/itemCatalog/itemCatalogMutations.js";
import {
	acceptanceWaybillBodySchema,
	inventoryCreateBodySchema,
	inventoryUpdateBodySchema,
} from "../../routes/inventory/types.js";
import { executeFefoBatchDeduction } from "../../routes/inventory/writeOffModules/writeOffFefoExecution.js";
import type { DatabaseTransaction } from "../../routes/inventory/writeOffModules/writeOffValidation.js";

function createMockReply() {
	let statusCode = 200;
	let sentBody: unknown = null;
	const reply = {
		status(code: number) {
			statusCode = code;
			return reply;
		},
		code(code: number) {
			statusCode = code;
			return reply;
		},
		send(body: unknown) {
			sentBody = body;
			return reply;
		},
	};
	return {
		reply: reply as unknown as FastifyReply,
		getStatus: () => statusCode,
		getBody: () => sentBody,
	};
}

describe("Warehouse & Inventory Integrity & Deadlock Defense Suite (Live 6G SUT)", () => {
	it("1. executeFefoBatchDeduction enforces deterministic lexicographic lock order to prevent 40P01 deadlocks", async (t) => {
		const callOrders: string[][] = [];
		let currentOrder: string[] = [];
		t.mock.method(
			fefoStockService,
			"deductFefo",
			async (_tx: unknown, opts: { inventoryItemId: string; requiredQty: number }) => {
				currentOrder.push(opts.inventoryItemId);
				return {
					inventoryItemId: opts.inventoryItemId,
					deductedQty: opts.requiredQty,
					shortageQty: 0,
					totalCostKopecks: 1000,
					usedBatches: [],
					overdraftApplied: false,
				};
			},
		);

		const fakeTx = {} as DatabaseTransaction;

		currentOrder = [];
		await executeFefoBatchDeduction(fakeTx, {
			organizationId: "org-1",
			effectiveUserId: "user-1",
			items: [
				{ inventoryItemId: "uuid-z-999", quantity: 2, name: "Бонд" },
				{ inventoryItemId: "uuid-a-001", quantity: 1, name: "Анестетик" },
				{ inventoryItemId: "uuid-m-555", quantity: 5, name: "Перчатки" },
			],
		});
		callOrders.push(currentOrder);

		currentOrder = [];
		await executeFefoBatchDeduction(fakeTx, {
			organizationId: "org-1",
			effectiveUserId: "user-1",
			items: [
				{ inventoryItemId: "uuid-m-555", quantity: 3, name: "Перчатки" },
				{ inventoryItemId: "uuid-z-999", quantity: 1, name: "Бонд" },
				{ inventoryItemId: "uuid-a-001", quantity: 2, name: "Анестетик" },
			],
		});
		callOrders.push(currentOrder);

		assert.deepEqual(callOrders[0], ["uuid-a-001", "uuid-m-555", "uuid-z-999"]);
		assert.deepEqual(callOrders[1], ["uuid-a-001", "uuid-m-555", "uuid-z-999"]);
	});

	it("2. compareFefoBatches, allocateFefoBatches & kopeck arithmetic preserve exact integer invariants", () => {
		const sorted = [
			{ batchId: "b-late", remainingQty: 5, expirationDate: "2027-12-01", unitCostKopecks: 20000, createdAt: "2026-01-02T00:00:00Z" },
			{ batchId: "b-nodate", remainingQty: 5, expirationDate: null, unitCostKopecks: 15000, createdAt: "2026-01-01T00:00:00Z" },
			{ batchId: "b-early", remainingQty: 2, expirationDate: "2026-10-01", unitCostKopecks: 125050, createdAt: "2026-01-03T00:00:00Z" },
		].sort(compareFefoBatches);
		assert.deepEqual(sorted.map((b) => b.batchId), ["b-early", "b-late", "b-nodate"]);

		const alloc = allocateFefoBatches({
			inventoryItemId: "item-1",
			requiredQty: 3,
			batches: sorted,
		});
		assert.equal(alloc.slices[0]?.batchId, "b-early");
		assert.equal(alloc.slices[0]?.quantityDeducted, 2);
		assert.equal(alloc.slices[1]?.batchId, "b-late");
		assert.equal(alloc.slices[1]?.quantityDeducted, 1);

		assert.equal(rubToKopecks(1250.5), 125050);
		assert.equal(rublesToKopecks(0.01), 1);
		assert.equal(kopecksToRubles(125050), 1250.5);
		assert.equal(kopecksToRubString(125050), "1250.50");
		assert.equal(calculateWriteOffCostKopecks(3, 125050), 375150);
		assert.equal(calculateWriteOffCostKopecks(-1, 125050), 0);
	});

	it("3. inventory schemas & mutation handlers validate strict contracts and reject invalid payloads with 400", async () => {
		const validCreate = inventoryCreateBodySchema.safeParse({
			name: "Артикаин 4%",
			criticalThreshold: 10,
			unitCostRub: 350,
			stockQuantity: 25,
			packageMultiplier: 50,
			sku: "ART-100",
			barcode: "4601234567890",
			lotNumber: "LOT-2026",
			expirationDate: "2027-12-31",
		});
		assert.equal(validCreate.success, true);

		const unknownFieldCreate = inventoryCreateBodySchema.safeParse({
			name: "Артикаин 4%",
			bogusField: "forbidden",
		});
		assert.equal(unknownFieldCreate.success, false, "Strict create schema must reject unknown keys");

		const missingNameMock = createMockReply();
		await handleCreateInventoryItem("org-1", { name: "   " }, {} as never, missingNameMock.reply);
		assert.equal(missingNameMock.getStatus(), 400);

		const badDateMock = createMockReply();
		await handleUpdateInventoryItem(
			"org-1",
			"11111111-1111-4111-8111-111111111111",
			{ name: "Перчатки", expirationDate: "not-a-date" },
			badDateMock.reply,
		);
		assert.equal(badDateMock.getStatus(), 400);

		const badUuidMock = createMockReply();
		await handleUpdateInventoryItem("org-1", "invalid-uuid", { name: "Перчатки" }, badUuidMock.reply);
		assert.equal(badUuidMock.getStatus(), 404);

		const validUpdate = inventoryUpdateBodySchema.safeParse({ name: "Перчатки", stockQuantity: -2 });
		assert.equal(validUpdate.success, true);

		const invalidWaybill = acceptanceWaybillBodySchema.safeParse({
			supplierName: "ООО Мед",
			waybillNumber: "НК-1",
			receiptDate: "2026-09-01",
			items: [],
		});
		assert.equal(invalidWaybill.success, false, "Waybill with 0 items must fail validation");
	});
});
