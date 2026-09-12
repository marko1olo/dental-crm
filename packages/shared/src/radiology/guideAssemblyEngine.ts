/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT RADIOLOGY: SURGICAL GUIDE ASSEMBLY & SLEEVE CONNECTIVITY
 * ═══════════════════════════════════════════════════════════════════════════
 * Pure mathematical engine for dental surgical navigation template modeling,
 * base arch centerline planning, sleeve housing geometry generation, and
 * structural integrity validation (inter-sleeve gap & base connectivity).
 *
 * Reverse-engineered & adapted from DenCT core/guideBuilder.ts & core/guideGeom.ts.
 * Wave 137 Implementation. 100% pure TypeScript, zero DOM/WASM dependencies.
 * Standards: Russian Form 043/u, Mandates 8d #7, 8e, 8n (100% Zero Emojis).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { Point2, Vec3 } from "./cprMath.js";
import {
	archFrameAt,
	nearestArchFrame,
	distSegmentToPolyline3,
	distSegmentToSegment3,
} from "./cbctSafetyEngine.js";

export type { Point2, Vec3 };

// ── Physical & Clinical Constants ─────────────────────────────────

/** Minimum safe resin clearance between adjacent guide sleeve housings (mm) */
export const MIN_INTER_SLEEVE_DISTANCE_MM = 1.5;

/** Minimum cross-section width for printable guide base bar (mm) */
export const MIN_BASE_WIDTH_MM = 3.0;

/** Minimum cross-section height along Z for printable guide base bar (mm) */
export const MIN_BASE_HEIGHT_MM = 2.5;

/** Default outer resin wall thickness around metal drill bushings (mm) */
export const DEFAULT_HOUSING_WALL_THICKNESS_MM = 1.5;

/** Standard arch length parameter padding on both ends of implant span */
export const DEFAULT_ARCH_PAD_S = 0.04;

/** Standard number of arc-length sample segments along base centerline */
export const DEFAULT_BASE_SAMPLE_COUNT = 40;

// ── Vector Math Utilities ─────────────────────────────────────────

export const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export const point2Schema = z.tuple([z.number(), z.number()]);

function norm3(v: Vec3): Vec3 {
	const l = Math.hypot(v[0], v[1], v[2]);
	return l > 1e-9 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 0, 1];
}

