import assert from "node:assert";
import { describe, test } from "node:test";
import {
	BASE_VISIOGRAPH_PRESETS_LIST,
	CLINICAL_VISIOGRAPH_FILTERS,
	computeVoiRange,
	huToGrayscale,
	VISIOGRAPH_PRESETS_LIST,
	VISIOGRAPH_WINDOW_PRESETS,
} from "../VisiographWindowPresets";

describe("3D Visiograph & DICOM HU Presets Calibration", () => {
	test("Bone Preset is exactly Window 2000, Level 500", () => {
		const preset = VISIOGRAPH_WINDOW_PRESETS.bone;
		assert.strictEqual(preset.windowWidth, 2000);
		assert.strictEqual(preset.windowCenter, 500);
		const range = computeVoiRange(preset.windowWidth, preset.windowCenter);
		assert.strictEqual(range.lower, -500);
		assert.strictEqual(range.upper, 1500);
	});

	test("Enamel/Dentin Preset is exactly Window 4000, Level 1500", () => {
		const preset = VISIOGRAPH_WINDOW_PRESETS.enamel_dentin;
		assert.strictEqual(preset.windowWidth, 4000);
		assert.strictEqual(preset.windowCenter, 1500);
		const range = computeVoiRange(preset.windowWidth, preset.windowCenter);
		assert.strictEqual(range.lower, -500);
		assert.strictEqual(range.upper, 3500);
	});

	test("Soft Tissue / Gingiva Preset is exactly Window 400, Level 40", () => {
		const preset = VISIOGRAPH_WINDOW_PRESETS.soft_tissue;
		assert.strictEqual(preset.windowWidth, 400);
		assert.strictEqual(preset.windowCenter, 40);
		const range = computeVoiRange(preset.windowWidth, preset.windowCenter);
		assert.strictEqual(range.lower, -160);
		assert.strictEqual(range.upper, 240);
	});

	test("Endodontic Canal / Apex Preset is exactly Window 1500, Level 300", () => {
		const preset = VISIOGRAPH_WINDOW_PRESETS.endodontic_canal;
		assert.strictEqual(preset.windowWidth, 1500);
		assert.strictEqual(preset.windowCenter, 300);
		const range = computeVoiRange(preset.windowWidth, preset.windowCenter);
		assert.strictEqual(range.lower, -450);
		assert.strictEqual(range.upper, 1050);
	});

	test("all 4 clinical presets are registered in BASE_VISIOGRAPH_PRESETS_LIST", () => {
		assert.strictEqual(BASE_VISIOGRAPH_PRESETS_LIST.length, 4);
		assert.deepStrictEqual(BASE_VISIOGRAPH_PRESETS_LIST.map((p) => p.id), [
			"bone", "enamel_dentin", "soft_tissue", "endodontic_canal",
		]);
	});

	test("all 8 clinical and CDViewer presets are registered in VISIOGRAPH_PRESETS_LIST", () => {
		assert.strictEqual(VISIOGRAPH_PRESETS_LIST.length, 8);
		assert.deepStrictEqual(VISIOGRAPH_PRESETS_LIST.map((p) => p.id), [
			"bone", "enamel_dentin", "soft_tissue", "endodontic_canal",
			"airway", "skull", "endoscopy", "soft_tissue_bone",
		]);
	});

	test("huToGrayscale maps values accurately to 0..255 with proper clamping", () => {
		assert.strictEqual(huToGrayscale(-600, 2000, 500), 0);
		assert.strictEqual(huToGrayscale(500, 2000, 500), 128);
		assert.strictEqual(huToGrayscale(1500, 2000, 500), 255);
		assert.strictEqual(huToGrayscale(0, 2000, 500), 64);
	});

	test("1-Click Clinical Filters are registered with clinical params", () => {
		assert.strictEqual(CLINICAL_VISIOGRAPH_FILTERS.length, 5);
		const bone = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "bone_periodont");
		assert.ok(bone && bone.params.sharpness === 80 && bone.label.includes("Кость / Периодонт"));

		const endo = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "endodontics");
		assert.ok(endo && endo.params.contrast === 48 && endo.label.includes("Эндодонтия"));

		const caries = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "caries_enamel");
		assert.ok(caries && caries.params.gamma === 1.18 && caries.label.includes("Кариес / Эмаль"));

		const neg = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "negative_cracks");
		assert.ok(neg && neg.params.invert === true && neg.label.includes("Негатив / Трещины"));

		const relief = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "pseudo_relief");
		assert.ok(relief && relief.params.pseudoRelief === true && relief.label.includes("Псевдо-3D / Рельеф"));
	});
});
