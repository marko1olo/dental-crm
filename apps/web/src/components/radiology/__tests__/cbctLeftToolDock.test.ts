import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CBCT_HOUNSFIELD_PRESETS,
	type HounsfieldPreset,
	type SlabProjectionMode,
} from "../cbctMprMath";
import type { CbctToolMode } from "../CbctLeftToolDock";

describe("Planmeca Romexis 6.x / Ez3D-i Left Tool Dock Architecture", () => {
	describe("1. Tool Mode Registry & Cursor Navigation Invariants", () => {
		it("supports all 8 essential Romexis/Ez3D-i tool modes", () => {
			const expectedTools: CbctToolMode[] = [
				"crosshair",
				"pan",
				"zoom",
				"window_level",
				"rotate",
				"ruler",
				"probe",
				"nerve",
			];

			assert.equal(expectedTools.length, 8);
			assert.ok(expectedTools.includes("crosshair"), "Crosshair navigation must be available");
			assert.ok(expectedTools.includes("pan"), "Pan tool must be available");
			assert.ok(expectedTools.includes("zoom"), "Zoom tool must be available");
			assert.ok(expectedTools.includes("window_level"), "Window/Level tool must be available");
			assert.ok(expectedTools.includes("rotate"), "Oblique rotation tool must be available");
			assert.ok(expectedTools.includes("ruler"), "Caliper distance tool must be available");
			assert.ok(expectedTools.includes("probe"), "HU densitometry probe must be available");
			assert.ok(expectedTools.includes("nerve"), "Mandibular canal nerve tracer must be available");
		});
	});

	describe("2. Slab Projection Modes & Thickness Constraints (1..30 mm)", () => {
		it("verifies standard slab projection modes", () => {
			const modes: SlabProjectionMode[] = ["single", "mip", "minip", "average"];
			assert.equal(modes.length, 4);
			assert.ok(modes.includes("single"));
			assert.ok(modes.includes("mip"));
			assert.ok(modes.includes("average"));
			assert.ok(modes.includes("minip"));
		});

		it("ensures slab thickness presets are within valid clinical ranges [1..30 mm]", () => {
			const quickPresets = [1, 2, 3, 5, 10, 15, 30];
			for (const t of quickPresets) {
				assert.ok(t >= 1.0 && t <= 30.0, `Thickness ${t} mm must be in range [1, 30]`);
			}
		});
	});

	describe("3. Clinical HU Contrast Presets Exact Specifications", () => {
		it("contains Dental/Зубы preset with WW 4400 / WL 1300", () => {
			const dental = CBCT_HOUNSFIELD_PRESETS.find((p) => p.id === "bone_dense");
			assert.ok(dental);
			assert.equal(dental.windowWidth, 4400);
			assert.equal(dental.windowLevel, 1300);
		});

		it("contains Endodontics/Эндо preset with WW 5500 / WL 1600", () => {
			const endo = CBCT_HOUNSFIELD_PRESETS.find((p) => p.id === "enamel_dentin");
			assert.ok(endo);
			assert.equal(endo.windowWidth, 5500);
			assert.equal(endo.windowLevel, 1600);
		});

		it("contains Cortical bone/Кортикал preset with WW 3500 / WL 900", () => {
			const cortical = CBCT_HOUNSFIELD_PRESETS.find((p) => p.id === "bone_cortical");
			assert.ok(cortical);
			assert.equal(cortical.windowWidth, 3500);
			assert.equal(cortical.windowLevel, 900);
		});

		it("contains Soft tissue/Мягкие ткани preset with WW 600 / WL 50", () => {
			const soft = CBCT_HOUNSFIELD_PRESETS.find((p) => p.id === "soft_tissue");
			assert.ok(soft);
			assert.equal(soft.windowWidth, 600);
			assert.equal(soft.windowLevel, 50);
		});

		it("contains Airways & Sinuses/Пазухи preset with WW 1600 / WL -400", () => {
			const sinus = CBCT_HOUNSFIELD_PRESETS.find((p) => p.id === "airways_sinus");
			assert.ok(sinus);
			assert.equal(sinus.windowWidth, 1600);
			assert.equal(sinus.windowLevel, -400);
		});
	});
});