function dist3(a: Vec3, b: Vec3): number {
	return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * Calculates total 3D arc length along an ordered polyline.
 */
export function calculatePolylineLength3(poly: readonly Vec3[]): number {
	let length = 0;
	for (let i = 0; i < poly.length - 1; i++) {
		const a = poly[i]!;
		const b = poly[i + 1]!;
		length += dist3(a, b);
	}
	return length;
}

// ── Zod Schemas & Types ───────────────────────────────────────────

/**
 * Input descriptor for a planned implant participating in surgical guide assembly.
 */
export const guideImplantInputSchema = z.object({
	/** Coronal platform bone entry point coordinates [X, Y, Z] in mm */
	entry: vec3Schema,
	/** Unit vector directed along insertion path (entry -> apex) */
	axis: vec3Schema,
	/** Fixture length in mm */
	length: z.number().positive(),
	/** Outer diameter of the metal drill sleeve bushing in mm */
	sleeveDiameter: z.number().positive(),
	/** Offset from platform to sleeve bottom along axis in mm */
	sleeveOffset: z.number().nonnegative(),
	/** Height of the metal sleeve cylinder along axis in mm */
	sleeveHeight: z.number().positive(),
	/** Optional tooth number according to FDI 11-48 */
	toothNumber: z.number().int().optional(),
});
export type GuideImplantInput = z.infer<typeof guideImplantInputSchema>;

/**
 * Surgical guide template base bar geometry parameters.
 */
export const guideBaseParamsSchema = z.object({
	/** Width of the swept base bar cross-section in mm. Default: 6.0 mm */
	baseWidthMm: z.number().positive().optional().default(6.0),
	/** Height of the swept base bar cross-section in mm. Default: 3.5 mm */
	baseHeightMm: z.number().positive().optional().default(3.5),
	/** Baseline Z floor coordinate for the template base in mm */
	baseZMFloor: z.number(),
	/** Curve parameter padding beyond outermost implants. Default: 0.04 */
	padS: z.number().min(0).max(0.5).optional().default(0.04),
	/** Resampling sample count along base curve. Default: 40 */
	sampleCount: z.number().int().min(2).max(500).optional().default(40),
	/** Outer resin wall thickness around sleeve. Default: 1.5 mm */
	wallThicknessMm: z.number().positive().optional().default(1.5),
});
export type GuideBaseParams = z.input<typeof guideBaseParamsSchema>;
export type GuideBaseParamsOutput = z.output<typeof guideBaseParamsSchema>;

/**
 * Geometric definition of the external resin sleeve housing tower.
 */
export const sleeveHousingGeometrySchema = z.object({
	/** Outer diameter of the printed resin housing cylinder in mm */
	outerDiameter: z.number().positive(),
	/** Height of the housing cylinder along the axis in mm */
	height: z.number().positive(),
	/** Radial resin wall thickness around the metal sleeve in mm */
	wallThickness: z.number().positive(),
	/** Occlusal top center point of the housing cylinder [X, Y, Z] */
	cylinderAxisA: vec3Schema,
	/** Basal/platform bottom center point of the housing cylinder [X, Y, Z] */
	cylinderAxisB: vec3Schema,
	/** True if housing geometrically intersects/connects to the guide base bar */
	isConnected: z.boolean(),
});
export type SleeveHousingGeometry = z.infer<typeof sleeveHousingGeometrySchema>;

/**
 * Pairwise clearance analysis between two adjacent guide sleeve housings.
 */
export const interSleeveClearanceSchema = z.object({
	implantIndexA: z.number().int().nonnegative(),
	implantIndexB: z.number().int().nonnegative(),
	toothNumberA: z.number().int().optional(),
	toothNumberB: z.number().int().optional(),
	/** Surface-to-surface distance in mm (negative = physical collision) */
	distanceMm: z.number(),
	/** Center-axis to center-axis shortest segment distance in mm */
	centerDistanceMm: z.number(),
	/** True if housings physically collide/overlap (distance < 0) */
	isCollision: z.boolean(),
	/** True if clearance meets or exceeds clinical minimum (>= 1.5 mm) */
	isAdequate: z.boolean(),
});
export type InterSleeveClearance = z.infer<typeof interSleeveClearanceSchema>;

/**
 * Result of surgical guide structural integrity validation.
 */
export const guideIntegrityResultSchema = z.object({
	/** Overall validity flag: all tests passed with zero blocking errors */
	isValid: z.boolean(),
	/** True if every sleeve housing is securely anchored to the base bar */
	allHousingsConnected: z.boolean(),
	/** Smallest clearance between any pair of sleeve housings in mm */
	minInterSleeveDistanceMm: z.number(),
	/** True if any pair of sleeve housings overlap (distance < 0) */
	hasInterSleeveCollisions: z.boolean(),
	/** True if base bar width >= 3.0 mm and height >= 2.5 mm */
	baseDimensionsValid: z.boolean(),
	baseWidthMm: z.number(),
	baseHeightMm: z.number(),
	warnings: z.array(z.string()),
	errors: z.array(z.string()),
	housings: z.array(sleeveHousingGeometrySchema),
	interSleeveClearances: z.array(interSleeveClearanceSchema),
});
export type GuideIntegrityResult = z.infer<typeof guideIntegrityResultSchema>;

/**
 * Parameters for generating an official Russian Form 043/u A4 surgical protocol.
 */
export const surgicalGuideAssemblyReportParamsSchema = z.object({
	patientName: z.string().optional().default("Не указан"),
	patientBirthDate: z.string().optional(),
	cardId: z.string().optional().default("б/н"),
	doctorName: z.string().optional().default("Врач-стоматолог"),
	clinicName: z.string().optional().default("Стоматологическая клиника"),
	procedureDate: z.string().optional(),
	archType: z.enum(["mandible", "maxilla"]).optional().default("mandible"),
	implants: z.array(guideImplantInputSchema),
	baseParams: guideBaseParamsSchema,
	baseCenterline: z.array(vec3Schema),
	housings: z.array(sleeveHousingGeometrySchema),
	integrity: guideIntegrityResultSchema,
	resinMaterial: z.string().optional().default("Medical Class I/IIa Surgical Guide Resin"),
	printerTechnology: z.string().optional().default("SLA / DLP 3D Printing"),
	notes: z.string().optional(),
});
export type SurgicalGuideAssemblyReportParams = z.input<
	typeof surgicalGuideAssemblyReportParamsSchema
>;
export type SurgicalGuideAssemblyReportParamsOutput = z.output<
	typeof surgicalGuideAssemblyReportParamsSchema
>;

// ── Pure Algorithmic Core ─────────────────────────────────────────

/**
 * Plans the 3D centerline for the surgical guide base bar along the dental arch curve.
 * Samples the arch over the guided implants' arc span (+padding), lifted to `baseZ`.
 *
 * @param controlPoints Catmull-Rom dental arch 2D spline control points
 * @param entries Coronal entry points [X, Y, Z] of all planned implants
 * @param baseZ Z level (elevation) for the base bar centerline in mm
 * @param padS Normalized arc length padding (0..0.5). Default: 0.04
 * @param samples Number of linear segments along the resampled curve. Default: 40
 */
export function planBaseCenterline(
	controlPoints: Point2[],
	entries: Vec3[],
	baseZ: number,
	padS: number = DEFAULT_ARCH_PAD_S,
	samples: number = DEFAULT_BASE_SAMPLE_COUNT,
): Vec3[] {
	if (entries.length === 0 || controlPoints.length < 2) return [];

	let sMin = 1.0;
	let sMax = 0.0;
	for (const e of entries) {
		const af = nearestArchFrame(controlPoints, [e[0], e[1]]);
		if (!af) continue;
		sMin = Math.min(sMin, af.s);
		sMax = Math.max(sMax, af.s);
	}

	if (sMin > sMax) return [];

	sMin = Math.max(0, sMin - padS);
	sMax = Math.min(1, sMax + padS);
	if (sMax <= sMin) {
		sMax = Math.min(1, sMin + 1e-3);
	}

	const pts: Vec3[] = [];
	const numSamples = Math.max(2, Math.floor(samples));
	for (let i = 0; i <= numSamples; i++) {
		const s = sMin + (sMax - sMin) * (i / numSamples);
		const af = archFrameAt(controlPoints, s);
		if (af) {
			pts.push([af.point[0], af.point[1], baseZ]);
		}
	}
	return pts;
}

/**
 * Analytical verification of whether a sleeve housing is geometrically connected
 * to the template base bar.
 *
 * A housing counts as connected when its cylinder axis passes within
 * (housingRadius + half the base cross-section) of the base centerline AND
 * the housing's vertical Z span overlaps the base bar slab.
 *
 * Catches housings that clearly miss the bar (e.g. implants placed far buccal).
 *
 * @param axisA Occlusal top endpoint of housing cylinder
 * @param axisB Basal bottom endpoint of housing cylinder
 * @param housingRadius Outer radius of the printed sleeve tower in mm
 * @param baseCenterline Base bar polyline points [X, Y, Z]
 * @param baseWidthMm Width of base bar cross-section in mm
 * @param baseHeightMm Height of base bar cross-section in mm
 */
export function isHousingConnectedToBase(
	axisA: Vec3,
	axisB: Vec3,
	housingRadius: number,
	baseCenterline: Vec3[],
	baseWidthMm: number,
	baseHeightMm: number,
): boolean {
	if (baseCenterline.length < 2) return false;

	const baseZ = baseCenterline[0]![2];
	const zMin = Math.min(axisA[2], axisB[2]);
	const zMax = Math.max(axisA[2], axisB[2]);

	// Vertical overlap check: housing cylinder Z span must intersect base slab
	if (zMax < baseZ - baseHeightMm / 2 || zMin > baseZ + baseHeightMm / 2) {
		return false;
	}

	// Lateral reach: housing outer radius + half of maximum base dimension
	const reach = housingRadius + Math.max(baseWidthMm, baseHeightMm) / 2;
	return distSegmentToPolyline3(axisA, axisB, baseCenterline) <= reach;
}

/**
 * Plans the 3D geometry of external resin sleeve housings for all planned implants.
 *
 * @param implants Array of planned guided implants
 * @param wallThicknessMm Outer resin wall thickness in mm (default: 1.5 mm)
 * @param baseCenterline Optional base bar centerline for connectivity check
 * @param baseParams Optional base bar parameters for connectivity check
 */
export function planSleeveHousings(
	implants: GuideImplantInput[],
	wallThicknessMm: number = DEFAULT_HOUSING_WALL_THICKNESS_MM,
	baseCenterline?: Vec3[],
	baseParams?: GuideBaseParams,
): SleeveHousingGeometry[] {
	const wall = Math.max(0.1, wallThicknessMm);

	return implants.map((imp) => {
		const outerDiameter = imp.sleeveDiameter + 2 * wall;
		const housingRadius = outerDiameter / 2;
		const sleeveTop = -(imp.sleeveOffset + imp.sleeveHeight);

		const axisNorm = norm3(imp.axis);
		const cylinderAxisA: Vec3 = [
			imp.entry[0] + axisNorm[0] * sleeveTop,
			imp.entry[1] + axisNorm[1] * sleeveTop,
			imp.entry[2] + axisNorm[2] * sleeveTop,
		];
		const cylinderAxisB: Vec3 = [imp.entry[0], imp.entry[1], imp.entry[2]];

		const height = dist3(cylinderAxisA, cylinderAxisB);

		let isConnected = false;
		if (baseCenterline && baseParams && baseCenterline.length >= 2) {
			const parsedBase = guideBaseParamsSchema.parse(baseParams);
			isConnected = isHousingConnectedToBase(
				cylinderAxisA,
				cylinderAxisB,
				housingRadius,
				baseCenterline,
				parsedBase.baseWidthMm,
				parsedBase.baseHeightMm,
			);
		}

		return {
			outerDiameter,
			height,
			wallThickness: wall,
			cylinderAxisA,
			cylinderAxisB,
			isConnected,
		};
	});
}

/**
 * Validates the complete structural integrity of a planned surgical guide template:
 *  1. Clearance between adjacent sleeve housings (must be >= 1.5 mm).
 *  2. Verification that all sleeve housings are anchored to the base bar.
 *  3. Base bar dimensions compliance (width >= 3.0 mm, height >= 2.5 mm).
 *  4. Base centerline geometry verification (>= 2 points).
 *
 * @param implants Planned guided implants
 * @param baseCenterline Base bar polyline
 * @param baseParams Base bar dimensions and parameters
 */
export function validateGuideStructuralIntegrity(
	implants: GuideImplantInput[],
	baseCenterline: Vec3[],
	baseParamsInput: GuideBaseParams,
): GuideIntegrityResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	const baseParams = guideBaseParamsSchema.parse(baseParamsInput);
	const baseWidth = baseParams.baseWidthMm;
	const baseHeight = baseParams.baseHeightMm;
	const wallThickness = baseParams.wallThicknessMm;

	// 1. Check Base Dimensions
	const baseWidthValid = baseWidth >= MIN_BASE_WIDTH_MM;
	const baseHeightValid = baseHeight >= MIN_BASE_HEIGHT_MM;
	const baseDimensionsValid = baseWidthValid && baseHeightValid;

	if (!baseWidthValid) {
		errors.push(
			`Ширина базиса шаблона (${baseWidth.toFixed(1)} мм) меньше допустимого минимума (${MIN_BASE_WIDTH_MM.toFixed(1)} мм)`,
		);
	}
	if (!baseHeightValid) {
		errors.push(
			`Высота базиса шаблона (${baseHeight.toFixed(1)} мм) меньше допустимого минимума (${MIN_BASE_HEIGHT_MM.toFixed(1)} мм)`,
		);
	}

	// 2. Check Base Centerline
	if (baseCenterline.length < 2) {
		errors.push("Базисная осевая линия шаблона содержит менее 2 опорных точек");
	}

	// 3. Plan Housings & Check Connectivity
	const housings = planSleeveHousings(implants, wallThickness, baseCenterline, baseParams);

	if (implants.length === 0) {
		errors.push("Отсутствуют установленные имплантаты для формирования хирургического шаблона");
	}

	for (let i = 0; i < implants.length; i++) {
		const imp = implants[i]!;
		const housing = housings[i]!;
		const toothLabel = imp.toothNumber ? `зуба ${imp.toothNumber}` : `имплантата #${i + 1}`;
		if (!housing.isConnected) {
			errors.push(
				`Втулка ${toothLabel} оторвана от базиса шаблона (detached floating sleeve: нарушена связность)`,
			);
		}
	}

	const allHousingsConnected = housings.length > 0 && housings.every((h) => h.isConnected);

	// 4. Pairwise Inter-Sleeve Clearance Analysis
	const clearances: InterSleeveClearance[] = [];
	let minInterSleeveDistanceMm = implants.length >= 2 ? Infinity : 999.0;
	let hasInterSleeveCollisions = false;

	for (let i = 0; i < implants.length; i++) {
		for (let j = i + 1; j < implants.length; j++) {
			const hA = housings[i]!;
			const hB = housings[j]!;
			const impA = implants[i]!;
			const impB = implants[j]!;

			const centerDist = distSegmentToSegment3(
				hA.cylinderAxisA,
				hA.cylinderAxisB,
				hB.cylinderAxisA,
				hB.cylinderAxisB,
			);
			const surfaceGap = centerDist - (hA.outerDiameter / 2 + hB.outerDiameter / 2);

			if (surfaceGap < minInterSleeveDistanceMm) {
				minInterSleeveDistanceMm = surfaceGap;
			}

			const isCollision = surfaceGap < 0;
			const isAdequate = surfaceGap >= MIN_INTER_SLEEVE_DISTANCE_MM;

			if (isCollision) {
				hasInterSleeveCollisions = true;
			}

			const nameA = impA.toothNumber ? `зуба ${impA.toothNumber}` : `имплантата #${i + 1}`;
			const nameB = impB.toothNumber ? `зуба ${impB.toothNumber}` : `имплантата #${j + 1}`;

			if (isCollision) {
				errors.push(
					`Коллизия направляющих втулок между ${nameA} и ${nameB}: взаимное пересечение стаканов на ${Math.abs(surfaceGap).toFixed(2)} мм`,
				);
			} else if (!isAdequate) {
				errors.push(
					`Недостаточный зазор между втулками ${nameA} и ${nameB}: ${surfaceGap.toFixed(2)} мм (минимально допустимо >= ${MIN_INTER_SLEEVE_DISTANCE_MM.toFixed(1)} мм)`,
				);
			}

			clearances.push({
				implantIndexA: i,
				implantIndexB: j,
				toothNumberA: impA.toothNumber,
				toothNumberB: impB.toothNumber,
				distanceMm: surfaceGap,
				centerDistanceMm: centerDist,
				isCollision,
				isAdequate,
			});
		}
	}

	const isValid =
		errors.length === 0 &&
		allHousingsConnected &&
		baseDimensionsValid &&
		(implants.length < 2 || minInterSleeveDistanceMm >= MIN_INTER_SLEEVE_DISTANCE_MM);

	return {
		isValid,
		allHousingsConnected,
		minInterSleeveDistanceMm: implants.length >= 2 ? minInterSleeveDistanceMm : 999.0,
		hasInterSleeveCollisions,
		baseDimensionsValid,
		baseWidthMm: baseWidth,
		baseHeightMm: baseHeight,
		warnings,
		errors,
		housings,
		interSleeveClearances: clearances,
	};
}

