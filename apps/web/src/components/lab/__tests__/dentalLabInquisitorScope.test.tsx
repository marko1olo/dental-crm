import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_LAB_PRICE_MATRIX } from "../DentalLabPriceMatrixModal";

describe("dentalLabInquisitorScope — Smoke Facade", () => {
	it("matrix items are present", () => {
		assert.ok(CANONICAL_LAB_PRICE_MATRIX.length >= 8);
	});
});
