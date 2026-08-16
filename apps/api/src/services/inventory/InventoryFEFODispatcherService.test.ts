import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	InventoryFEFODispatcherService,
	type InventoryBatch,
} from "./InventoryFEFODispatcherService.js";

describe("InventoryFEFODispatcherService — Feature #238 FEFO Inventory Dispatcher", () => {
	const now = new Date("2026-08-17T12:00:00Z");

	const batchExpiringSoon: InventoryBatch = {
		id: "b-soon",
		itemId: "composite-a2",
		itemName: "Filtek Ultimate A2",
		quantity: 5,
		expiryDate: new Date("2026-09-15T00:00:00Z"), // ~29 days
		locationId: "loc-cabinet-1",
	};

	const batchExpiringLater: InventoryBatch = {
		id: "b-later",
		itemId: "composite-a2",
		itemName: "Filtek Ultimate A2",
		quantity: 10,
		expiryDate: new Date("2027-06-01T00:00:00Z"),
		locationId: "loc-warehouse",
	};

	const batchAlreadyExpired: InventoryBatch = {
		id: "b-expired",
		itemId: "composite-a2",
		itemName: "Filtek Ultimate A2",
		quantity: 4,
		expiryDate: new Date("2026-08-01T00:00:00Z"), // Expired
		locationId: "loc-cabinet-2",
	};

	test("1. Dispatches batches in strict FEFO order, ignoring expired batches", () => {
		const batches = [batchExpiringLater, batchAlreadyExpired, batchExpiringSoon];
		// Request 8 units -> should take 5 from b-soon, then 3 from b-later, 0 from b-expired
		const result = InventoryFEFODispatcherService.dispatch(batches, 8, now);

		assert.equal(result.dispatched.length, 2);
		assert.equal(result.dispatched[0]!.batchId, "b-soon");
		assert.equal(result.dispatched[0]!.quantity, 5);
		assert.equal(result.dispatched[1]!.batchId, "b-later");
		assert.equal(result.dispatched[1]!.quantity, 3);
		assert.equal(result.remainingNeed, 0);
	});

	test("2. Detects critical expiration (<60 days) and suggests reallocation", () => {
		const batches = [batchExpiringSoon, batchExpiringLater];
		const highDemandRooms = ["loc-surgery-1", "loc-hygiene-1"];

		const alerts = InventoryFEFODispatcherService.getExpiryAlerts(batches, highDemandRooms, now);
		assert.equal(alerts.length, 1);
		assert.equal(alerts[0]!.batchId, "b-soon");
		assert.ok(alerts[0]!.daysUntilExpiry < 60);
		assert.equal(alerts[0]!.suggestedTransferToLocationId, "loc-surgery-1");
	});
});
