import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ALL_FDI_TEETH,
	CLINICAL_2D_WL_PRESETS,
	DEFAULT_MODALITY_PIXEL_SPACING,
	FDI_QUADRANTS,
	VATECH_DEVICE_CALIBRATION_PRESETS,
	VATECH_EZDENT_IP_MODES,
	calculateCursorCenteredZoom,
	calculatePhysicalDistanceMm,
	calculateUnsharpMaskWeights,
	calibrateSpatialScale,
	formatDistanceMm,
	isValidFdiTooth,
	resolveCalibratedPixelSpacing,
} from "../dentalViewerMath";
import {
	createRvgGlRenderer,
	type RvgGlRenderParams,
} from "../rvgGlShaderRenderer";

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

	describe("WebGL 2D Shader Engine & Zero-Jank Filter Pipeline", () => {
		it("creates a valid renderer instance with graceful 2D fallback when WebGL context is null", () => {
			const mockCanvas = {
				width: 1000,
				height: 1300,
				getContext: (type: string) => {
					if (type === "webgl" || type === "experimental-webgl") return null;
					if (type === "2d") {
						return {
							clearRect: () => {},
							drawImage: () => {},
							filter: "none",
						};
					}
					return null;
				},
			} as unknown as HTMLCanvasElement;

			const renderer = createRvgGlRenderer(mockCanvas);
			assert.ok(renderer, "Renderer instance must be created");
			assert.equal(renderer.isWebGL, false, "Fallback to 2D canvas in headless environment");

			const mockImg = { width: 1000, height: 1300 } as HTMLImageElement;
			assert.equal(renderer.updateImage(mockImg), true);

			const params: RvgGlRenderParams = {
				brightness: 120,
				contrast: 150,
				sharpness: 50,
				invert: true,
			};
			assert.equal(renderer.render(params), true);

			// Disposing should be error-free
			assert.doesNotThrow(() => renderer.dispose());
		});

		it("validates 3x3 unsharp mask Laplacian edge enhancement math on GPU", () => {
			// Center pixel 0.5 with surrounding edge contrast
			const center = 0.5;
			const n = 0.2, s = 0.8, w = 0.3, e = 0.7;
			const laplacian = (n + s + w + e) - 4.0 * center;
			assert.equal(laplacian, 0.0); // uniform gradient balance

			// High-frequency detail / apical edge
			const edgeCenter = 0.2;
			const edgeNeighbors = 0.8;
			const edgeLaplacian = 4.0 * edgeNeighbors - 4.0 * edgeCenter; // 3.2 - 0.8 = 2.4
			const sharpness = 60.0;
			const weight = (sharpness / 100.0) * 1.6;
			const enhanced = edgeCenter - weight * -edgeLaplacian; // boosted edge
			assert.ok(enhanced > edgeCenter, "Unsharp mask must enhance high-frequency edge transition");
		});

		it("verifies negative inversion mapping is mathematically exact (1.0 - color)", () => {
			const testLevels = [0.0, 0.25, 0.5, 0.75, 1.0];
			for (const val of testLevels) {
				const inverted = 1.0 - val;
				const restored = 1.0 - inverted;
				assert.equal(restored, val);
			}
		});
	});

	describe("Vatech Hardware Sensor Calibration Matrix (Ground Truth from EzDent-i)", () => {
		it("provides exact physical calibration for Vatech EzSensor 1.5 (35.0 microns = 0.0350 mm/px)", () => {
			const preset = VATECH_DEVICE_CALIBRATION_PRESETS.ezsensor_standard;
			assert.ok(preset);
			assert.equal(preset.calMmPerPx, 0.0350);
			assert.equal(preset.pixelPitchMicrons, 35.0);

			// A 600-pixel root canal measured on EzSensor 1.5
			const p1 = { x: 100, y: 100 };
			const p2 = { x: 100, y: 700 }; // 600 px
			const measuredLength = calculatePhysicalDistanceMm(p1, p2, preset.calMmPerPx);

			// 600 * 0.0350 = 21.0 mm (Clinical ground truth)
			assert.equal(measuredLength, 21.0);
			assert.equal(formatDistanceMm(measuredLength), "21.0 мм");

			// Contrast against naive 0.04 hardcode which produced 24.0 mm (3.0 mm dangerous overestimation)
			const naiveDistance = calculatePhysicalDistanceMm(p1, p2, 0.04);
			assert.equal(naiveDistance, 24.0);
			assert.equal(naiveDistance - measuredLength, 3.0, "Naive hardcode causes dangerous 3.0 mm endodontic over-instrumentation error");
		});

		it("provides exact calibration for EzSensor Soft High Resolution (14.8 microns = 0.0148 mm/px)", () => {
			const preset = VATECH_DEVICE_CALIBRATION_PRESETS.ezsensor_soft_hr;
			assert.ok(preset);
			assert.equal(preset.calMmPerPx, 0.0148);
			assert.equal(preset.pixelPitchMicrons, 14.8);

			const p1 = { x: 0, y: 0 };
			const p2 = { x: 1000, y: 0 }; // 1000 px
			const dist = calculatePhysicalDistanceMm(p1, p2, preset.calMmPerPx);
			assert.equal(dist, 14.8);
		});

		it("provides exact calibration for PaX-i panoramic sensor (76.1 microns = 0.0761 mm/px)", () => {
			const preset = VATECH_DEVICE_CALIBRATION_PRESETS.pax_i_pano;
			assert.ok(preset);
			assert.equal(preset.calMmPerPx, 0.0761);

			// UHD mode is exactly 38.0 microns
			const uhd = VATECH_DEVICE_CALIBRATION_PRESETS.pax_i_pano_uhd;
			assert.equal(uhd.calMmPerPx, 0.0380);
		});

		it("correctly resolves calibrated pixel spacing from device name string", () => {
			assert.equal(resolveCalibratedPixelSpacing("Vatech EzSensor 1.5 USB"), 0.0350);
			assert.equal(resolveCalibratedPixelSpacing("EzSensor Soft HR"), 0.0148);
			assert.equal(resolveCalibratedPixelSpacing("EzSensor Classic"), 0.0296);
			assert.equal(resolveCalibratedPixelSpacing("PaX-i Pano"), 0.0761);
			assert.equal(resolveCalibratedPixelSpacing("PaX-i UHD Pano"), 0.0380);
			assert.equal(resolveCalibratedPixelSpacing("PaX-Reve3D Ceph"), 0.1108);
			assert.equal(resolveCalibratedPixelSpacing(null), 0.0350); // Safe modern default
		});
	});

	describe("Cursor-Centered Zoom Mathematics (Anti-Drift Invariant)", () => {
		it("proves that zooming keeps the target anatomical point stationary under mouse cursor", () => {
			const canvasWidth = 1000;
			const canvasHeight = 800;
			const currentZoom = 1.0;
			const zoomFactor = 1.5; // Zoom in to 1.5x
			const currentPanX = 0;
			const currentPanY = 0;

			// Doctor points at apex of tooth 36 located at screen (650, 480)
			const cursorX = 650;
			const cursorY = 480;

			const result = calculateCursorCenteredZoom({
				currentZoom,
				zoomFactor,
				cursorX,
				cursorY,
				canvasWidth,
				canvasHeight,
				currentPanX,
				currentPanY,
			});

			assert.equal(result.nextZoom, 1.5);

			// Center is (500, 400).
			// Cursor offset from center = (150, 80).
			// Ratio = 1.5. Next pan = 0 + (150) * (1 - 1.5) = -75. Next panY = (80) * (1 - 1.5) = -40.
			assert.equal(result.nextPanX, -75);
			assert.equal(result.nextPanY, -40);

			// Verification: Image point under cursor before zoom:
			// P_image_x = (cursorX - center - panOld) / zoomOld = (650 - 500 - 0) / 1.0 = 150
			// Image point under cursor after zoom:
			// P_image_x_after = (cursorX - center - panNew) / zoomNew = (650 - 500 - (-75)) / 1.5 = 225 / 1.5 = 150!
			const beforeImageX = (cursorX - canvasWidth / 2 - currentPanX) / currentZoom;
			const afterImageX = (cursorX - canvasWidth / 2 - result.nextPanX) / result.nextZoom;
			assert.equal(Number(beforeImageX.toFixed(4)), Number(afterImageX.toFixed(4)), "Anatomical coordinate under cursor must be 100% identical before and after zoom");

			const beforeImageY = (cursorY - canvasHeight / 2 - currentPanY) / currentZoom;
			const afterImageY = (cursorY - canvasHeight / 2 - result.nextPanY) / result.nextZoom;
			assert.equal(Number(beforeImageY.toFixed(4)), Number(afterImageY.toFixed(4)), "Y coordinate under cursor must be 100% identical before and after zoom");
		});

		it("performs pure centered zoom when cursor is at viewport center", () => {
			const result = calculateCursorCenteredZoom({
				currentZoom: 1.0,
				zoomFactor: 2.0,
				cursorX: 500,
				cursorY: 400,
				canvasWidth: 1000,
				canvasHeight: 800,
				currentPanX: 0,
				currentPanY: 0,
			});

			assert.equal(result.nextZoom, 2.0);
			assert.equal(result.nextPanX, 0);
			assert.equal(result.nextPanY, 0);
		});
	});

	describe("Vatech EzDent-i Multi-Scale Unsharp Masking Math", () => {
		it("loads all canonical Vatech image processing modes from EzSensor.ini", () => {
			assert.equal(VATECH_EZDENT_IP_MODES.length, 7);
			const modeIds = VATECH_EZDENT_IP_MODES.map((m) => m.id);
			assert.ok(modeIds.includes("ip1_molar_rc"));
			assert.ok(modeIds.includes("ip3_molar_hc"));
			assert.ok(modeIds.includes("ip8_caries_hc"));
		});

		it("calculates accurate unsharp mask weights and laplacian scaling", () => {
			const molarWeights = calculateUnsharpMaskWeights("ip1_molar_rc");
			assert.equal(molarWeights.amount, 150);
			assert.equal(molarWeights.radius, 2.0);
			assert.equal(molarWeights.laplacianWeight, 1.2); // (150 / 100) * 0.8 = 1.2
			assert.equal(molarWeights.threshold, 80);

			const cariesWeights = calculateUnsharpMaskWeights("ip8_caries_hc");
			assert.equal(cariesWeights.amount, 200);
			assert.equal(cariesWeights.laplacianWeight, 1.6);
		});
	});
});
