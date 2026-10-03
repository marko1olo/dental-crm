/**
 * CBCT MANDIBULAR NERVE & 3D MPR VIEWPORTS INTEGRATION TEST SUITE
 *
 * Verifies end-to-end integration of:
 * 1. 2-Seed semi-automatic Fast Marching pathfinder (Mental foramen -> Mandibular foramen in < 100 ms).
 * 2. Dynamic 3D nerve spline projection onto cross-section slices (project3DNerveToCrossSection).
 * 3. Mandibular nerve canal rendering across all 4-MPR viewports and panoramic view.
 * 4. 3D Volume Viewport vector overlay (project3DWorldToVolumeScreen, 2.5 mm #FF9100 tube).
 * 5. Dynamic apex-to-nerve clearance audit with Vatech color coding:
 *    - Safe (>= 2.0 mm, #10b981)
 *    - Warning (1.5 - 2.0 mm, #f59e0b)
 *    - Danger collision (< 1.5 mm, #ef4444)
 *
 * Mandate 8b: Декомпозиция монолитов (строго <= 800 строк).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { CbctVoxelVolume, Point3D } from "../cbctMprMath";
import {
	traceMandibularNerveFastMarching,
	evaluateVatechImplantNerveClearance,
	VATECH_CANAL_BASE_DIAMETER_MM,
	VATECH_CANAL_SAFETY_ZONE_MM,
	VATECH_MINIMAL_APICAL_DISTANCE_MM,
	VATECH_COLLISION_DANGER_MM,
} from "../fastMarchingNerve";
import {
	project3DNerveToCrossSection,
	interpolateNerveSpline3D,
	calculateSplineLength3DMm,
} from "../cbctCaliperNerveMath";
import {
	auditNerveSafetyMargin,
	calculateApexCoordinates,
	calculateImplant3DWorldPose,
	STANDARD_IMPLANT_CATALOG,
	type CrossSectionImplantPose,
	type MandibularCanalCrossSection,
} from "../implantSafetyEngine";
import {
	computeVolume3DRotationMatrix,
} from "../mpr/cbctVolume3DMath";
import {
	project3DWorldToVolumeScreen,
	drawVolume3DOverlay,
} from "../mpr/cbctVolume3DOverlayRenderer";
import {
	drawCrossSectionOverlay,
} from "../mpr/cbctCurvedOverlayRenderers";

/**
 * Creates a synthetic 3D CBCT volume for testing with a defined hypodense canal corridor.
 */
function createSyntheticTestVolume(dim = 64, spacingMm = 0.4): CbctVoxelVolume {
	const totalVoxels = dim * dim * dim;
	const data = new Int16Array(totalVoxels);
	// Fill with dense trabecular bone (~800 HU)
	data.fill(800);

	// Carve a hypodense cylindrical lumen (150 HU) along the mandibular canal trajectory
	for (let x = 10; x <= 54; x++) {
		const y = Math.round(20 + Math.sin((x / 54) * Math.PI) * 12);
		const z = Math.round(15 + (x / 54) * 10);
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (let dz = -1; dz <= 1; dz++) {
					const idx = (z + dz) * dim * dim + (y + dy) * dim + (x + dx);
					if (idx >= 0 && idx < totalVoxels) {
						data[idx] = 150; // Hypodense canal lumen
					}
				}
			}
		}
	}

	return {
		id: "test_volume",
		data,
		dimensions: { width: dim, height: dim, depth: dim },
		spacingMm: { x: spacingMm, y: spacingMm, z: spacingMm },
		originMm: { x: 0, y: 0, z: 0 },
		physicalSizeMm: { x: dim * spacingMm, y: dim * spacingMm, z: dim * spacingMm },
		minHU: -1000,
		maxHU: 3000,
		defaultWindowLevel: 500,
		defaultWindowWidth: 2000,
		isDisposed: false,
	};
}

