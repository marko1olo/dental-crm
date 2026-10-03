import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	VITA_CLASSICAL_PLUS_BLEACH_PALETTE,
	VITA_SHADE_HEX_MAP,
	getVitaShadeHex,
	CANONICAL_LAB_WORK_TYPES,
	LAB_WORK_TYPES_BY_ID,
	getLabWorkTypeById,
} from "../vitaPalette.js";

describe("Shared Dental Lab — VITA Palette & Work Types Catalog", () => {
	test("VITA_CLASSICAL_PLUS_BLEACH_PALETTE contains all 20 canonical shades", () => {
		assert.equal(VITA_CLASSICAL_PLUS_BLEACH_PALETTE.length, 20);

		const codes = VITA_CLASSICAL_PLUS_BLEACH_PALETTE.map((item) => item.code);
		assert.ok(codes.includes("A1"));
		assert.ok(codes.includes("A2"));
		assert.ok(codes.includes("A3"));
		assert.ok(codes.includes("A3.5"));
		assert.ok(codes.includes("A4"));

		assert.ok(codes.includes("B1"));
		assert.ok(codes.includes("B2"));
		assert.ok(codes.includes("B3"));
		assert.ok(codes.includes("B4"));

		assert.ok(codes.includes("C1"));
		assert.ok(codes.includes("C2"));
		assert.ok(codes.includes("C3"));
		assert.ok(codes.includes("C4"));

		assert.ok(codes.includes("D2"));
		assert.ok(codes.includes("D3"));
		assert.ok(codes.includes("D4"));

		assert.ok(codes.includes("BL1"));
		assert.ok(codes.includes("BL2"));
		assert.ok(codes.includes("BL3"));
		assert.ok(codes.includes("BL4"));
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
		assert.equal(getVitaShadeHex("A3.5"), "#D8C2A4");
		assert.equal(getVitaShadeHex("bl1"), "#FFF7EE");
		assert.equal(getVitaShadeHex("non_existent"), undefined);
		assert.equal(getVitaShadeHex(null), undefined);
		assert.equal(getVitaShadeHex(undefined), undefined);
	});

	test("CANONICAL_LAB_WORK_TYPES contains exactly 17 lab products with proper classification", () => {
		assert.equal(CANONICAL_LAB_WORK_TYPES.length, 17);

		const first = getLabWorkTypeById("wt_001");
		assert.ok(first);
		assert.equal(first.titleRu, "Коронка металлокерамическая");
		assert.equal(first.category, "fixed_prosthetics");

		const implantZirconia = getLabWorkTypeById("wt_014");
		assert.ok(implantZirconia);
		assert.equal(implantZirconia.titleRu, "Коронка ZrO2 на импланте");
		assert.equal(implantZirconia.category, "implant_prosthetics");

		const last = getLabWorkTypeById("wt_017");
		assert.ok(last);
		assert.equal(last.titleRu, "Трансфер-чек");
		assert.equal(last.category, "auxiliary");

		assert.equal(getLabWorkTypeById("unknown"), undefined);
		assert.equal(getLabWorkTypeById(null), undefined);
	});
});
