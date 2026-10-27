import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CHAIRSIDE_EXPRESS_PRESETS,
	VITA_EXPRESS_SHADES,
} from "../DentalLabExpressConfigurator";

describe("Chairside Express Presets & 1-Click VITA Shades (Мандаты 8e, 8b)", () => {
	it("1. Содержит 6 канонических пресетов у кресла ортопеда", () => {
		assert.equal(CHAIRSIDE_EXPRESS_PRESETS.length, 6);
		const ids = CHAIRSIDE_EXPRESS_PRESETS.map((p) => p.id);
		assert.deepEqual(ids, [
			"zirconia_prettau",
			"emax_press",
			"pfm_cocr",
			"pmma_cadcam",
			"buegel_clasp",
			"aligners_set",
		]);
	});

	it("2. Сроки и материалы: коронки +5 дней, временные +2 дня, съемные и элайнеры +7 дней", () => {
		const zirconia = CHAIRSIDE_EXPRESS_PRESETS.find((p) => p.id === "zirconia_prettau")!;
		assert.equal(zirconia.days, 5);
		assert.equal(zirconia.mat, "zirconia_multilayer");
		assert.equal(zirconia.shade, "A2");

		const emax = CHAIRSIDE_EXPRESS_PRESETS.find((p) => p.id === "emax_press")!;
		assert.equal(emax.days, 5);
		assert.equal(emax.mat, "emax_lithium_disilicate");

		const pfm = CHAIRSIDE_EXPRESS_PRESETS.find((p) => p.id === "pfm_cocr")!;
		assert.equal(pfm.days, 5);
		assert.equal(pfm.mat, "pfm_cocr");
		assert.equal(pfm.shade, "A3");

		const pmma = CHAIRSIDE_EXPRESS_PRESETS.find((p) => p.id === "pmma_cadcam")!;
		assert.equal(pmma.days, 2);
		assert.equal(pmma.mat, "pmma_temporary");

		const buegel = CHAIRSIDE_EXPRESS_PRESETS.find((p) => p.id === "buegel_clasp")!;
		assert.equal(buegel.days, 7);
		assert.equal(buegel.type, "clasp_denture");

		const aligners = CHAIRSIDE_EXPRESS_PRESETS.find((p) => p.id === "aligners_set")!;
		assert.equal(aligners.days, 7);
		assert.equal(aligners.type, "aligners");
	});

	it("3. Шкала VITA Classical содержит 6 экспресс-оттенков в 1 тап", () => {
		assert.deepEqual(Array.from(VITA_EXPRESS_SHADES), [
			"A1",
			"A2",
			"A3",
			"A3.5",
			"B1",
			"Bleach",
		]);
	});

	it("4. Чистый язык без бюрократических приказов и чужих CRM", () => {
		for (const p of CHAIRSIDE_EXPRESS_PRESETS) {
			assert.equal(/804н|043\/у|DentalPRO|IDENT|StomX/i.test(p.title), false);
			assert.equal(/804н|043\/у|DentalPRO|IDENT|StomX/i.test(p.shortTitle), false);
		}
	});
});
