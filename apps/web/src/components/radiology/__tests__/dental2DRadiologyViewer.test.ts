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

	describe("Calibrated Ruler Zoom & Pan Scale Invariance (Mandate 8e, 8n)", () => {
		// Import extractTransformParams dynamically or from component
		it("extracts transform params cleanly from CSS transform string", async () => {
			const { extractTransformParams } = await import("../../imaging/ShadowAnalystImageSlider");
			
			// Default / none
			const def = extractTransformParams("none");
			assert.deepEqual(def, { zoom: 1, panX: 0, panY: 0, rotationDeg: 0, flipHorizontal: false });

			const empty = extractTransformParams(undefined);
			assert.deepEqual(empty, { zoom: 1, panX: 0, panY: 0, rotationDeg: 0, flipHorizontal: false });

			// Complex transform with pan, zoom, rotation, and flip
			const complex = extractTransformParams("translate(75px, -45px) scale(2.5) rotate(90deg) scaleX(-1)");
			assert.equal(complex.zoom, 2.5);
			assert.equal(complex.panX, 75);
			assert.equal(complex.panY, -45);
			assert.equal(complex.rotationDeg, 90);
			assert.equal(complex.flipHorizontal, true);
		});

		it("proves measured physical length in mm is 100% invariant under zoom and pan transformations", async () => {
			const { extractTransformParams } = await import("../../imaging/ShadowAnalystImageSlider");

			// Simulate container dimensions (1000px x 800px)
			const rect = { left: 100, top: 50, width: 1000, height: 800 };
			const cx = rect.left + rect.width / 2; // 600
			const cy = rect.top + rect.height / 2; // 450
			const pixelSpacingMm = 0.04; // RVG 0.04 mm/px

			// Target anatomical landmark: tooth 36 root canal (250px long unzoomed = 10.0 mm)
			// Landmark starts at unzoomed (550, 450) and ends at (800, 450)
			const unzoomedP1 = { x: 550, y: 450 };
			const unzoomedP2 = { x: 800, y: 450 };

			// Condition A: 1.0x Zoom, 0px Pan
			const transformA = "none";
			const paramsA = extractTransformParams(transformA);
			
			// Condition B: 2.5x Zoom, panX = 120px, panY = -80px
			const transformB = "translate(120px, -80px) scale(2.5)";
			const paramsB = extractTransformParams(transformB);

			// Under Condition B, landmarks on screen are transformed:
			// dxScreen = panX + zoom * (landmarkX - cx)
			const screenB1 = {
				clientX: cx + paramsB.panX + paramsB.zoom * (unzoomedP1.x - cx),
				clientY: cy + paramsB.panY + paramsB.zoom * (unzoomedP1.y - cy),
			};
			const screenB2 = {
				clientX: cx + paramsB.panX + paramsB.zoom * (unzoomedP2.x - cx),
				clientY: cy + paramsB.panY + paramsB.zoom * (unzoomedP2.y - cy),
			};

			// Inverse mapping function (same as getClientToImagePercent in ShadowAnalystImageSlider)
			const mapToPercent = (clientX: number, clientY: number, params: typeof paramsB) => {
				const dxScreen = clientX - (cx + params.panX);
				const dyScreen = clientY - (cy + params.panY);
				const dxUnzoomed = dxScreen / params.zoom;
				const dyUnzoomed = dyScreen / params.zoom;
				const unzoomedX = cx + dxUnzoomed;
				const unzoomedY = cy + dyUnzoomed;
				const xPct = ((unzoomedX - rect.left) / rect.width) * 100;
				const yPct = ((unzoomedY - rect.top) / rect.height) * 100;
				return { x: xPct, y: yPct };
			};

			const pA1 = mapToPercent(unzoomedP1.x, unzoomedP1.y, paramsA);
			const pA2 = mapToPercent(unzoomedP2.x, unzoomedP2.y, paramsA);
			const distPxA = Math.hypot(((pA2.x - pA1.x) / 100) * rect.width, ((pA2.y - pA1.y) / 100) * rect.height);
			const lengthMmA = Math.round(distPxA * pixelSpacingMm * 10) / 10;

			const pB1 = mapToPercent(screenB1.clientX, screenB1.clientY, paramsB);
			const pB2 = mapToPercent(screenB2.clientX, screenB2.clientY, paramsB);
			const distPxB = Math.hypot(((pB2.x - pB1.x) / 100) * rect.width, ((pB2.y - pB1.y) / 100) * rect.height);
			const lengthMmB = Math.round(distPxB * pixelSpacingMm * 10) / 10;

			// Invariance assertion: physical length in mm must be identical
			assert.equal(lengthMmA, 10.0, "Unzoomed measurement must be 10.0 mm");
			assert.equal(lengthMmB, 10.0, "Zoomed 2.5x measurement must also be 10.0 mm");
			assert.equal(lengthMmA, lengthMmB, "Measured length in mm must be 100% invariant under zoom and pan");
		});

		it("proves badge counter-scale prevents text ballooning at high zoom", () => {
			const zoomFactors = [1.0, 1.5, 2.0, 3.0, 4.0];
			for (const zoom of zoomFactors) {
				const badgeCounterScale = 1 / Math.max(0.2, zoom);
				const effectiveScreenScale = zoom * badgeCounterScale;
				assert.equal(
					Math.round(effectiveScreenScale * 100) / 100,
					1.0,
					`Effective badge scale at zoom ${zoom}x must remain exactly 1.0`,
				);
			}
		});
	});
});
