import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	dot3,
	sub3,
	norm3,
	distPointToSegment3,
	distSegmentToSegment3,
	distSegmentToPolyline3,
	evaluateNerveClearance,
	evaluateSinusClearance,
	evaluateNeighborImplantClearance,
	evaluateToothRootClearance,
	aggregateImplantSafetyAssessment,
	classifyMischBoneDensity,
	getMischClassConfig,
	type Vec3,
	type MischBoneClass,
} from "../radiology/index.js";

describe("Wave 118: Carl Misch D1–D5 Bone Classification & 3D Implant Safety Clearance", () => {
	describe("1. Pure 3D Analytical Vector Math", () => {
		it("calculates dot product and vector subtraction correctly", () => {
			const a: Vec3 = [1, 2, 3];
			const b: Vec3 = [4, 5, 6];
			assert.equal(dot3(a, b), 4 + 10 + 18); // 32
			assert.deepEqual(sub3(b, a), [3, 3, 3]);
		});

		it("calculates Euclidean norm of 3D vector", () => {
			const v: Vec3 = [3, 4, 12];
			assert.equal(norm3(v), 13);
		});

		it("calculates shortest distance from 3D point to line segment", () => {
			const a: Vec3 = [0, 0, 0];
			const b: Vec3 = [10, 0, 0];

			// Point directly above the segment midpoint
			const pMid: Vec3 = [5, 4, 0];
			assert.equal(distPointToSegment3(pMid, a, b), 4);

			// Point projecting before endpoint a
			const pBefore: Vec3 = [-3, 4, 0];
			assert.equal(distPointToSegment3(pBefore, a, b), 5); // hypot(-3-0, 4-0)

			// Point projecting past endpoint b
			const pPast: Vec3 = [13, 4, 0];
			assert.equal(distPointToSegment3(pPast, a, b), 5); // hypot(13-10, 4-0)

			// Point directly on segment
			const pOn: Vec3 = [3, 0, 0];
			assert.equal(distPointToSegment3(pOn, a, b), 0);
		});

		it("calculates shortest distance between two 3D segments", () => {
			// Two parallel segments separated by 5 mm along Y
			const p1: Vec3 = [0, 0, 0];
			const q1: Vec3 = [10, 0, 0];
			const p2: Vec3 = [0, 5, 0];
			const q2: Vec3 = [10, 5, 0];
			assert.equal(distSegmentToSegment3(p1, q1, p2, q2), 5);

			// Two perpendicular skew segments separated by 7 mm along Z
			const s1a: Vec3 = [0, -5, 0];
			const s1b: Vec3 = [0, 5, 0];
			const s2a: Vec3 = [-5, 0, 7];
			const s2b: Vec3 = [5, 0, 7];
			assert.equal(distSegmentToSegment3(s1a, s1b, s2a, s2b), 7);

			// Intersecting segments
			const i1a: Vec3 = [0, 0, 0];
			const i1b: Vec3 = [10, 10, 0];
			const i2a: Vec3 = [0, 10, 0];
			const i2b: Vec3 = [10, 0, 0];
			assert.ok(distSegmentToSegment3(i1a, i1b, i2a, i2b) < 1e-6);
		});

		it("calculates shortest distance between segment and 3D polyline", () => {
			const a: Vec3 = [5, 5, 0];
			const b: Vec3 = [5, 15, 0];
			const poly: Vec3[] = [
				[0, 0, 0],
				[0, 10, 0],
				[0, 20, 0],
			];
			const d = distSegmentToPolyline3(a, b, poly);
			assert.equal(d, 5);

			// Empty polyline returns infinity
			assert.equal(distSegmentToPolyline3(a, b, []), Number.POSITIVE_INFINITY);
		});
	});

	describe("2. Anatomical Clearance Evaluators", () => {
		const entry: Vec3 = [15, 0, 0];
		const apex: Vec3 = [15, 10, 0];
		const diameterMm = 4.0; // radius = 2.0 mm

		it("evaluates Inferior Alveolar Nerve (IAN) clearance with >= 2.0 mm threshold", () => {
			// Case A: Safe corridor (centerline distance = 6.0 mm, radius = 2.0, nerve radius = 1.5 -> clearance = 2.5 mm >= 2.0 mm)
			const nerveCenterSafe: Vec3 = [15, 16, 0];
			const safeResult = evaluateNerveClearance(entry, apex, diameterMm, [nerveCenterSafe], 1.5);
			assert.equal(safeResult.landmarkType, "nerve");
			assert.equal(safeResult.status, "safe");
			assert.equal(safeResult.surfaceClearanceMm, 2.5);
			assert.ok(safeResult.clinicalRecommendationRu.includes("Безопасный коридор"));

			// Case B: Warning corridor (centerline = 4.5 mm, clearance = 4.5 - 2.0 - 1.5 = 1.0 mm < 2.0 mm)
			const nerveCenterWarn: Vec3 = [15, 14.5, 0];
			const warnResult = evaluateNerveClearance(entry, apex, diameterMm, [nerveCenterWarn], 1.5);
			assert.equal(warnResult.status, "warning");
			assert.equal(warnResult.surfaceClearanceMm, 1.0);
			assert.ok(warnResult.clinicalRecommendationRu.includes("Внимание"));

			// Case C: Critical Collision / Paresthesia (centerline = 3.0 mm, clearance = 3.0 - 2.0 - 1.5 = -0.5 mm <= 0)
			const nerveCenterCollision: Vec3 = [15, 13, 0];
			const collResult = evaluateNerveClearance(entry, apex, diameterMm, [nerveCenterCollision], 1.5);
			assert.equal(collResult.status, "collision");
			assert.ok(collResult.surfaceClearanceMm <= 0);
			assert.ok(collResult.clinicalRecommendationRu.includes("парестезии"));
		});

		it("evaluates Maxillary Sinus Floor clearance with >= 1.0 mm threshold", () => {
			// Sinus polyline along Y = 13 mm
			const sinusFloor: Vec3[] = [
				[10, 13, 0],
				[20, 13, 0],
			];

			// Centerline distance to apex (15, 10, 0) is 3.0 mm. Implant radius = 2.0 mm -> surface clearance = 1.0 mm.
			const safeSinus = evaluateSinusClearance(entry, apex, diameterMm, sinusFloor);
			assert.equal(safeSinus.landmarkType, "sinus");
			assert.equal(safeSinus.status, "safe");
			assert.equal(safeSinus.surfaceClearanceMm, 1.0);

			// Sinus closer: Y = 12.5 mm -> centerline = 2.5 mm -> clearance = 0.5 mm < 1.0 mm -> warning (closed sinus lift)
			const closeSinusFloor: Vec3[] = [
				[10, 12.5, 0],
				[20, 12.5, 0],
			];
			const warnSinus = evaluateSinusClearance(entry, apex, diameterMm, closeSinusFloor);
			assert.equal(warnSinus.status, "warning");
			assert.ok(warnSinus.clinicalRecommendationRu.includes("синус-лифтинг"));

			// Sinus perforation: Y = 11.5 mm -> clearance = -0.5 mm <= 0 -> collision
			const perfSinusFloor: Vec3[] = [
				[10, 11.5, 0],
				[20, 11.5, 0],
			];
			const collSinus = evaluateSinusClearance(entry, apex, diameterMm, perfSinusFloor);
			assert.equal(collSinus.status, "collision");
			assert.ok(collSinus.clinicalRecommendationRu.includes("Перфорация"));
		});

		it("evaluates adjacent implant clearance with >= 3.0 mm threshold", () => {
			// Adjacent implant parallel at X = 22 mm (distance between axes = 7.0 mm, radii = 2.0 + 2.0 = 4.0 mm -> clearance = 3.0 mm)
			const adjEntry: Vec3 = [22, 0, 0];
			const adjApex: Vec3 = [22, 10, 0];
			const safeAdj = evaluateNeighborImplantClearance(entry, apex, 4.0, adjEntry, adjApex, 4.0);
			assert.equal(safeAdj.landmarkType, "implant");
			assert.equal(safeAdj.status, "safe");
			assert.equal(safeAdj.surfaceClearanceMm, 3.0);

			// Warning: distance between axes = 6.0 mm (21 - 15) -> clearance = 6.0 - 2.0 - 2.0 = 2.0 mm < 3.0 mm
			const warnAdj = evaluateNeighborImplantClearance(entry, apex, 4.0, [21, 0, 0], [21, 10, 0], 4.0);
			assert.equal(warnAdj.status, "warning");
			assert.equal(warnAdj.surfaceClearanceMm, 2.0);

			// Collision: distance between axes = 3.0 mm -> clearance = -1.0 mm <= 0
			const collAdj = evaluateNeighborImplantClearance(entry, apex, 4.0, [18, 0, 0], [18, 10, 0], 4.0);
			assert.equal(collAdj.status, "collision");
		});

		it("evaluates adjacent tooth root clearance with >= 1.5 mm threshold", () => {
			// Root cervical and apex at X = 20.5 mm, root radius = 1.5 mm, implant radius = 2.0 mm
			// Centerline = 5.5 mm -> clearance = 5.5 - 2.0 - 1.5 = 2.0 mm >= 1.5 mm -> safe
			const rootCervical: Vec3 = [20.5, 0, 0];
			const rootApex: Vec3 = [20.5, 10, 0];
			const safeRoot = evaluateToothRootClearance(entry, apex, 4.0, rootCervical, rootApex, 1.5);
			assert.equal(safeRoot.landmarkType, "tooth");
			assert.equal(safeRoot.status, "safe");
			assert.equal(safeRoot.surfaceClearanceMm, 2.0);

			// Warning: clearance = 1.0 mm < 1.5 mm
			const warnRoot = evaluateToothRootClearance(entry, apex, 4.0, [19.5, 0, 0], [19.5, 10, 0], 1.5);
			assert.equal(warnRoot.status, "warning");

			// Collision: clearance <= 0 mm
			const collRoot = evaluateToothRootClearance(entry, apex, 4.0, [17.5, 0, 0], [17.5, 10, 0], 1.5);
			assert.equal(collRoot.status, "collision");
		});

		it("aggregates multiple landmarks into unified assessment", () => {
			const safeNerve = evaluateNerveClearance(entry, apex, diameterMm, [[15, 16, 0]], 1.5);
			const warnTooth = evaluateToothRootClearance(entry, apex, 4.0, [19.5, 0, 0], [19.5, 10, 0], 1.5);

			const combined = aggregateImplantSafetyAssessment([safeNerve, warnTooth]);
			assert.equal(combined.status, "warning");
			assert.equal(combined.isWarning, true);
			assert.equal(combined.isCollision, false);
			assert.equal(combined.minClearanceMm, warnTooth.surfaceClearanceMm);
		});
	});

	describe("3. Carl Misch D1–D5 Bone Classification", () => {
		it("correctly classifies all 5 Carl Misch bone classes with clinical protocols", () => {
			// D1: > 1250 GV
			const d1 = classifyMischBoneDensity(1350);
			assert.equal(d1.mischClass, "D1");
			assert.equal(d1.densityRangeRu, "> 1250 GV (HU)");
			assert.ok(d1.surgicalPreparationProtocolRu.includes("метчиком"));
			assert.equal(d1.recommendedTorqueNcm.target, 40);

			// D2: 850–1250 GV
			const d2 = classifyMischBoneDensity(1000);
			assert.equal(d2.mischClass, "D2");
			assert.equal(d2.densityRangeRu, "850–1250 GV (HU)");
			assert.equal(d2.recommendedTorqueNcm.target, 35);

			// D3: 350–850 GV
			const d3 = classifyMischBoneDensity(550);
			assert.equal(d3.mischClass, "D3");
			assert.equal(d3.densityRangeRu, "350–850 GV (HU)");
			assert.ok(d3.surgicalPreparationProtocolRu.includes("under-drilling"));
			assert.equal(d3.recommendedTorqueNcm.target, 30);

			// D4: 150–350 GV
			const d4 = classifyMischBoneDensity(220);
			assert.equal(d4.mischClass, "D4");
			assert.equal(d4.densityRangeRu, "150–350 GV (HU)");
			assert.ok(d4.surgicalPreparationProtocolRu.includes("остеоконденсация"));
			assert.equal(d4.recommendedTorqueNcm.target, 25);

			// D5: < 150 GV
			const d5 = classifyMischBoneDensity(80);
			assert.equal(d5.mischClass, "D5");
			assert.equal(d5.densityRangeRu, "< 150 GV (HU)");
			assert.ok(d5.surgicalPreparationProtocolRu.includes("противопоказана"));
			assert.equal(d5.recommendedTorqueNcm.target, 10);
		});

		it("tests exact boundary thresholds of Carl Misch classification", () => {
			assert.equal(classifyMischBoneDensity(1251).mischClass, "D1");
			assert.equal(classifyMischBoneDensity(1250).mischClass, "D2");
			assert.equal(classifyMischBoneDensity(850).mischClass, "D2");
			assert.equal(classifyMischBoneDensity(849.9).mischClass, "D3");
			assert.equal(classifyMischBoneDensity(350).mischClass, "D3");
			assert.equal(classifyMischBoneDensity(349.9).mischClass, "D4");
			assert.equal(classifyMischBoneDensity(150).mischClass, "D4");
			assert.equal(classifyMischBoneDensity(149.9).mischClass, "D5");
			assert.equal(classifyMischBoneDensity(-500).mischClass, "D5");
		});

		it("returns valid static configuration via getMischClassConfig", () => {
			const classes: MischBoneClass[] = ["D1", "D2", "D3", "D4", "D5"];
			for (const c of classes) {
				const cfg = getMischClassConfig(c);
				assert.equal(cfg.mischClass, c);
				assert.ok(cfg.colorHex.startsWith("#"));
				assert.ok(cfg.bgBadgeHex.startsWith("#"));
				assert.ok(cfg.borderBadgeHex.startsWith("#"));
				assert.ok(cfg.recommendedTorqueNcm.target > 0);
				assert.ok(cfg.healingMonths.mandible > 0);
				assert.ok(cfg.healingMonths.maxilla > 0);
			}
		});
	});
});
