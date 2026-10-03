/**
 * FAST MARCHING MANDIBULAR NERVE CANAL (IAN) SEGMENTATION SUITE
 * Tests for Vatech Ez3D2009 Reverse-Engineered 2-Seed Fast Marching / Dijkstra Algorithm
 *
 * Requirements:
 * - 2-Seed semi-automatic workflow (Foramen mentale + Foramen mandibulae)
 * - Vatech Sigmoid gradient velocity transfer function (alpha = -20.0, beta = 3.0)
 * - FastMinHeap priority queue correctness and performance
 * - Sub-volume Bounding Box ROI (+15 voxels padding)
 * - Sub-200ms pathfinding execution in 16-bit HU volume
 * - Vatech safety thresholds: 3.0 mm apical warning, 1.5 mm collision danger
 *
 * Mandate 8b: Декомпозиция и лимит строк (<= 800 строк).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	FastMinHeap,
	calculateVoxelGradientMagnitude,
	calculateVatechSigmoidVelocity,
	calculateVoxelHuPenalty,
	traceMandibularCanal2Seeds,
	traceMandibularNerveFastMarching,
	evaluateVatechImplantNerveClearance,
	smoothCatmullRom3D,
	VATECH_CANAL_BASE_DIAMETER_MM,
	VATECH_CANAL_SAFETY_ZONE_MM,
	VATECH_MINIMAL_APICAL_DISTANCE_MM,
	VATECH_COLLISION_DANGER_MM,
	type VolumeDimensions3D,
	type VoxelPoint3D,
} from "../fastMarchingNerve";
import type { CbctVoxelVolume, Point3D } from "../cbctMprMath";

describe("Vatech Ez3D Fast Marching Nerve Segmentation Engine", () => {
	describe("1. FastMinHeap Priority Queue", () => {
		it("correctly pops elements in ascending cost order", () => {
			const heap = new FastMinHeap(16);
			heap.push(10, 5.5);
			heap.push(20, 1.2);
			heap.push(30, 8.9);
			heap.push(40, 0.4);
			heap.push(50, 3.1);

			assert.equal(heap.size, 5);
			assert.equal(heap.pop(), 40); // cost 0.4
			assert.equal(heap.pop(), 20); // cost 1.2
			assert.equal(heap.pop(), 50); // cost 3.1
			assert.equal(heap.pop(), 10); // cost 5.5
			assert.equal(heap.pop(), 30); // cost 8.9
			assert.equal(heap.size, 0);
			assert.equal(heap.pop(), -1); // empty heap returns -1
		});

		it("handles duplicate costs and single element correctly", () => {
			const heap = new FastMinHeap(8);
			heap.push(1, 2.0);
			heap.push(2, 2.0);
			assert.equal(heap.size, 2);
			const first = heap.pop();
			const second = heap.pop();
			assert.ok(first === 1 || first === 2);
			assert.ok(second === 1 || second === 2);
			assert.notEqual(first, second);
		});
	});

	describe("2. Vatech Sigmoid & Hounsfield Unit Gradient Mathematics", () => {
		it("calculates 3D central difference gradient magnitude accurately", () => {
			// Create a 5x5x5 volume where HU increases linearly along X axis: HU = x * 100
			const w = 5;
			const h = 5;
			const d = 5;
			const vol = new Int16Array(w * h * d);
			for (let z = 0; z < d; z++) {
				for (let y = 0; y < h; y++) {
					for (let x = 0; x < w; x++) {
						vol[z * (w * h) + y * w + x] = x * 100;
					}
				}
			}

			// spacingX = 0.5 mm -> dx = (200 - 0) / (2 * 0.5) = 200 HU/mm
			const grad = calculateVoxelGradientMagnitude(vol, w, h, d, 1, 2, 2, 0.5, 0.5, 0.5);
			assert.ok(Math.abs(grad - 200) < 1.0, `Expected grad ~200, got ${grad}`);
		});

		it("evaluates Vatech Sigmoid Velocity with proper wall attenuation", () => {
			// MNCSeg.ini: alpha = -20.0, beta = 3.0
			// When gradient is low (inner lumen, grad <= 2 HU/mm): velocity ~0.95..1.0 (free propagation)
			const lumenVelocity = calculateVatechSigmoidVelocity(2.0, -20.0, 3.0);
			assert.ok(lumenVelocity > 0.9, `Lumen velocity should be high (~1.0), got ${lumenVelocity}`);

			// When gradient is high (cortical wall, grad >= 100 HU/mm): velocity -> ~0.0 (blocked propagation)
			const wallVelocity = calculateVatechSigmoidVelocity(100.0, -20.0, 3.0);
			assert.ok(wallVelocity < 0.05, `Cortical wall velocity should be low (<0.05), got ${wallVelocity}`);
			assert.ok(lumenVelocity > wallVelocity * 10.0);
		});

		it("penalizes HU values according to Vatech bone density categories", () => {
			// Hypodense canal lumen (150 HU) -> minimal penalty 0.15
			const lumenPenalty = calculateVoxelHuPenalty(150);
			assert.equal(lumenPenalty, 0.15);

			// Dense cortical bone (1000 HU) -> heavy penalty: 1 + ((1000-350)/100)^2 = 1 + 42.25 = 43.25
			const bonePenalty = calculateVoxelHuPenalty(1000);
			assert.ok(bonePenalty > 40.0, `Expected bone penalty > 40, got ${bonePenalty}`);

			// Air (< 0 HU) -> impenetrable penalty (15.0)
			const airPenalty = calculateVoxelHuPenalty(-500);
			assert.equal(airPenalty, 15.0);
		});
	});

	describe("3. 2-Seed Wavefront Propagation in 3D Volume", () => {
		it("traces canal path strictly through hypodense canal lumen surrounded by dense bone", () => {
			// Create a 40x40x40 volume (spacing 0.5 mm -> 20x20x20 mm physical)
			const w = 40;
			const h = 40;
			const d = 40;
			const volumeHU = new Int16Array(w * h * d).fill(1200); // Default: dense cortical bone (1200 HU)

			// Carve a curved hypodense canal tube (150 HU) from (5, 10, 5) to (35, 30, 35)
			// Canal follows a gentle arc
			const canalVoxels: VoxelPoint3D[] = [];
			const steps = 30;
			for (let i = 0; i <= steps; i++) {
				const t = i / steps;
				const cx = Math.round(5 + 30 * t);
				const cy = Math.round(10 + 20 * t + Math.sin(t * Math.PI) * 5); // arc curvature
				const cz = Math.round(5 + 30 * t);

				// Fill 3x3 cylinder cross-section with hypodense 150 HU
				for (let dz = -1; dz <= 1; dz++) {
					for (let dy = -1; dy <= 1; dy++) {
						for (let dx = -1; dx <= 1; dx++) {
							const vx = cx + dx;
							const vy = cy + dy;
							const vz = cz + dz;
							if (vx >= 0 && vx < w && vy >= 0 && vy < h && vz >= 0 && vz < d) {
								volumeHU[vz * (w * h) + vy * w + vx] = 150;
							}
						}
					}
				}
				canalVoxels.push({ x: cx, y: cy, z: cz });
			}

			const dims: VolumeDimensions3D = {
				width: w,
				height: h,
				depth: d,
				spacingX: 0.5,
				spacingY: 0.5,
				spacingZ: 0.5,
			};

			const startSeed: VoxelPoint3D = { x: 5, y: 10, z: 5 }; // Mental foramen
			const endSeed: VoxelPoint3D = { x: 35, y: 30, z: 35 }; // Mandibular foramen

			const result = traceMandibularCanal2Seeds(volumeHU, dims, startSeed, endSeed, {
				roiPaddingVoxels: 10,
			});

			assert.ok(result.voxelPath.length >= 10, "Path should contain multiple points");
			assert.equal(result.voxelPath[0]!.x, 5);
			assert.equal(result.voxelPath[0]!.y, 10);
			assert.equal(result.voxelPath[0]!.z, 5);
			assert.equal(result.voxelPath[result.voxelPath.length - 1]!.x, 35);
			assert.equal(result.voxelPath[result.voxelPath.length - 1]!.y, 30);
			assert.equal(result.voxelPath[result.voxelPath.length - 1]!.z, 35);

			// Verify execution time is sub-200ms
			assert.ok(result.executionTimeMs < 200, `Execution time must be <200ms, took ${result.executionTimeMs}ms`);

			// Verify path voxels stayed inside or very close to the hypodense canal (mean HU < 500)
			let totalHU = 0;
			for (const p of result.voxelPath) {
				const hu = volumeHU[p.z * (w * h) + p.y * w + p.x] ?? 1200;
				totalHU += hu;
			}
			const meanPathHU = totalHU / result.voxelPath.length;
			assert.ok(meanPathHU < 500, `Path should stay within canal lumen, mean HU: ${meanPathHU}`);

			// Verify total physical length is calculated (>0)
			assert.ok(result.totalLengthMm > 15.0, `Physical length should be realistic, got ${result.totalLengthMm} mm`);
		});
	});

	describe("4. High-Level CbctVoxelVolume Adapter & 3D Spline Reconstruction", () => {
		it("executes traceMandibularNerveFastMarching on CbctVoxelVolume", () => {
			const w = 30;
			const h = 30;
			const d = 30;
			const data = new Int16Array(w * h * d).fill(300);

			const volume: CbctVoxelVolume = {
				id: "test-volume-mpr",
				dimensions: { width: w, height: h, depth: d },
				spacingMm: { x: 0.3, y: 0.3, z: 0.3 },
				originMm: { x: 0, y: 0, z: 0 },
				physicalSizeMm: { x: 9.0, y: 9.0, z: 9.0 },
				data,
				minHU: -1000,
				maxHU: 3000,
				isDisposed: false,
			};

			const startSeedMm: Point3D = { x: 1.5, y: 1.5, z: 1.5 };
			const endSeedMm: Point3D = { x: 7.5, y: 7.5, z: 7.5 };

			const res = traceMandibularNerveFastMarching(volume, startSeedMm, endSeedMm);
			assert.ok(res.physicalSpline.length >= 2, "Spline must be constructed");
			assert.ok(res.totalLengthMm > 0, "Length must be non-zero");
			assert.equal(res.seeds.mentalForamen.x, 1.5);
			assert.equal(res.seeds.mandibularForamen.x, 7.5);
			assert.equal(res.warningApicalDistanceMm, VATECH_MINIMAL_APICAL_DISTANCE_MM);
			assert.equal(res.dangerCollisionThresholdMm, VATECH_COLLISION_DANGER_MM);
		});

		it("provides anatomical fallback when volume.data is null (preview/mock-safe)", () => {
			const emptyVolume: CbctVoxelVolume = {
				id: "empty-volume",
				dimensions: { width: 512, height: 512, depth: 400 },
				spacingMm: { x: 0.2, y: 0.2, z: 0.2 },
				originMm: { x: -50, y: -50, z: -40 },
				physicalSizeMm: { x: 102.4, y: 102.4, z: 80.0 },
				data: null, // null raw data
				minHU: -1000,
				maxHU: 3000,
				isDisposed: false,
			};

			const startMm: Point3D = { x: -20, y: 15, z: -10 };
			const endMm: Point3D = { x: -35, y: -20, z: 12 };

			const res = traceMandibularNerveFastMarching(emptyVolume, startMm, endMm);
			assert.ok(res.physicalSpline.length >= 8);
			assert.ok(res.totalLengthMm > 20.0);
			assert.equal(res.estimatedDiameterMm, VATECH_CANAL_BASE_DIAMETER_MM);
		});
	});

	describe("5. Vatech Safety Thresholds & Collision Audit", () => {
		it("flags danger when apical or body clearance is below 1.5 mm collision threshold", () => {
			// Collision / severe penetration: 1.2 mm
			const audit = evaluateVatechImplantNerveClearance(1.2, 3.5);
			assert.equal(audit.safetyStatus, "danger");
			assert.equal(audit.isDanger, true);
			assert.equal(audit.isWarning, false);
			assert.equal(audit.isSafe, false);
			assert.ok(audit.messageRu.includes("КРИТИЧЕСКАЯ КОЛЛИЗИЯ VATECH"));
		});

		it("flags warning when apical distance is below Vatech Minimal Apical Distance (3.0 mm)", () => {
			// Apical clearance 2.4 mm (< 3.0 mm warning, >= 1.5 mm danger)
			const audit = evaluateVatechImplantNerveClearance(2.4, 2.5);
			assert.equal(audit.safetyStatus, "warning");
			assert.equal(audit.isDanger, false);
			assert.equal(audit.isWarning, true);
			assert.equal(audit.isSafe, false);
			assert.ok(audit.messageRu.includes("ПРЕДУПРЕЖДЕНИЕ VATECH: отступ апекса 2.4 мм (< 3.0 мм)"));
		});

		it("flags warning when body clearance is below 2.0 mm safety zone", () => {
			// Apical clearance safe (3.5 mm), but body clearance is 1.8 mm (< 2.0 mm)
			const audit = evaluateVatechImplantNerveClearance(3.5, 1.8);
			assert.equal(audit.safetyStatus, "warning");
			assert.equal(audit.isWarning, true);
			assert.ok(audit.messageRu.includes("зазор тела 1.8 мм (< 2.0 мм буфера)"));
		});

		it("flags safe when both apex >= 3.0 mm and body >= 2.0 mm", () => {
			const audit = evaluateVatechImplantNerveClearance(4.2, 3.1);
			assert.equal(audit.safetyStatus, "safe");
			assert.equal(audit.isDanger, false);
			assert.equal(audit.isWarning, false);
			assert.equal(audit.isSafe, true);
			assert.ok(audit.messageRu.includes("Безопасный коридор Vatech соблюден"));
		});
	});

	describe("6. 3D Catmull-Rom Smoothness", () => {
		it("interpolates smooth continuous curve through input points", () => {
			const pts: Point3D[] = [
				{ x: 0, y: 0, z: 0 },
				{ x: 10, y: 5, z: 2 },
				{ x: 20, y: 12, z: 8 },
				{ x: 30, y: 15, z: 12 },
			];
			const spline = smoothCatmullRom3D(pts, 4);
			assert.ok(spline.length > pts.length);
			// Start and end points match
			assert.equal(spline[0]!.x, pts[0]!.x);
			assert.equal(spline[0]!.y, pts[0]!.y);
			assert.equal(spline[spline.length - 1]!.x, pts[pts.length - 1]!.x);
			assert.equal(spline[spline.length - 1]!.y, pts[pts.length - 1]!.y);
		});
	});
});
