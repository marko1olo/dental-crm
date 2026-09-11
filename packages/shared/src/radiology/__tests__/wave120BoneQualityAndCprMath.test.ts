/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 120: CBCT BONE QUALITY (MISCH D1–D5) & CPR SAMPLING MATH TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Comprehensive unit tests for:
 * 1. Carl Misch bone density classification (D1..D5) at strict boundaries
 * 2. Clinical guidance and surgical osteotomy protocols (torque, under-drilling)
 * 3. 3D Trilinear voxel interpolation on synthetic 2x2x2 cube and air sentinel
 * 4. Volumetric bone sampling along planned implant osteotomy sites
 * 5. Edge cases: degenerate implant length (< 1e-6), out-of-volume bounds,
 *    and coincident/degenerate curve control points.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	classifyBone,
	getMischBoneClinicalGuidance,
	sampleImplantBoneHU,
	MISCH_CLINICAL_GUIDANCE,
	type BoneClass,
	type VolumeSamplingData,
} from "../boneQuality.js";
import {
	trilinear,
	buildUniformCurve,
	crossSectionFrame,
	computeCrossSection,
	AIR_HU,
	MAX_CROSS_SECTION_TILT_DEG,
	type Point2,
} from "../cprMath.js";
import type { Vec3 } from "../cbctSafetyEngine.js";

