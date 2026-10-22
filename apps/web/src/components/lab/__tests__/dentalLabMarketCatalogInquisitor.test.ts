import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ORDERED_MARKET_ORTHOPEDIC_TYPES } from "../dentalLabWorkflowEngine";

describe("dentalLabMarketCatalogInquisitor — Smoke Facade", () => {
	it("market catalog order is defined", () => {
		assert.ok(ORDERED_MARKET_ORTHOPEDIC_TYPES.length >= 8);
	});
});
