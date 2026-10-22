import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getBridgeSpanTeeth } from "../DentalLabFdiOdontogramPicker";

describe("dentalLabBridgeAndShadeInquisitor — Smoke Facade", () => {
	it("bridge span expands correctly", () => {
		assert.deepStrictEqual(getBridgeSpanTeeth([14, 16]), [14, 15, 16]);
	});
});
