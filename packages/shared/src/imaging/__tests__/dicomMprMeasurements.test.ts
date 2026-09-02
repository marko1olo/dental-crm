import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	analyzeMischBoneQuality,
	calculate3DAngleDegrees,
	calculateNerveTrajectoryLength3DMm,
	calculateRoiDensityStats,
	calculateVectorAngleDegrees,
	calibrateVoxelSpacingFromKnownDistance,
	classifyHUToMisch,
	distancePointToSegment3DMm,
	interpolateNerveSpline3D,
	measure3DDistanceMm,
	measureDistanceToMandibularNerve,
	measureDistanceToMaxillarySinus,
	normalizeVoxelSpacing,
} from "../index.js";

describe("3D DICOM PACS MPR Series Measurements & Anatomy Engine", () => {
	it("1. 3D Euclidean Distance & Anisotropic Voxel Spacing", () => {
		const p1 = { x: 100, y: 100, z: 20 };
		const p2 = { x: 130, y: 140, z: 20 }; // dx = 30, dy = 40 in voxel space -> dist in voxels = 50

		// Isotropic spacing: 0.2 mm/voxel in X and Y
		const distMm = measure3DDistanceMm(p1, p2, { x: 0.2, y: 0.2, z: 0.5 });
		// dxMm = 30 * 0.2 = 6 mm, dyMm = 40 * 0.2 = 8 mm -> dist = sqrt(36 + 64) = 10.0 mm
		assert.equal(distMm, 10.0);

		// Anisotropic spacing with Z variation: dz = 10 slices, spacing = 0.5 mm -> dzMm = 5.0 mm
		const p3 = { x: 100, y: 100, z: 10 };
		const p4 = { x: 100, y: 100, z: 20 };
		const zDistMm = measure3DDistanceMm(p3, p4, { x: 0.2, y: 0.2, z: 0.5 });
		assert.equal(zDistMm, 5.0);

		// Normalization of array input
		const norm = normalizeVoxelSpacing([0.25, 0.25, 0.75]);
		assert.equal(norm.x, 0.25);
		assert.equal(norm.y, 0.25);
		assert.equal(norm.z, 0.75);
	});

	it("2. Scale Calibration from Known Reference Marker", () => {
		// Marker spanning 200 voxels in X representing a 10.0 mm calibration sphere
		const p1 = { x: 50, y: 100, z: 10 };
		const p2 = { x: 250, y: 100, z: 10 };
		const scaleMmPerVoxel = calibrateVoxelSpacingFromKnownDistance(p1, p2, 10.0);
		assert.equal(scaleMmPerVoxel, 0.05); // 10.0 / 200 = 0.05 mm/voxel

		// Anisotropic Z-axis calibration: 20 slices along Z (dz=20) with known 10.0 mm distance.
		// Standard spacing: x=0.2, z=0.5 -> relZ = 0.5 / 0.2 = 2.5
		// Effective voxel distance = 20 * 2.5 = 50. Base spacing = 10.0 / 50 = 0.2 mm/voxel
		const pZ1 = { x: 100, y: 100, z: 0 };
		const pZ2 = { x: 100, y: 100, z: 20 };
		const scaleZ = calibrateVoxelSpacingFromKnownDistance(pZ1, pZ2, 10.0);
		assert.equal(scaleZ, 0.2);

		// Anisotropic 3D diagonal calibration with custom spacing
		const pDiag1 = { x: 0, y: 0, z: 0 };
		const pDiag2 = { x: 30, y: 40, z: 20 }; // dx=30, dy=40 (50), dz=20 * 2.5 = 50 -> total = sqrt(5000)
		const knownDiagMm = Math.sqrt(5000) * 0.2; // ~14.142136 mm for base spacing 0.2 mm
		const scaleDiag = calibrateVoxelSpacingFromKnownDistance(pDiag1, pDiag2, knownDiagMm);
		assert.equal(scaleDiag, 0.2);
	});

	it("3. 3D Angle & Implant Axis Inclination", () => {
		// Orthogonal vectors -> 90.0 degrees
		const v1 = { x: 1, y: 0, z: 0 };
		const v2 = { x: 0, y: 1, z: 0 };
		const angle90 = calculateVectorAngleDegrees(v1, v2);
		assert.equal(angle90, 90.0);

		// 45-degree angle in 3-point space (in-plane XY)
		const p1 = { x: 10, y: 0, z: 0 };
		const vertex = { x: 0, y: 0, z: 0 };
		const p2 = { x: 10, y: 10, z: 0 };
		const angle45 = calculate3DAngleDegrees(p1, vertex, p2);
		assert.equal(angle45, 45.0);

		// 45-degree angle across Z-plane with default dental spacing { x: 0.2, y: 0.2, z: 0.5 }
		// dx = 10 voxels * 0.2 = 2.0 mm; dz = 4 slices * 0.5 = 2.0 mm -> equal physical legs -> 45.0 degrees
		const pZ45 = { x: 10, y: 0, z: 4 };
		const angleZ45 = calculate3DAngleDegrees(p1, vertex, pZ45);
		assert.equal(angleZ45, 45.0);

		// Parallel vectors -> 0.0 degrees
		const angle0 = calculateVectorAngleDegrees({ x: 0, y: 5, z: 0 }, { x: 0, y: 10, z: 0 });
		assert.equal(angle0, 0.0);
	});

	it("4. Mandibular Nerve (N. Alveolaris Inferior) 3D Trajectory & Safety Corridors", () => {
		const voxelSpacing = { x: 0.2, y: 0.2, z: 0.5 };
		// 3D nerve trajectory passing along X from 10 to 100 at y=50, z=20
		const nerveControlPoints = [
			{ x: 10, y: 50, z: 20 },
			{ x: 40, y: 52, z: 21 },
			{ x: 70, y: 51, z: 20 },
			{ x: 100, y: 50, z: 19 },
		];

		// 4.1 Catmull-Rom spline interpolation
		const interpolated = interpolateNerveSpline3D(nerveControlPoints, 10);
		assert.ok(interpolated.length >= 30, "Spline must be smoothly subdivided");

		// 4.2 Total anatomical trajectory length in mm
		const trajectoryLengthMm = calculateNerveTrajectoryLength3DMm(interpolated, voxelSpacing);
		// Approx (100 - 10) * 0.2 mm = 18.0 mm
		assert.ok(trajectoryLengthMm >= 17.5 && trajectoryLengthMm <= 19.0);

		// 4.3 Safe implant apex position (distance >= 2.0 mm)
		// Apex at x=40, y=70 (20 voxels away in Y = 4.0 mm distance), z=21
		const safeApex = { x: 40, y: 70, z: 21 };
		const safeResult = measureDistanceToMandibularNerve(safeApex, nerveControlPoints, voxelSpacing);
		assert.equal(safeResult.safetyZone, "safe");
		assert.equal(safeResult.isSafe, true);
		assert.ok(safeResult.distanceMm >= 3.5);

		// 4.4 Warning zone (distance between 1.0 and 2.0 mm)
		// Apex at x=40, y=58 (6 voxels away in Y = 1.2 mm distance), z=21
		const warningApex = { x: 40, y: 58, z: 21 };
		const warningResult = measureDistanceToMandibularNerve(warningApex, nerveControlPoints, voxelSpacing);
		assert.equal(warningResult.safetyZone, "warning");
		assert.equal(warningResult.isSafe, false);
		assert.ok(warningResult.distanceMm >= 1.0 && warningResult.distanceMm < 2.0);

		// 4.5 Danger zone (distance < 1.0 mm -> Critical risk of nerve damage)
		// Apex at x=40, y=53 (1 voxel away in Y = 0.2 mm), z=21
		const dangerApex = { x: 40, y: 53, z: 21 };
		const dangerResult = measureDistanceToMandibularNerve(dangerApex, nerveControlPoints, voxelSpacing);
		assert.equal(dangerResult.safetyZone, "danger");
		assert.equal(dangerResult.isSafe, false);
		assert.ok(dangerResult.distanceMm < 1.0);
		assert.ok(dangerResult.clinicalAdvice.includes("ОПАСНО"));
	});

	it("5. Point to 3D Segment Orthogonal Distance", () => {
		const segStart = { x: 0, y: 0, z: 0 };
		const segEnd = { x: 100, y: 0, z: 0 };
		const point = { x: 50, y: 30, z: 0 }; // 30 voxels orthogonal in Y

		const result = distancePointToSegment3DMm(point, segStart, segEnd, { x: 0.1, y: 0.1, z: 0.1 });
		// 30 voxels * 0.1 mm = 3.0 mm
		assert.equal(result.distanceMm, 3.0);
		assert.equal(result.closestPoint.x, 50);
		assert.equal(result.closestPoint.y, 0);
	});

	it("6. Carl E. Misch Bone Density (HU) Classification & Surgical Protocol", () => {
		// Classification thresholds
		assert.equal(classifyHUToMisch(1400), "D1");
		assert.equal(classifyHUToMisch(950), "D2");
		assert.equal(classifyHUToMisch(500), "D3");
		assert.equal(classifyHUToMisch(250), "D4");
		assert.equal(classifyHUToMisch(50), "D5");

		// D1 Bone Analysis: Dense cortical bone
		const d1Profile = {
			coronalCrestalHU: 1500,
			trabecularCoreHU: 1300,
			apicalBaseHU: 1400,
			overallMeanHU: 1350,
		};
		const d1Result = analyzeMischBoneQuality(d1Profile, 4.0);
		assert.equal(d1Result.mischClass, "D1");
		assert.equal(d1Result.corticalTapRequired, true);
		assert.equal(d1Result.isImmediateLoadingEligible, true);
		assert.equal(d1Result.estimatedInsertionTorqueNcm.expectedNcm, 50);

		// D4 Bone Analysis: Soft trabecular bone (Requires under-drilling)
		const d4Profile = {
			coronalCrestalHU: 300,
			trabecularCoreHU: 200,
			apicalBaseHU: 250,
			overallMeanHU: 238,
		};
		const d4Result = analyzeMischBoneQuality(d4Profile, 4.0);
		assert.equal(d4Result.mischClass, "D4");
		assert.equal(d4Result.underdrillingRecommended, true);
		assert.equal(d4Result.isImmediateLoadingEligible, false);
		assert.ok(d4Result.underdrillingMm >= 0.5);
	});

	it("7. ROI Density Statistics Calculation", () => {
		const roiVoxels = [900, 950, 1000, 1050, 1100]; // Mean = 1000 HU -> D2 bone
		const stats = calculateRoiDensityStats(roiVoxels);
		assert.equal(stats.meanHu, 1000);
		assert.equal(stats.minHu, 900);
		assert.equal(stats.maxHu, 1100);
		assert.equal(stats.boneClassification, "D2");
		assert.ok(stats.stdDevHu > 0);
	});

	it("8. Maxillary Sinus Floor Residual Bone Height & Sinus Lift Indications", () => {
		const spacing = { x: 0.1, y: 0.1, z: 0.1 };

		// Case A: Bone height 10.0 mm (100 voxels) -> No sinus lift needed
		const crestA = { x: 50, y: 150, z: 10 };
		const sinusA = { x: 50, y: 50, z: 10 }; // 100 voxels = 10.0 mm
		const resultA = measureDistanceToMaxillarySinus(crestA, sinusA, spacing);
		assert.equal(resultA.residualBoneHeightMm, 10.0);
		assert.equal(resultA.sinusLiftRecommended, false);
		assert.equal(resultA.sinusLiftType, "none");

		// Case B: Bone height 6.0 mm (60 voxels) -> Closed crestal sinus lift (Summers)
		const crestB = { x: 50, y: 110, z: 10 };
		const sinusB = { x: 50, y: 50, z: 10 }; // 60 voxels = 6.0 mm
		const resultB = measureDistanceToMaxillarySinus(crestB, sinusB, spacing);
		assert.equal(resultB.residualBoneHeightMm, 6.0);
		assert.equal(resultB.sinusLiftRecommended, true);
		assert.equal(resultB.sinusLiftType, "crestal_closed");

		// Case C: Bone height 3.5 mm (35 voxels) -> Open lateral window sinus lift
		const crestC = { x: 50, y: 85, z: 10 };
		const sinusC = { x: 50, y: 50, z: 10 }; // 35 voxels = 3.5 mm
		const resultC = measureDistanceToMaxillarySinus(crestC, sinusC, spacing);
		assert.equal(resultC.residualBoneHeightMm, 3.5);
		assert.equal(resultC.sinusLiftRecommended, true);
		assert.equal(resultC.sinusLiftType, "lateral_open");
	});
});
