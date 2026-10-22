import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_EMAX_CROWN,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	MODAL_EXPRESS_LAB_PRESETS,
	addWorkingDays,
} from "../DentalLabOrderModal";

describe("Wave 43 Autonomy — Express Presets Invariants", () => {
	it("Contains all 4 canonical 1-click express presets: ZrO2, PFM, e.max, PMMA", () => {
		assert.strictEqual(EXPRESS_PRESET_ZIRCONIA_CROWN.id, "zirconia_crown_express");
		assert.strictEqual(EXPRESS_PRESET_ZIRCONIA_CROWN.workingDays, 5);

		assert.strictEqual(EXPRESS_PRESET_PFM_DUCERAM.id, "pfm_duceram_express");
		assert.strictEqual(EXPRESS_PRESET_PFM_DUCERAM.workingDays, 7);

		assert.strictEqual(EXPRESS_PRESET_EMAX_CROWN.id, "emax_crown_express");
		assert.strictEqual(EXPRESS_PRESET_EMAX_CROWN.materialId, "emax_lithium_disilicate");
		assert.strictEqual(EXPRESS_PRESET_EMAX_CROWN.workingDays, 5);

		assert.strictEqual(EXPRESS_PRESET_PMMA_TEMPORARY.id, "pmma_temporary_express");
		assert.strictEqual(EXPRESS_PRESET_PMMA_TEMPORARY.workingDays, 2);

		const presetIds = MODAL_EXPRESS_LAB_PRESETS.map((p) => p.id);
		assert.ok(presetIds.includes("zirconia_crown_express"));
		assert.ok(presetIds.includes("pfm_duceram_express"));
		assert.ok(presetIds.includes("emax_crown_express"));
		assert.ok(presetIds.includes("pmma_temporary_express"));

		const baseDate = new Date("2026-09-07T12:00:00.000Z");
		const duePMMA = addWorkingDays(baseDate, 2);
		assert.strictEqual(duePMMA.getDay(), 3);

		const dueZrO2 = addWorkingDays(baseDate, 5);
		assert.strictEqual(dueZrO2.getDay(), 1);
	});
});
