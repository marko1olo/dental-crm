import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_BRIDGE_ZIRCONIA,
	EXPRESS_PRESET_EMAX_INLAY,
	MODAL_EXPRESS_LAB_PRESETS,
	CANONICAL_LAB_STAGES,
} from "../dentalLabCatalogData";
import { generateDentalLabOrderA4PrintBlank } from "../dentalLabWorkflowExport";
import { createDentalLabOrder } from "../dentalLabWorkflowEngine";
import { CANONICAL_5_CLINICAL_LAB_STATUSES } from "../dentalLabOrderEngine";

describe("Wave 243 — Presets & Form ZTL-1", () => {
	it("1. Express presets include Single crown ZrO2, Bridge prosthesis, and Inlay E.max", () => {
		assert.ok(EXPRESS_PRESET_ZIRCONIA_CROWN);
		assert.equal(EXPRESS_PRESET_ZIRCONIA_CROWN.constructionType, "single_crown");
		assert.equal(EXPRESS_PRESET_ZIRCONIA_CROWN.materialId, "zirconia_multilayer");
		assert.equal(EXPRESS_PRESET_ZIRCONIA_CROWN.colorVita, "A2");
		assert.equal(EXPRESS_PRESET_ZIRCONIA_CROWN.workingDays, 5);

		assert.ok(EXPRESS_PRESET_BRIDGE_ZIRCONIA);
		assert.equal(EXPRESS_PRESET_BRIDGE_ZIRCONIA.constructionType, "bridge");
		assert.equal(EXPRESS_PRESET_BRIDGE_ZIRCONIA.materialId, "zirconia_multilayer");
		assert.equal(EXPRESS_PRESET_BRIDGE_ZIRCONIA.colorVita, "A2");
		assert.equal(EXPRESS_PRESET_BRIDGE_ZIRCONIA.workingDays, 7);

		assert.ok(EXPRESS_PRESET_EMAX_INLAY);
		assert.equal(EXPRESS_PRESET_EMAX_INLAY.constructionType, "inlay_onlay");
		assert.equal(EXPRESS_PRESET_EMAX_INLAY.materialId, "emax_lithium_disilicate");
		assert.equal(EXPRESS_PRESET_EMAX_INLAY.colorVita, "A2");
		assert.equal(EXPRESS_PRESET_EMAX_INLAY.workingDays, 5);

		const presetIds = MODAL_EXPRESS_LAB_PRESETS.map((p) => p.id);
		assert.ok(presetIds.includes("zirconia_crown_express"));
		assert.ok(presetIds.includes("bridge_zirconia_express"));
		assert.ok(presetIds.includes("emax_inlay_express"));
		assert.ok(presetIds.includes("emax_crown_express"));
	});

	it("4. Form ZTL-1 5-stage tracker exposes all canonical stages in order without legacy blockers", () => {
		assert.deepEqual(
			CANONICAL_LAB_STAGES.map((s) => s.id),
			["scan_sent", "in_production", "fitting_ready", "in_clinic", "seated"],
		);
		assert.deepEqual(
			CANONICAL_5_CLINICAL_LAB_STATUSES.map((s) => s.id),
			["sent", "in_progress", "fitting", "ready", "completed"],
		);
		const wfOrder = createDentalLabOrder({
			patientId: "pt-243",
			patientName: "Пациент Тест",
			doctorId: "doc-243",
			doctorName: "Врач Тест",
			workTypeId: "crown_zirconia",
			selectedTeeth: [16],
		});
		const printHtml = generateDentalLabOrderA4PrintBlank(wfOrder);
		assert.ok(printHtml.includes("Пациент Тест"));
		assert.ok(printHtml.includes("@media print"));
	});
});
