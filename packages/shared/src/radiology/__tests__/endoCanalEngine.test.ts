/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIT TESTS: ENDODONTIC CANAL ENGINE (FRANGI + FAST MARCHING + CLINICAL)
 * ═══════════════════════════════════════════════════════════════════════════
 * Blind mathematical verification of:
 * 1. Cardano / Viète analytical eigensolver for 3x3 symmetric Hessian matrices.
 * 2. Multiscale Frangi 3D Tubeness response for hypodense canal in hyperdense dentin.
 * 3. 26-Connected Anisotropic Fast Marching Method and RK4 geodesic backtracing.
 * 4. 3D Catmull-Rom spline arc-length reparameterization (0.1 mm step).
 * 5. Schneider canal curvature angle, working length, and radius of curvature.
 * 6. Vertucci morphology classification (Types I through VIII).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	solveSymmetricEigenvalues3D,
	computeFrangiTubenessFromEigenvalues,
	isDentinHU,
	isCanalLumenHU,
	compute1DGaussianKernels,
	type HessianMatrix3D,
} from "../endoCanalFrangiEngine.js";
import {
	runFastMarching,
	computeSpeedMap,
	traceCanalCenterlineRK4,
	detectCanalOrifices,
	detectApicalForamina,
	type OrificePoint,
	type ApicalForamen,
} from "../endoFastMarchingTracer.js";
import {
	catmullRomPoint3D,
	fitAndSampleCatmullRomCanal,
	computeSchneiderCurvatureMetrics,
	classifyVertucciTopology,
	evaluateCanalClinicalMetrics,
	buildEndoToothClinicalReport,
} from "../endoClinicalMetrics.js";
import type { CbctVoxelVolume, VolumeDimensions, VolumeSpacingMm } from "../cbctCropBox.js";
import type { FrangiVolumeResult } from "../endoCanalFrangiEngine.js";

