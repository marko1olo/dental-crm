/**
 * DENTE CRM — Unit & Integration Tests for CBCT Panoramic Arch Curve & Cross-Section Reslicer Engine
 *
 * Test Suite Coverage:
 * 1. Dental Arch Presets & Control Points Geometry (Mandible, Maxilla, V-Shape, U-Shape, Asymmetric)
 * 2. Catmull-Rom Spline Curve Interpolation & Analytical Derivatives
 * 3. Arc-Length Parameterization with 1.0–2.0 mm Uniform Physical Step
 * 4. Tangent & Normal Orthogonal Vectors (Frenet-Serret N · T = 0, |N| = 1, Buccal Orientation)
 * 5. Cross-Sectional Plane Slicing (32–40 Pararadicular Slices) & Focal Trough Corridors (5mm, 10mm, 20mm)
 * 6. FDI Tooth Number Annotation & Region Classification (18..28 for Maxilla, 48..38 for Mandible)
 * 7. Subantral Sinus Floor Clearance & Sinus Lifting Protocols (Summers vs. Lateral Window)
 * 8. Mandibular Canal Nerve Safety Corridors (2.0mm Safety Buffer & 1.5mm Critical Threshold)
 * 9. Misch Bone Density HU Classification (D1-D4)
 * 10. Alveolar Ridge Bone Profile Generation & Custom Slicing Calibration Overrides
 * 11. 1-Click Structured Data Export to Dental Implant Planning Card & Form 043/u Diary Formatter
 * 12. Robust Error Handling for Degenerate Inputs & Boundary Conditions
 */

import assert from "node:assert/strict";
import { describe, it, test } from "node:test";
import {
	calculateMandibularCanalClearance,
	calculateSinusFloorClearance,
	classifyBoneDensityMisch,
	exportCrossSectionsToImplantPlan,
	FOCAL_TROUGH_PRESETS,
	formatCrossSectionSummaryDiary043,
	generateCrossSectionBoneProfiles,
	getFdiToothShortLabel,
} from "../components/radiology/cbctCrossSectionEngine";
import {
	buildArcLengthParameterizedCurve,
	catmullRom2D,
	catmullRomDerivative2D,
	classifyArchRegion,
	estimateFdiToothAtParam,
	generateCrossSectionPlanes,
	getStandardDentalArchControlPoints,
	interpolateArchSpline,
	pointDistanceMm,
	projectPointToArchCurve,
	verifyNormalTangentOrthogonality,
	type Point2D,
} from "../components/radiology/cbctPanoramicCurveMath";

