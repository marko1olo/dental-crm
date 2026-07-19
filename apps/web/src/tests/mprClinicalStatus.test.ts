import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveMprClinicalPresetProjection, buildMprWorkbenchSummary, type MprClinicalChecklistInput } from "../mprClinicalStatus.js";

describe("resolveMprClinicalPresetProjection", () => {
	it("should return the requested projection if availableProjections is undefined", () => {
		assert.equal(
			resolveMprClinicalPresetProjection("sagittal", undefined),
			"sagittal",
		);
	});

	it("should return the requested projection if availableProjections is empty", () => {
		assert.equal(resolveMprClinicalPresetProjection("coronal", []), "coronal");
	});

	it("should return the requested projection if it exists in availableProjections", () => {
		assert.equal(
			resolveMprClinicalPresetProjection("axial", [
				"sagittal",
				"coronal",
				"axial",
			]),
			"axial",
		);
	});

	it("should fall back to 'coronal' if 'panoramic_reconstruction' is requested and 'coronal' is available", () => {
		assert.equal(
			resolveMprClinicalPresetProjection("panoramic_reconstruction", [
				"sagittal",
				"axial",
				"coronal",
			]),
			"coronal",
		);
	});

	it("should fall back to 'axial' if the requested projection is not available and 'axial' is available", () => {
		assert.equal(
			resolveMprClinicalPresetProjection("sagittal", ["coronal", "axial"]),
			"axial",
		);
	});

	it("should fall back to the first available projection if neither exact, panoramic fallback, nor axial are available", () => {
		assert.equal(
			resolveMprClinicalPresetProjection("sagittal", ["oblique", "curved"]),
			"oblique",
		);
	});

	it("should fall back to 'axial' even for 'panoramic_reconstruction' if 'coronal' is not available but 'axial' is", () => {
		assert.equal(
			resolveMprClinicalPresetProjection("panoramic_reconstruction", [
				"sagittal",
				"axial",
				"oblique",
			]),
			"axial",
		);
	});
});

describe("buildMprWorkbenchSummary", () => {
	it("should return missing MPR message when canOpenMpr is false", () => {
		const input: MprClinicalChecklistInput = {
			canOpenMpr: false,
			hasSeries: false,
			hasWorkbenchManifest: false,
			hasWorkstationReadiness: false,
			protocolExact: false,
			protocolCanApply: false,
			protocolLabel: "Test Protocol",
			projectionLabel: "Axial",
			axisLabel: "0°",
			slabMm: 1,
			sliceLabel: "Slice 1",
			windowLabel: "Bone",
			crosshair: false,
			linkedPlanes: false,
		};
		const result = buildMprWorkbenchSummary(input);
		assert.equal(result, "КТ-срезы: выберите готовую КЛКТ/КТ-серию.");
	});

	it("should return full summary when canOpenMpr is true and options are enabled", () => {
		const input: MprClinicalChecklistInput = {
			canOpenMpr: true,
			hasSeries: true,
			hasWorkbenchManifest: true,
			hasWorkstationReadiness: true,
			protocolExact: true,
			protocolCanApply: true,
			protocolLabel: "Test Protocol",
			projectionLabel: "аксиальная",
			axisLabel: "ось 0°",
			slabMm: 2,
			sliceLabel: "срез по центру",
			windowLabel: "кость",
			crosshair: true,
			linkedPlanes: true,
		};
		const result = buildMprWorkbenchSummary(input);
		assert.equal(
			result,
			"КТ-срезы: аксиальная · ось 0° · слой 2 мм · срез по центру · окно кость · протокол совпадает · плоскости связаны · курсор включен"
		);
	});

	it("should return full summary when canOpenMpr is true and options are disabled", () => {
		const input: MprClinicalChecklistInput = {
			canOpenMpr: true,
			hasSeries: true,
			hasWorkbenchManifest: true,
			hasWorkstationReadiness: true,
			protocolExact: false,
			protocolCanApply: true,
			protocolLabel: "Test Protocol",
			projectionLabel: "коронарная",
			axisLabel: "ось 15°",
			slabMm: 1,
			sliceLabel: "срез в первой половине",
			windowLabel: "мягкие ткани",
			crosshair: false,
			linkedPlanes: false,
		};
		const result = buildMprWorkbenchSummary(input);
		assert.equal(
			result,
			"КТ-срезы: коронарная · ось 15° · слой 1 мм · срез в первой половине · окно мягкие ткани · протокол требует настройки · плоскости отдельно · курсор скрыт"
		);
	});
});