describe("Wave 120: CBCT Bone Quality & CPR Math Engine", () => {
	// ── 1. Carl Misch D1–D5 Classification at Boundaries ─────────

	describe("1. classifyBone (Misch HU/GV reference ranges)", () => {
		it("correctly classifies D1 (> 1250 HU: dense cortical bone)", () => {
			assert.equal(classifyBone(1251), "D1");
			assert.equal(classifyBone(1250.01), "D1");
			assert.equal(classifyBone(1500), "D1");
			assert.equal(classifyBone(2500), "D1");
		});

		it("correctly classifies D2 (850–1250 HU: porous cortical & coarse trabecular)", () => {
			assert.equal(classifyBone(1250), "D2");
			assert.equal(classifyBone(1000), "D2");
			assert.equal(classifyBone(850), "D2");
		});

		it("correctly classifies D3 (350–850 HU: porous cortical & fine trabecular)", () => {
			assert.equal(classifyBone(849), "D3");
			assert.equal(classifyBone(849.99), "D3");
			assert.equal(classifyBone(600), "D3");
			assert.equal(classifyBone(350), "D3");
		});

		it("correctly classifies D4 (150–350 HU: fine trabecular bone)", () => {
			assert.equal(classifyBone(349), "D4");
			assert.equal(classifyBone(349.99), "D4");
			assert.equal(classifyBone(250), "D4");
			assert.equal(classifyBone(150), "D4");
		});

		it("correctly classifies D5 (< 150 HU: immature bone / soft tissue / air)", () => {
			assert.equal(classifyBone(149), "D5");
			assert.equal(classifyBone(149.99), "D5");
			assert.equal(classifyBone(50), "D5");
			assert.equal(classifyBone(0), "D5");
			assert.equal(classifyBone(-50), "D5");
			assert.equal(classifyBone(-1024), "D5");
		});
	});

	// ── 2. Clinical Guidance & Surgical Protocols ────────────────

	describe("2. getMischBoneClinicalGuidance", () => {
		const classes: BoneClass[] = ["D1", "D2", "D3", "D4", "D5"];

		it("returns guidance for all 5 bone classes with non-empty clinical fields", () => {
			for (const bc of classes) {
				const g = getMischBoneClinicalGuidance(bc);
				assert.equal(g.boneClass, bc);
				assert.ok(g.classNameRu.length > 0);
				assert.ok(g.densityRangeRu.length > 0);
				assert.ok(g.anatomicLocationRu.length > 0);
				assert.ok(g.corticalDescriptionRu.length > 0);
				assert.ok(g.trabecularDescriptionRu.length > 0);
				assert.ok(g.tactileFeelRu.length > 0);
				assert.ok(g.clinicalDescriptionRu.length > 0);
				assert.ok(g.surgicalPreparationProtocolRu.length > 0);
				assert.ok(g.drillingProtocolRu.length > 0);
				assert.ok(g.colorHex.startsWith("#"));
				assert.ok(g.bgBadgeHex.startsWith("#"));
				assert.ok(g.borderBadgeHex.startsWith("#"));
				assert.ok(g.recommendedTorqueNcm.min >= 0);
				assert.ok(g.recommendedTorqueNcm.max >= g.recommendedTorqueNcm.min);
				assert.ok(
					g.recommendedTorqueNcm.target >= g.recommendedTorqueNcm.min &&
						g.recommendedTorqueNcm.target <= g.recommendedTorqueNcm.max,
				);
				assert.ok(g.healingMonths.mandible > 0);
				assert.ok(g.healingMonths.maxilla > 0);
			}
		});

		it("verifies D1 surgical protocol: full-depth tapping & thermal necrosis protection", () => {
			const d1 = getMischBoneClinicalGuidance("D1");
			assert.ok(d1.surgicalPreparationProtocolRu.includes("метчиком"));
			assert.ok(d1.surgicalPreparationProtocolRu.includes("охлаждением"));
			assert.equal(d1.recommendedTorqueNcm.target, 40);
			assert.equal(d1.healingMonths.mandible, 3);
			assert.equal(d1.healingMonths.maxilla, 4);
		});

		it("verifies D2 surgical protocol: standard stepped osteotomy, cortical neck tapping", () => {
			const d2 = getMischBoneClinicalGuidance("D2");
			assert.ok(d2.surgicalPreparationProtocolRu.includes("ступенчатый"));
			assert.equal(d2.recommendedTorqueNcm.target, 35);
		});

		it("verifies D3 surgical protocol: under-drilling for bone condensation", () => {
			const d3 = getMischBoneClinicalGuidance("D3");
			assert.ok(
				d3.surgicalPreparationProtocolRu.includes("under-drilling") ||
					d3.surgicalPreparationProtocolRu.includes("недопрепарирование"),
			);
			assert.equal(d3.recommendedTorqueNcm.target, 30);
		});

		it("verifies D4 surgical protocol: osteocondensation, aggressive thread, no final drill", () => {
			const d4 = getMischBoneClinicalGuidance("D4");
			assert.ok(
				d4.surgicalPreparationProtocolRu.includes("остеоконденсация") ||
					d4.surgicalPreparationProtocolRu.includes("остеотом"),
			);
			assert.equal(d4.recommendedTorqueNcm.target, 20);
			assert.equal(d4.healingMonths.maxilla, 6);
		});

		it("verifies D5 surgical protocol: GBR requirement and direct implant contraindication", () => {
			const d5 = getMischBoneClinicalGuidance("D5");
			assert.ok(
				d5.surgicalPreparationProtocolRu.includes("противопоказана") ||
					d5.surgicalPreparationProtocolRu.includes("GBR"),
			);
			assert.equal(d5.recommendedTorqueNcm.target, 10);
			assert.equal(d5.healingMonths.maxilla, 9);
		});
	});

	// ── 3. Trilinear Interpolation on Synthetic Cube ─────────────

	describe("3. trilinear interpolation", () => {
		// 2x2x2 linear voxel cube: HU = 100*i + 200*j + 400*k
		const dims2: [number, number, number] = [2, 2, 2];
		const linearVoxel = (i: number, j: number, k: number) =>
			100 * i + 200 * j + 400 * k;

		it("interpolates exactly at the 8 cube vertices", () => {
			assert.ok(Math.abs(trilinear(linearVoxel, dims2, 0, 0, 0) - 0) < 1e-4);
			assert.ok(Math.abs(trilinear(linearVoxel, dims2, 1, 0, 0) - 100) < 1e-3);
			assert.ok(Math.abs(trilinear(linearVoxel, dims2, 0, 1, 0) - 200) < 1e-3);
			assert.ok(Math.abs(trilinear(linearVoxel, dims2, 1, 1, 0) - 300) < 1e-3);
			assert.ok(Math.abs(trilinear(linearVoxel, dims2, 0, 0, 1) - 400) < 1e-3);
			assert.ok(Math.abs(trilinear(linearVoxel, dims2, 1, 0, 1) - 500) < 1e-3);
			assert.ok(Math.abs(trilinear(linearVoxel, dims2, 0, 1, 1) - 600) < 1e-3);
			assert.ok(Math.abs(trilinear(linearVoxel, dims2, 1, 1, 1) - 700) < 1e-3);
		});

		it("interpolates exactly at the cube centroid (0.5, 0.5, 0.5)", () => {
			// Center is (0 + 100 + 200 + 300 + 400 + 500 + 600 + 700) / 8 = 350
			const centerVal = trilinear(linearVoxel, dims2, 0.5, 0.5, 0.5);
			assert.ok(
				Math.abs(centerVal - 350) < 1e-4,
				`Expected 350, got ${centerVal}`,
			);
		});

		it("interpolates arbitrary intermediate fractional coordinates", () => {
			// (0.25, 0.5, 0.75) -> 100*0.25 + 200*0.5 + 400*0.75 = 25 + 100 + 300 = 425
			const val = trilinear(linearVoxel, dims2, 0.25, 0.5, 0.75);
			assert.ok(Math.abs(val - 425) < 1e-4, `Expected 425, got ${val}`);
		});

		it("preserves real data on the outermost boundary plane (coord == dims - 1)", () => {
			const boundaryVal = trilinear(linearVoxel, dims2, 1, 0.5, 0.5);
			assert.notEqual(boundaryVal, AIR_HU);
			// 100*1 + 200*0.5 + 400*0.5 = 100 + 100 + 200 = 400
			assert.ok(
				Math.abs(boundaryVal - 400) < 1e-3,
				`Expected ~400, got ${boundaryVal}`,
			);
		});

		it("returns AIR_HU (-1024) for genuinely out-of-volume samples", () => {
			assert.equal(trilinear(linearVoxel, dims2, -0.1, 0.5, 0.5), AIR_HU);
			assert.equal(trilinear(linearVoxel, dims2, 2.1, 0.5, 0.5), AIR_HU);
			assert.equal(trilinear(linearVoxel, dims2, 0.5, -0.5, 0.5), AIR_HU);
			assert.equal(trilinear(linearVoxel, dims2, 0.5, 2.5, 0.5), AIR_HU);
			assert.equal(trilinear(linearVoxel, dims2, 0.5, 0.5, -1.0), AIR_HU);
			assert.equal(trilinear(linearVoxel, dims2, 0.5, 0.5, 3.0), AIR_HU);
		});
	});

	// ── 4. Implant Bed Bone Density Sampling ─────────────────────

	describe("4. sampleImplantBoneHU", () => {
		function createLinearVolume(): VolumeSamplingData {
			return {
				dims: [50, 50, 50],
				origin: [0, 0, 0],
				getVoxel: (_i, _j, k) => 100 + 10 * k, // HU = 100 + 10*z
				invSx: 1,
				invSy: 1,
				invSz: 1,
				zMin: 0,
				zMax: 49,
				vSpacing: 1,
			};
		}

		it("samples mean HU along a vertical implant in a linear vertical gradient", () => {
			const vol = createLinearVolume();
			// Implant along Z from z=10 to z=30 at x=25, y=25
			const entry: Vec3 = [25, 25, 10];
			const apex: Vec3 = [25, 25, 30];
			const sample = sampleImplantBoneHU(vol, entry, apex, 4);

			assert.ok(sample !== null);
			// Mid-Z is 20 -> HU = 100 + 10*20 = 300
			assert.ok(
				Math.abs(sample.meanHU - 300) < 1e-4,
				`Expected meanHU 300, got ${sample.meanHU}`,
			);
			assert.equal(sample.bone, "D4"); // 300 HU is Misch D4 (150–350)
			assert.ok(sample.samples > 0);
			assert.ok(sample.minHU !== undefined && sample.minHU <= 300);
			assert.ok(sample.maxHU !== undefined && sample.maxHU >= 300);
			assert.ok(sample.stdDevHU !== undefined && sample.stdDevHU > 0);
			assert.ok(sample.profile !== undefined);
			assert.equal(sample.profile.boneClass, "D4");
		});

		it("samples D1 density for implant in dense cortical field (1400 HU)", () => {
			const vol: VolumeSamplingData = {
				dims: [30, 30, 30],
				origin: [0, 0, 0],
				getVoxel: () => 1400,
				invSx: 1,
				invSy: 1,
				invSz: 1,
				zMin: 0,
				zMax: 29,
				vSpacing: 1,
			};
			const sample = sampleImplantBoneHU(
				vol,
				[15, 15, 5],
				[15, 15, 20],
				3.5,
			);
			assert.ok(sample !== null);
			assert.ok(Math.abs(sample.meanHU - 1400) < 1e-4);
			assert.equal(sample.bone, "D1");
			assert.equal(sample.profile?.recommendedTorqueNcm.target, 40);
		});

		it("samples D2 density in 1000 HU field", () => {
			const vol: VolumeSamplingData = {
				dims: [30, 30, 30],
				origin: [0, 0, 0],
				getVoxel: () => 1000,
				invSx: 1,
				invSy: 1,
				invSz: 1,
				zMin: 0,
				zMax: 29,
				vSpacing: 1,
			};
			const sample = sampleImplantBoneHU(
				vol,
				[15, 15, 5],
				[15, 15, 20],
				3.5,
			);
			assert.ok(sample !== null);
			assert.equal(sample.bone, "D2");
		});

		it("samples D3 density in 600 HU field", () => {
			const vol: VolumeSamplingData = {
				dims: [30, 30, 30],
				origin: [0, 0, 0],
				getVoxel: () => 600,
				invSx: 1,
				invSy: 1,
				invSz: 1,
				zMin: 0,
				zMax: 29,
				vSpacing: 1,
			};
			const sample = sampleImplantBoneHU(
				vol,
				[15, 15, 5],
				[15, 15, 20],
				3.5,
			);
			assert.ok(sample !== null);
			assert.equal(sample.bone, "D3");
		});

		it("samples D5 density in graft defect / low density field (50 HU)", () => {
			const vol: VolumeSamplingData = {
				dims: [30, 30, 30],
				origin: [0, 0, 0],
				getVoxel: () => 50,
				invSx: 1,
				invSy: 1,
				invSz: 1,
				zMin: 0,
				zMax: 29,
				vSpacing: 1,
			};
			const sample = sampleImplantBoneHU(
				vol,
				[15, 15, 5],
				[15, 15, 20],
				3.5,
			);
			assert.ok(sample !== null);
			assert.equal(sample.bone, "D5");
		});
	});

	// ── 5. Edge Cases & Degenerate Geometries ─────────────────────

	describe("5. Edge cases and degenerate geometries", () => {
		const vol: VolumeSamplingData = {
			dims: [40, 40, 40],
			origin: [0, 0, 0],
			getVoxel: () => 500,
			invSx: 1,
			invSy: 1,
			invSz: 1,
			zMin: 0,
			zMax: 39,
			vSpacing: 1,
		};

		it("returns null when implant length is < 1e-6 (coincident entry & apex)", () => {
			const rZero = sampleImplantBoneHU(vol, [20, 20, 20], [20, 20, 20], 3.5);
			assert.equal(rZero, null);

			const rEpsilon = sampleImplantBoneHU(
				vol,
				[20, 20, 20],
				[20, 20, 20 + 1e-7],
				3.5,
			);
			assert.equal(rEpsilon, null);
		});

		it("returns null when the implant lies entirely outside the volume", () => {
			const rOutside = sampleImplantBoneHU(
				vol,
				[200, 200, 200],
				[200, 200, 220],
				4,
			);
			assert.equal(rOutside, null);
		});

		it("safely samples when implant partially crosses volume boundary", () => {
			// entry inside at [20, 20, 35], apex outside at [20, 20, 60]
			const rPartial = sampleImplantBoneHU(
				vol,
				[20, 20, 35],
				[20, 20, 60],
				2.0,
			);
			assert.ok(rPartial !== null);
			assert.ok(rPartial.samples > 0);
			assert.equal(rPartial.bone, "D3");
		});

		it("buildUniformCurve handles degenerate coincident control points", () => {
			const pts: Point2[] = [
				[10, 10],
				[10, 10],
				[10, 10],
			];
			const res = buildUniformCurve(pts, 50);
			assert.equal(res.curve.length, 2);
			assert.equal(res.normals.length, 2);
			assert.equal(res.arcLen, 0);
			for (const n of res.normals) {
				assert.ok(Math.abs(Math.hypot(n[0], n[1]) - 1) < 1e-5);
			}
		});

		it("buildUniformCurve handles empty array", () => {
			const res = buildUniformCurve([], 50);
			assert.equal(res.curve.length, 0);
			assert.equal(res.normals.length, 0);
			assert.equal(res.arcLen, 0);
		});

		it("crossSectionFrame clamps tilt angle to ±30° (MAX_CROSS_SECTION_TILT_DEG)", () => {
			const pts: Point2[] = [
				[0, 20],
				[10, 20],
				[20, 20],
				[30, 20],
			];
			const frame60 = crossSectionFrame(pts, 0.5, 60, 0, 40);
			const frame30 = crossSectionFrame(pts, 0.5, 30, 0, 40);

			assert.ok(frame60 !== null);
			assert.ok(frame30 !== null);
			// Both must yield the same eV vector since 60° clamps to 30°
			assert.ok(Math.abs(frame60.eV[0] - frame30.eV[0]) < 1e-6);
			assert.ok(Math.abs(frame60.eV[1] - frame30.eV[1]) < 1e-6);
			assert.ok(Math.abs(frame60.eV[2] - frame30.eV[2]) < 1e-6);
		});

		it("computeCrossSection samples valid pixel buffer", () => {
			const pts: Point2[] = [
				[10, 20],
				[15, 20],
				[20, 20],
				[25, 20],
			];
			const res = computeCrossSection(vol, {
				controlPoints: pts,
				position: 0.5,
				tiltDeg: 0,
				widthMm: 10,
				resolution: 1.0,
			});
			assert.ok(res !== null);
			assert.ok(res.width > 0);
			assert.ok(res.height > 0);
			assert.equal(res.pixelData.length, res.width * res.height);
			// Center of cross section should read ~500 HU
			const midPixel =
				res.pixelData[
					Math.floor(res.height / 2) * res.width + Math.floor(res.width / 2)
				];
			assert.ok(
				Math.abs((midPixel ?? 0) - 500) < 1e-3,
				`Expected ~500, got ${midPixel}`,
			);
		});
	});
});