describe("CBCT Panoramic Arch Curve & Cross-Section Reslicer Engine (WAVE 9)", () => {
	// =========================================================================
	// 1. DENTAL ARCH PRESETS & CONTROL POINTS GEOMETRY
	// =========================================================================
	describe("1. Dental Arch Presets & Control Points Geometry", () => {
		test("getStandardDentalArchControlPoints returns valid anatomical points for standard mandible", () => {
			const pts = getStandardDentalArchControlPoints("standard_mandible", "mandible");
			assert.ok(pts.length >= 7, "Mandible arch should have at least 7 control points");

			// Incisors must be centered around x = 50%
			const incisor = pts.find((p) => p.region === "incisor");
			assert.ok(incisor, "Must have incisor point");
			assert.strictEqual(incisor.x, 50.0);
			assert.ok(incisor.y < 30.0, "Incisors must be in anterior region (low y)");

			// Molar endpoints must be bilateral (right side low x, left side high x)
			const rightMolar = pts.find((p) => p.region === "molar_right");
			const leftMolar = pts.find((p) => p.region === "molar_left");
			assert.ok(rightMolar && leftMolar);
			assert.ok(rightMolar.x < 30.0);
			assert.ok(leftMolar.x > 70.0);
		});

		test("getStandardDentalArchControlPoints returns distinct geometry for maxilla vs narrow V-shape vs wide U-shape", () => {
			const maxilla = getStandardDentalArchControlPoints("standard_maxilla", "maxilla");
			const vShape = getStandardDentalArchControlPoints("narrow_v_shape", "mandible");
			const uShape = getStandardDentalArchControlPoints("wide_u_shape", "mandible");

			assert.ok(maxilla.length >= 7);
			assert.ok(vShape.length >= 7);
			assert.ok(uShape.length >= 8, "U-shape arch has flat front with 8 points");

			// V-shape has narrow premolars compared to wide U-shape
			const vRightPm = vShape.find((p) => p.region === "premolar_right");
			const uRightPm = uShape.find((p) => p.region === "premolar_right");
			assert.ok(vRightPm && uRightPm);
			assert.ok(vRightPm.x > uRightPm.x, "V-shape premolar is more medial (higher x)");
		});

		test("getStandardDentalArchControlPoints supports asymmetric arch configurations", () => {
			const leftAsym = getStandardDentalArchControlPoints("asymmetric_left", "mandible");
			const rightAsym = getStandardDentalArchControlPoints("asymmetric_right", "mandible");

			const leftInc = leftAsym.find((p) => p.region === "incisor");
			const rightInc = rightAsym.find((p) => p.region === "incisor");

			assert.ok(leftInc && rightInc);
			assert.ok(leftInc.x < 50.0, "Left asymmetric shifts center to the right (< 50)");
			assert.ok(rightInc.x > 50.0, "Right asymmetric shifts center to the left (> 50)");
		});
	});

	// =========================================================================
	// 2. CATMULL-ROM SPLINE CURVE & DERIVATIVES
	// =========================================================================
	describe("2. Catmull-Rom Spline Curve & Analytical Derivatives", () => {
		test("catmullRom2D passes exactly through intermediate control points at t=0 and t=1", () => {
			const p0: Point2D = { x: 10, y: 10 };
			const p1: Point2D = { x: 20, y: 30 };
			const p2: Point2D = { x: 50, y: 40 };
			const p3: Point2D = { x: 80, y: 10 };

			const atZero = catmullRom2D(p0, p1, p2, p3, 0.0);
			const atOne = catmullRom2D(p0, p1, p2, p3, 1.0);

			assert.strictEqual(Number(atZero.x.toFixed(3)), 20.0);
			assert.strictEqual(Number(atZero.y.toFixed(3)), 30.0);
			assert.strictEqual(Number(atOne.x.toFixed(3)), 50.0);
			assert.strictEqual(Number(atOne.y.toFixed(3)), 40.0);
		});

		test("catmullRomDerivative2D matches finite difference approximation", () => {
			const p0: Point2D = { x: 0, y: 0 };
			const p1: Point2D = { x: 20, y: 40 };
			const p2: Point2D = { x: 60, y: 50 };
			const p3: Point2D = { x: 100, y: 20 };

			const t = 0.5;
			const dt = 0.0001;

			const posPrev = catmullRom2D(p0, p1, p2, p3, t - dt);
			const posNext = catmullRom2D(p0, p1, p2, p3, t + dt);
			const numDx = (posNext.x - posPrev.x) / (2 * dt);
			const numDy = (posNext.y - posPrev.y) / (2 * dt);

			const analytical = catmullRomDerivative2D(p0, p1, p2, p3, t);

			assert.ok(Math.abs(analytical.x - numDx) < 0.01);
			assert.ok(Math.abs(analytical.y - numDy) < 0.01);
		});

		test("interpolateArchSpline produces continuous point array without NaN or discontinuities", () => {
			const controlPoints: Point2D[] = [
				{ x: 20, y: 80 },
				{ x: 30, y: 50 },
				{ x: 50, y: 20 },
				{ x: 70, y: 50 },
				{ x: 80, y: 80 },
			];

			const dense = interpolateArchSpline(controlPoints, 20);
			assert.ok(dense.length > 60);

			for (const pt of dense) {
				assert.ok(!Number.isNaN(pt.x) && Number.isFinite(pt.x));
				assert.ok(!Number.isNaN(pt.y) && Number.isFinite(pt.y));
			}

			// First point matches first control point
			assert.strictEqual(Number(dense[0]!.x.toFixed(1)), 20.0);
			assert.strictEqual(Number(dense[0]!.y.toFixed(1)), 80.0);

			// Last point matches last control point
			const last = dense[dense.length - 1]!;
			assert.strictEqual(Number(last.x.toFixed(1)), 80.0);
			assert.strictEqual(Number(last.y.toFixed(1)), 80.0);
		});
	});

	// =========================================================================
	// 3. ARC-LENGTH PARAMETERIZATION & NORMAL VECTORS
	// =========================================================================
	describe("3. Arc-Length Parameterization & Normal Vectors", () => {
		test("buildArcLengthParameterizedCurve creates monotonically increasing arc distances in millimeters", () => {
			const pts = getStandardDentalArchControlPoints("standard_mandible");
			const samples = buildArcLengthParameterizedCurve(pts, 1.5, 120.0, 120.0);

			assert.ok(samples.length > 50, "Should generate 50+ samples at 1.5mm step");
			assert.strictEqual(samples[0]!.arcDistanceMm, 0.0);

			for (let i = 1; i < samples.length; i++) {
				assert.ok(
					samples[i]!.arcDistanceMm >= samples[i - 1]!.arcDistanceMm,
					`Sample ${i} arc distance must be >= previous`,
				);
			}

			const totalLength = samples[samples.length - 1]!.arcDistanceMm;
			assert.ok(
				totalLength >= 80.0 && totalLength <= 160.0,
				`Adult jaw arch length should be between 80mm and 160mm, got ${totalLength}`,
			);
		});

		test("Tangent and Normal vectors are unit vectors and strictly orthogonal (N · T = 0)", () => {
			const pts = getStandardDentalArchControlPoints("standard_mandible");
			const samples = buildArcLengthParameterizedCurve(pts, 2.0, 120.0, 120.0);

			for (const s of samples) {
				const tangentLen = Math.hypot(s.tangent.x, s.tangent.y);
				const normalLen = Math.hypot(s.normal.x, s.normal.y);

				assert.ok(
					Math.abs(tangentLen - 1.0) < 0.01,
					`Tangent must have unit length, got ${tangentLen}`,
				);
				assert.ok(
					Math.abs(normalLen - 1.0) < 0.01,
					`Normal must have unit length, got ${normalLen}`,
				);

				const dotProduct = verifyNormalTangentOrthogonality(s.normal, s.tangent);
				assert.ok(
					Math.abs(dotProduct) < 0.01,
					`Normal and tangent must be orthogonal, got dot product ${dotProduct}`,
				);
			}
		});

		test("Normals consistently point outward toward buccal side", () => {
			const pts = getStandardDentalArchControlPoints("standard_mandible");
			const samples = buildArcLengthParameterizedCurve(pts, 2.0, 120.0, 120.0);

			// Center of anterior arch is at index near middle (incisor region)
			const midSample = samples[Math.floor(samples.length / 2)]!;
			assert.ok(midSample.point.y < 30.0, "Apex is near top of axial slice");

			// At apex of arch (anterior), buccal normal must point anteriorly (negative Y in screen coords)
			assert.ok(
				midSample.normal.y < 0,
				`Anterior normal should point upwards (anteriorly), got y = ${midSample.normal.y}`,
			);
		});
	});

	// =========================================================================
	// 4. CROSS-SECTIONAL SLICE PLANES GENERATION (32–40 SLICES)
	// =========================================================================
	describe("4. Cross-Sectional Slice Planes Generation (32–40 Slices)", () => {
		test("generateCrossSectionPlanes generates exact requested count of pararadicular slices", () => {
			const pts = getStandardDentalArchControlPoints("standard_mandible");

			const planes32 = generateCrossSectionPlanes({ controlPoints: pts, planeCount: 32 });
			const planes36 = generateCrossSectionPlanes({ controlPoints: pts, planeCount: 36 });
			const planes40 = generateCrossSectionPlanes({ controlPoints: pts, planeCount: 40 });

			assert.strictEqual(planes32.length, 32);
			assert.strictEqual(planes36.length, 36);
			assert.strictEqual(planes40.length, 40);

			// Check first and last plane indices
			assert.strictEqual(planes36[0]!.sliceIndex, 0);
			assert.strictEqual(planes36[35]!.sliceIndex, 35);
		});

		test("generateCrossSectionPlanes calculates startPoint, endPoint and focal trough bounds", () => {
			const pts = getStandardDentalArchControlPoints("standard_mandible");
			const planes = generateCrossSectionPlanes({
				controlPoints: pts,
				planeCount: 36,
				focalTroughThicknessMm: 10,
				crossSectionWidthMm: 30,
			});

			const p0 = planes[0]!;
			assert.ok(p0.startPoint.x !== p0.endPoint.x || p0.startPoint.y !== p0.endPoint.y);
			assert.strictEqual(p0.sliceThicknessMm, 10);
			assert.strictEqual(p0.crossSectionWidthMm, 30);
			assert.strictEqual(p0.crossSectionHeightMm, 35);

			// Focal trough boundaries must be narrower than total slice width
			const totalWidthDist = Math.hypot(
				p0.startPoint.x - p0.endPoint.x,
				p0.startPoint.y - p0.endPoint.y,
			);
			const troughWidthDist = Math.hypot(
				p0.focalTroughBuccalPoint.x - p0.focalTroughLingualPoint.x,
				p0.focalTroughBuccalPoint.y - p0.focalTroughLingualPoint.y,
			);

			assert.ok(troughWidthDist < totalWidthDist, "Focal trough is a subset of slice width");
		});

		test("Focal trough thickness presets 5mm, 10mm, 20mm correctly scale trough bounds", () => {
			const pts = getStandardDentalArchControlPoints("standard_mandible");

			const planes5 = generateCrossSectionPlanes({ controlPoints: pts, focalTroughThicknessMm: 5 });
			const planes10 = generateCrossSectionPlanes({ controlPoints: pts, focalTroughThicknessMm: 10 });
			const planes20 = generateCrossSectionPlanes({ controlPoints: pts, focalTroughThicknessMm: 20 });

			const dist5 = Math.hypot(
				planes5[18]!.focalTroughBuccalPoint.x - planes5[18]!.focalTroughLingualPoint.x,
				planes5[18]!.focalTroughBuccalPoint.y - planes5[18]!.focalTroughLingualPoint.y,
			);
			const dist10 = Math.hypot(
				planes10[18]!.focalTroughBuccalPoint.x - planes10[18]!.focalTroughLingualPoint.x,
				planes10[18]!.focalTroughBuccalPoint.y - planes10[18]!.focalTroughLingualPoint.y,
			);
			const dist20 = Math.hypot(
				planes20[18]!.focalTroughBuccalPoint.x - planes20[18]!.focalTroughLingualPoint.x,
				planes20[18]!.focalTroughBuccalPoint.y - planes20[18]!.focalTroughLingualPoint.y,
			);

			assert.ok(dist5 < dist10, "5mm trough must be narrower than 10mm");
			assert.ok(dist10 < dist20, "10mm trough must be narrower than 20mm");
		});
	});

	// =========================================================================
	// 5. FDI TOOTH NUMBER ANNOTATION ALONG THE ARCH
	// =========================================================================
	describe("5. FDI Tooth Number Annotation along the Arch", () => {
		test("estimateFdiToothAtParam correctly maps maxilla teeth (18..28) with 11/21 in center", () => {
			// t=0 (Right molar) -> 18
			assert.strictEqual(estimateFdiToothAtParam(0.0, "maxilla"), "18");
			// t=0.25 (Right premolar/canine) -> 14 or 15
			const t25 = estimateFdiToothAtParam(0.25, "maxilla");
			assert.ok(t25 === "14" || t25 === "15");
			// t=0.48 (Right central incisor) -> 11
			assert.strictEqual(estimateFdiToothAtParam(0.48, "maxilla"), "11");
			// t=0.52 (Left central incisor) -> 21
			assert.strictEqual(estimateFdiToothAtParam(0.52, "maxilla"), "21");
			// t=0.99 (Left molar) -> 28
			assert.strictEqual(estimateFdiToothAtParam(0.99, "maxilla"), "28");
		});

		test("estimateFdiToothAtParam correctly maps mandible teeth (48..38) with 41/31 in center", () => {
			assert.strictEqual(estimateFdiToothAtParam(0.0, "mandible"), "48");
			assert.strictEqual(estimateFdiToothAtParam(0.48, "mandible"), "41");
			assert.strictEqual(estimateFdiToothAtParam(0.52, "mandible"), "31");
			assert.strictEqual(estimateFdiToothAtParam(0.99, "mandible"), "38");
		});

		test("classifyArchRegion correctly segments arch into molar, premolar, canine, incisor", () => {
			assert.strictEqual(classifyArchRegion(0.05), "molar");
			assert.strictEqual(classifyArchRegion(0.25), "premolar");
			assert.strictEqual(classifyArchRegion(0.40), "canine");
			assert.strictEqual(classifyArchRegion(0.50), "incisor");
			assert.strictEqual(classifyArchRegion(0.60), "canine");
			assert.strictEqual(classifyArchRegion(0.75), "premolar");
			assert.strictEqual(classifyArchRegion(0.95), "molar");
		});

		test("getFdiToothShortLabel formats clear Russian clinical descriptions", () => {
			const label46 = getFdiToothShortLabel("46");
			const label11 = getFdiToothShortLabel("11");
			const label28 = getFdiToothShortLabel("28");

			assert.ok(label46.includes("Н/ч право") && label46.includes("1-й моляр"));
			assert.ok(label11.includes("В/ч право") && label11.includes("центр. резец"));
			assert.ok(label28.includes("В/ч лево") && label28.includes("3-й моляр"));
		});
	});

	// =========================================================================
	// 6. SUBANTRAL SINUS FLOOR & MANDIBULAR CANAL SAFETY
	// =========================================================================
	describe("6. Subantral Sinus Floor & Mandibular Canal Safety", () => {
		test("calculateSinusFloorClearance diagnoses adequate bone >= 10 mm", () => {
			const res = calculateSinusFloorClearance(12.5);
			assert.strictEqual(res.status, "adequate");
			assert.strictEqual(res.isGraftingRequired, false);
			assert.strictEqual(res.sinusLiftingTechnique, "none");
			assert.ok(res.recommendedProtocol.includes("Классическая имплантация"));
		});

		test("calculateSinusFloorClearance diagnoses closed sinus lift for 6.0–9.9 mm", () => {
			const res = calculateSinusFloorClearance(7.8);
			assert.strictEqual(res.status, "crestal_lift_indicated");
			assert.strictEqual(res.isGraftingRequired, true);
			assert.strictEqual(res.sinusLiftingTechnique, "crestal_summers");
			assert.ok(res.recommendedProtocol.includes("Саммерсу"));
		});

		test("calculateSinusFloorClearance diagnoses open lateral window for 3.0–5.9 mm", () => {
			const res = calculateSinusFloorClearance(4.2);
			assert.strictEqual(res.status, "lateral_window_indicated");
			assert.strictEqual(res.isGraftingRequired, true);
			assert.strictEqual(res.sinusLiftingTechnique, "lateral_window");
			assert.ok(res.recommendedProtocol.includes("латеральное окно"));
		});

		test("calculateSinusFloorClearance diagnoses 2-stage grafting for severe atrophy < 3.0 mm", () => {
			const res = calculateSinusFloorClearance(2.1);
			assert.strictEqual(res.status, "severe_atrophy_two_stage");
			assert.strictEqual(res.isGraftingRequired, true);
			assert.strictEqual(res.sinusLiftingTechnique, "two_stage_block");
			assert.ok(res.recommendedProtocol.includes("2-этапный"));
		});

		test("calculateMandibularCanalClearance evaluates safe, warning, and danger corridors", () => {
			// Distance 14.0 mm with 10.0 mm implant -> 4.0 mm buffer >= 2.0 mm (SAFE)
			const safe = calculateMandibularCanalClearance(14.0, 10.0);
			assert.strictEqual(safe.safetyStatus, "safe");
			assert.strictEqual(safe.isSafe, true);
			assert.strictEqual(safe.isDanger, false);
			assert.strictEqual(safe.safetyBufferMm, 4.0);

			// Distance 11.7 mm with 10.0 mm implant -> 1.7 mm buffer (WARNING: 1.5 - 2.0 mm)
			const warning = calculateMandibularCanalClearance(11.7, 10.0);
			assert.strictEqual(warning.safetyStatus, "warning");
			assert.strictEqual(warning.isWarning, true);
			assert.strictEqual(warning.isDanger, false);

			// Distance 10.8 mm with 10.0 mm implant -> 0.8 mm buffer (DANGER: < 1.5 mm)
			const danger = calculateMandibularCanalClearance(10.8, 10.0);
			assert.strictEqual(danger.safetyStatus, "danger");
			assert.strictEqual(danger.isDanger, true);
			assert.strictEqual(danger.isSafe, false);
			assert.ok(danger.messageRu.includes("Критическая опасность"));
		});
	});

	// =========================================================================
	// 7. MISCH BONE DENSITY HU CLASSIFICATION
	// =========================================================================
	describe("7. Misch Bone Density HU Classification", () => {
		test("classifyBoneDensityMisch correctly classifies D1, D2, D3, and D4", () => {
			assert.strictEqual(classifyBoneDensityMisch(1350).densityClass, "D1");
			assert.strictEqual(classifyBoneDensityMisch(950).densityClass, "D2");
			assert.strictEqual(classifyBoneDensityMisch(600).densityClass, "D3");
			assert.strictEqual(classifyBoneDensityMisch(200).densityClass, "D4");
		});
	});

	// =========================================================================
	// 8. BONE PROFILES GENERATION & CUSTOM CALIBRATION
	// =========================================================================
	describe("8. Bone Profiles Generation & Custom Calibration", () => {
		test("generateCrossSectionBoneProfiles creates complete clinical profiles for all slices", () => {
			const pts = getStandardDentalArchControlPoints("standard_mandible");
			const planes = generateCrossSectionPlanes({ controlPoints: pts, planeCount: 36 });
			const profiles = generateCrossSectionBoneProfiles({ planes, jaw: "mandible" });

			assert.strictEqual(profiles.length, 36);

			for (const p of profiles) {
				assert.ok(p.crestBoneHeightMm > 0);
				assert.ok(p.crestalWidthMm > 0);
				assert.ok(p.midBodyWidthMm > p.crestalWidthMm);
				assert.ok(p.baseWidthMm > p.midBodyWidthMm);
				assert.ok(p.implantFeasibility !== undefined);
				assert.ok(p.recommendedImplant.diameterMm > 0);
				assert.ok(p.recommendedImplant.lengthMm > 0);
			}

			// Molar slices on mandible have mandibular canal clearance
			const molarProfile = profiles[2]!; // Slice #3 (molar zone)
			assert.ok(molarProfile.mandibularCanalDistanceMm !== null);
			assert.ok(molarProfile.nerveClearance !== null);
		});

		test("generateCrossSectionBoneProfiles respects custom height and width overrides", () => {
			const pts = getStandardDentalArchControlPoints("standard_mandible");
			const planes = generateCrossSectionPlanes({ controlPoints: pts, planeCount: 36 });

			const customHeightMap: Record<number, number> = { 10: 17.5 };
			const customWidthMap: Record<number, number> = { 10: 8.8 };

			const profiles = generateCrossSectionBoneProfiles({
				planes,
				jaw: "mandible",
				customHeightMapMm: customHeightMap,
				customWidthMapMm: customWidthMap,
			});

			assert.strictEqual(profiles[10]!.crestBoneHeightMm, 17.5);
			assert.strictEqual(profiles[10]!.crestalWidthMm, 8.8);
		});
	});

	// =========================================================================
	// 9. 1-CLICK IMPLANT PLANNING EXPORT & DIARY 043/U FORMATTER
	// =========================================================================
	describe("9. 1-Click Implant Planning Export & Diary 043/u Formatter", () => {
		test("exportCrossSectionsToImplantPlan produces complete structured JSON payload", () => {
			const pts = getStandardDentalArchControlPoints("standard_mandible");
			const planes = generateCrossSectionPlanes({ controlPoints: pts, planeCount: 36 });
			const profiles = generateCrossSectionBoneProfiles({ planes, jaw: "mandible" });

			const payload = exportCrossSectionsToImplantPlan(
				"study-cbct-test-01",
				profiles,
				"mandible",
				"patient-007",
			);

			assert.strictEqual(payload.studyId, "study-cbct-test-01");
			assert.strictEqual(payload.patientId, "patient-007");
			assert.strictEqual(payload.jaw, "mandible");
			assert.strictEqual(payload.sliceCount, 36);
			assert.ok(payload.archLengthMm > 0);
			assert.ok(payload.exportedAt.length > 10);
			assert.strictEqual(payload.measurements.length, 36);

			const firstM = payload.measurements[0]!;
			assert.ok(firstM.heightMm > 0);
			assert.ok(firstM.crestWidthMm > 0);
			assert.ok(firstM.clinicalNoteRu.includes("Имплантат"));
		});

		test("formatCrossSectionSummaryDiary043 formats readable text report for outpatient card 043/u", () => {
			const pts = getStandardDentalArchControlPoints("standard_mandible");
			const planes = generateCrossSectionPlanes({ controlPoints: pts, planeCount: 16 });
			const profiles = generateCrossSectionBoneProfiles({ planes, jaw: "mandible" });

			const diaryText = formatCrossSectionSummaryDiary043(profiles);
			assert.ok(diaryText.includes("ПРОТОКОЛ КРОСС-СЕКЦИОННОГО РЕСЛАЙСИНГА"));
			assert.ok(diaryText.includes("Реком. имплантат"));
			assert.ok(diaryText.includes("Канал нерва"));
		});
	});

	// =========================================================================
	// 10. EDGE CASES & POINT PROJECTION GEOMETRY
	// =========================================================================
	describe("10. Edge Cases & Point Projection Geometry", () => {
		test("projectPointToArchCurve projects point to dental arch with arc distance and orthogonal offset", () => {
			const pts = getStandardDentalArchControlPoints("standard_mandible");
			const curveSamples = buildArcLengthParameterizedCurve(pts, 1.0, 120.0, 120.0);

			// Test point near center incisor (x: 50, y: 25)
			const testPt: Point2D = { x: 50.0, y: 20.0 };
			const projection = projectPointToArchCurve(testPt, curveSamples, 120.0, 120.0);

			assert.ok(projection !== null);
			assert.ok(projection.directDistanceMm >= 0);
			assert.ok(projection.arcDistanceMm > 0);
		});

		test("Handles 2-point minimal curve gracefully without throwing", () => {
			const minimalPts: Point2D[] = [
				{ x: 20, y: 80 },
				{ x: 80, y: 80 },
			];

			const samples = buildArcLengthParameterizedCurve(minimalPts, 2.0);
			assert.ok(samples.length >= 2);

			const planes = generateCrossSectionPlanes({
				controlPoints: minimalPts,
				planeCount: 16,
			});
			assert.strictEqual(planes.length, 16);
		});

		test("FOCAL_TROUGH_PRESETS constant includes 5mm, 10mm, and 20mm options", () => {
			assert.strictEqual(FOCAL_TROUGH_PRESETS.length, 3);
			const thicknesses = FOCAL_TROUGH_PRESETS.map((p) => p.thicknessMm);
			assert.deepStrictEqual(thicknesses, [5, 10, 20]);
		});
	});
});
