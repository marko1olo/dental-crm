/**
 * DENTE CRM — Unit & Integration Tests for CBCT / 3D MPR Caliper & Nerve Tracer
 *
 * Test Suite Coverage:
 * 1. Electronic Caliper (Штангенциркуль альвеолярного гребня):
 *    - Scale calibration & physical distance conversion (pixel spacing mm/px)
 *    - Alveolar ridge dimensions: height, crest width, mid-body width, basal width
 *    - Implant feasibility grading & clinical bone augmentation recommendations
 * 2. Mandibular Canal Spline Tracer (Nervus alveolaris inferior):
 *    - Catmull-Rom 2D & 3D spline curve interpolation
 *    - Safety Margin corridor generation (2.0 mm clinical safety buffer)
 *    - Point-to-nerve 2D and 3D shortest distance calculation
 *    - Proximity clearance evaluation: Safe (>=2.0mm), Warning (1.5-2.0mm), Danger (<1.5mm)
 *    - Anatomical length calculation of nerve trajectory in millimeters
 */

import assert from "node:assert/strict";
import { describe, it, test } from "node:test";
import {
	buildMandibularNerveSpline,
	calculateCaliperRidgeDimensions,
	calculatePhysicalDistanceMm,
	calculatePointToNerveDistance2D,
	calculatePointToNerveDistance3D,
	calculateSplineLengthMm,
	distancePointToSegment2DMm,
	evaluateAlveolarRidgeFeasibility,
	evaluateNerveClearance,
	generateNerveSafetyCorridor2D,
	interpolateNerveSpline2D,
	MANDIBULAR_NERVE_CRITICAL_THRESHOLD_MM,
	MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
	MIN_IMPLANT_BONE_HEIGHT_MM,
	MIN_IMPLANT_BONE_WIDTH_MM,
	type Point2D,
	type Point3D,
} from "../components/radiology/cbctCaliperNerveMath";

