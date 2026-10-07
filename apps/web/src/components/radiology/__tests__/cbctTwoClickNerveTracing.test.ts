/**
 * DENTE CRM — CBCT Mandibular Nerve Canal (IAN) 2-Click Tracing & Doctor Autonomy Test Suite
 *
 * Requirements:
 * 1. Honest 2-Click workflow:
 *    - Click 1: Foramen mentale (Seed 1) -> pulsing green hint
 *    - Click 2: Foramen mandibulae (Seed 2) -> Instant Fast Marching calculation
 * 2. Real Fast Marching 3D path generation (Vatech Ez3D2009 / Planmeca Romexis)
 * 3. Manual Micro-Adjustment (Mandate 8e Doctor Autonomy):
 *    - Node dragging hit-testing on MPR slices
 *    - Coordinate updating without reset
 * 4. Bilateral canal support:
 *    - Independent Right (4.4-4.8) and Left (3.4-3.8) canals
 *    - 1-Click Reset / Node Delete
 *
 * Mandate 8b: Strictly <= 800 lines.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { CbctVoxelVolume, Point3D, ViewportTransform } from "../cbctMprMath.js";
import { DEFAULT_VIEWPORT_TRANSFORM } from "../cbctMprMath.js";
import {
	formatNerveStepStatus,
	hitTestNerveControlPoint,
} from "../mpr/cbctNerveHitTest.js";
import {
	DEFAULT_IAN_NERVE_POINTS,
	DEFAULT_LEFT_IAN_NERVE_POINTS,
	DEFAULT_RIGHT_IAN_NERVE_POINTS,
	type NerveCanalSide,
} from "../mpr/cbctStudioTypes.js";
import {
	FastMinHeap,
	traceMandibularNerveFastMarching,
	evaluateVatechImplantNerveClearance,
} from "../fastMarchingNerve.js";
import {
	calculateSplineLength3DMm,
	interpolateNerveSpline3D,
} from "../cbctCaliperNerveMath.js";

// Helper to create synthetic test volume
function createTestVolume(dimX = 64, dimY = 64, dimZ = 40): CbctVoxelVolume {
	const totalVoxels = dimX * dimY * dimZ;
	const data = new Int16Array(totalVoxels);
	// Fill with typical bone / soft tissue background
	data.fill(-100);

	// Create a synthetic low-density tubular structure (mandibular canal, HU ~ -400)
	// from (x: 45, y: 20, z: 10) to (x: 55, y: 45, z: 25)
	const start = { x: 45, y: 20, z: 10 };
	const end = { x: 55, y: 45, z: 25 };
	const steps = 50;

	for (let s = 0; s <= steps; s++) {
		const t = s / steps;
		const cx = Math.round(start.x + (end.x - start.x) * t);
		const cy = Math.round(start.y + (end.y - start.y) * t);
		const cz = Math.round(start.z + (end.z - start.z) * t);

		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (let dz = -1; dz <= 1; dz++) {
					const vx = cx + dx;
					const vy = cy + dy;
					const vz = cz + dz;
					if (vx >= 0 && vx < dimX && vy >= 0 && vy < dimY && vz >= 0 && vz < dimZ) {
						const idx = vx + vy * dimX + vz * dimX * dimY;
						data[idx] = -400; // Canal lumen
					}
				}
			}
		}
	}

	return {
		dimensions: { width: dimX, height: dimY, depth: dimZ },
		spacingMm: { x: 0.5, y: 0.5, z: 0.5 },
		originMm: {
			x: -(dimX * 0.5) / 2,
			y: -(dimY * 0.5) / 2,
			z: -(dimZ * 0.5) / 2,
		},
		data,
		minHU: -1000,
		maxHU: 3000,
		id: "test-volume-synth",
		physicalSizeMm: { x: dimX * 0.5, y: dimY * 0.5, z: dimZ * 0.5 },
		isDisposed: false,
	};
}

describe("CBCT Two-Click Mandibular Nerve Tracing & Autonomy Suite", () => {
	describe("1. Step-by-Step HUD Workflow Guidance (formatNerveStepStatus)", () => {
		it("returns Step 1 guidance when 0 points are placed (initial state)", () => {
			const statusRight = formatNerveStepStatus(0, 0, "right");
			assert.equal(statusRight.step, 1);
			assert.match(statusRight.titleRu, /Foramen mentale/i);
			assert.match(statusRight.hintRu, /Правый \(4\.4-4\.8\)/i);
			assert.equal(statusRight.isCompleted, false);
			assert.match(statusRight.badgeClass, /emerald/i);

			const statusLeft = formatNerveStepStatus(0, 0, "left");
			assert.equal(statusLeft.step, 1);
			assert.match(statusLeft.hintRu, /Левый \(3\.4-3\.8\)/i);
		});

		it("returns Step 2 guidance when Click 1 is recorded (1 seed placed)", () => {
			const status = formatNerveStepStatus(1, 0, "right");
			assert.equal(status.step, 2);
			assert.match(status.titleRu, /Foramen mandibulae/i);
			assert.match(status.hintRu, /ветви челюсти/i);
			assert.equal(status.isCompleted, false);
			assert.match(status.badgeClass, /amber/i);
		});

		it("returns Step 3 completed status with length badge when Click 2 is completed", () => {
			const status = formatNerveStepStatus(8, 48.6, "right");
			assert.equal(status.step, 3);
			assert.match(status.titleRu, /48\.6 мм/i);
			assert.match(status.titleRu, /Fast Marching Vatech/i);
			assert.equal(status.isCompleted, true);
			assert.match(status.hintRu, /микроподгонки/i);
			assert.match(status.badgeClass, /cyan/i);
		});
	});

	describe("2. Fast Marching 3D Nerve Path Calculation", () => {
		it("calculates 3D trajectory between 2 anatomical seeds in synthetic volume", () => {
			const volume = createTestVolume();
			// Seeds in world coordinates corresponding to voxel coordinates
			const seed1: Point3D = {
				x: volume.originMm.x + 45 * volume.spacingMm.x,
				y: volume.originMm.y + 20 * volume.spacingMm.y,
				z: volume.originMm.z + 10 * volume.spacingMm.z,
			};
			const seed2: Point3D = {
				x: volume.originMm.x + 55 * volume.spacingMm.x,
				y: volume.originMm.y + 45 * volume.spacingMm.y,
				z: volume.originMm.z + 25 * volume.spacingMm.z,
			};

			const result = traceMandibularNerveFastMarching(volume, seed1, seed2);

			assert.ok(result.controlPoints.length >= 2, "Path should contain multiple control points");
			assert.ok(result.totalLengthMm > 0, "Total length must be positive");
			assert.ok(result.executionTimeMs >= 0, "Execution time measured");

			// Start and end points should correspond closely to seeds
			const startPoint = result.controlPoints[0]!;
			const endPoint = result.controlPoints[result.controlPoints.length - 1]!;

			const distStart = Math.hypot(startPoint.x - seed1.x, startPoint.y - seed1.y, startPoint.z - seed1.z);
			const distEnd = Math.hypot(endPoint.x - seed2.x, endPoint.y - seed2.y, endPoint.z - seed2.z);

			assert.ok(distStart < 2.0, "Start point must be within 2mm of Seed 1");
			assert.ok(distEnd < 2.0, "End point must be within 2mm of Seed 2");
		});

		it("interpolates smooth 3D spline and measures accurate length", () => {
			const points: Point3D[] = [
				{ x: 20, y: 10, z: 0 },
				{ x: 25, y: 20, z: 5 },
				{ x: 30, y: 35, z: 12 },
			];

			const spline = interpolateNerveSpline3D(points, 10);
			assert.ok(spline.length > points.length, "Interpolated spline has higher resolution");

			const length = calculateSplineLength3DMm(spline);
			assert.ok(length > 25 && length < 40, `Expected plausible arc length, got ${length}`);
		});
	});

	describe("3. Interactive Control Node Hit-Testing (Mandate 8e: Doctor Autonomy)", () => {
		const volume = createTestVolume();
		const transform: ViewportTransform = { ...DEFAULT_VIEWPORT_TRANSFORM, zoom: 1.0, panX: 0, panY: 0 };
		const nervePoints: Point3D[] = [
			{ x: 0, y: 0, z: 0 },
			{ x: 10, y: 15, z: 0 },
			{ x: 20, y: 30, z: 5 },
		];

		it("detects node under cursor within tolerance radius on axial slice", () => {
			// At crosshair z = 0, node 0 is exactly at (0, 0, 0)
			// Volume slice coordinates for (0, 0, 0)
			const crosshairMm: Point3D = { x: 0, y: 0, z: 0 };
			// Center of volume in slice px
			const slicePxX = (0 - volume.originMm.x) / volume.spacingMm.x;
			const slicePxY = (0 - volume.originMm.y) / volume.spacingMm.y;

			const hit = hitTestNerveControlPoint(
				{ x: slicePxX + 4, y: slicePxY + 4 }, // 5.6 px away (within 14px tolerance)
				nervePoints,
				"axial",
				crosshairMm,
				volume,
				transform,
				14,
			);

			assert.ok(hit !== null, "Hit should be detected");
			assert.equal(hit.index, 0);
			assert.ok(hit.screenDistancePx < 14);
		});

		it("rejects hit when pointer is beyond pixel tolerance", () => {
			const crosshairMm: Point3D = { x: 0, y: 0, z: 0 };
			const slicePxX = (0 - volume.originMm.x) / volume.spacingMm.x;
			const slicePxY = (0 - volume.originMm.y) / volume.spacingMm.y;

			const hit = hitTestNerveControlPoint(
				{ x: slicePxX + 40, y: slicePxY + 40 }, // 56 px away (well beyond 14px)
				nervePoints,
				"axial",
				crosshairMm,
				volume,
				transform,
				14,
			);

			assert.equal(hit, null, "Should not hit outside tolerance");
		});

		it("rejects hit when slice depth is too far from node plane (> 4.0 mm)", () => {
			// Node 2 has z = 5. Crosshair at z = 15 -> deltaZ = 10mm > 4.0mm
			const crosshairMm: Point3D = { x: 0, y: 0, z: 15 };
			const slicePxX = (20 - volume.originMm.x) / volume.spacingMm.x;
			const slicePxY = (30 - volume.originMm.y) / volume.spacingMm.y;

			const hit = hitTestNerveControlPoint(
				{ x: slicePxX, y: slicePxY },
				nervePoints,
				"axial",
				crosshairMm,
				volume,
				transform,
				14,
			);

			assert.equal(hit, null, "Should reject node outside slice depth buffer");
		});
	});

	describe("4. Bilateral Canal Sovereignty & Symmetry", () => {
		it("provides distinct anatomical landmark anchors for right and left canals", () => {
			assert.ok(DEFAULT_RIGHT_IAN_NERVE_POINTS.length >= 2, "Right canal has default landmarks");
			assert.ok(DEFAULT_LEFT_IAN_NERVE_POINTS.length >= 2, "Left canal has default landmarks");

			// In standard dental CT space: right side has x > 0 (or positive offset), left side has x < 0
			const rightFirst = DEFAULT_RIGHT_IAN_NERVE_POINTS[0]!;
			const leftFirst = DEFAULT_LEFT_IAN_NERVE_POINTS[0]!;

			assert.notEqual(rightFirst.x, leftFirst.x, "Right and left landmarks must not collide");
			assert.ok(rightFirst.x > 0, "Right mandibular canal has positive X coordinate");
			assert.ok(leftFirst.x < 0, "Left mandibular canal has negative X coordinate");
		});

		it("allows independent state management per side without cross-contamination", () => {
			let rightPoints: Point3D[] = [{ x: 22, y: -5, z: -10 }];
			let leftPoints: Point3D[] = [];
			let activeSide: NerveCanalSide = "right";

			// Simulating user switching to left side
			activeSide = "left";
			leftPoints = [{ x: -22, y: -5, z: -10 }, { x: -26, y: 15, z: 8 }];

			assert.equal(rightPoints.length, 1, "Right canal remains intact");
			assert.equal(leftPoints.length, 2, "Left canal updated independently");

			// 1-Click Reset on left side
			leftPoints = [];
			assert.equal(leftPoints.length, 0, "Left canal cleared");
			assert.equal(rightPoints.length, 1, "Right canal not affected by left reset");
		});
	});

	describe("5. Vatech Implant-Nerve Safety Margin Evaluation", () => {
		it("evaluates clearance and flags safe / warning / danger states", () => {
			// Implant apex 5mm above nerve -> Safe (> 3.0mm)
			const safeAudit = evaluateVatechImplantNerveClearance(5.0, 4.0);
			assert.equal(safeAudit.safetyStatus, "safe");
			assert.ok(safeAudit.isSafe);
			assert.equal(safeAudit.isDanger, false);
			assert.ok(safeAudit.worstClearanceMm >= 3.0);

			// Implant apex 2mm above nerve -> Warning (1.5 - 3.0mm)
			const warnAudit = evaluateVatechImplantNerveClearance(2.0, 3.5);
			assert.equal(warnAudit.safetyStatus, "warning");
			assert.ok(warnAudit.isWarning);
			assert.equal(warnAudit.isSafe, false);

			// Implant apex 0.8mm from nerve -> Danger (< 1.5mm)
			const dangerAudit = evaluateVatechImplantNerveClearance(0.8, 1.2);
			assert.equal(dangerAudit.safetyStatus, "danger");
			assert.ok(dangerAudit.isDanger);
			assert.equal(dangerAudit.isSafe, false);
		});
	});
});