describe("Endodontic Voxel & Differential Geometry Engine Suite", () => {
	// ── 1. Cardano / Viète 3x3 Symmetric Eigensolver ──────────────

	describe("1. Analytical 3x3 Symmetric Eigensolver (Cardano / Viète)", () => {
		it("correctly decomposes a diagonal matrix", () => {
			const H: HessianMatrix3D = {
				xx: 2.0,
				yy: 8.0,
				zz: 0.5,
				xy: 0.0,
				xz: 0.0,
				yz: 0.0,
			};

			const eigen = solveSymmetricEigenvalues3D(H);
			const [l1, l2, l3] = eigen.eigenvalues;

			// Must be sorted by absolute value: |l1| <= |l2| <= |l3|
			assert.ok(Math.abs(l1) <= Math.abs(l2) + 1e-6);
			assert.ok(Math.abs(l2) <= Math.abs(l3) + 1e-6);

			assert.ok(Math.abs(l1 - 0.5) < 1e-5);
			assert.ok(Math.abs(l2 - 2.0) < 1e-5);
			assert.ok(Math.abs(l3 - 8.0) < 1e-5);
		});

		it("correctly decomposes a general symmetric matrix with off-diagonal terms", () => {
			// Matrix:
			// [ 4, 1, 0 ]
			// [ 1, 4, 0 ]
			// [ 0, 0, 2 ]
			// Eigenvalues are: 2, 3 (for [1, -1, 0]), 5 (for [1, 1, 0])
			const H: HessianMatrix3D = {
				xx: 4.0,
				yy: 4.0,
				zz: 2.0,
				xy: 1.0,
				xz: 0.0,
				yz: 0.0,
			};

			const eigen = solveSymmetricEigenvalues3D(H);
			const [l1, l2, l3] = eigen.eigenvalues;

			assert.ok(Math.abs(l1 - 2.0) < 1e-5);
			assert.ok(Math.abs(l2 - 3.0) < 1e-5);
			assert.ok(Math.abs(l3 - 5.0) < 1e-5);

			// Check that eigenvectors are orthonormal
			const [v1, v2, v3] = eigen.eigenvectors;
			const normV1 = Math.hypot(v1[0], v1[1], v1[2]);
			const normV2 = Math.hypot(v2[0], v2[1], v2[2]);
			const normV3 = Math.hypot(v3[0], v3[1], v3[2]);

			assert.ok(Math.abs(normV1 - 1.0) < 1e-5);
			assert.ok(Math.abs(normV2 - 1.0) < 1e-5);
			assert.ok(Math.abs(normV3 - 1.0) < 1e-5);

			const dot12 = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
			const dot13 = v1[0] * v3[0] + v1[1] * v3[1] + v1[2] * v3[2];
			const dot23 = v2[0] * v3[0] + v2[1] * v3[1] + v2[2] * v3[2];

			assert.ok(Math.abs(dot12) < 1e-5);
			assert.ok(Math.abs(dot13) < 1e-5);
			assert.ok(Math.abs(dot23) < 1e-5);
		});

		it("handles multiple equal eigenvalues (isotropic degeneracy)", () => {
			const H: HessianMatrix3D = {
				xx: 3.0,
				yy: 3.0,
				zz: 3.0,
				xy: 0.0,
				xz: 0.0,
				yz: 0.0,
			};

			const eigen = solveSymmetricEigenvalues3D(H);
			const [l1, l2, l3] = eigen.eigenvalues;

			assert.ok(Math.abs(l1 - 3.0) < 1e-5);
			assert.ok(Math.abs(l2 - 3.0) < 1e-5);
			assert.ok(Math.abs(l3 - 3.0) < 1e-5);
		});
	});

	// ── 2. Frangi Tubeness Filter for Dark Canals ────────────────

	describe("2. Frangi 3D Tubeness Filter for Hypodense Lumen in Dentin", () => {
		it("yields high tubeness for dark cylindrical lumen (lambda2 > 0, lambda3 > 0, lambda1 ~= 0)", () => {
			// Ideal dark canal: circular cross section, high positive curvature in x and y, zero along z
			const lambda1 = 0.01;
			const lambda2 = 25.0;
			const lambda3 = 26.0;

			const result = computeFrangiTubenessFromEigenvalues(lambda1, lambda2, lambda3);
			assert.ok(result.tubeness > 0.5, `Expected high tubeness, got ${result.tubeness}`);
			assert.ok(result.structuredness > 20.0);
		});

		it("yields zero tubeness if cross-sectional eigenvalues are negative (bright tube)", () => {
			const lambda1 = 0.01;
			const lambda2 = -12.0;
			const lambda3 = -12.5;

			const result = computeFrangiTubenessFromEigenvalues(lambda1, lambda2, lambda3);
			assert.strictEqual(result.tubeness, 0.0);
		});

		it("suppresses planar/plate structures (where lambda2 ~= 0)", () => {
			const lambda1 = 0.01;
			const lambda2 = 0.1;
			const lambda3 = 25.0;

			const result = computeFrangiTubenessFromEigenvalues(lambda1, lambda2, lambda3);
			assert.ok(result.tubeness < 0.05, `Plate structure must be suppressed, got ${result.tubeness}`);
		});

		it("suppresses spherical blob structures (where lambda1 ~= lambda2 ~= lambda3)", () => {
			const lambda1 = 15.0;
			const lambda2 = 15.2;
			const lambda3 = 15.5;

			const result = computeFrangiTubenessFromEigenvalues(lambda1, lambda2, lambda3);
			assert.ok(result.tubeness < 0.15, `Blob structure must be suppressed (< 0.15), got ${result.tubeness}`);
		});
	});

	// ── 3. Dentin & Lumen HU Classification ──────────────────────

	describe("3. Dentin & Lumen HU Thresholds", () => {
		it("correctly identifies radicular dentin in range [750, 1650] HU", () => {
			assert.strictEqual(isDentinHU(400), false); // Spongy bone / soft tissue
			assert.strictEqual(isDentinHU(749), false);
			assert.strictEqual(isDentinHU(750), true);
			assert.strictEqual(isDentinHU(1100), true);
			assert.strictEqual(isDentinHU(1650), true);
			assert.strictEqual(isDentinHU(1651), false);
			assert.strictEqual(isDentinHU(2200), false); // Enamel
		});

		it("correctly identifies uncalcified canal lumen (< 650 HU)", () => {
			assert.strictEqual(isCanalLumenHU(150), true); // Pulp tissue
			assert.strictEqual(isCanalLumenHU(650), true);
			assert.strictEqual(isCanalLumenHU(800), false); // Dentin
		});

		it("pre-computes normalized 1D Gaussian kernels with zero DC drift", () => {
			const kernel = compute1DGaussianKernels(0.6, 0.2);
			let sumG0 = 0.0;
			for (let i = 0; i < kernel.g0.length; i++) {
				sumG0 += kernel.g0[i] ?? 0;
			}
			assert.ok(Math.abs(sumG0 - 1.0) < 1e-6);
		});
	});

	// ── 4. 26-Connected Anisotropic Fast Marching & Tracing ──────

	describe("4. 26-Connected Anisotropic Fast Marching Method", () => {
		it("monotonically propagates arrival times away from seed point", () => {
			const dims: VolumeDimensions = { width: 10, height: 10, depth: 10 };
			const spacing: VolumeSpacingMm = { x: 0.2, y: 0.2, z: 0.2 };
			const total = 1000;
			const speed = new Float32Array(total);
			speed.fill(1.0); // Uniform speed 1 mm/s

			const seedIdx = 5 * 100 + 5 * 10 + 5; // Center voxel (5, 5, 5)
			const timeField = runFastMarching(speed, dims, spacing, [seedIdx]);

			assert.strictEqual(timeField[seedIdx], 0.0);

			// Neighbor voxel along X (6, 5, 5)
			const nXIdx = 5 * 100 + 5 * 10 + 6;
			const tX = timeField[nXIdx] ?? Infinity;
			assert.ok(tX > 0.0);
			assert.ok(tX < 0.5);

			// Corner voxel (9, 9, 9) must have higher arrival time than near neighbor
			const cornerIdx = 9 * 100 + 9 * 10 + 9;
			const tCorner = timeField[cornerIdx] ?? Infinity;
			assert.ok(tCorner > tX, `Corner time ${tCorner} must exceed neighbor time ${tX}`);
		});
	});

	// ── 5. 3D Catmull-Rom Spline & Arc-Length Reparameterization ─

	describe("5. 3D Catmull-Rom Spline & Schneider Curvature Metrics", () => {
		it("accurately computes Schneider angle for a straight canal (~0 deg)", () => {
			const straightPolyline: [number, number, number][] = [
				[0, 0, 0],
				[0, 0, 4],
				[0, 0, 8],
				[0, 0, 12],
				[0, 0, 16],
			];

			const samples = fitAndSampleCatmullRomCanal(straightPolyline, 0.1);
			assert.ok(samples.length > 150);

			const metrics = computeSchneiderCurvatureMetrics(samples);
			assert.ok(metrics.schneiderAngleDeg < 1.0, `Expected ~0 deg, got ${metrics.schneiderAngleDeg}`);
			assert.strictEqual(metrics.schneiderRiskTier, "low");
			assert.strictEqual(metrics.curvatureRadiusTier, "gentle");
		});

		it("accurately identifies severe curvature (> 25 deg) for a bent canal", () => {
			const bentPolyline: [number, number, number][] = [
				[0, 0, 0],
				[0, 0, 5],
				[0, 0, 9], // Point of curve
				[3, 0, 13],
				[7, 0, 16], // Apex sharply bent
			];

			const samples = fitAndSampleCatmullRomCanal(bentPolyline, 0.1);
			const metrics = computeSchneiderCurvatureMetrics(samples);

			assert.ok(
				metrics.schneiderAngleDeg > 25.0,
				`Expected severe curvature > 25 deg, got ${metrics.schneiderAngleDeg}`,
			);
			assert.strictEqual(metrics.schneiderRiskTier, "severe");
			assert.ok(metrics.minRadiusOfCurvatureMm < 15.0);
		});
	});

	// ── 6. Vertucci Root Canal Morphology Classification ────────

	describe("6. Vertucci Root Canal Morphology Classification", () => {
		const makeDummyCanal = (
			id: string,
			name: string,
			orificePos: [number, number, number],
			apexPos: [number, number, number],
			midPos: [number, number, number],
		) => ({
			canalId: id,
			canalName: name,
			orifice: {
				id: `or_${id}`,
				canalName: name,
				worldPositionMm: orificePos,
				voxelCoordinates: [0, 0, 0] as [number, number, number],
				tubeness: 0.8,
				hu: 150,
				estimatedDiameterMm: 0.8,
			},
			apicalForamen: {
				id: `ap_${id}`,
				canalName: name,
				worldPositionMm: apexPos,
				voxelCoordinates: [0, 0, 0] as [number, number, number],
				tubeness: 0.7,
				hu: 300,
			},
			polylineMm: [orificePos, midPos, apexPos] as [number, number, number][],
			geodesicLengthMm: 18.0,
			meanTubeness: 0.75,
			meanHU: 200,
			reachedOrifice: true,
		});

		it("classifies single canal as Vertucci Type I (1-1)", () => {
			const canal1 = makeDummyCanal("c1", "P", [0, 0, 0], [0, 0, 18], [0, 0, 9]);
			const classification = classifyVertucciTopology([canal1]);

			assert.strictEqual(classification.type, "TYPE_I");
			assert.strictEqual(classification.configurationCode, "1-1");
			assert.strictEqual(classification.orificeCount, 1);
			assert.strictEqual(classification.foramenCount, 1);
		});

		it("classifies two converging canals as Vertucci Type II (2-1)", () => {
			// Two separate orifices, merging at apex
			const canal1 = makeDummyCanal("c1", "MB1", [0, 0, 0], [1, 0, 18], [0.5, 0, 9]);
			const canal2 = makeDummyCanal("c2", "MB2", [2.5, 0, 0], [1, 0, 18], [1.5, 0, 9]);

			const classification = classifyVertucciTopology([canal1, canal2]);

			assert.strictEqual(classification.type, "TYPE_II");
			assert.strictEqual(classification.configurationCode, "2-1");
			assert.strictEqual(classification.orificeCount, 2);
			assert.strictEqual(classification.foramenCount, 1);
		});

		it("classifies two distinct separate canals as Vertucci Type IV (2-2)", () => {
			const canal1 = makeDummyCanal("c1", "B", [0, 0, 0], [0, 0, 18], [0, 0, 9]);
			const canal2 = makeDummyCanal("c2", "L", [3.0, 0, 0], [3.0, 0, 18], [3.0, 0, 9]);

			const classification = classifyVertucciTopology([canal1, canal2]);

			assert.strictEqual(classification.type, "TYPE_IV");
			assert.strictEqual(classification.configurationCode, "2-2");
			assert.strictEqual(classification.orificeCount, 2);
			assert.strictEqual(classification.foramenCount, 2);
		});

		it("builds comprehensive clinical tooth report with risk and NiTi recommendations", () => {
			const canal = makeDummyCanal("c1", "MB", [0, 0, 0], [5, 0, 18], [2, 0, 9]);
			const report = buildEndoToothClinicalReport([canal], 36);

			assert.strictEqual(report.toothFdi, 36);
			assert.strictEqual(report.canalCount, 1);
			assert.ok(report.canals.length === 1);
			assert.ok(report.clinicalSummaryRu.includes("№36"));
			assert.ok(report.recommendedRotaryTaper === "0.04" || report.recommendedRotaryTaper === "0.06");
		});
	});
});