describe("CBCT / 3D MPR Caliper Measurements & Mandibular Nerve Tracer Engine", () => {
	// =========================================================================
	// 1. ELECTRONIC CALIPER & SCALE CALIBRATION
	// =========================================================================
	describe("1. Electronic Caliper & Alveolar Ridge Dimensions", () => {
		test("calculatePhysicalDistanceMm converts percentage delta to true millimeters based on sensor calibration", () => {
			const p1: Point2D = { x: 10, y: 20 };
			const p2: Point2D = { x: 10, y: 30 }; // dy = 10%

			// In a 1000x1000 image with 0.1 mm/pixel:
			// dyPx = (10/100) * 1000 = 100 px -> distance = 100 * 0.1 = 10.0 mm
			const distMm = calculatePhysicalDistanceMm(p1, p2, 1000, 1000, 0.1);
			assert.strictEqual(distMm, 10.0);

			// Diagonal distance (dx = 30px, dy = 40px -> hypot = 50px -> 5.0 mm)
			const pDiag1: Point2D = { x: 0, y: 0 };
			const pDiag2: Point2D = { x: 3, y: 4 }; // 3% of 1000 = 30px, 4% of 1000 = 40px
			const diagMm = calculatePhysicalDistanceMm(pDiag1, pDiag2, 1000, 1000, 0.1);
			assert.strictEqual(diagMm, 5.0);
		});

		test("evaluateAlveolarRidgeFeasibility correctly classifies adequate bone volume for standard implants", () => {
			// Height = 13.0 mm, Width = 8.5 mm -> Optimal bone volume
			const result = evaluateAlveolarRidgeFeasibility(13.0, 8.5);

			assert.strictEqual(result.isAdequate, true);
			assert.strictEqual(result.requiresBoneGrafting, false);
			assert.strictEqual(result.recommendedDiameterMm, 4.5);
			assert.strictEqual(result.recommendedLengthMm, 11.5);
			assert.strictEqual(result.graftingType, "none");
			assert.ok(result.clinicalAdviceRu.includes("Объем кости достаточен"));
		});

		test("evaluateAlveolarRidgeFeasibility flags narrow ridge requiring GBR / splitting", () => {
			// Height = 12.0 mm, Width = 4.5 mm -> Severe horizontal deficiency
			const result = evaluateAlveolarRidgeFeasibility(12.0, 4.5);

			assert.strictEqual(result.isAdequate, false);
			assert.strictEqual(result.requiresBoneGrafting, true);
			assert.strictEqual(result.graftingType, "ridge_split");
			assert.ok(result.clinicalAdviceRu.includes("расщепление альвеолярного гребня"));
		});

		test("evaluateAlveolarRidgeFeasibility flags low vertical height requiring sinus lift", () => {
			// Height = 6.0 mm, Width = 8.0 mm -> Vertical deficiency in posterior maxilla
			const result = evaluateAlveolarRidgeFeasibility(6.0, 8.0);

			assert.strictEqual(result.isAdequate, false);
			assert.strictEqual(result.requiresBoneGrafting, true);
			assert.strictEqual(result.graftingType, "sinus_lift");
			assert.ok(result.clinicalAdviceRu.includes("синус-лифтинг"));
		});

		test("calculateCaliperRidgeDimensions computes height, crest width, mid width, and basal width", () => {
			const caliper = calculateCaliperRidgeDimensions({
				crestPoint: { x: 50, y: 30 },
				basePoint: { x: 50, y: 42 }, // dy = 12% -> 12.0 mm
				crestWidthLeft: { x: 46.5, y: 30 },
				crestWidthRight: { x: 53.5, y: 30 }, // dx = 7.0% -> 7.0 mm
				imageWidthPx: 1000,
				imageHeightPx: 1000,
				pixelSpacingMm: 0.1,
				fdiTooth: "36",
			});

			assert.strictEqual(caliper.fdiTooth, "36");
			assert.strictEqual(caliper.heightMm, 12.0);
			assert.strictEqual(caliper.crestWidthMm, 7.0);
			assert.ok(caliper.midWidthMm > caliper.crestWidthMm); // anatomical expansion
			assert.ok(caliper.baseWidthMm > caliper.midWidthMm);
			assert.strictEqual(caliper.implantFeasibility.isAdequate, true);
			assert.strictEqual(caliper.implantFeasibility.recommendedDiameterMm, 4.0);
		});
	});

	// =========================================================================
	// 2. MANDIBULAR CANAL NERVE TRACER & SAFETY CORRIDOR (2.0 MM)
	// =========================================================================
	describe("2. Mandibular Canal Spline & 2.0 mm Safety Corridor", () => {
		test("interpolateNerveSpline2D produces smooth Catmull-Rom spline points", () => {
			const controlPoints: Point2D[] = [
				{ x: 10, y: 20 },
				{ x: 30, y: 25 },
				{ x: 50, y: 40 },
				{ x: 70, y: 60 },
			];

			const spline = interpolateNerveSpline2D(controlPoints, 10);
			assert.ok(spline.length > controlPoints.length);
			// Start and end points must match
			assert.strictEqual(spline[0]!.x, 10);
			assert.strictEqual(spline[0]!.y, 20);
			assert.strictEqual(spline[spline.length - 1]!.x, 70);
			assert.strictEqual(spline[spline.length - 1]!.y, 60);
		});

		test("generateNerveSafetyCorridor2D creates a 2.0 mm buffer envelope polygon", () => {
			const spline: Point2D[] = [
				{ x: 20, y: 50 },
				{ x: 40, y: 50 },
				{ x: 60, y: 50 },
			];

			// With 0.1 mm/px spacing, 2.0 mm = 20 pixels = 2.0% on 1000px width
			const corridor = generateNerveSafetyCorridor2D(spline, 2.0, 1000, 1000, 0.1);

			// Must have twice the number of vertices (left + right offset)
			assert.strictEqual(corridor.length, spline.length * 2);

			// Check first offset point (orthogonal to horizontal segment is vertical)
			const pLeft0 = corridor[0]!;
			const pRight0 = corridor[corridor.length - 1]!;

			assert.strictEqual(pLeft0.x, 20);
			assert.strictEqual(Math.round(pLeft0.y), 52); // 50 + 2.0 = 52
			assert.strictEqual(pRight0.x, 20);
			assert.strictEqual(Math.round(pRight0.y), 48); // 50 - 2.0 = 48
		});

		test("calculateSplineLengthMm computes total anatomical length of nerve canal", () => {
			const spline: Point2D[] = [
				{ x: 10, y: 20 },
				{ x: 20, y: 20 }, // 10% = 10 mm
				{ x: 20, y: 35 }, // 15% = 15 mm
			];

			const lenMm = calculateSplineLengthMm(spline, 1000, 1000, 0.1);
			assert.strictEqual(lenMm, 25.0);
		});

		test("distancePointToSegment2DMm calculates orthogonal distance to segment", () => {
			const segStart: Point2D = { x: 10, y: 50 };
			const segEnd: Point2D = { x: 50, y: 50 };
			const testPoint: Point2D = { x: 30, y: 45 }; // 5% above the middle -> 5.0 mm

			const dist = distancePointToSegment2DMm(testPoint, segStart, segEnd, 1000, 1000, 0.1);
			assert.strictEqual(dist, 5.0);
		});

		test("calculatePointToNerveDistance2D finds shortest distance to multi-segment nerve spline", () => {
			const nerveSpline: Point2D[] = [
				{ x: 10, y: 60 },
				{ x: 30, y: 60 },
				{ x: 50, y: 60 },
			];

			// Test point at (30, 58) -> 2.0% = 2.0 mm from middle point
			const clearance = calculatePointToNerveDistance2D({ x: 30, y: 58 }, nerveSpline, 1000, 1000, 0.1);
			assert.strictEqual(clearance.distanceMm, 2.0);
		});

		test("calculatePointToNerveDistance3D finds shortest 3D distance between implant apex and 3D nerve canal", () => {
			const nerve3D: Point3D[] = [
				{ x: 10, y: 20, z: -50 },
				{ x: 20, y: 20, z: -50 },
				{ x: 30, y: 20, z: -50 },
			];

			// Implant apex at (20, 20, -47) -> dz = 3.0 mm
			const implantApex: Point3D = { x: 20, y: 20, z: -47 };
			const res = calculatePointToNerveDistance3D(implantApex, nerve3D);
			assert.strictEqual(res.distanceMm, 3.0);
		});

		test("evaluateNerveClearance returns Safe status when distance >= 2.0 mm", () => {
			const outcome = evaluateNerveClearance(3.2);

			assert.strictEqual(outcome.safetyStatus, "safe");
			assert.strictEqual(outcome.isDanger, false);
			assert.strictEqual(outcome.isWarning, false);
			assert.ok(outcome.messageRu.includes("Безопасный коридор соблюден"));
		});

		test("evaluateNerveClearance returns Warning status when distance is between 1.5 mm and 1.99 mm", () => {
			const outcome = evaluateNerveClearance(1.8);

			assert.strictEqual(outcome.safetyStatus, "warning");
			assert.strictEqual(outcome.isDanger, false);
			assert.strictEqual(outcome.isWarning, true);
			assert.ok(outcome.messageRu.includes("ПРЕДУПРЕЖДЕНИЕ"));
		});

		test("evaluateNerveClearance returns Critical Danger status when distance < 1.5 mm", () => {
			const outcome = evaluateNerveClearance(1.1);

			assert.strictEqual(outcome.safetyStatus, "danger");
			assert.strictEqual(outcome.isDanger, true);
			assert.strictEqual(outcome.isWarning, false);
			assert.ok(outcome.messageRu.includes("КРИТИЧЕСКАЯ ОПАСНОСТЬ"));
			assert.ok(outcome.messageRu.includes("парестезии"));
		});

		test("buildMandibularNerveSpline constructs a fully populated nerve model with 2.0 mm safety corridor", () => {
			const nerve = buildMandibularNerveSpline({
				side: "right",
				controlPoints: [
					{ x: 20, y: 70 },
					{ x: 40, y: 65 },
					{ x: 60, y: 60 },
				],
				imageWidthPx: 1000,
				imageHeightPx: 1000,
				pixelSpacingMm: 0.1,
			});

			assert.strictEqual(nerve.side, "right");
			assert.ok(nerve.lengthMm > 0);
			assert.strictEqual(nerve.safetyMarginMm, MANDIBULAR_NERVE_SAFETY_MARGIN_MM);
			assert.ok(nerve.interpolatedCurve.length > nerve.controlPoints.length);
			assert.ok(nerve.safetyCorridorPolygon.length > 0);
		});
	});
});
