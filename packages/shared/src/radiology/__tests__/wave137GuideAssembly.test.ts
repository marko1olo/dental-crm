/**
 * ═══════════════════════════════════════════════════════════════════════════
 * WAVE 137: SURGICAL GUIDE ASSEMBLY & SLEEVE CONNECTIVITY UNIT TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Comprehensive verification suite (100% Zero Mocks):
 *  1. Arch base centerline planning (planBaseCenterline) along Catmull-Rom splines.
 *  2. Analytical sleeve housing-to-base connectivity (isHousingConnectedToBase).
 *  3. Sleeve housing geometry generation (planSleeveHousings).
 *  4. Pairwise sleeve gap & collision detection (MIN_INTER_SLEEVE_DISTANCE_MM = 1.5 mm).
 *  5. Full structural integrity validation (validateGuideStructuralIntegrity).
 *  6. Russian Form 043/u A4 surgical protocol formatting & strict 0 emojis audit.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	MIN_INTER_SLEEVE_DISTANCE_MM,
	MIN_BASE_WIDTH_MM,
	MIN_BASE_HEIGHT_MM,
	DEFAULT_HOUSING_WALL_THICKNESS_MM,
	type GuideImplantInput,
	type GuideBaseParams,
	type Point2,
	type Vec3,
	guideImplantInputSchema,
	guideBaseParamsSchema,
	sleeveHousingGeometrySchema,
	guideIntegrityResultSchema,
	surgicalGuideAssemblyReportParamsSchema,
	planBaseCenterline,
	isHousingConnectedToBase,
	planSleeveHousings,
	validateGuideStructuralIntegrity,
	formatSurgicalGuideAssemblyA4Protocol,
	calculatePolylineLength3,
} from "../guideAssemblyEngine.js";

describe("Wave 137: Surgical Guide Assembly & Sleeve Connectivity Engine", () => {
	// Standard mandibular U-shaped dental arch Catmull-Rom control points
	const archControlPoints: Point2[] = [
		[-35, 30],
		[-25, 10],
		[-15, -5],
		[0, -10],
		[15, -5],
		[25, 10],
		[35, 30],
	];

	// ── 1. Arch Base Centerline Planning ─────────────────────────────

	describe("1. Arch Base Centerline Planning (planBaseCenterline)", () => {
		it("generates a smooth 3D centerline along the arch covering planned implants", () => {
			const entries: Vec3[] = [
				[-25, 10, -12], // tooth 36 area
				[-15, -5, -12], // tooth 34 area
			];
			const baseZ = -12.0;

			const centerline = planBaseCenterline(archControlPoints, entries, baseZ, 0.04, 40);

			assert.ok(centerline.length >= 2, "Centerline must contain sample points");
			assert.equal(centerline.length, 41, "Must generate exactly samples + 1 points");

			// Every point must be at baseZ
			for (const pt of centerline) {
				assert.equal(pt[2], baseZ, "All points must reside at the specified baseZ floor");
			}

			// Arc length must be positive
			const length = calculatePolylineLength3(centerline);
			assert.ok(length > 5.0, `Base centerline length (${length.toFixed(1)} mm) must be substantial`);
		});

		it("returns empty array for empty implant entries or degenerate control points", () => {
			assert.deepEqual(planBaseCenterline(archControlPoints, [], -10), []);
			assert.deepEqual(planBaseCenterline([], [[0, 0, 0]], -10), []);
			assert.deepEqual(planBaseCenterline([archControlPoints[0]!], [[0, 0, 0]], -10), []);
		});

		it("respects padding padS expanding the arc span beyond outer implants", () => {
			const entries: Vec3[] = [[0, -10, 0]]; // single central point
			const narrowLine = planBaseCenterline(archControlPoints, entries, 0, 0.02, 20);
			const wideLine = planBaseCenterline(archControlPoints, entries, 0, 0.10, 20);

			const lenNarrow = calculatePolylineLength3(narrowLine);
			const lenWide = calculatePolylineLength3(wideLine);

			assert.ok(lenWide > lenNarrow, "Larger padS must produce a longer base bar centerline");
		});
	});

	// ── 2. Sleeve Housing Connectivity to Base Bar ───────────────────

	describe("2. Sleeve Housing Connectivity (isHousingConnectedToBase)", () => {
		const baseCenterline: Vec3[] = [
			[-20, 0, 0],
			[0, 0, 0],
			[20, 0, 0],
		];
		const baseWidth = 6.0;
		const baseHeight = 3.5;
		const housingRadius = 4.0; // 5 mm sleeve + 2*1.5 mm wall -> outer 8 mm -> radius 4 mm

		it("returns true for a well-seated sleeve housing intersecting the base bar", () => {
			// Housing along Z axis spanning [-6, 0] at X=0, Y=0 (directly through the base bar at Z=0)
			const axisA: Vec3 = [0, 0, -6];
			const axisB: Vec3 = [0, 0, 0];

			const connected = isHousingConnectedToBase(
				axisA,
				axisB,
				housingRadius,
				baseCenterline,
				baseWidth,
				baseHeight,
			);

			assert.equal(connected, true, "Housing aligned with base bar must be connected");
		});

		it("returns false for a detached floating sleeve located far buccal from the arch", () => {
			// Implant placed 15 mm buccal (in Y) away from the base bar at Y=0
			const axisA: Vec3 = [0, 15, -6];
			const axisB: Vec3 = [0, 15, 0];

			const connected = isHousingConnectedToBase(
				axisA,
				axisB,
				housingRadius,
				baseCenterline,
				baseWidth,
				baseHeight,
			);

			assert.equal(connected, false, "Housing 15 mm away from base bar must be disconnected");
		});

		it("returns false when vertical Z span completely misses the base bar slab", () => {
			// Base bar is at Z=0, slab is [-1.75, +1.75]. Housing is at Z in [10, 16]
			const axisA: Vec3 = [0, 0, 16];
			const axisB: Vec3 = [0, 0, 10];

			const connected = isHousingConnectedToBase(
				axisA,
				axisB,
				housingRadius,
				baseCenterline,
				baseWidth,
				baseHeight,
			);

			assert.equal(connected, false, "Housing with no Z overlap must be disconnected");
		});

		it("returns false for degenerate base centerline (< 2 points)", () => {
			assert.equal(
				isHousingConnectedToBase([0, 0, -6], [0, 0, 0], housingRadius, [[0, 0, 0]], baseWidth, baseHeight),
				false,
			);
			assert.equal(
				isHousingConnectedToBase([0, 0, -6], [0, 0, 0], housingRadius, [], baseWidth, baseHeight),
				false,
			);
		});
	});

	// ── 3. Sleeve Housing Planning ────────────────────────────────────

	describe("3. Sleeve Housing Planning (planSleeveHousings)", () => {
		it("calculates correct outer diameter, height and axis endpoints", () => {
			const implants: GuideImplantInput[] = [
				{
					entry: [10, 5, 0],
					axis: [0, 0, 1], // apical direction +Z
					length: 10,
					sleeveDiameter: 5.0,
					sleeveOffset: 2.0,
					sleeveHeight: 4.0,
					toothNumber: 46,
				},
			];

			const housings = planSleeveHousings(implants, 1.5);

			assert.equal(housings.length, 1);
			const h = housings[0]!;

			// Outer diameter: sleeve 5.0 + 2 * wall 1.5 = 8.0 mm
			assert.equal(h.outerDiameter, 8.0);
			assert.equal(h.wallThickness, 1.5);

			// Sleeve top: -(offset 2.0 + height 4.0) = -6.0 along axis
			// cylinderAxisA = [10, 5, -6], cylinderAxisB = [10, 5, 0]
			assert.deepEqual(h.cylinderAxisA, [10, 5, -6]);
			assert.deepEqual(h.cylinderAxisB, [10, 5, 0]);
			assert.equal(h.height, 6.0);
		});
	});

	// ── 4. Inter-Sleeve Distance & Collision Analysis ────────────────

	describe("4. Inter-Sleeve Clearance Analysis", () => {
		const baseCenterline: Vec3[] = [
			[-30, 0, 0],
			[0, 0, 0],
			[30, 0, 0],
		];
		const baseParams: GuideBaseParams = {
			baseWidthMm: 6.0,
			baseHeightMm: 3.5,
			baseZMFloor: 0.0,
			padS: 0.04,
			sampleCount: 40,
			wallThicknessMm: 1.5,
		};

		it("detects safe distance between adjacent housings (clearance >= 1.5 mm)", () => {
			// Both sleeves: sleeveDiameter 5.0, wall 1.5 -> outerDiameter 8.0 (radius 4.0).
			// Implant 1 at X=0, Implant 2 at X=10 -> center distance 10 mm.
			// Surface clearance = 10 - (4 + 4) = 2.0 mm >= 1.5 mm.
			const implants: GuideImplantInput[] = [
				{
					entry: [0, 0, 0],
					axis: [0, 0, 1],
					length: 10,
					sleeveDiameter: 5.0,
					sleeveOffset: 2.0,
					sleeveHeight: 4.0,
					toothNumber: 35,
				},
				{
					entry: [10, 0, 0],
					axis: [0, 0, 1],
					length: 10,
					sleeveDiameter: 5.0,
					sleeveOffset: 2.0,
					sleeveHeight: 4.0,
					toothNumber: 36,
				},
			];

			const result = validateGuideStructuralIntegrity(implants, baseCenterline, baseParams);

			assert.equal(result.isValid, true);
			assert.equal(result.hasInterSleeveCollisions, false);
			assert.ok(result.minInterSleeveDistanceMm >= MIN_INTER_SLEEVE_DISTANCE_MM);
			assert.equal(result.errors.length, 0);
		});

		it("detects insufficient clearance violation (gap < 1.5 mm) but non-colliding", () => {
			// Implant 1 at X=0, Implant 2 at X=9.0 -> center distance 9.0 mm.
			// Surface clearance = 9.0 - (4 + 4) = 1.0 mm (< 1.5 mm).
			const implants: GuideImplantInput[] = [
				{
					entry: [0, 0, 0],
					axis: [0, 0, 1],
					length: 10,
					sleeveDiameter: 5.0,
					sleeveOffset: 2.0,
					sleeveHeight: 4.0,
					toothNumber: 45,
				},
				{
					entry: [9.0, 0, 0],
					axis: [0, 0, 1],
					length: 10,
					sleeveDiameter: 5.0,
					sleeveOffset: 2.0,
					sleeveHeight: 4.0,
					toothNumber: 46,
				},
			];

			const result = validateGuideStructuralIntegrity(implants, baseCenterline, baseParams);

			assert.equal(result.isValid, false, "Must fail integrity due to fragile thin web gap");
			assert.equal(result.hasInterSleeveCollisions, false);
			assert.equal(result.minInterSleeveDistanceMm.toFixed(2), "1.00");
			assert.ok(
				result.errors.some((e) => e.includes("Недостаточный зазор")),
				"Must report insufficient gap error",
			);
		});

		it("detects direct physical collision / overlap between sleeve housings (gap < 0)", () => {
			// Implant 1 at X=0, Implant 2 at X=6.5 -> center distance 6.5 mm.
			// Surface clearance = 6.5 - 8.0 = -1.5 mm (collision).
			const implants: GuideImplantInput[] = [
				{
					entry: [0, 0, 0],
					axis: [0, 0, 1],
					length: 10,
					sleeveDiameter: 5.0,
					sleeveOffset: 2.0,
					sleeveHeight: 4.0,
					toothNumber: 11,
				},
				{
					entry: [6.5, 0, 0],
					axis: [0, 0, 1],
					length: 10,
					sleeveDiameter: 5.0,
					sleeveOffset: 2.0,
					sleeveHeight: 4.0,
					toothNumber: 21,
				},
			];

			const result = validateGuideStructuralIntegrity(implants, baseCenterline, baseParams);

			assert.equal(result.isValid, false);
			assert.equal(result.hasInterSleeveCollisions, true);
			assert.ok(result.minInterSleeveDistanceMm < 0);
			assert.ok(
				result.errors.some((e) => e.includes("Коллизия направляющих втулок")),
				"Must report collision error",
			);
		});
	});

	// ── 5. Full Structural Integrity Validation ───────────────────────

	describe("5. Full Structural Integrity Validation", () => {
		const baseCenterline: Vec3[] = [
			[-20, 0, 0],
			[0, 0, 0],
			[20, 0, 0],
		];

		it("catches base dimension violations (width < 3.0 mm or height < 2.5 mm)", () => {
			const implants: GuideImplantInput[] = [
				{
					entry: [0, 0, 0],
					axis: [0, 0, 1],
					length: 10,
					sleeveDiameter: 5.0,
					sleeveOffset: 2.0,
					sleeveHeight: 4.0,
				},
			];

			const badBaseParams: GuideBaseParams = {
				baseWidthMm: 2.0, // < 3.0 mm
				baseHeightMm: 1.8, // < 2.5 mm
				baseZMFloor: 0.0,
				padS: 0.04,
				sampleCount: 40,
			};

			const result = validateGuideStructuralIntegrity(implants, baseCenterline, badBaseParams);

			assert.equal(result.isValid, false);
			assert.equal(result.baseDimensionsValid, false);
			assert.ok(result.errors.some((e) => e.includes("Ширина базиса")));
			assert.ok(result.errors.some((e) => e.includes("Высота базиса")));
		});

		it("catches detached floating sleeve during full validation", () => {
			const implants: GuideImplantInput[] = [
				{
					entry: [0, 25, 0], // 25 mm away from base bar
					axis: [0, 0, 1],
					length: 10,
					sleeveDiameter: 5.0,
					sleeveOffset: 2.0,
					sleeveHeight: 4.0,
					toothNumber: 37,
				},
			];

			const validParams: GuideBaseParams = {
				baseWidthMm: 6.0,
				baseHeightMm: 3.5,
				baseZMFloor: 0.0,
				padS: 0.04,
				sampleCount: 40,
			};

			const result = validateGuideStructuralIntegrity(implants, baseCenterline, validParams);

			assert.equal(result.isValid, false);
			assert.equal(result.allHousingsConnected, false);
			assert.ok(result.errors.some((e) => e.includes("оторвана от базиса шаблона")));
		});
	});

	// ── 6. Russian Form 043/u A4 Clinical Protocol & Zero Emojis ─────

	describe("6. Russian Form 043/u A4 Surgical Protocol Formatting", () => {
		it("generates a complete clinical protocol and strictly contains 0 emojis", () => {
			const implants: GuideImplantInput[] = [
				{
					entry: [0, 0, 0],
					axis: [0, 0, 1],
					length: 10,
					sleeveDiameter: 5.0,
					sleeveOffset: 2.0,
					sleeveHeight: 4.0,
					toothNumber: 36,
				},
				{
					entry: [12, 0, 0],
					axis: [0, 0, 1],
					length: 10,
					sleeveDiameter: 5.0,
					sleeveOffset: 2.0,
					sleeveHeight: 4.0,
					toothNumber: 37,
				},
			];

			const baseCenterline: Vec3[] = [
				[-10, 0, 0],
				[0, 0, 0],
				[12, 0, 0],
				[22, 0, 0],
			];

			const baseParams: GuideBaseParams = {
				baseWidthMm: 6.0,
				baseHeightMm: 3.5,
				baseZMFloor: 0.0,
				padS: 0.04,
				sampleCount: 40,
				wallThicknessMm: 1.5,
			};

			const integrity = validateGuideStructuralIntegrity(implants, baseCenterline, baseParams);
			const housings = planSleeveHousings(implants, 1.5, baseCenterline, baseParams);

			const protocol = formatSurgicalGuideAssemblyA4Protocol({
				patientName: "Барабаш Сергей Владимирович",
				patientBirthDate: "14.03.1982",
				cardId: "D-40912",
				doctorName: "д-р Смирнов К.И.",
				clinicName: "Стоматологическая клиника ДЕНТЕ",
				procedureDate: "2026-09-12",
				archType: "mandible",
				implants,
				baseParams,
				baseCenterline,
				housings,
				integrity,
				notes: "Установка навигационных втулок диаметром 5.0 мм под пилотное сверло 2.0 мм.",
			});

			// Verify expected clinical sections
			assert.ok(protocol.includes("МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ"));
			assert.ok(protocol.includes("ФОРМА 043/У"));
			assert.ok(protocol.includes("ПРОТОКОЛ МОДЕЛИРОВАНИЯ И СБОРКИ НАВИГАЦИОННОГО ХИРУРГИЧЕСКОГО ШАБЛОНА"));
			assert.ok(protocol.includes("Барабаш Сергей Владимирович"));
			assert.ok(protocol.includes("1. ПАРАМЕТРЫ БАЗИСНОЙ БАЛКИ ШАБЛОНА"));
			assert.ok(protocol.includes("2. СПЕЦИФИКАЦИЯ НАПРАВЛЯЮЩИХ ВТУЛОК"));
			assert.ok(protocol.includes("3. АНАЛИЗ ГЕОМЕТРИЧЕСКОЙ СВЯЗНОСТИ И МЕЖВТУЛОЧНЫХ ЗАЗОРОВ"));
			assert.ok(protocol.includes("4. ДИАГНОСТИЧЕСКОЕ ЗАКЛЮЧЕНИЕ И ПРИГОДНОСТЬ К 3D-ПЕЧАТИ"));
			assert.ok(protocol.includes("ВЕРДИКТ: ШАБЛОН ДОПУЩЕН К ПРОИЗВОДСТВУ"));

			// Mandate 8d Item 7: STRICT ZERO EMOJIS AUDIT
			const emojiRegex =
				/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
			assert.equal(
				emojiRegex.test(protocol),
				false,
				"Form 043/u protocol MUST contain strictly 0 emojis per Mandate 8d #7",
			);
		});
	});

	// ── 7. Zod Schema Round-Trip Validation ───────────────────────────

	describe("7. Zod Schema Verification", () => {
		it("validates valid input and rejects malformed values", () => {
			const validImplant = {
				entry: [1.0, 2.0, 3.0],
				axis: [0, 0, 1],
				length: 11.5,
				sleeveDiameter: 5.0,
				sleeveOffset: 2.5,
				sleeveHeight: 4.0,
				toothNumber: 16,
			};
			assert.doesNotThrow(() => guideImplantInputSchema.parse(validImplant));

			// Invalid: negative length
			assert.throws(() =>
				guideImplantInputSchema.parse({
					...validImplant,
					length: -5,
				}),
			);

			// Base params with defaults
			const parsedBase = guideBaseParamsSchema.parse({
				baseZMFloor: -15.5,
			});
			assert.equal(parsedBase.baseWidthMm, 6.0);
			assert.equal(parsedBase.baseHeightMm, 3.5);
			assert.equal(parsedBase.padS, 0.04);
			assert.equal(parsedBase.sampleCount, 40);
		});
	});
});
