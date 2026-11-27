import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import { resolveCostKopecks } from "@dental/shared";
import { db } from "../../db/client.js";
import {
	inventoryItems,
	inventoryTransactions,
	organizations,
	stockBatches,
} from "../../db/schema.js";
import { withTenantCtx } from "../../db/rls.js";
import { fefoStockService, sortBatchesByFefo } from "./fefoStockService.js";
import { wsBroker } from "../websocketBroker.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../../tests/support/fixtureOrganizations.js";

function isDatabaseUnavailable(err: unknown): boolean {
	const msg = err instanceof Error ? err.message : String(err);
	return /ECONNREFUSED|connect|5432/i.test(msg);
}

const NS = "fefo-service-honest";
const ORG_ID = fixtureUuid(NS, 1);
const ITEM_ID = fixtureUuid(NS, 2);

describe("FEFO Stock Service, Cost Resolution & Post-Commit WS Invariants", () => {
	let dbReady = true;

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await db
				.insert(organizations)
				.values({ id: ORG_ID, name: "FEFO Honest Test Clinic" })
				.onConflictDoNothing();
			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(inventoryItems).values({
					id: ITEM_ID,
					organizationId: ORG_ID,
					name: "Артикаин 1:100 000",
					category: "Анестезия",
					unit: "карп.",
					stockQuantity: "10",
					currentQty: "10",
					criticalThreshold: "2",
					unitCostRub: "450.00",
					unitCostKopecks: 0n,
					pricePerUnitKopecks: 0n,
				});
				await db.insert(stockBatches).values([
					{
						id: fixtureUuid(NS, 10),
						organizationId: ORG_ID,
						inventoryItemId: ITEM_ID,
						batchNumber: "LOT-2026-EARLY",
						expirationDate: "2026-12-31",
						initialQty: "3",
						remainingQty: "3",
						purchasePricePerUnit: "420.00",
						purchasePricePerUnitKopecks: 0n,
						status: "active",
					},
					{
						id: fixtureUuid(NS, 11),
						organizationId: ORG_ID,
						inventoryItemId: ITEM_ID,
						batchNumber: "LOT-2028-LATE",
						expirationDate: "2028-06-30",
						initialQty: "7",
						remainingQty: "7",
						purchasePricePerUnit: "450.00",
						purchasePricePerUnitKopecks: 45000n,
						status: "active",
					},
				]);
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbReady = false;
			} else {
				throw err;
			}
		}
	});

	after(async () => {
		if (!dbReady) return;
		await purgeFixtureOrganizations([ORG_ID]);
	});

	it("sorts batches by FEFO (earliest expirationDate first)", () => {
		const batches = [
			{ id: "b3", batchNumber: "LOT-2028", expirationDate: "2028-05-01", remainingQty: "10" },
			{ id: "b1", batchNumber: "LOT-2026", expirationDate: "2026-06-15", remainingQty: "5" },
			{ id: "b2", batchNumber: "LOT-2027", expirationDate: "2027-01-10", remainingQty: "8" },
		];

		const sorted = sortBatchesByFefo(batches);
		assert.deepEqual(
			sorted.map((b) => b.id),
			["b1", "b2", "b3"],
		);
	});

	it("resolveCostKopecks bypasses 0n NOT NULL DB defaults and resolves fallback rubles", () => {
		assert.equal(resolveCostKopecks(0n, "420.50"), 42050n);
		assert.equal(resolveCostKopecks(0n, "0", 15000n), 15000n);
		assert.equal(resolveCostKopecks(31000n, "420.50"), 31000n);
		assert.equal(resolveCostKopecks(0n, null, 0n, "99.90"), 9990n);
		assert.equal(resolveCostKopecks(0n, null, 0n, null), 0n);
	});

	it("deductFefo allocates across batches in FEFO order, resolves 0n fallback cost, and fires WS post-commit", async () => {
		if (!dbReady) return;

		const broadcasts: Array<{ orgId: string; type: string }> = [];
		const originalBroadcast = wsBroker.broadcastToOrganization.bind(wsBroker);
		wsBroker.broadcastToOrganization = ((orgId: string, msg: { type: string }) => {
			broadcasts.push({ orgId, type: msg.type });
			return 0;
		}) as typeof wsBroker.broadcastToOrganization;

		try {
			// 1. Rolled-back transaction must NEVER broadcast WS deficit alert
			await assert.rejects(
				withTenantCtx(ORG_ID, async (tx) => {
					await fefoStockService.deductFefo(tx, {
						organizationId: ORG_ID,
						inventoryItemId: ITEM_ID,
						requiredQty: 15,
						transactionType: "treatment_consumable",
						allowOverdraft: true,
						notes: "Rollback WS guard check",
					});
					assert.equal(broadcasts.length, 0, "WS broadcast must NOT fire before COMMIT");
					throw new Error("FORCE_ROLLBACK");
				}),
				/FORCE_ROLLBACK/,
			);
			assert.equal(broadcasts.length, 0, "Rolled back transaction must never emit WS alert");

			// 2. Committed overdraft deducts early batch then late batch, records 42000n cost, and emits WS post-commit
			const res = await withTenantCtx(ORG_ID, async (tx) =>
				fefoStockService.deductFefo(tx, {
					organizationId: ORG_ID,
					inventoryItemId: ITEM_ID,
					requiredQty: 12,
					transactionType: "treatment_consumable",
					allowOverdraft: true,
					notes: "Committed FEFO overdraft test",
				}),
			);

			assert.equal(res.isOverdraft, true);
			assert.equal(res.deficitQty, 2);
			assert.equal(res.batchesUsed.length, 2);
			assert.equal(res.batchesUsed[0]?.batchNumber, "LOT-2026-EARLY");
			assert.equal(res.batchesUsed[0]?.quantityDeducted, 3);
			assert.equal(res.batchesUsed[1]?.batchNumber, "LOT-2028-LATE");
			assert.equal(res.batchesUsed[1]?.quantityDeducted, 7);
			assert.ok(Array.isArray(res.transactionIds) && res.transactionIds.length >= 3);
			assert.equal(broadcasts.length, 1, "WS alert must fire once after COMMIT");
			assert.equal(broadcasts[0]?.type, "INVENTORY_DEFICIT_ALERT");

			await withFixtureTenant(ORG_ID, async () => {
				const txs = await db
					.select()
					.from(inventoryTransactions)
					.where(
						and(
							eq(inventoryTransactions.organizationId, ORG_ID),
							eq(inventoryTransactions.inventoryItemId, ITEM_ID),
						),
					);
				const batchTx = txs.find((t) => t.batchId === fixtureUuid(NS, 10));
				assert.ok(batchTx, "Batch transaction must exist");
				assert.equal(batchTx.unitCostKopecks, 42000n, "0n batch kopecks must fall back to 420.00 rub = 42000n");
			});
		} finally {
			wsBroker.broadcastToOrganization = originalBroadcast;
		}
	});
});
