/**
 * panoramicReconstruction.test.ts — Unit tests for Panoramic Reconstruction, CPR Math,
 * Misch Bone Quality D1..D5, and 3D Implant Safety Distance Validation.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { autoDetectDentalArch } from "@dental/shared";
import { autoDetectPanoramicArch } from "./panoramicArch.js";
import {
	AIR_HU,
	buildUniformCurve,
	catmullRom2D,
	classifyMischBoneDensity,
	computeCrossSection,
	computeCurveNormals,
	createAnatomicalJawControlPoints,
	crossSectionFrame,
	generateCatmullRomArch,
	generateCrossSectionSlicePlanes,
	generateDefaultArchCurve,
	interpolateArchCurve,
	offsetCurve,
	type Point2,
	type Point3D,
	resampleByArcLength,
	synchronizeMprCoordinates,
	totalArcLength,
	trilinear,
	type VolumeSamplingData,
} from "./panoramicMprMath.js";
import {
	ctPlanningRestoredLabel,
	distPointToSegment3,
	distSegmentToPolyline3,
	distSegmentToSegment3,
	emptyCtPlanningMarkup,
	MANDIBULAR_NERVE_SAFETY_THRESHOLD_MM,
	pluralizeRu,
	saveCtPlanningMarkup,
	type StoredImplant,
	validateImplantNerveSafety,
	validatePlanSafety,
	type WorldPoint3,
} from "./ctPlanningPersistence.js";
import {
	angleDeg2D,
	angleDeg3D,
	circleAreaMm2,
	circleRadiusMm,
	computeRoiStats,
	ellipseAreaMm2,
	euclideanDistance2D,
	euclideanDistance3D,
	formatAngleRu,
	formatAreaRu,
	formatDensityRu,
	formatDimensions2DRu,
	formatDistanceRu,
	polylineLength2D,
	polylineLength3D,
	rectangleAreaMm2,
} from "./dicomMeasurementMath.js";
import {
	DENTIUM_SYSTEM,
	formatImplantSpecRu,
	getAllImplantSystems,
	getAvailableDiameters,
	getAvailableLengths,
	getImplantSystem,
	getPlatformForDiameter,
	NOBEL_BIOCARE_SYSTEM,
	OSSTEM_SYSTEM,
	STRAUMANN_SYSTEM,
	validateImplantDimensions,
} from "./implantCatalog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Panoramic Reconstruction, CPR Math & Implant Safety Engine (Mandates 8s, 8j, 8d)", () => {
	it("1. Generates anatomical jaw landmarks and smooth Catmull-Rom dental arch", () => {
		const landmarks = createAnatomicalJawControlPoints();
		assert.ok(
			landmarks.length >= 7,
			"Must contain at least 7 anatomical landmarks",
		);

		const archCurve = generateCatmullRomArch(landmarks, 0.5);
		assert.ok(archCurve.length > 50, "Curve must be densely sampled");
		const lastPoint = archCurve[archCurve.length - 1];
		assert.ok(
			lastPoint && lastPoint.arcLengthMm > 80,
			"Total dental arch length must exceed 80mm",
		);

		// Tangent and normal vectors must be unit length
		for (const pt of archCurve.slice(0, 10)) {
			const tLen = Math.hypot(pt.tangent.x, pt.tangent.y, pt.tangent.z);
			const nLen = Math.hypot(pt.normal.x, pt.normal.y, pt.normal.z);
			assert.ok(
				Math.abs(tLen - 1.0) < 1e-3,
				"Tangent vector must be normalized",
			);
			assert.ok(
				Math.abs(nLen - 1.0) < 1e-3,
				"Normal vector must be normalized",
			);
		}
	});

	it("2. Generates equidistant perpendicular cross-sectional slice planes along the arch", () => {
		const landmarks = createAnatomicalJawControlPoints();
		const archCurve = generateCatmullRomArch(landmarks, 0.5);
		const stepIntervalMm = 1.5;
		const thicknessMm = 2.0;

		const slices = generateCrossSectionSlicePlanes(archCurve, {
			stepIntervalMm,
			thicknessMm,
			widthMm: 32.0,
			heightMm: 40.0,
		});

		assert.ok(
			slices.length > 30,
			"Must generate adequate cross-sectional slices for dental arch",
		);
		const firstSlice = slices[0];
		assert.ok(firstSlice, "First slice must exist");
		assert.equal(firstSlice.sliceIndex, 0);
		assert.equal(firstSlice.thicknessMm, thicknessMm);
		assert.equal(firstSlice.widthMm, 32.0);
		assert.equal(firstSlice.heightMm, 40.0);

		// Slices must be ordered by arcLengthMm
		for (let i = 1; i < slices.length; i++) {
			const prev = slices[i - 1];
			const curr = slices[i];
			assert.ok(
				prev && curr && curr.arcLengthMm >= prev.arcLengthMm,
				"Cross-section slices must be monotonically ordered by arcLength",
			);
		}
	});

	it("3. Synchronizes 3D coordinates between MPR viewports and cross-section indices", () => {
		const landmarks = createAnatomicalJawControlPoints();
		const archCurve = generateCatmullRomArch(landmarks, 0.5);
		const slices = generateCrossSectionSlicePlanes(archCurve, {
			stepIntervalMm: 1.5,
		});

		const testPos: Point3D = { x: 0, y: 40, z: 10 };
		const sync = synchronizeMprCoordinates(testPos, archCurve, slices);

		assert.equal(sync.axialSliceZ, 10);
		assert.equal(sync.coronalSliceY, 40);
		assert.equal(sync.sagittalSliceX, 0);
		assert.ok(
			sync.activeCrossSectionIndex >= 0 &&
				sync.activeCrossSectionIndex < slices.length,
		);
		assert.ok(sync.distanceToArchMm >= 0);
	});

	it("4. Classifies Misch bone density across full D1..D5 spectrum with surgical protocols", () => {
		// D1 (>1250 HU): Dense cortical bone, cortical tap required
		const d1 = classifyMischBoneDensity(1350);
		assert.equal(d1.mischClass, "D1");
		assert.equal(d1.corticalTap, true);
		assert.equal(d1.underDrilling, false);
		assert.ok(d1.clinicalAdvice.includes("кортикальный метчик"));

		// D2 (850-1250 HU): Ideal cancellous & cortical, standard protocol
		const d2 = classifyMischBoneDensity(1000);
		assert.equal(d2.mischClass, "D2");
		assert.equal(d2.corticalTap, false);
		assert.equal(d2.underDrilling, false);
		assert.ok(d2.clinicalAdvice.includes("Золотой стандарт"));

		// D3 (350-850 HU): Moderate density porous bone
		const d3 = classifyMischBoneDensity(550);
		assert.equal(d3.mischClass, "D3");
		assert.equal(d3.corticalTap, false);
		assert.equal(d3.underDrilling, false);

		// D4 (150-350 HU): Soft bone, under-drilling indicated
		const d4 = classifyMischBoneDensity(220);
		assert.equal(d4.mischClass, "D4");
		assert.equal(d4.underDrilling, true);
		assert.equal(d4.underDrillingMm, 1.0);
		assert.equal(d4.osteotomeCondensation, true);
		assert.ok(d4.clinicalAdvice.includes("недопрепарирование"));

		// D5 (0-150 HU): Critically soft / resorbed bone, bone condensers
		const d5 = classifyMischBoneDensity(80);
		assert.equal(d5.mischClass, "D5");
		assert.equal(d5.underDrilling, true);
		assert.equal(d5.underDrillingMm, 1.5);
		assert.equal(d5.osteotomeCondensation, true);
		assert.ok(d5.clinicalAdvice.includes("остеотомами"));

		// Defect / Air / Sinus (<0 HU): Bone grafting required, NO osteotomes
		const airDefect = classifyMischBoneDensity(-500);
		assert.equal(airDefect.mischClass, "D5");
		assert.equal(airDefect.osteotomeCondensation, false);
		assert.equal(airDefect.underDrilling, false);
		assert.ok(airDefect.label.includes("<0 HU"));
		assert.ok(airDefect.clinicalAdvice.includes("костной пластики"));

		// NaN / non-finite fallback
		const nanResult = classifyMischBoneDensity(Number.NaN);
		assert.equal(nanResult.mischClass, "D5");
		assert.equal(nanResult.osteotomeCondensation, false);
		assert.ok(nanResult.label.includes("Неопределенная"));
	});

	it("5. Evaluates 2D Catmull-Rom cubic spline interpolation and 90° CW curve normals for CPR", () => {
		const p0: Point2 = [0, 0];
		const p1: Point2 = [10, 0];
		const p2: Point2 = [20, 10];
		const p3: Point2 = [30, 10];

		// At t=0, spline must equal p1; at t=1, spline must equal p2
		const atStart = catmullRom2D(p0, p1, p2, p3, 0.0);
		assert.ok(Math.abs(atStart[0] - 10) < 1e-4);
		assert.ok(Math.abs(atStart[1] - 0) < 1e-4);

		const atEnd = catmullRom2D(p0, p1, p2, p3, 1.0);
		assert.ok(Math.abs(atEnd[0] - 20) < 1e-4);
		assert.ok(Math.abs(atEnd[1] - 10) < 1e-4);

		// Multi-segment interpolation
		const controlPoints: Point2[] = [
			[0, 0],
			[20, 5],
			[40, 20],
			[60, 20],
			[80, 5],
			[100, 0],
		];
		const interpolated = interpolateArchCurve(controlPoints, 20);
		assert.ok(interpolated.length >= 100);

		// Normals must be normalized and rotated 90° CW: [-ty/len, tx/len]
		const normals = computeCurveNormals(interpolated);
		assert.equal(normals.length, interpolated.length);
		for (const norm of normals) {
			const len = Math.hypot(norm[0], norm[1]);
			assert.ok(Math.abs(len - 1.0) < 1e-3, "Normal must be a unit vector");
		}

		// On a straight horizontal line moving +X, tangent is [1, 0] -> normal must be [0, 1]
		const horizLine: Point2[] = [
			[0, 0],
			[10, 0],
			[20, 0],
		];
		const horizNormals = computeCurveNormals(horizLine);
		assert.ok(Math.abs(horizNormals[1]![0] - 0) < 1e-4);
		assert.ok(Math.abs(horizNormals[1]![1] - 1) < 1e-4);
	});

	it("6. Resamples dental arch polyline uniformly by arc length and computes offset curves", () => {
		const rawCurve: Point2[] = [
			[0, 0],
			[10, 0],
			[50, 0], // uneven spacing
			[100, 0],
		];
		const arcLen = totalArcLength(rawCurve);
		assert.equal(arcLen, 100);

		const uniform = resampleByArcLength(rawCurve, 11);
		assert.equal(uniform.length, 11);
		// Each segment must be exactly 10 units apart
		for (let i = 0; i < uniform.length; i++) {
			assert.ok(Math.abs(uniform[i]![0] - i * 10) < 1e-3);
			assert.ok(Math.abs(uniform[i]![1] - 0) < 1e-3);
		}

		// Full buildUniformCurve test
		const defaultArchCP = generateDefaultArchCurve([50, 50], [80, 60]);
		assert.equal(defaultArchCP.length, 9);
		const { curve, normals, arcLen: fullLen } = buildUniformCurve(
			defaultArchCP,
			200,
		);
		assert.equal(curve.length, 200);
		assert.equal(normals.length, 200);
		assert.ok(fullLen > 50);

		// Offset curve for slab width visualization
		const offset = offsetCurve(curve, normals, 5.0);
		assert.equal(offset.length, curve.length);
		const dist0 = Math.hypot(
			offset[0]![0] - curve[0]![0],
			offset[0]![1] - curve[0]![1],
		);
		assert.ok(Math.abs(dist0 - 5.0) < 1e-3);
	});

	it("7. Evaluates 3D cross-section framing and trilinear CPR sampling math", () => {
		const controlPoints: Point2[] = [
			[0, 0],
			[25, 20],
			[50, 25],
			[75, 20],
			[100, 0],
		];
		const frame = crossSectionFrame(controlPoints, 0.5, 10, -50, 0);
		assert.ok(frame !== null);
		assert.ok(Number.isFinite(frame.origin[0]));
		assert.ok(Number.isFinite(frame.origin[1]));
		assert.equal(frame.origin[2], -25); // mid-Z

		// Synthetic mini volume for trilinear sampling
		const dims: [number, number, number] = [4, 4, 4];
		const voxels = new Float32Array(64);
		for (let i = 0; i < 64; i++) voxels[i] = 100 + i;
		const getVoxel = (i: number, j: number, k: number) =>
			voxels[k * 16 + j * 4 + i] ?? AIR_HU;

		// Inside volume interpolation
		const valCenter = trilinear(getVoxel, dims, 1.5, 1.5, 1.5);
		assert.ok(valCenter > 100 && valCenter < 164);

		// Outside volume returns AIR_HU sentinel (-1024)
		const valOut = trilinear(getVoxel, dims, -2, 1, 1);
		assert.equal(valOut, AIR_HU);

		const samplingData: VolumeSamplingData = {
			dims,
			origin: [0, 0, -10],
			getVoxel,
			invSx: 1,
			invSy: 1,
			invSz: 1,
			zMin: -10,
			zMax: 0,
			vSpacing: 1,
		};
		const cprSlice = computeCrossSection(samplingData, {
			controlPoints,
			position: 0.5,
			tiltDeg: 0,
			widthMm: 10,
			resolution: 1,
		});
		assert.ok(cprSlice !== null);
		assert.ok(cprSlice.pixelData.length > 0);
		assert.equal(cprSlice.width, 10);
	});

	it("8. Validates 3D implant safety clearance against mandibular nerve canal (threshold 1.5 mm)", () => {
		// Model a mandibular nerve canal along Y from Y=0 to Y=40 at Z=-30, X=20
		const nervePoints: WorldPoint3[] = [
			{ x: 20, y: 0, z: -30 },
			{ x: 20, y: 20, z: -30 },
			{ x: 20, y: 40, z: -30 },
		];

		// Case A: Safe implant positioned at X=20, Y=20, Z=-15 to -25 (apex at Z=-25, cylinder radius=2.0)
		// Distance from apex (Z=-25) to nerve (Z=-30) is 5.0 mm.
		// Surface clearance: 5.0 - radius(2.0) = 3.0 mm (safe >= 1.5 mm)
		const safeImplant: StoredImplant = {
			id: "imp-safe",
			fdiCode: "46",
			diameter: 4.0,
			length: 10.0,
			startWorld: [20, 20, -15],
			endWorld: [20, 20, -25],
			boneDensity: { averageHU: 900, classification: "D2" },
			distanceToNerve: null,
		};

		const safeResult = validateImplantNerveSafety(safeImplant, nervePoints);
		assert.ok(safeResult !== null);
		assert.equal(safeResult.status, "safe");
		assert.equal(safeResult.isSafe, true);
		assert.ok(
			safeResult.distanceToNerveMm >= MANDIBULAR_NERVE_SAFETY_THRESHOLD_MM,
		);
		assert.ok(Math.abs(safeResult.distanceToNerveMm - 3.0) < 1e-2);

		// Case B: Dangerous proximity implant (apex at Z=-27.2, radius=2.0)
		// Centerline dist = 2.8 mm -> Surface clearance = 2.8 - 2.0 = 0.8 mm (< 1.5 mm)
		const warningImplant: StoredImplant = {
			id: "imp-warn",
			fdiCode: "47",
			diameter: 4.0,
			length: 11.5,
			startWorld: [20, 10, -15.7],
			endWorld: [20, 10, -27.2],
			boneDensity: { averageHU: 800, classification: "D2" },
			distanceToNerve: null,
		};

		const warnResult = validateImplantNerveSafety(warningImplant, nervePoints);
		assert.ok(warnResult !== null);
		assert.equal(warnResult.status, "warning");
		assert.equal(warnResult.isSafe, false);
		assert.ok(warnResult.distanceToNerveMm < 1.5);
		assert.ok(warnResult.messageRu.includes("ОПАСНОЕ ПРИБЛИЖЕНИЕ"));
		assert.ok(warnResult.messageRu.includes("зуб #47"));

		// Case C: Collision / impingement implant penetrating nerve canal (apex at Z=-31)
		// Surface clearance is negative (overlap)
		const collisionImplant: StoredImplant = {
			id: "imp-collision",
			fdiCode: "36",
			diameter: 4.5,
			length: 13.0,
			startWorld: [20, 30, -18],
			endWorld: [20, 30, -31],
			boneDensity: { averageHU: 850, classification: "D2" },
			distanceToNerve: null,
		};

		const collResult = validateImplantNerveSafety(
			collisionImplant,
			nervePoints,
		);
		assert.ok(collResult !== null);
		assert.equal(collResult.status, "collision");
		assert.equal(collResult.isSafe, false);
		assert.ok(collResult.distanceToNerveMm <= 0);
		assert.ok(collResult.messageRu.includes("КРИТИЧЕСКАЯ КОЛЛИЗИЯ"));

		// Case D: Full plan validation with multiple implants
		const planMarkup = {
			splinePoints: [],
			nervePoints,
			implants: [safeImplant, warningImplant, collisionImplant],
		};
		const planValidation = validatePlanSafety(planMarkup);
		assert.equal(planValidation.isSafe, false);
		assert.equal(planValidation.worstStatus, "collision");
		assert.equal(planValidation.warnings.length, 2);
		assert.ok(
			safeImplant.distanceToNerve !== null &&
				safeImplant.distanceToNerve >= 1.5,
		);
	});

	it("9. autoDetectDentalArch and autoDetectPanoramicArch adapt MIP ray-tracing with Zero Dead-Ends fallback", () => {
		const emptyVol = new Float32Array(32 * 32 * 8);
		const dims: [number, number, number] = [32, 32, 8];
		const spacing: [number, number, number] = [0.5, 0.5, 0.5];

		const archPts = autoDetectDentalArch(emptyVol, dims, spacing);
		assert.ok(Array.isArray(archPts), "Must return Point2[] array");
		assert.ok(
			archPts.length >= 7,
			"Fallback must provide at least 7 anatomical control points",
		);

		const panoramicPts = autoDetectPanoramicArch({
			scalarData: emptyVol,
			dimensions: dims,
			spacing,
		});
		assert.ok(Array.isArray(panoramicPts), "Must return Point2D[] array");
		assert.ok(panoramicPts.length >= 7);

		const nullFallback = autoDetectPanoramicArch(null);
		assert.ok(nullFallback.length >= 7);
	});

	it("10. PanoramicRendererWindow and BoneQualityPanel verify UI mounting contracts", () => {
		const panRenderer = fs.readFileSync(
			path.resolve(__dirname, "./PanoramicRendererWindow.tsx"),
			"utf-8",
		);
		assert.ok(panRenderer.includes("ref={crossSectionCanvasRef}"));
		assert.ok(panRenderer.includes("computeCrossSection"));
		assert.ok(panRenderer.includes("Авто-дуга"));

		const bonePanel = fs.readFileSync(
			path.resolve(__dirname, "./BoneQualityPanel.tsx"),
			"utf-8",
		);
		assert.ok(
			bonePanel.includes("classifyMischBoneDensity"),
			"BoneQualityPanel must integrate classifyMischBoneDensity",
		);
		assert.ok(
			bonePanel.includes("D5"),
			"BoneQualityPanel must support Misch D5 classification",
		);
		assert.ok(
			bonePanel.includes("clinicalAdvice"),
			"BoneQualityPanel must render clinical advice for surgeon",
		);
	});

	it("11. Handles colinear tangents in generateCatmullRomArch without NaN normal vectors", () => {
		// Pure vertical line moving in Z: tangent aligns with worldUp {0, 0, 1}
		const verticalControl: Point3D[] = [
			{ x: 10, y: 10, z: 0 },
			{ x: 10, y: 10, z: 10 },
			{ x: 10, y: 10, z: 20 },
		];
		const curve = generateCatmullRomArch(verticalControl, 1.0);
		assert.ok(curve.length > 0);
		for (const pt of curve) {
			assert.ok(Number.isFinite(pt.normal.x));
			assert.ok(Number.isFinite(pt.normal.y));
			assert.ok(Number.isFinite(pt.normal.z));
			const len = Math.hypot(pt.normal.x, pt.normal.y, pt.normal.z);
			assert.ok(Math.abs(len - 1.0) < 1e-3, "Normal must be a unit vector");
		}
	});

	it("12. Validates empty markup save guard and Russian grammatical pluralization", async () => {
		const emptyMarkup = emptyCtPlanningMarkup();
		const saveRes = await saveCtPlanningMarkup(
			"pat-1",
			"study-1",
			emptyMarkup,
		);
		assert.equal(saveRes.status, "refused");
		assert.ok(saveRes.message.includes("Разметка пуста: нечего сохранять"));

		// Pluralize Russian nouns
		assert.equal(
			pluralizeRu(1, "имплантат", "имплантата", "имплантатов"),
			"1 имплантат",
		);
		assert.equal(
			pluralizeRu(2, "имплантат", "имплантата", "имплантатов"),
			"2 имплантата",
		);
		assert.equal(
			pluralizeRu(4, "имплантат", "имплантата", "имплантатов"),
			"4 имплантата",
		);
		assert.equal(
			pluralizeRu(5, "имплантат", "имплантата", "имплантатов"),
			"5 имплантатов",
		);
		assert.equal(
			pluralizeRu(11, "имплантат", "имплантата", "имплантатов"),
			"11 имплантатов",
		);
		assert.equal(
			pluralizeRu(21, "имплантат", "имплантата", "имплантатов"),
			"21 имплантат",
		);

		// Restored label
		const restoredText = ctPlanningRestoredLabel({
			splinePoints: [{ x: 1, y: 2, z: 3 }],
			nervePoints: [
				{ x: 1, y: 2, z: 3 },
				{ x: 4, y: 5, z: 6 },
			],
			implants: [
				{
					id: "imp-1",
					fdiCode: "36",
					diameter: 4,
					length: 10,
					startWorld: [0, 0, 0],
					endWorld: [0, 0, -10],
					boneDensity: { averageHU: 800, classification: "D2" },
					distanceToNerve: null,
				},
			],
		});
		assert.ok(restoredText !== null);
		assert.ok(restoredText.includes("1 точка дуги"));
		assert.ok(restoredText.includes("2 точки канала"));
		assert.ok(restoredText.includes("1 имплантат"));
	});

	it("13. Evaluates 2D/3D Euclidean caliper distance, angles, ROI areas, and HU profile stats", () => {
		// 2D distance with isotropic spacing
		const d2dIso = euclideanDistance2D([0, 0], [3, 4], [1, 1]);
		assert.equal(d2dIso, 5.0);

		// 2D distance with anisotropic spacing: 3px * 0.5mm = 1.5mm, 4px * 0.5mm = 2.0mm -> hypot(1.5, 2.0) = 2.5mm
		const d2dAniso = euclideanDistance2D({ x: 0, y: 0 }, { x: 3, y: 4 }, [
			0.5, 0.5,
		]);
		assert.equal(d2dAniso, 2.5);

		// 3D distance: [0, 0, 0] to [2, 3, 6] -> hypot(2, 3, 6) = sqrt(4+9+36) = sqrt(49) = 7.0
		const d3d = euclideanDistance3D([0, 0, 0], [2, 3, 6], [1, 1, 1]);
		assert.equal(d3d, 7.0);

		// 2D Caliper angle: 90 degrees
		const rightAngle = angleDeg2D([0, 10], [0, 0], [10, 0]);
		assert.ok(Math.abs(rightAngle - 90.0) < 1e-4);

		// 2D Collinear angle: 180 degrees
		const flatAngle = angleDeg2D([-10, 0], [0, 0], [10, 0]);
		assert.ok(Math.abs(flatAngle - 180.0) < 1e-4);

		// 3D Spatial angle: perpendicular vectors
		const spatialAngle = angleDeg3D([10, 0, 0], [0, 0, 0], [0, 10, 0]);
		assert.ok(Math.abs(spatialAngle - 90.0) < 1e-4);

		// Polyline cumulative lengths
		const poly2d = polylineLength2D([
			[0, 0],
			[10, 0],
			[10, 10],
		]);
		assert.equal(poly2d, 20.0);

		const poly3d = polylineLength3D([
			[0, 0, 0],
			[0, 0, 10],
			[0, 10, 10],
		]);
		assert.equal(poly3d, 20.0);

		// 2D ROI areas
		const rectArea = rectangleAreaMm2([0, 0], [10, 5], [1, 1]);
		assert.equal(rectArea, 50.0);

		const circArea = circleAreaMm2(10);
		assert.ok(Math.abs(circArea - Math.PI * 100) < 1e-4);

		const ellArea = ellipseAreaMm2([-10, -5], [10, 5], [1, 1]);
		assert.ok(Math.abs(ellArea - Math.PI * 10 * 5) < 1e-4);

		const radius = circleRadiusMm([0, 0], [0, 10]);
		assert.equal(radius, 10.0);

		// ROI statistics
		const stats = computeRoiStats([100, 200, 300, 400, 500]);
		assert.ok(stats !== null);
		assert.equal(stats.count, 5);
		assert.equal(stats.mean, 300);
		assert.equal(stats.min, 100);
		assert.equal(stats.max, 500);
		assert.ok(Math.abs(stats.stdDev - 141.4) < 0.2);

		// Clinical localized readouts
		assert.equal(formatDistanceRu(12.4), "12.4 мм");
		assert.equal(formatAngleRu(45.2), "45.2°");
		assert.equal(formatAreaRu(82.36), "82.4 мм²");
		assert.equal(formatDimensions2DRu(10.2, 8.5), "10.2 × 8.5 мм");
		assert.equal(formatDensityRu(850), "850 HU");
		assert.equal(formatDensityRu(NaN), "— HU");
	});

	it("14. Validates canonical implant catalogs (Nobel, Straumann, Osstem, Dentium) and platform color coding", () => {
		const allSystems = getAllImplantSystems();
		assert.ok(allSystems.length >= 4);

		// Nobel Biocare specification
		const nobel = getImplantSystem("nobel");
		assert.equal(nobel.brand, "Nobel Biocare");
		assert.equal(nobel.line, "NobelActive");
		assert.ok(nobel.diameters.includes(3.5));
		assert.ok(nobel.diameters.includes(4.3));
		assert.ok(nobel.lengths.includes(11.5));

		const nobelNP = getPlatformForDiameter("nobel", 3.5);
		assert.equal(nobelNP.code, "NP");
		assert.equal(nobelNP.hexColor, "#e11d48");

		const nobelRP = getPlatformForDiameter("nobel", 4.3);
		assert.equal(nobelRP.code, "RP");
		assert.equal(nobelRP.hexColor, "#f59e0b");

		// Straumann specification
		const straumann = getImplantSystem("straumann");
		assert.equal(straumann.brand, "Straumann");
		const straumannNC = getPlatformForDiameter("straumann", 3.5);
		assert.equal(straumannNC.code, "NC");
		const straumannRC = getPlatformForDiameter("straumann", 4.0);
		assert.equal(straumannRC.code, "RC");
		assert.equal(straumannRC.hexColor, "#a855f7");

		// Osstem specification
		const osstem = getImplantSystem("osstem");
		assert.equal(osstem.brand, "Osstem");
		assert.equal(osstem.sleeveDiameterMm, 5.0);
		const osstemMini = getPlatformForDiameter("osstem", 3.5);
		assert.equal(osstemMini.code, "Mini");
		const osstemReg = getPlatformForDiameter("osstem", 4.0);
		assert.equal(osstemReg.code, "Regular");
		assert.equal(osstemReg.hexColor, "#16a34a");

		// Dentium specification
		const dentium = getImplantSystem("dentium");
		assert.equal(dentium.brand, "Dentium");
		const dentiumReg = getPlatformForDiameter("dentium", 4.3);
		assert.equal(dentiumReg.code, "Regular");

		// Dimension validation & normalization
		const validCheck = validateImplantDimensions("osstem", 4.0, 10.0);
		assert.equal(validCheck.valid, true);
		assert.equal(validCheck.normalizedDiameter, 4.0);
		assert.equal(validCheck.normalizedLength, 10.0);
		assert.equal(validCheck.platform.code, "Regular");

		// Out-of-catalog dimension normalization (e.g. non-standard Ø4.1, length 9.6)
		const invalidCheck = validateImplantDimensions("osstem", 4.1, 9.6);
		assert.equal(invalidCheck.valid, false);
		assert.equal(invalidCheck.normalizedDiameter, 4.0);
		assert.equal(invalidCheck.normalizedLength, 10.0);

		// Clinical label formatting
		const osstemLabel = formatImplantSpecRu("osstem", 4.0, 10.0);
		assert.ok(osstemLabel.includes("Osstem"));
		assert.ok(osstemLabel.includes("Ø4.0 × 10.0 мм"));
		assert.ok(osstemLabel.includes("Regular"));

		const nobelLabel = formatImplantSpecRu("nobel", 4.3, 11.5);
		assert.ok(nobelLabel.includes("Nobel Biocare"));
		assert.ok(nobelLabel.includes("Ø4.3 × 11.5 мм"));
		assert.ok(nobelLabel.includes("RP"));
	});
});