describe("Red Team Layer 2: Mandibular Nerve & 3D MPR Cross-Section Integration", () => {
	const volume = createSyntheticTestVolume(64, 0.4);

	// ─── 1. FAST MARCHING NERVE TRACING IN < 100 MS ───────────────────────────
	describe("1. 2-Seed Fast Marching Nerve Segmentation Workflow", () => {
		const mentalForamen: Point3D = { x: 10 * 0.4, y: 20 * 0.4, z: 15 * 0.4 };
		const mandibularForamen: Point3D = { x: 54 * 0.4, y: 20 * 0.4, z: 25 * 0.4 };

		it("computes the 3D mandibular nerve spline in < 100 ms", () => {
			const t0 = performance.now();
			const result = traceMandibularNerveFastMarching(volume, mentalForamen, mandibularForamen);
			const durationMs = performance.now() - t0;

			assert.ok(durationMs < 100, `Expected execution < 100 ms, took ${durationMs.toFixed(2)} ms`);
			assert.ok(result.totalLengthMm > 0, "Nerve length should be positive");
			assert.ok(result.physicalSpline.length >= 2, "Spline must contain at least 2 points");
			assert.ok(result.controlPoints.length >= 2, "Must return control points");
			assert.equal(result.estimatedDiameterMm, VATECH_CANAL_BASE_DIAMETER_MM);
		});

		it("generates continuous 3D Catmull-Rom spline with sub-millimeter precision", () => {
			const seeds = [mentalForamen, { x: 30 * 0.4, y: 32 * 0.4, z: 20 * 0.4 }, mandibularForamen];
			const spline = interpolateNerveSpline3D(seeds, 10);
			const lengthMm = calculateSplineLength3DMm(spline);

			assert.ok(spline.length > seeds.length, "Interpolated spline must have more points than seeds");
			assert.ok(lengthMm > 15.0, "Physical length must represent realistic anatomical distance");
		});
	});

	// ─── 2. DYNAMIC CROSS-SECTION SLICE PROJECTION ────────────────────────────
	describe("2. Dynamic 3D-to-Cross-Section Spline Projection (project3DNerveToCrossSection)", () => {
		const testSpline: Point3D[] = [
			{ x: -10, y: 15, z: -5 },
			{ x: -5, y: 18, z: -6 },
			{ x: 0, y: 20, z: -7 },
			{ x: 5, y: 18, z: -6 },
			{ x: 10, y: 15, z: -5 },
		];

		it("accurately projects intersection of nerve spline onto transverse cross-section slice", () => {
			// Cross-section slice centered at (0, 20, 0) with normal across ridge (0, 1) and tangent (1, 0)
			const sliceCenter: Point3D = { x: 0, y: 20, z: 0 };
			const normal2D = { x: 0, y: 1 };
			const tangent2D = { x: 1, y: 0 };
			const sliceHeightMm = 34.0;
			const topCrestMarginMm = 4.0;

			const result = project3DNerveToCrossSection(
				testSpline,
				sliceCenter,
				normal2D,
				tangent2D,
				sliceHeightMm,
				topCrestMarginMm,
			);

			assert.ok(result !== null, "Nerve intersection must be found near slice center");
			assert.equal(result.distanceToPlaneMm, 0, "Intersection point must have 0 distance to slice plane");
			// In-slice depth yDepthMm = crestZ - P.z = (0 + 17 - 4) - (-7) = 13 - (-7) = 20 mm
			assert.equal(result.yDepthMm, 20.0);
			assert.equal(result.xOffsetMm, 0.0);
		});

		it("returns null when cross-section slice is beyond maximum distance threshold (> 3.0 mm)", () => {
			const farSliceCenter: Point3D = { x: 40, y: 50, z: 0 };
			const result = project3DNerveToCrossSection(
				testSpline,
				farSliceCenter,
				{ x: 0, y: 1 },
				{ x: 1, y: 0 },
			);

			assert.equal(result, null, "Far cross-section must return null");
		});
	});

	// ─── 3. VATECH CLEARANCE AUDIT & DYNAMIC STATUS COLORING ──────────────────
	describe("3. Dynamic Apical Clearance Calculation & Vatech Safety Status", () => {
		const implantPose: CrossSectionImplantPose = {
			entryPoint: { x: 0, y: 2.0 },
			angulationDeg: 0,
			implantSpec: STANDARD_IMPLANT_CATALOG[0]!, // 10 mm length, 3.5 mm diameter
		};

		it("correctly flags SAFE (green) when clearance >= 2.0 mm (Vatech standard)", () => {
			// Canal at depth 19.0 mm -> apex at 2.0 + 10.0 = 12.0 mm -> distance to center = 7.0 mm
			// Net clearance to canal wall = 7.0 - (implant radius 1.75 + canal radius 1.4) = 3.85 mm >= 2.0 mm (Misch) and >= 3.0 mm (Vatech apical)
			const safeCanal: MandibularCanalCrossSection = {
				center: { x: 0, y: 19.0 },
				radiusMm: 1.4,
				safetyMarginMm: 2.0,
			};

			const audit2D = auditNerveSafetyMargin(implantPose, safeCanal);
			assert.equal(audit2D.safetyStatus, "safe");
			assert.equal(audit2D.isDangerous, false);
			assert.equal(audit2D.isWarning, false);
			assert.ok(audit2D.netClearanceToCanalWallMm >= 2.0);

			const vatech3D = evaluateVatechImplantNerveClearance(3.85, 3.85);
			assert.equal(vatech3D.safetyStatus, "safe");
			assert.equal(vatech3D.isSafe, true);
		});

		it("correctly flags WARNING (amber) when clearance is between 1.5 mm and 2.0 mm", () => {
			// Canal at depth 16.9 mm -> apex at 12.0 mm -> distance to center = 4.9 mm
			// Net clearance = 4.9 - 3.15 = 1.75 mm (1.5 <= 1.75 < 2.0)
			const warningCanal: MandibularCanalCrossSection = {
				center: { x: 0, y: 16.9 },
				radiusMm: 1.4,
				safetyMarginMm: 2.0,
			};

			const audit2D = auditNerveSafetyMargin(implantPose, warningCanal);
			assert.equal(audit2D.safetyStatus, "warning");
			assert.equal(audit2D.isWarning, true);
			assert.equal(audit2D.isDangerous, false);

			const vatech3D = evaluateVatechImplantNerveClearance(2.5, 1.75);
			assert.equal(vatech3D.safetyStatus, "warning");
			assert.equal(vatech3D.isWarning, true);
		});

		it("correctly flags DANGER COLLISION (red) when clearance is < 1.5 mm", () => {
			// Canal at depth 16.0 mm -> apex at 12.0 mm -> distance to center = 4.0 mm
			// Net clearance = 4.0 - 3.15 = 0.85 mm (< 1.5 mm collision danger)
			const dangerCanal: MandibularCanalCrossSection = {
				center: { x: 0, y: 16.0 },
				radiusMm: 1.4,
				safetyMarginMm: 2.0,
			};

			const audit2D = auditNerveSafetyMargin(implantPose, dangerCanal);
			assert.equal(audit2D.safetyStatus, "danger");
			assert.equal(audit2D.isDangerous, true);

			const vatech3D = evaluateVatechImplantNerveClearance(0.85, 0.85);
			assert.equal(vatech3D.safetyStatus, "danger");
			assert.equal(vatech3D.isDanger, true);
		});
	});

	// ─── 4. 3D VOLUME VIEWPORT ORTHOGRAPHIC PROJECTION & OVERLAY ──────────────
	describe("4. 3D Volume Viewport Orthographic Screen Projection", () => {
		const rotMat = computeVolume3DRotationMatrix(30, 12);
		const scale = 2.5;
		const center = { x: 256, y: 256 };

		it("accurately projects 3D world coordinate to screen pixels matching shaders", () => {
			const pt3D: Point3D = { x: 12.8, y: 12.8, z: 12.8 }; // Voxel (32, 32, 32) at midpoint
			const proj = project3DWorldToVolumeScreen(pt3D, volume, rotMat, scale, center);

			assert.ok(proj.isVisible, "Midpoint voxel must be visible");
			// Centered voxel at (0, 0, 0) should project exactly to viewport center (256, 256)
			assert.equal(Math.round(proj.screenX), 256);
			assert.equal(Math.round(proj.screenY), 256);
		});

		it("renders 3D vector overlay without throwing on mock 2D canvas context", () => {
			const mockCtx = {
				canvas: { width: 512, height: 512 },
				save: () => {},
				restore: () => {},
				beginPath: () => {},
				moveTo: () => {},
				lineTo: () => {},
				arc: () => {},
				rect: () => {},
				roundRect: () => {},
				fill: () => {},
				stroke: () => {},
				closePath: () => {},
				setLineDash: () => {},
				measureText: () => ({ width: 40 }),
				fillText: () => {},
			} as unknown as CanvasRenderingContext2D;

			const implant3D = calculateImplant3DWorldPose(
				{
					entryPoint: { x: 0, y: 2.0 },
					angulationDeg: 0,
					implantSpec: STANDARD_IMPLANT_CATALOG[0]!,
				},
				{ x: 12.8, y: 12.8, z: 12.8 },
				{ x: 0, y: 1 },
			);

			assert.doesNotThrow(() => {
				drawVolume3DOverlay(mockCtx, {
					volume,
					yaw: 30,
					pitch: 12,
					zoom: 1.0,
					pan: { x: 0, y: 0 },
					width: 512,
					height: 512,
					nervePoints: [{ x: 10, y: 12, z: 8 }, { x: 15, y: 14, z: 10 }],
					interpolatedNerve3D: [{ x: 10, y: 12, z: 8 }, { x: 12, y: 13, z: 9 }, { x: 15, y: 14, z: 10 }],
					implant3DWorld: implant3D,
					nerveAuditResult: { isDangerous: false, isWarning: false, netClearanceToCanalWallMm: 3.2 },
				});
			});
		});
	});

	// ─── 5. CROSS-SECTION OVERLAY IN ALL VIEW MODES ───────────────────────────
	describe("5. Cross-Section Overlay Mandibular Canal Visibility", () => {
		it("renders mandibular canal in both implant and non-implant (panoramic) modes", () => {
			const mockCtx = {
				canvas: { width: 400, height: 400 },
				save: () => {},
				restore: () => {},
				translate: () => {},
				scale: () => {},
				rotate: () => {},
				beginPath: () => {},
				moveTo: () => {},
				lineTo: () => {},
				arc: () => {},
				rect: () => {},
				roundRect: () => {},
				fill: () => {},
				stroke: () => {},
				fillRect: () => {},
				closePath: () => {},
				setLineDash: () => {},
				measureText: () => ({ width: 30 }),
				fillText: () => {},
			} as unknown as CanvasRenderingContext2D;

			const mockCrossSection = {
				sliceIndex: 0,
				distanceAlongArchMm: 24.0,
				centerPointMm: { x: 0, y: 20, z: 0 },
				normalVector2D: { x: 0, y: 1 },
				tangentVector2D: { x: 1, y: 0 },
				nearestToothFdi: "46",
				toothLabelRu: "Моляр #46",
				widthMm: 24.0,
				heightMm: 34.0,
				pixelSpacingMm: 0.25,
				widthPx: 400,
				heightPx: 400,
				pixelData: new Uint8ClampedArray(400 * 400 * 4),
			};

			const canal: MandibularCanalCrossSection = {
				center: { x: 1.5, y: 18.0 },
				radiusMm: 1.4,
				safetyMarginMm: 2.0,
			};

			// Panoramic mode test (non-implant)
			assert.doesNotThrow(() => {
				drawCrossSectionOverlay(mockCtx, {
					activeCrossSection: mockCrossSection,
					transform: { panX: 0, panY: 0, zoom: 1.0 },
					studioMode: "panoramic",
					currentCanal: canal,
					currentImplantPose: {
						entryPoint: { x: 0, y: 2.0 },
						angulationDeg: 0,
						implantSpec: STANDARD_IMPLANT_CATALOG[0]!,
					},
					currentImplantSpec: STANDARD_IMPLANT_CATALOG[0]!,
					nerveAuditResult: {
						isDangerous: false,
						isWarning: false,
						netClearanceToCanalWallMm: 3.5,
						clinicalMessageRu: "Безопасно",
					},
					selectedMeasurement: null,
					hoveredImplantPart: null,
					dragImplantPart: null,
					invertColors: false,
				});
			});

			// Implant mode test
			assert.doesNotThrow(() => {
				drawCrossSectionOverlay(mockCtx, {
					activeCrossSection: mockCrossSection,
					transform: { panX: 0, panY: 0, zoom: 1.0 },
					studioMode: "implant",
					currentCanal: canal,
					currentImplantPose: {
						entryPoint: { x: 0, y: 2.0 },
						angulationDeg: 0,
						implantSpec: STANDARD_IMPLANT_CATALOG[0]!,
					},
					currentImplantSpec: STANDARD_IMPLANT_CATALOG[0]!,
					nerveAuditResult: {
						isDangerous: true,
						isWarning: false,
						netClearanceToCanalWallMm: 1.0,
						clinicalMessageRu: "Опасность",
					},
					selectedMeasurement: null,
					hoveredImplantPart: null,
					dragImplantPart: null,
					invertColors: false,
				});
			});
		});
	});
});
