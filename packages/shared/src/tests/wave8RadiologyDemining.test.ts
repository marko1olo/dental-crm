/**
 * DENTE CRM — Wave 8 Honest 6G Regression Suite (Shared Radiology & 3D Arch Demining)
 *
 * Verifies that removing non-null `!` assertions across packages/shared/src/radiology/*
 * preserves safe behavior on empty arrays, degenerate curves, out-of-bounds indices,
 * and minimal dimensions without throwing or returning NaN crashes.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	alignClustersToFdiArch,
	computeCanonicalToothPositions,
	getCanonicalArchSpecs,
} from "../radiology/toothFdiAlignmentEngine.js";
import type { CrownCluster } from "../radiology/toothCrownWatershedEngine.js";
import {
	computeCurveNormals3D,
	computeCurveTangents3D,
	interpolateNerveSpline3D,
	resampleNerveByArcLength3D,
	totalArcLength3D,
} from "../radiology/nerveCanalSpline.js";
import {
	type Arch3DCurve,
	build3DArchFromControlPoints,
	findNearestArchFrame,
	frameAtArcLength,
	frameAtNormalized,
	interpolate3DCurve,
} from "../radiology/cbct3DArchEngine.js";
import {
	computeSchneiderCurvatureMetrics,
	fitAndSampleCatmullRomCanal,
} from "../radiology/endoClinicalMetrics.js";
import { generateImplantMesh } from "../radiology/implantGeometry/meshGenerator.js";

describe("Wave 8 Shared Radiology Non-Null Demining (6G Degenerate Inputs)", () => {
	const degenerateArch: Arch3DCurve = {
		jaw: "mandible",
		controlPoints: [],
		curvePoints: [],
		frames: [],
		totalLengthMm: 0,
		curveOfSpeeDepthMm: 0,
		occlusalProfile: [],
	};

	it("alignClustersToFdiArch handles empty clusters and empty gaps safely", () => {
		const res = alignClustersToFdiArch([], [], degenerateArch);
		assert.equal(res.teeth.length, 16);
		assert.equal(res.presentCount, 0);
		assert.equal(res.missingCount, 16);
		for (const tooth of res.teeth) {
			assert.equal(tooth.status, "MISSING");
			assert.ok(Number.isFinite(tooth.centroidWorld[0]));
			assert.ok(Number.isFinite(tooth.centroidWorld[1]));
			assert.ok(Number.isFinite(tooth.centroidWorld[2]));
		}
	});

	it("alignClustersToFdiArch aligns single cluster on arch without OOB crash", () => {
		const cluster: CrownCluster = {
			id: 1,
			centroidWorld: [0, 20, 0],
			archArcLengthMm: 45,
			archNormalizedU: 0.5,
			distanceBLMm: 0,
			peakDistanceMm: 4,
			voxelCount: 120,
			volumeMm3: 250,
			peakHU: 2100,
			meanHU: 1600,
			p90HU: 1950,
			classification: "NATURAL_TOOTH",
			confidence: 0.92,
			minBoundsWorld: [-4, 16, -3],
			maxBoundsWorld: [4, 24, 3],
			estimatedMesiodistalMm: 7.5,
			estimatedBuccolingualMm: 6.5,
			estimatedApicocoronalMm: 7.0,
		};
		const arch: Arch3DCurve = {
			...degenerateArch,
			jaw: "maxilla",
			totalLengthMm: 90,
		};
		const res = alignClustersToFdiArch([cluster], [], arch);
		assert.equal(res.teeth.length, 16);
		assert.equal(res.presentCount, 1);
		assert.ok(res.teeth.some((t) => t.status === "PRESENT_NATURAL" && t.matchedClusterId === 1));
	});

	it("computeCanonicalToothPositions handles empty specs cleanly", () => {
		assert.deepEqual(computeCanonicalToothPositions([], 40), []);
		assert.equal(getCanonicalArchSpecs("maxilla").length, 16);
		assert.equal(getCanonicalArchSpecs("mandible").length, 16);
	});

	it("nerveCanalSpline helpers handle empty and single-point polylines safely", () => {
		assert.deepEqual(interpolateNerveSpline3D([], 12), []);
		assert.deepEqual(interpolateNerveSpline3D([[10, 20, 30]], 12), [[10, 20, 30]]);
		assert.equal(totalArcLength3D([]), 0);
		assert.deepEqual(resampleNerveByArcLength3D([], 5), []);
		assert.deepEqual(resampleNerveByArcLength3D([[1, 2, 3]], 3), [
			[1, 2, 3],
			[1, 2, 3],
			[1, 2, 3],
		]);
		assert.deepEqual(computeCurveTangents3D([]), []);
		assert.deepEqual(computeCurveNormals3D([]), []);
	});

	it("cbct3DArchEngine frame lookups handle empty frames without undefined crashes", () => {
		assert.deepEqual(interpolate3DCurve([], 10), []);
		const nearest = findNearestArchFrame(degenerateArch, [5, 5, 5]);
		assert.deepEqual(nearest.point, [0, 0, 0]);
		const normFrame = frameAtNormalized(degenerateArch, 2.5);
		assert.deepEqual(normFrame.tangent, [1, 0, 0]);
		const arcFrame = frameAtArcLength(degenerateArch, 100);
		assert.deepEqual(arcFrame.binormal, [0, 0, 1]);

		const validArch = build3DArchFromControlPoints(
			[
				[-30, 0, 0],
				[0, 35, 0],
				[30, 0, 0],
			],
			{ jaw: "mandible" },
		);
		assert.ok(validArch.totalLengthMm > 0);
		assert.ok(validArch.frames.length > 0);
	});

	it("endoClinicalMetrics handles empty or single-point canal polylines safely", () => {
		const single = fitAndSampleCatmullRomCanal([[1, 2, 3]]);
		assert.equal(single.length, 1);
		assert.deepEqual(single[0]?.positionMm, [1, 2, 3]);

		const emptyMetrics = computeSchneiderCurvatureMetrics([]);
		assert.equal(emptyMetrics.schneiderAngleDeg, 0);
		assert.equal(emptyMetrics.minRadiusOfCurvatureMm, 9999.0);
	});

	it("generateImplantMesh generates valid buffers even with tiny dimensions", () => {
		const buffers = generateImplantMesh(
			{
				diameterMm: 3.5,
				lengthMm: 0.2,
				platformDiameterMm: 3.5,
				apexDiameterMm: 2.2,
				threadPitchMm: 0.8,
			},
			16,
		);
		assert.ok(buffers.positions.length > 0);
		assert.ok(buffers.indices.length > 0);
		assert.ok(buffers.normals.length === buffers.positions.length);
	});
});
