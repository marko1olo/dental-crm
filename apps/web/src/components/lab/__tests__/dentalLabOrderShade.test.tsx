import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	SHADE_SWATCH_MAP,
} from "../labMath";

describe("dentalLabOrderShade — Core Smoke & Sanity Check", () => {
	it("VITA palettes and swatch mappings are correctly initialized", () => {
		assert.equal(VITA_CLASSICAL_SHADES.length, 16);
		assert.equal(VITA_3D_MASTER_SHADES.length, 26);
		assert.ok(SHADE_SWATCH_MAP.A2);
		assert.ok(SHADE_SWATCH_MAP["1M1"]);
	});
});
