/**
 * @dental/shared/hardware/__tests__/intraoralScannerEngine.test.ts
 *
 * Universal Intraoral Scanner Engine Test Suite.
 *
 * Validates:
 * 1. Scanner vendor detection across all 10 vendor families (3Shape, Medit, iTero, Sirona, Shining3D, Panda, Runyes, Carestream, Eighteeth, Generic).
 * 2. Multilingual deterministic file classifier (Russian, English, Latin transliteration).
 * 3. Clinical FDI tooth number extraction from filename strings.
 * 4. Scan session grouping and Zod contract schema validation.
 * 5. CAD Z-Up <-> Three.js Y-Up transformation matrix precision and reversibility.
 * 6. Unit detection and scale normalization (meters, microns, millimeters).
 * 7. 4x4 matrix algebra (determinant, multiplication, Cramer inverse, singular guard).
 * 8. Occlusal clearance calculation in microns with 4 clinical contact tiers (<50, 50-150, 150-350, >350 um).
 * 9. Iterative Closest Point (ICP) buccal bite registration.
 * 10. Undercut & reverse taper analysis along path of insertion.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	classifyScanFile,
	detectScannerVendor,
	extractFdiToothFromFilename,
	groupFilesIntoScanSessions,
	isValidScanFdiToothNumber,
} from "../intraoralScannerClassifier.js";

import {
	intraoralScanSessionSchema,
	occlusionClearanceMapSchema,
	undercutAnalysisResultSchema,
	type Matrix4x4,
	type Vector3,
} from "../intraoralScannerTypes.js";

import {
	CAD_Z_UP_TO_THREE_Y_UP_MATRIX,
	THREE_Y_UP_TO_CAD_Z_UP_MATRIX,
	IDENTITY_MATRIX_4X4,
	alignJawsByBuccalBite,
	analyzeUndercuts,
	calculateOcclusionClearance,
	createScaleMatrix4x4,
	createTranslationMatrix4x4,
	determinantMatrix4x4,
	detectAndNormalizeUnits,
	detectMeshUnitScale,
	invertMatrix4x4,
	multiplyMatrix4x4,
	transformPoint4x4,
	transposeMatrix4x4,
} from "../../geometry/dentalMeshMath.js";

describe("Universal Intraoral Scanner Engine Suite", () => {
	// ========================================================================
	// 1. HARDWARE VENDOR DETECTION
	// ========================================================================
	describe("Vendor Signature Detection", () => {
		it("detects 3Shape TRIOS scan paths and files", () => {
			assert.equal(detectScannerVendor("C:\\3Shape\\Scans\\Patient_UpperJaw.stl"), "3shape");
			assert.equal(detectScannerVendor("TRIOS_Case_1001.3ox"), "3shape");
			assert.equal(detectScannerVendor("DentalDesktop_Export_01.stl"), "3shape");
		});

		it("detects Medit Link scan paths and files", () => {
			assert.equal(detectScannerVendor("C:\\Medit Link\\Data\\Case_Maxillary.ply"), "medit");
			assert.equal(detectScannerVendor("medit_case.json"), "medit");
			assert.equal(detectScannerVendor("i700_scan_mandibular.ply"), "medit");
		});

		it("detects iTero CADENT scan paths", () => {
			assert.equal(detectScannerVendor("C:\\iTero\\Export\\UpperJaw.stl"), "itero");
			assert.equal(detectScannerVendor("cadent_aligntech_bite.stl"), "itero");
		});

		it("detects Dentsply Sirona / CEREC files", () => {
			assert.equal(detectScannerVendor("C:\\Sidexis\\Upper.dxx"), "sirona");
			assert.equal(detectScannerVendor("cerec_inlab_lower.stl"), "sirona");
		});

		it("detects Shining 3D Aoralscan files", () => {
			assert.equal(detectScannerVendor("shining_order.json"), "shining3d");
			assert.equal(detectScannerVendor("Aoralscan3_UpperJaw.ply"), "shining3d");
		});

		it("detects Panda BAMBOO scanner files", () => {
			assert.equal(detectScannerVendor("panda_bamboo_upper.stl"), "panda");
			assert.equal(detectScannerVendor("PandaScanner_Lower.stl"), "panda");
		});

		it("detects Runyes 3DS scanner files", () => {
			assert.equal(detectScannerVendor("Runyes_3DS_Case01_U.stl"), "runyes");
			assert.equal(detectScannerVendor("quickscan_bite.stl"), "runyes");
		});

		it("detects Carestream CS 3600/3700/3800 files", () => {
			assert.equal(detectScannerVendor("carestream_cs3700_jaw.stl"), "carestream");
			assert.equal(detectScannerVendor("CS3800_Scans_Upper.ply"), "carestream");
		});

		it("detects Eighteeth Helios files", () => {
			assert.equal(detectScannerVendor("eighteeth_helios_scan.stl"), "eighteeth");
		});

		it("falls back to generic for unknown scanners", () => {
			assert.equal(detectScannerVendor("my_custom_mesh.stl"), "generic");
		});
	});

	// ========================================================================
	// 2. MULTILINGUAL SCAN FILE CLASSIFIER
	// ========================================================================
	describe("Scan File Role Classifier", () => {
		it("correctly identifies Upper Jaw in Russian, English, and Translit", () => {
			assert.equal(classifyScanFile("upper_jaw.stl").role, "upper_jaw");
			assert.equal(classifyScanFile("Patient_Maxillary.ply").role, "upper_jaw");
			assert.equal(classifyScanFile("вч_скан.stl").role, "upper_jaw");
			assert.equal(classifyScanFile("верхняя_челюсть.ply").role, "upper_jaw");
			assert.equal(classifyScanFile("verkh_jaw.stl").role, "upper_jaw");
			assert.equal(classifyScanFile("arcata_sup.stl").role, "upper_jaw");
		});

		it("correctly identifies Lower Jaw in Russian, English, and Translit", () => {
			assert.equal(classifyScanFile("lower_jaw.stl").role, "lower_jaw");
			assert.equal(classifyScanFile("Patient_Mandibular.ply").role, "lower_jaw");
			assert.equal(classifyScanFile("нч_скан.stl").role, "lower_jaw");
			assert.equal(classifyScanFile("нижняя_челюсть.ply").role, "lower_jaw");
			assert.equal(classifyScanFile("niz_jaw.stl").role, "lower_jaw");
			assert.equal(classifyScanFile("arcata_inf.stl").role, "lower_jaw");
		});

		it("correctly identifies Buccal Bite & Occlusal records", () => {
			assert.equal(classifyScanFile("buccal_bite_1.stl").role, "buccal_bite_1");
			assert.equal(classifyScanFile("bite2.stl").role, "buccal_bite_2");
			assert.equal(classifyScanFile("прикус_окклюзия.ply").role, "buccal_bite_1");
			assert.equal(classifyScanFile("prikus_right_2.stl").role, "buccal_bite_2");
		});

		it("correctly identifies Preparation Dies & Stumps", () => {
			assert.equal(classifyScanFile("prep_tooth_16.stl").role, "preparation_die");
			assert.equal(classifyScanFile("культя_зуб_21.stl").role, "preparation_die");
			assert.equal(classifyScanFile("die_stump_36.ply").role, "preparation_die");
			assert.equal(classifyScanFile("уступ_преп_46.stl").role, "preparation_die");
		});

		it("correctly identifies Scanbody Transfer Markers", () => {
			assert.equal(classifyScanFile("scanbody_16.stl").role, "scanbody");
			assert.equal(classifyScanFile("трансфер_маркер_46.ply").role, "scanbody");
			assert.equal(classifyScanFile("scan_post_36.stl").role, "scanbody");
		});

		it("correctly identifies Pre-Op Study Models", () => {
			assert.equal(classifyScanFile("preop_jaw.stl").role, "pre_op_jaw");
			assert.equal(classifyScanFile("до_обточки_вч.ply").role, "pre_op_jaw");
			assert.equal(classifyScanFile("исходная_ситуация.stl").role, "pre_op_jaw");
		});

		it("correctly identifies Face Scans", () => {
			assert.equal(classifyScanFile("face_scan_portrait.obj").role, "face_scan");
			assert.equal(classifyScanFile("лицо_фас_3d.ply").role, "face_scan");
		});

		it("correctly identifies Metadata and Preview files", () => {
			assert.equal(classifyScanFile("order_info.json").role, "order_metadata");
			assert.equal(classifyScanFile("case_metadata.xml").role, "order_metadata");
			assert.equal(classifyScanFile("preview_snapshot.png").role, "screenshot_preview");
		});
	});

	// ========================================================================
	// 3. FDI TOOTH NUMBER PARSING
	// ========================================================================
	describe("FDI Tooth Number Extraction", () => {
		it("validates legitimate FDI numbers", () => {
			assert.equal(isValidScanFdiToothNumber(16), true);
			assert.equal(isValidScanFdiToothNumber(21), true);
			assert.equal(isValidScanFdiToothNumber(48), true);
			assert.equal(isValidScanFdiToothNumber(75), true); // deciduous
		});

		it("rejects illegitimate tooth numbers", () => {
			assert.equal(isValidScanFdiToothNumber(19), false);
			assert.equal(isValidScanFdiToothNumber(99), false);
			assert.equal(isValidScanFdiToothNumber(0), false);
			assert.equal(isValidScanFdiToothNumber(-5), false);
		});

		it("extracts tooth FDI from diverse filenames", () => {
			assert.equal(extractFdiToothFromFilename("prep_16.stl"), 16);
			assert.equal(extractFdiToothFromFilename("stump_tooth_21.ply"), 21);
			assert.equal(extractFdiToothFromFilename("культя_зуб_36.stl"), 36);
			assert.equal(extractFdiToothFromFilename("scanbody_fdi_46.stl"), 46);
			assert.equal(extractFdiToothFromFilename("case_no_tooth.stl"), undefined);
		});
	});

	// ========================================================================
	// 4. SCAN SESSION GROUPING & ZOD SCHEMA VALIDATION
	// ========================================================================
	describe("Scan Session Grouping & Zod Contracts", () => {
		it("groups multiple files of a 3Shape session and validates Zod contract", () => {
			const files = [
				"C:\\3Shape\\DentalDesktop\\PatientIvanov_UpperJaw.stl",
				"C:\\3Shape\\DentalDesktop\\PatientIvanov_LowerJaw.stl",
				"C:\\3Shape\\DentalDesktop\\PatientIvanov_Bite1.stl",
				"C:\\3Shape\\DentalDesktop\\PatientIvanov_prep_16.stl",
				"C:\\3Shape\\DentalDesktop\\PatientIvanov_scanbody_46.stl",
				"C:\\3Shape\\DentalDesktop\\PatientIvanov_order.json",
			];

			const sessions = groupFilesIntoScanSessions(files, {
				defaultPatientId: "pat-ivanov-01",
				defaultVisitId: "vis-101",
			});

			assert.equal(sessions.length, 1);
			const session = sessions[0];
			assert.ok(session);

			assert.equal(session.patientId, "pat-ivanov-01");
			assert.equal(session.visitId, "vis-101");
			assert.deepEqual(session.preparationTeethFdi, [16]);
			assert.deepEqual(session.implantTeethFdi, [46]);
			assert.ok(session.upperJawLods?.lod0MasterUrl);
			assert.ok(session.lowerJawLods?.lod0MasterUrl);
			assert.equal(session.buccalBiteLods?.length, 1);
			assert.equal(session.isOcclusionPreAligned, true);

			// Validate Zod contract schema
			const parsed = intraoralScanSessionSchema.safeParse(session);
			assert.equal(parsed.success, true);
		});

		it("handles empty input gracefully", () => {
			const sessions = groupFilesIntoScanSessions([]);
			assert.deepEqual(sessions, []);
		});
	});

	// ========================================================================
	// 5. CAD Z-UP <-> THREE.JS Y-UP COORDINATE TRANSFORMATION
	// ========================================================================
	describe("CAD Z-Up to Three.js Y-Up Transformation", () => {
		it("maps point (x, y, z) to (x, z, -y) using CAD_Z_UP_TO_THREE_Y_UP_MATRIX", () => {
			const cadPoint: Vector3 = [15.5, 20.0, 35.0];
			const threePoint = transformPoint4x4(cadPoint, CAD_Z_UP_TO_THREE_Y_UP_MATRIX);

			assert.equal(threePoint[0], 15.5);
			assert.equal(threePoint[1], 35.0);
			assert.equal(threePoint[2], -20.0);
		});

		it("maps point back from Three.js Y-Up to CAD Z-Up reversibly", () => {
			const threePoint: Vector3 = [15.5, 35.0, -20.0];
			const restoredCadPoint = transformPoint4x4(threePoint, THREE_Y_UP_TO_CAD_Z_UP_MATRIX);

			assert.equal(restoredCadPoint[0], 15.5);
			assert.equal(restoredCadPoint[1], 20.0);
			assert.equal(restoredCadPoint[2], 35.0);
		});

		it("verifies matrix multiplication of CAD transform and its inverse yields Identity", () => {
			const product = multiplyMatrix4x4(CAD_Z_UP_TO_THREE_Y_UP_MATRIX, THREE_Y_UP_TO_CAD_Z_UP_MATRIX);

			for (let i = 0; i < 16; i++) {
				const expected = IDENTITY_MATRIX_4X4[i] ?? 0;
				const actual = product[i] ?? 0;
				assert.ok(Math.abs(actual - expected) < 1e-12, `Element ${i} mismatch`);
			}
		});
	});

	// ========================================================================
	// 6. UNIT DETECTION & SCALE NORMALIZATION
	// ========================================================================
	describe("Unit Detection & Scale Normalization", () => {
		it("detects meters scale (< 0.2 m) and returns scaleFactor 1000.0", () => {
			const radiusInMeters = 0.055; // 55 mm in meters
			const scale = detectAndNormalizeUnits(radiusInMeters);
			assert.equal(scale, 1000.0);

			const { detectedUnit } = detectMeshUnitScale([-0.03, -0.02, -0.01], [0.03, 0.02, 0.01]);
			assert.equal(detectedUnit, "meters");
		});

		it("detects microns scale (> 5000 um) and returns scaleFactor 0.001", () => {
			const radiusInMicrons = 55000.0; // 55 mm in microns
			const scale = detectAndNormalizeUnits(radiusInMicrons);
			assert.equal(scale, 0.001);

			const { detectedUnit } = detectMeshUnitScale([-30000, -20000, -10000], [30000, 20000, 10000]);
			assert.equal(detectedUnit, "microns");
		});

		it("detects native millimeters and returns scaleFactor 1.0", () => {
			const radiusInMm = 45.0;
			const scale = detectAndNormalizeUnits(radiusInMm);
			assert.equal(scale, 1.0);

			const { detectedUnit } = detectMeshUnitScale([-25, -20, -10], [25, 20, 10]);
			assert.equal(detectedUnit, "millimeters");
		});

		it("guards against zero, negative, or infinite bounding radii", () => {
			assert.equal(detectAndNormalizeUnits(0), 1.0);
			assert.equal(detectAndNormalizeUnits(-50), 1.0);
			assert.equal(detectAndNormalizeUnits(Number.NaN), 1.0);
			assert.equal(detectAndNormalizeUnits(Number.POSITIVE_INFINITY), 1.0);
		});
	});

	// ========================================================================
	// 7. 4x4 MATRIX ALGEBRA & INVERSE
	// ========================================================================
	describe("4x4 Matrix Mathematics & Inversion", () => {
		it("correctly computes determinant of identity and scaled matrices", () => {
			assert.equal(determinantMatrix4x4(IDENTITY_MATRIX_4X4), 1);

			const scaleMat = createScaleMatrix4x4(2, 3, 4);
			assert.equal(determinantMatrix4x4(scaleMat), 24);
		});

		it("inverts non-singular affine matrices with high numerical precision", () => {
			const trans = createTranslationMatrix4x4(10, -25, 50);
			const scale = createScaleMatrix4x4(2, 2, 2);
			const matrix = multiplyMatrix4x4(trans, scale);

			const inv = invertMatrix4x4(matrix);
			assert.ok(inv !== null);

			const identityCheck = multiplyMatrix4x4(matrix, inv as Matrix4x4);
			for (let i = 0; i < 16; i++) {
				const expected = IDENTITY_MATRIX_4X4[i] ?? 0;
				const actual = identityCheck[i] ?? 0;
				assert.ok(Math.abs(actual - expected) < 1e-10, `Matrix inversion deviation at ${i}`);
			}
		});

		it("returns null for singular (degenerate) matrices with zero determinant", () => {
			const singularMatrix: Matrix4x4 = [
				0, 0, 0, 0,
				0, 1, 0, 0,
				0, 0, 1, 0,
				0, 0, 0, 1,
			];
			const inv = invertMatrix4x4(singularMatrix);
			assert.equal(inv, null);
		});

		it("transposes matrices correctly", () => {
			const mat: Matrix4x4 = [
				1, 2, 3, 4,
				5, 6, 7, 8,
				9, 10, 11, 12,
				13, 14, 15, 16,
			];
			const t = transposeMatrix4x4(mat);
			assert.equal(t[1], 5);
			assert.equal(t[4], 2);
			assert.equal(t[11], 15);
		});
	});

	// ========================================================================
	// 8. OCCLUSAL CLEARANCE CALCULATION (MICRON-LEVEL CONTACT TIERS)
	// ========================================================================
	describe("Occlusal Clearance Calculation in Microns", () => {
		it("categorizes contacts into hard, physiological, clearance gap, and disocclusion", () => {
			// Upper jaw vertices: 4 points positioned above opposing lower jaw
			const upperVertices: Vector3[] = [
				[10, 10, 0.025], // 0.025 mm = 25 um -> hard_contact (<50 um)
				[20, 10, 0.100], // 0.100 mm = 100 um -> physiological_contact (50-150 um)
				[30, 10, 0.250], // 0.250 mm = 250 um -> clearance_gap (150-350 um)
				[40, 10, 1.200], // 1.200 mm = 1200 um -> disocclusion (>350 um)
			];

			// Lower jaw vertices positioned at Z = 0
			const lowerVertices: Vector3[] = [
				[10, 10, 0],
				[20, 10, 0],
				[30, 10, 0],
				[40, 10, 0],
			];

			const clearanceMap = calculateOcclusionClearance(upperVertices, lowerVertices);

			assert.equal(clearanceMap.contactPointCount, 4);
			assert.equal(clearanceMap.hardContactCount, 1);
			assert.equal(clearanceMap.physiologicalContactCount, 1);
			assert.equal(clearanceMap.clearanceGapCount, 1);
			assert.equal(clearanceMap.disocclusionCount, 1);

			assert.equal(clearanceMap.minDistanceMicrons, 25);
			assert.equal(clearanceMap.maxDistanceMicrons, 1200);

			// Validate with Zod schema
			const parsed = occlusionClearanceMapSchema.safeParse(clearanceMap);
			assert.equal(parsed.success, true);
		});

		it("handles empty vertex collections safely", () => {
			const map = calculateOcclusionClearance([], []);
			assert.equal(map.contactPointCount, 0);
			assert.equal(map.minDistanceMicrons, 0);
			assert.equal(map.points.length, 0);
		});
	});

	// ========================================================================
	// 9. BUCCAL BITE ICP ALIGNMENT
	// ========================================================================
	describe("Buccal Bite ICP Registration", () => {
		it("aligns translated jaw vertices to target bite surface via ICP", () => {
			// Target surface (buccal bite)
			const biteVertices: Vector3[] = [
				[0, 0, 0],
				[5, 0, 0],
				[10, 0, 0],
				[0, 5, 0],
				[5, 5, 0],
				[10, 5, 0],
			];

			// Source jaw displaced by translation (tx = 0.5, ty = -0.3, tz = 0.2)
			const jawVertices: Vector3[] = biteVertices.map((pt) => [
				pt[0] + 0.5,
				pt[1] - 0.3,
				pt[2] + 0.2,
			]);

			const result = alignJawsByBuccalBite(jawVertices, biteVertices, {
				maxIterations: 20,
				tolerance: 1e-5,
				maxCorrespondenceDistanceMm: 5.0,
			});

			assert.ok(result.iterations > 0);
			assert.ok(result.rmse < 0.1, `ICP residual error ${result.rmse} must be < 0.1 mm`);
			assert.ok(result.converged, "ICP must converge on rigid displacement");
		});

		it("guards against insufficient point pairs", () => {
			const result = alignJawsByBuccalBite([[0, 0, 0]], [[1, 1, 1]]);
			assert.equal(result.converged, false);
			assert.equal(result.iterations, 0);
		});
	});

	// ========================================================================
	// 10. UNDERCUT ANALYSIS (PATH OF DRAW / INSERTION)
	// ========================================================================
	describe("Undercut & Reverse Taper Analysis", () => {
		it("detects undercuts on downward-facing surfaces opposite to insertion path", () => {
			// Surface with 3 normal vectors:
			// Normal 1: facing upward [0, 0, 1] (favorable, dot = 1.0)
			// Normal 2: slightly tapered [0.2, 0, 0.98] (dot > 0, favorable)
			// Normal 3: negative draft / undercut [0, 0, -1] (facing downward, dot = -1.0)
			const vertices: Vector3[] = [
				[10, 10, 5],
				[12, 10, 5],
				[14, 10, 3], // Undercut vertex
			];
			const normals: Vector3[] = [
				[0, 0, 1],
				[0.2, 0, 0.98],
				[0, 0, -1],
			];

			const result = analyzeUndercuts(vertices, normals, [0, 0, 1]);

			assert.equal(result.hasUndercut, true);
			assert.equal(result.undercutZones.length, 1);
			assert.ok(result.maxUndercutDepthMm > 0);

			// Validate with Zod schema
			const parsed = undercutAnalysisResultSchema.safeParse(result);
			assert.equal(parsed.success, true);
		});

		it("reports no undercut for strictly drafted preparation dies", () => {
			const vertices: Vector3[] = [
				[0, 0, 5],
				[1, 0, 5],
				[0, 1, 5],
			];
			const normals: Vector3[] = [
				[0, 0, 1],
				[0.1, 0, 0.99],
				[0, 0.1, 0.99],
			];

			const result = analyzeUndercuts(vertices, normals, [0, 0, 1]);
			assert.equal(result.hasUndercut, false);
			assert.equal(result.maxUndercutDepthMm, 0);
			assert.equal(result.undercutZones.length, 0);
		});
	});
});
