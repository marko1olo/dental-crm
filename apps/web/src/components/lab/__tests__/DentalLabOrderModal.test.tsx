import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONSTRUCTION_TYPES, LAB_MATERIALS } from "../labMath";

describe("DentalLabOrderModal — Smoke Sanity Check", () => {
	it("Core construction types and materials are initialized", () => {
		assert.ok(CONSTRUCTION_TYPES.length >= 8);
		assert.ok(LAB_MATERIALS.length >= 6);
	});
});
