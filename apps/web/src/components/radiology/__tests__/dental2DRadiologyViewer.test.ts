import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_FDI_TEETH,
	CLINICAL_2D_WL_PRESETS,
	DEFAULT_MODALITY_PIXEL_SPACING,
	FDI_QUADRANTS,
	calculatePhysicalDistanceMm,
	calibrateSpatialScale,
	formatDistanceMm,
	isValidFdiTooth,
} from "../dentalViewerMath";

describe("Dental 2D Radiology Engine — Clean Outpatient Tests", () => {
	describe("Spatial Calibration and Measurement Math", () => {
		it("calculates accurate physical distance in mm for RVG sensor (0.04 mm/px)", () => {
			// A 250 pixel vertical line on RVG
			const p1 = { x: 100, y: 100 };
			const p2 = { x: 100, y: 350 };
			const mmPerPx = DEFAULT_MODALITY_PIXEL_SPACING.rvg ?? 0.04;
			const distance = calculatePhysicalDistanceMm(p1, p2, mmPerPx);

			// 250 * 0.04 = 10.0 mm
			assert.equal(distance, 10.0);
			assert.equal(formatDistanceMm(distance), "10.0 мм");
		});

		it("calculates accurate physical distance in mm for OPG panoramic scan (0.10 mm/px)", () => {
			const p1 = { x: 50, y: 50 };
			const p2 = { x: 170, y: 50 }; // 120 px horizontal
			const mmPerPx = DEFAULT_MODALITY_PIXEL_SPACING.opg ?? 0.10;
			const distance = calculatePhysicalDistanceMm(p1, p2, mmPerPx);

			// 120 * 0.10 = 12.0 mm
			assert.equal(distance, 12.0);
			assert.equal(formatDistanceMm(distance), "12.0 мм");
		});

		it("calculates accurate Euclidean diagonal distance for CBCT slice (0.125 mm/px)", () => {
			const p1 = { x: 0, y: 0 };
			const p2 = { x: 300, y: 400 }; // 3-4-5 triangle: hypot = 500 px
			const mmPerPx = DEFAULT_MODALITY_PIXEL_SPACING.cbct_slice ?? 0.125;
			const distance = calculatePhysicalDistanceMm(p1, p2, mmPerPx);

			// 500 * 0.125 = 62.5 mm
			assert.equal(distance, 62.5);
			assert.equal(formatDistanceMm(distance), "62.5 мм");
		});

		it("calibrates spatial scale from a known 10mm implant/sphere reference", () => {
			const p1 = { x: 200, y: 100 };
			const p2 = { x: 200, y: 350 }; // 250 pixels
			const knownMm = 10.0;
			const calibratedRatio = calibrateSpatialScale(p1, p2, knownMm);

			// 10 / 250 = 0.04 mm/px
			assert.equal(calibratedRatio, 0.04);
		});
	});

	describe("FDI Tooth Formula Mapping (11..48)", () => {
		it("contains all 4 anatomical quadrants with exactly 8 teeth each (total 32 permanent teeth)", () => {
			assert.equal(FDI_QUADRANTS.q1_upper_right.length, 8);
			assert.equal(FDI_QUADRANTS.q2_upper_left.length, 8);
			assert.equal(FDI_QUADRANTS.q3_lower_left.length, 8);
			assert.equal(FDI_QUADRANTS.q4_lower_right.length, 8);
			assert.equal(ALL_FDI_TEETH.length, 32);
		});

		it("correctly validates valid permanent teeth across all quadrants", () => {
			assert.equal(isValidFdiTooth("11"), true);
			assert.equal(isValidFdiTooth("18"), true);
			assert.equal(isValidFdiTooth("24"), true);
			assert.equal(isValidFdiTooth("36"), true);
			assert.equal(isValidFdiTooth("47"), true);
		});

		it("rejects invalid tooth codes", () => {
			assert.equal(isValidFdiTooth("0"), false);
			assert.equal(isValidFdiTooth("19"), false);
			assert.equal(isValidFdiTooth("20"), false);
			assert.equal(isValidFdiTooth("50"), false);
			assert.equal(isValidFdiTooth("abc"), false);
		});
	});

	describe("Clinical W/L Presets Integrity", () => {
		it("provides all essential dental presets: standard, endo, implant, negative, soft_tissue", () => {
			const ids = CLINICAL_2D_WL_PRESETS.map((p) => p.id);
			assert.ok(ids.includes("standard"));
			assert.ok(ids.includes("endo"));
			assert.ok(ids.includes("implant_bone"));
			assert.ok(ids.includes("negative_invert"));
			assert.ok(ids.includes("soft_tissue"));
		});

		it("ensures negative preset has invert flag enabled for microcrack detection", () => {
			const negativePreset = CLINICAL_2D_WL_PRESETS.find((p) => p.id === "negative_invert");
			assert.ok(negativePreset);
			assert.equal(negativePreset.invert, true);
		});

		it("ensures endo preset provides high contrast for canal visualization", () => {
			const endoPreset = CLINICAL_2D_WL_PRESETS.find((p) => p.id === "endo");
			assert.ok(endoPreset);
			assert.ok(endoPreset.contrast >= 150);
		});
	});
});