// ── Official Form 043/u A4 Clinical Protocol Generator ────────────

/**
 * Formats a formal Russian Form 043/u A4 clinical protocol for surgical guide modeling.
 * Strictly ZERO emojis per Mandate 8d item 7.
 */
export function formatSurgicalGuideAssemblyA4Protocol(
	params: SurgicalGuideAssemblyReportParams,
): string {
	const parsed = surgicalGuideAssemblyReportParamsSchema.parse(params);
	const dateStr = parsed.procedureDate ?? new Date().toISOString().split("T")[0]!;
	const archNameRu = parsed.archType === "maxilla" ? "Верхняя челюсть" : "Нижняя челюсть";
	const baseArcLength = calculatePolylineLength3(parsed.baseCenterline);

	const lines: string[] = [];

	lines.push("═══════════════════════════════════════════════════════════════════════════");
	lines.push("          МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ");
	lines.push("           МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА 043/У)");
	lines.push("       ПРОТОКОЛ МОДЕЛИРОВАНИЯ И СБОРКИ НАВИГАЦИОННОГО ХИРУРГИЧЕСКОГО ШАБЛОНА");
	lines.push("═══════════════════════════════════════════════════════════════════════════");
	lines.push("");
	lines.push(`Клиника:          ${parsed.clinicName}`);
	lines.push(`Врач:             ${parsed.doctorName}`);
	lines.push(`Пациент:          ${parsed.patientName}${parsed.patientBirthDate ? ` (д.р. ${parsed.patientBirthDate})` : ""}`);
	lines.push(`Медицинская карта: ${parsed.cardId}`);
	lines.push(`Дата протокола:   ${dateStr}`);
	lines.push(`Анатомическая зона: ${archNameRu}`);
	lines.push(`Технология печати: ${parsed.printerTechnology}`);
	lines.push(`Материал базиса:   ${parsed.resinMaterial}`);
	lines.push("");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push("1. ПАРАМЕТРЫ БАЗИСНОЙ БАЛКИ ШАБЛОНА");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push(`- Ширина сечения базиса:      ${parsed.baseParams.baseWidthMm.toFixed(1)} мм (норма >= ${MIN_BASE_WIDTH_MM.toFixed(1)} мм)`);
	lines.push(`- Высота сечения базиса:     ${parsed.baseParams.baseHeightMm.toFixed(1)} мм (норма >= ${MIN_BASE_HEIGHT_MM.toFixed(1)} мм)`);
	lines.push(`- Базовый Z-уровень балки:    ${parsed.baseParams.baseZMFloor.toFixed(2)} мм`);
	lines.push(`- Количество опорных точек:   ${parsed.baseCenterline.length}`);
	lines.push(`- Длина осевой дуги базиса:   ${baseArcLength.toFixed(1)} мм`);
	lines.push(`- Статус геометрии базиса:    ${parsed.integrity.baseDimensionsValid ? "СООТВЕТСТВУЕТ СТАНДАРТУ" : "НАРУШЕНИЕ ГАБАРИТОВ"}`);
	lines.push("");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push("2. СПЕЦИФИКАЦИЯ НАПРАВЛЯЮЩИХ ВТУЛОК И ТИТАНОВЫХ ШАХТ");
	lines.push("───────────────────────────────────────────────────────────────────────────");

	if (parsed.implants.length === 0) {
		lines.push("Имплантаты не заданы.");
	} else {
		lines.push(
			"Зуб   Платформа (X, Y, Z) мм       Втулка D  Стакан D  Оффсет  Высота  Связность",
		);
		lines.push(
			"───────────────────────────────────────────────────────────────────────────",
		);
		for (let i = 0; i < parsed.implants.length; i++) {
			const imp = parsed.implants[i]!;
			const h = parsed.housings[i];
			const tooth = imp.toothNumber ? String(imp.toothNumber).padEnd(4) : `#${i + 1}  `;
			const pos = `[${imp.entry[0].toFixed(1)}, ${imp.entry[1].toFixed(1)}, ${imp.entry[2].toFixed(1)}]`.padEnd(26);
			const sDiam = `${imp.sleeveDiameter.toFixed(1)} мм`.padEnd(9);
			const oDiam = h ? `${h.outerDiameter.toFixed(1)} мм`.padEnd(9) : "---      ";
			const off = `${imp.sleeveOffset.toFixed(1)} мм`.padEnd(7);
			const hgt = `${imp.sleeveHeight.toFixed(1)} мм`.padEnd(7);
			const conn = h?.isConnected ? "СВЯЗАНА" : "ОТОРВАНА";

			lines.push(`${tooth}  ${pos}  ${sDiam} ${oDiam} ${off} ${hgt} ${conn}`);
		}
	}

	lines.push("");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push("3. АНАЛИЗ ГЕОМЕТРИЧЕСКОЙ СВЯЗНОСТИ И МЕЖВТУЛОЧНЫХ ЗАЗОРОВ");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push(
		`- Связность всех втулок с базисом:   ${parsed.integrity.allHousingsConnected ? "ОБЕСПЕЧЕНА (100%)" : "НАРУШЕНА (ЕСТЬ ОТОРВАННЫЕ ВТУЛКИ)"}`,
	);
	lines.push(
		`- Минимальный зазор между втулками: ${parsed.implants.length >= 2 ? `${parsed.integrity.minInterSleeveDistanceMm.toFixed(2)} мм` : "N/A (одиночный имплантат)"} (норма >= ${MIN_INTER_SLEEVE_DISTANCE_MM.toFixed(1)} мм)`,
	);
	lines.push(
		`- Физические коллизии стаканов:      ${parsed.integrity.hasInterSleeveCollisions ? "ОБНАРУЖЕНЫ ПЕРЕСЕЧЕНИЯ" : "ОТСУТСТВУЮТ"}`,
	);

	if (parsed.integrity.interSleeveClearances.length > 0) {
		lines.push("");
		lines.push("Попарный анализ зазоров между смежными втулками:");
		for (const cl of parsed.integrity.interSleeveClearances) {
			const labelA = cl.toothNumberA ? `зуб ${cl.toothNumberA}` : `#${cl.implantIndexA + 1}`;
			const labelB = cl.toothNumberB ? `зуб ${cl.toothNumberB}` : `#${cl.implantIndexB + 1}`;
			const status = cl.isCollision
				? "ПЕРЕСЕЧЕНИЕ"
				: cl.isAdequate
					? "НОРМА"
					: "ДЕФИЦИТ ЗАЗОРА";
			lines.push(
				`  * ${labelA} <-> ${labelB}: зазор ${cl.distanceMm.toFixed(2)} мм (осевое расст. ${cl.centerDistanceMm.toFixed(2)} мм) -> [${status}]`,
			);
		}
	}

	lines.push("");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push("4. ДИАГНОСТИЧЕСКОЕ ЗАКЛЮЧЕНИЕ И ПРИГОДНОСТЬ К 3D-ПЕЧАТИ");
	lines.push("───────────────────────────────────────────────────────────────────────────");

	if (parsed.integrity.isValid) {
		lines.push("ВЕРДИКТ: ШАБЛОН ДОПУЩЕН К ПРОИЗВОДСТВУ (3D-ПЕЧАТЬ РАЗРЕШЕНА)");
		lines.push("Геометрическая целостность, толщина перемычек и связность втулок подтверждены.");
	} else {
		lines.push("ВЕРДИКТ: БРАК МОДЕЛИРОВАНИЯ - ТРЕБУЕТСЯ КОРРЕКЦИЯ ДО ВЫВОДА НА ПЕЧАТЬ");
		lines.push("Обнаружены критические несоответствия клиническим критериям безопасности:");
		for (const err of parsed.integrity.errors) {
			lines.push(`  [ОШИБКА] ${err}`);
		}
	}

	if (parsed.integrity.warnings.length > 0) {
		lines.push("Предостережения:");
		for (const warn of parsed.integrity.warnings) {
			lines.push(`  [ПРЕДУПРЕЖДЕНИЕ] ${warn}`);
		}
	}

	if (parsed.notes) {
		lines.push("");
		lines.push(`Клинические примечания: ${parsed.notes}`);
	}

	lines.push("");
	lines.push("───────────────────────────────────────────────────────────────────────────");
	lines.push("Врач-стоматолог-хирург: ____________________ / " + parsed.doctorName);
	lines.push("Оператор 3D-моделирования: _________________ / Лаборатория CAD/CAM");
	lines.push("═══════════════════════════════════════════════════════════════════════════");

	return lines.join("\n");
}
