import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	VITA_CLASSICAL_PLUS_BLEACH_PALETTE,
	getVitaShadeHex,
	CANONICAL_LAB_WORK_TYPES,
	getLabWorkTypeById,
} from "../vitaPalette.js";
import {
	DENTAL_LAB_CONSTRUCTIONS,
	calculateLabWageDeductionKopecks,
} from "../labUnifiedWorkTypes.js";

describe("Shared Dental Lab — VITA Palette & Work Types Catalog", () => {
	test("VITA_CLASSICAL_PLUS_BLEACH_PALETTE contains all 20 canonical shades", () => {
		assert.equal(VITA_CLASSICAL_PLUS_BLEACH_PALETTE.length, 20);

		const codes = VITA_CLASSICAL_PLUS_BLEACH_PALETTE.map((item) => item.code);
		assert.ok(codes.includes("A1"));
		assert.ok(codes.includes("A2"));
		assert.ok(codes.includes("A3"));
		assert.ok(codes.includes("A3.5"));
		assert.ok(codes.includes("A4"));
		assert.ok(codes.includes("BL1"));
	});

	test("VITA shades have valid HEX colors format #RRGGBB", () => {
		const hexRegex = /^#[0-9A-Fa-f]{6}$/;
		for (const item of VITA_CLASSICAL_PLUS_BLEACH_PALETTE) {
			assert.match(item.hex, hexRegex, `Shade ${item.code} must have valid HEX color`);
		}
	});

	test("getVitaShadeHex returns correct HEX code case-insensitively and handles falsy input", () => {
		assert.equal(getVitaShadeHex("A1"), "#F3E2C8");
		assert.equal(getVitaShadeHex("a1"), "#F3E2C8");
		assert.equal(getVitaShadeHex(null), undefined);
	});

	test("CANONICAL_LAB_WORK_TYPES contains exactly 17 lab products with proper classification", () => {
		assert.equal(CANONICAL_LAB_WORK_TYPES.length, 17);
		const first = getLabWorkTypeById("wt_001");
		assert.ok(first);
		assert.equal(first.titleRu, "Коронка металлокерамическая");
		assert.equal(first.category, "fixed_prosthetics");
	});

	test("DENTAL_LAB_CONSTRUCTIONS integrates 6 clinical constructions with integer kopecks", () => {
		const keys = Object.keys(DENTAL_LAB_CONSTRUCTIONS);
		assert.equal(keys.length, 6);
		assert.ok(DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultZtlCostKopecks > 0);
		assert.ok(DENTAL_LAB_CONSTRUCTIONS.crown_emax.defaultPatientPriceKopecks > 0);
	});

	test("calculateLabWageDeductionKopecks deducts lab cost before doctor percentage", () => {
		const result = calculateLabWageDeductionKopecks({
			patientPriceKopecks: 2400000,
			labCostKopecks: 750000,
			doctorSharePercent: 25,
		});
		assert.equal(result.doctorWageBaseKopecks, 1650000);
		assert.equal(result.doctorWageKopecks, 412500);
		assert.equal(result.clinicMarginKopecks, 1237500);
		assert.equal(result.isBalanced, true);
	});
});
