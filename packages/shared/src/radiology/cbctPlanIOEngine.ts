/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT SURGICAL PLAN PERSISTENCE & CASE IO ENGINE (WAVE 131)
 * ═══════════════════════════════════════════════════════════════════════════
 * Reverse-engineered & adapted from DenCT (Dental-CBCT-Viewer planIO.ts):
 * - Strict Zod schemas for dental implant surgical plans (FDI 11..48 notation)
 * - Deterministic serialization & robust deserialization with memory exhaustion guards
 * - Memory protection: caps on implants (100), canal points (2000), arch points (200)
 * - Coordinate sanitization: drops/filters NaN and Infinity injections
 * - DICOM StudyInstanceUID & PatientId mismatch detection against active viewer context
 * - Official Form 043/u A4 clinical implantology protocol (Strictly 0 emojis, Mandate 8d)
 *
 * 100% pure TypeScript, zero DOM/VTK dependencies, 100% unit-testable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

// ── Constants & Limits ─────────────────────────────────────────

export const PLAN_IO_VERSION = 1;

export const MAX_PLAN_IMPLANTS = 100;
export const MAX_CANAL_SPLINE_POINTS = 2000;
export const MAX_ARCH_CONTROL_POINTS = 200;
export const MAX_FIXATION_PINS = 50;
export const MAX_CANALS_COUNT = 20;

// ── FDI Tooth Notation Helper ──────────────────────────────────

/**
 * Validates permanent dentition FDI two-digit notation (11..18, 21..28, 31..38, 41..48).
 */
export function isValidPermanentFdiToothNumber(tooth: number): boolean {
	if (!Number.isInteger(tooth)) return false;
	const quadrant = Math.floor(tooth / 10);
	const index = tooth % 10;
	return quadrant >= 1 && quadrant <= 4 && index >= 1 && index <= 8;
}

// ── Zod Schemas ────────────────────────────────────────────────

export const vec3TupleSchema = z.tuple([
	z.number().finite(),
	z.number().finite(),
	z.number().finite(),
]);

export const vec2TupleSchema = z.tuple([
	z.number().finite(),
	z.number().finite(),
]);

export const fixationPinTupleSchema = z.tuple([
	z.number().finite(),
	z.number().finite(),
	z.number().finite(),
	z.number().finite(),
	z.number().finite(),
	z.number().finite(),
]);

/**
 * Single planned dental implant item.
 */
export const implantPlanItemSchema = z.object({
	id: z.string().min(1),
	toothNumber: z
		.number()
		.int()
		.refine(isValidPermanentFdiToothNumber, {
			message:
				"Tooth number must be a valid permanent FDI two-digit notation (11..18, 21..28, 31..38, 41..48)",
		}),
	implantModel: z.string().min(1).default("Standard"),
	lengthMm: z.number().finite().positive(),
	diameterMm: z.number().finite().positive(),
	platformDiameterMm: z.number().finite().positive(),
	position: vec3TupleSchema,
	direction: vec3TupleSchema,
	rollDeg: z.number().finite().default(0),
	safetyMarginMm: z.number().finite().nonnegative().default(1.5),
});

/**
 * Mandibular nerve canal (IAN) traced 3D spline & mental foramen.
 */
export const nerveCanalPlanSchema = z.object({
	id: z.string().min(1),
	side: z.enum(["left", "right"]),
	points: z.array(vec3TupleSchema).max(MAX_CANAL_SPLINE_POINTS),
	mentalForamen: vec3TupleSchema.nullish().default(null),
});

/**
 * Dental arch curve & panoramic CPR reconstruction parameters.
 */
export const projectionModeSchema = z.preprocess((val) => {
	if (typeof val === "string") {
		const lower = val.toLowerCase().trim();
		if (lower === "avg") return "average";
		return lower;
	}
	return val;
}, z.enum(["mip", "average", "minip"]));

export const archCurvePlanSchema = z.object({
	controlPoints: z.array(vec2TupleSchema).max(MAX_ARCH_CONTROL_POINTS),
	slabWidthMm: z.number().finite().positive().default(20),
	projectionMode: projectionModeSchema.default("mip"),
	resolutionMm: z.number().finite().positive().default(0.3),
	crossSectionPosition: z.number().finite().min(0).max(1).default(0.5),
	crossSectionTiltDeg: z.number().finite().default(0),
});

/**
 * Surgical drill guide parameters & anchor fixation pins.
 */
export const surgicalGuidePlanSchema = z.object({
	sleeveDiameterMm: z.number().finite().positive().default(5.0),
	sleeveHeightMm: z.number().finite().positive().default(4.0),
	offsetClearanceMm: z.number().finite().nonnegative().default(0.2),
	wallThicknessMm: z.number().finite().positive().default(2.5),
	fixationPins: z.array(fixationPinTupleSchema).max(MAX_FIXATION_PINS).default([]),
});

/**
 * Anatomical safety clearance limit thresholds.
 */
export const safetyLimitsSchema = z.object({
	minCanalDistanceMm: z.number().finite().nonnegative().default(2.0),
	minRootDistanceMm: z.number().finite().nonnegative().default(1.5),
	minCorticalClearanceMm: z.number().finite().nonnegative().default(1.0),
});

/**
 * Complete CBCT surgical plan case document.
 */
export const planCaseSchema = z.object({
	version: z.number().int().positive().default(PLAN_IO_VERSION),
	savedAt: z.string().min(1),
	studyInstanceUID: z.string().nullish().default(null),
	seriesInstanceUID: z.string().nullish().default(null),
	patientId: z.string().nullish().default(null),
	doctorId: z.string().nullish().default(null),
	implants: z.array(implantPlanItemSchema).max(MAX_PLAN_IMPLANTS).default([]),
	nerveCanals: z.array(nerveCanalPlanSchema).max(MAX_CANALS_COUNT).default([]),
	archCurve: archCurvePlanSchema.nullish().default(null),
	surgicalGuide: surgicalGuidePlanSchema.nullish().default(null),
	safetyLimits: safetyLimitsSchema.default({
		minCanalDistanceMm: 2.0,
		minRootDistanceMm: 1.5,
		minCorticalClearanceMm: 1.0,
	}),
	notes: z.string().default(""),
});

// ── Inferred Types ─────────────────────────────────────────────

export type ImplantPlanItem = z.infer<typeof implantPlanItemSchema>;
export type NerveCanalPlan = z.infer<typeof nerveCanalPlanSchema>;
export type ArchCurvePlan = z.infer<typeof archCurvePlanSchema>;
export type SurgicalGuidePlan = z.infer<typeof surgicalGuidePlanSchema>;
export type SafetyLimits = z.infer<typeof safetyLimitsSchema>;
export type PlanCase = z.infer<typeof planCaseSchema>;

export interface ActiveRadiologyContext {
	studyInstanceUID?: string;
	patientId?: string;
}

export interface PlanCaseValidationResult {
	isValid: boolean;
	plan: PlanCase | null;
	warnings: string[];
	errors: string[];
	studyMismatch: boolean;
	patientMismatch: boolean;
}

// ── Serialization & Parsing ────────────────────────────────────

/**
 * Deterministically serializes a validated PlanCase document into formatted JSON.
 */
export function serializePlanCase(plan: PlanCase): string {
	const validated = planCaseSchema.parse(plan);
	return JSON.stringify(validated, null, 2);
}

/**
 * Sanitizes and validates untrusted raw plan JSON.
 * Defends against:
 * 1. Memory exhaustion (limits max implants to 100, canal points to 2000, arch points to 200)
 * 2. NaN / Infinity injection in spatial coordinates and geometric dimensions
 * 3. DICOM StudyInstanceUID and PatientId mismatches with active session
 */
export function parseAndSanitizePlanCase(
	rawJson: string,
	activeContext?: ActiveRadiologyContext,
): PlanCaseValidationResult {
	const warnings: string[] = [];
	const errors: string[] = [];

	if (typeof rawJson !== "string" || rawJson.trim().length === 0) {
		return {
			isValid: false,
			plan: null,
			warnings: [],
			errors: ["Строка данных плана пуста или имеет неверный тип."],
			studyMismatch: false,
			patientMismatch: false,
		};
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(rawJson);
	} catch (err) {
		return {
			isValid: false,
			plan: null,
			warnings: [],
			errors: [
				`Синтаксическая ошибка JSON: ${err instanceof Error ? err.message : String(err)}`,
			],
			studyMismatch: false,
			patientMismatch: false,
		};
	}

	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		return {
			isValid: false,
			plan: null,
			warnings: [],
			errors: ["Корневой элемент документа плана должен быть объектом."],
			studyMismatch: false,
			patientMismatch: false,
		};
	}

	const root = { ...(parsed as Record<string, unknown>) };

	// 1. Memory Exhaustion & NaN/Infinity protection for Implants
	if (Array.isArray(root.implants)) {
		const rawImplants = root.implants;
		if (rawImplants.length > MAX_PLAN_IMPLANTS) {
			warnings.push(
				`Превышен лимит имплантатов (${rawImplants.length} > ${MAX_PLAN_IMPLANTS}), массив усечен до ${MAX_PLAN_IMPLANTS}.`,
			);
		}
		const bounded = rawImplants.slice(0, MAX_PLAN_IMPLANTS);
		const sanitizedImplants: unknown[] = [];

		for (const imp of bounded) {
			if (!imp || typeof imp !== "object" || Array.isArray(imp)) continue;
			const item = imp as Record<string, unknown>;

			const pos = item.position;
			const dir = item.direction;
			const isPosValid =
				Array.isArray(pos) &&
				pos.length === 3 &&
				pos.every((n) => typeof n === "number" && Number.isFinite(n));
			const isDirValid =
				Array.isArray(dir) &&
				dir.length === 3 &&
				dir.every((n) => typeof n === "number" && Number.isFinite(n));

			const isDimsValid =
				typeof item.lengthMm === "number" &&
				Number.isFinite(item.lengthMm) &&
				typeof item.diameterMm === "number" &&
				Number.isFinite(item.diameterMm) &&
				typeof item.platformDiameterMm === "number" &&
				Number.isFinite(item.platformDiameterMm);

			if (!isPosValid || !isDirValid || !isDimsValid) {
				warnings.push(
					`Имплантат [ID: ${String(item.id ?? "неизвестно")}] содержит невалидные координаты или размеры (NaN/Infinity) и был отсечен.`,
				);
				continue;
			}

			sanitizedImplants.push(item);
		}
		root.implants = sanitizedImplants;
	}

	// 2. Memory Exhaustion & NaN/Infinity protection for Nerve Canals
	if (Array.isArray(root.nerveCanals)) {
		const rawCanals = root.nerveCanals.slice(0, MAX_CANALS_COUNT);
		const sanitizedCanals: unknown[] = [];

		for (const canal of rawCanals) {
			if (!canal || typeof canal !== "object" || Array.isArray(canal)) continue;
			const item = { ...(canal as Record<string, unknown>) };

			if (Array.isArray(item.points)) {
				if (item.points.length > MAX_CANAL_SPLINE_POINTS) {
					warnings.push(
						`Канал [ID: ${String(item.id ?? "неизвестно")}]: превышен лимит точек (${item.points.length} > ${MAX_CANAL_SPLINE_POINTS}), сплайн усечен.`,
					);
				}
				item.points = item.points
					.slice(0, MAX_CANAL_SPLINE_POINTS)
					.filter(
						(p) =>
							Array.isArray(p) &&
							p.length === 3 &&
							p.every((n) => typeof n === "number" && Number.isFinite(n)),
					);
			}

			if (item.mentalForamen !== null && item.mentalForamen !== undefined) {
				const mf = item.mentalForamen;
				const isMfValid =
					Array.isArray(mf) &&
					mf.length === 3 &&
					mf.every((n) => typeof n === "number" && Number.isFinite(n));
				if (!isMfValid) {
					warnings.push(
						`Канал [ID: ${String(item.id ?? "неизвестно")}]: невалидные координаты ментального отверстия (NaN/Infinity), сброшено в null.`,
					);
					item.mentalForamen = null;
				}
			}

			sanitizedCanals.push(item);
		}
		root.nerveCanals = sanitizedCanals;
	}

	// 3. Memory Exhaustion & NaN/Infinity protection for Arch Curve
	if (root.archCurve && typeof root.archCurve === "object" && !Array.isArray(root.archCurve)) {
		const curve = { ...(root.archCurve as Record<string, unknown>) };
		if (Array.isArray(curve.controlPoints)) {
			if (curve.controlPoints.length > MAX_ARCH_CONTROL_POINTS) {
				warnings.push(
					`Кривая зубной дуги: превышен лимит точек (${curve.controlPoints.length} > ${MAX_ARCH_CONTROL_POINTS}), массив усечен.`,
				);
			}
			curve.controlPoints = curve.controlPoints
				.slice(0, MAX_ARCH_CONTROL_POINTS)
				.filter(
					(p) =>
						Array.isArray(p) &&
						p.length === 2 &&
						p.every((n) => typeof n === "number" && Number.isFinite(n)),
				);
		}

		if (typeof curve.slabWidthMm === "number" && !Number.isFinite(curve.slabWidthMm)) {
			curve.slabWidthMm = 20;
			warnings.push("Кривая дуги: толщина слоя (slabWidthMm) содержала NaN/Infinity, сброшена в 20 мм.");
		}
		if (typeof curve.resolutionMm === "number" && !Number.isFinite(curve.resolutionMm)) {
			curve.resolutionMm = 0.3;
			warnings.push("Кривая дуги: разрешение (resolutionMm) содержало NaN/Infinity, сброшено в 0.3 мм.");
		}
		if (
			typeof curve.crossSectionPosition === "number" &&
			!Number.isFinite(curve.crossSectionPosition)
		) {
			curve.crossSectionPosition = 0.5;
			warnings.push("Кривая дуги: позиция кросс-секции содержала NaN/Infinity, сброшена в 0.5.");
		}
		if (
			typeof curve.crossSectionTiltDeg === "number" &&
			!Number.isFinite(curve.crossSectionTiltDeg)
		) {
			curve.crossSectionTiltDeg = 0;
			warnings.push("Кривая дуги: наклон кросс-секции содержал NaN/Infinity, сброшен в 0.");
		}

		root.archCurve = curve;
	}

	// 4. Memory Exhaustion & NaN/Infinity protection for Surgical Guide
	if (
		root.surgicalGuide &&
		typeof root.surgicalGuide === "object" &&
		!Array.isArray(root.surgicalGuide)
	) {
		const guide = { ...(root.surgicalGuide as Record<string, unknown>) };
		if (Array.isArray(guide.fixationPins)) {
			if (guide.fixationPins.length > MAX_FIXATION_PINS) {
				warnings.push(
					`Хирургический шаблон: превышен лимит пинов (${guide.fixationPins.length} > ${MAX_FIXATION_PINS}), усечен.`,
				);
			}
			guide.fixationPins = guide.fixationPins
				.slice(0, MAX_FIXATION_PINS)
				.filter(
					(pin) =>
						Array.isArray(pin) &&
						pin.length === 6 &&
						pin.every((n) => typeof n === "number" && Number.isFinite(n)),
				);
		}
		root.surgicalGuide = guide;
	}

	// Validate against Zod schema
	const parseResult = planCaseSchema.safeParse(root);
	if (!parseResult.success) {
		for (const issue of parseResult.error.issues) {
			errors.push(`${issue.path.join(".")}: ${issue.message}`);
		}
		return {
			isValid: false,
			plan: null,
			warnings,
			errors,
			studyMismatch: false,
			patientMismatch: false,
		};
	}

	const plan = parseResult.data;
	let studyMismatch = false;
	let patientMismatch = false;

	// 5. Detection of StudyInstanceUID / PatientId mismatches
	if (activeContext?.studyInstanceUID && plan.studyInstanceUID) {
		if (plan.studyInstanceUID.trim() !== activeContext.studyInstanceUID.trim()) {
			studyMismatch = true;
			warnings.push(
				`Несоответствие исследования: план был сохранен для StudyInstanceUID "${plan.studyInstanceUID}", а активное исследование "${activeContext.studyInstanceUID}".`,
			);
		}
	}

	if (activeContext?.patientId && plan.patientId) {
		if (plan.patientId.trim() !== activeContext.patientId.trim()) {
			patientMismatch = true;
			warnings.push(
				`Несоответствие пациента: план был сохранен для пациента "${plan.patientId}", а в сессии открыт пациент "${activeContext.patientId}".`,
			);
		}
	}

	return {
		isValid: true,
		plan,
		warnings,
		errors: [],
		studyMismatch,
		patientMismatch,
	};
}

// ── Official Form 043/u A4 Protocol Generation ─────────────────

const f1 = (n: number): string => n.toFixed(1);
const f2 = (n: number): string => n.toFixed(2);
const f3 = (n: number): string => n.toFixed(3);

/**
 * Generates an official clinical Form 043/u A4 surgical implant planning protocol.
 * Conforms strictly to Mandate 8d item 7: STRICTLY 0 CARTOON EMOJIS.
 */
export function formatSurgicalPlanForm043A4Protocol(plan: PlanCase): string {
	const lines: string[] = [
		"================================================================================",
		"РЕГЛАМЕНТНЫЙ ХИРУРГИЧЕСКИЙ ПРОТОКОЛ ПЛАНИРОВАНИЯ ИМПЛАНТАЦИИ (ФОРМА 043/У)",
		"КЛИНИЧЕСКИЙ ПЛАН ОПЕРАЦИИ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ ПО ДАННЫМ КЛКТ",
		"================================================================================",
		`Версия схемы плана                : Ревизия ${plan.version}`,
		`Дата и время фиксации плана       : ${plan.savedAt}`,
		`Идентификатор пациента            : ${plan.patientId ?? "Не указан"}`,
		`Лечащий хирург-имплантолог        : ${plan.doctorId ?? "Не указан"}`,
		`Идентификатор исследования (UID)  : ${plan.studyInstanceUID ?? "Не привязан"}`,
		`Серия томографии КЛКТ (Series UID): ${plan.seriesInstanceUID ?? "Не привязана"}`,
		"",
		"--------------------------------------------------------------------------------",
		"1. СПЕЦИФИКАЦИЯ И 3D КООРДИНАТЫ ПЛАНИРУЕМЫХ ИМПЛАНТАТОВ",
		"--------------------------------------------------------------------------------",
	];

	if (plan.implants.length === 0) {
		lines.push("Запланированные имплантаты отсутствуют.");
	} else {
		lines.push(`Всего запланировано имплантатов: ${plan.implants.length}`);
		lines.push("");

		for (let i = 0; i < plan.implants.length; i++) {
			const imp = plan.implants[i]!;
			lines.push(`Позиция №${i + 1} | Зуб по FDI: ${imp.toothNumber} | ID: ${imp.id}`);
			lines.push(`  Модель имплантата                 : ${imp.implantModel}`);
			lines.push(`  Длина тела (L)                    : ${f1(imp.lengthMm)} мм`);
			lines.push(`  Диаметр тела (D)                  : ${f1(imp.diameterMm)} мм`);
			lines.push(`  Диаметр ортопедической платформы  : ${f1(imp.platformDiameterMm)} мм`);
			lines.push(
				`  Точка входа платформы (Entry XYZ) : [${f2(imp.position[0])}, ${f2(imp.position[1])}, ${f2(imp.position[2])}] мм`,
			);
			lines.push(
				`  Вектор оси установки (Unit Dir)   : [${f3(imp.direction[0])}, ${f3(imp.direction[1])}, ${f3(imp.direction[2])}]`,
			);
			lines.push(`  Осевой крен платформы (Roll)      : ${f1(imp.rollDeg)} град.`);
			lines.push(`  Индивидуальный коридор безопасности: >= ${f1(imp.safetyMarginMm)} мм`);
			if (i < plan.implants.length - 1) {
				lines.push("  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -");
			}
		}
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("2. АНАТОМИЧЕСКИЕ СТРУКТУРЫ РИСКА (НИЖНЕЧЕЛЮСТНЫЕ КАНАЛЫ)");
	lines.push("--------------------------------------------------------------------------------");

	if (plan.nerveCanals.length === 0) {
		lines.push("Трассировка нижнечелюстных каналов (IAN) не зафиксирована.");
	} else {
		lines.push(`Всего трассировано каналов: ${plan.nerveCanals.length}`);
		for (let i = 0; i < plan.nerveCanals.length; i++) {
			const canal = plan.nerveCanals[i]!;
			const sideLabel = canal.side === "left" ? "Левая сторона (Left)" : "Правая сторона (Right)";
			lines.push(`Канал №${i + 1} [ID: ${canal.id}] | Сторона: ${sideLabel}`);
			lines.push(`  Количество опорных точек сплайна  : ${canal.points.length}`);
			if (canal.mentalForamen) {
				lines.push(
					`  Ментальное отверстие (Foramen XYZ): [${f2(canal.mentalForamen[0])}, ${f2(canal.mentalForamen[1])}, ${f2(canal.mentalForamen[2])}] мм`,
				);
			} else {
				lines.push("  Ментальное отверстие              : Не отмечено");
			}
		}
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("3. ПАНОРАМНАЯ РЕКОНСТРУКЦИЯ И КРИВАЯ ЗУБНОЙ ДУГИ (CPR)");
	lines.push("--------------------------------------------------------------------------------");

	if (plan.archCurve) {
		const curve = plan.archCurve;
		lines.push(`Количество контрольных точек дуги  : ${curve.controlPoints.length}`);
		lines.push(`Толщина слоя среза (Slab Width)    : ${f1(curve.slabWidthMm)} мм`);
		lines.push(`Режим проекции плотности           : ${curve.projectionMode.toUpperCase()}`);
		lines.push(`Разрешение панорамного слоя        : ${f2(curve.resolutionMm)} мм/пикс`);
		lines.push(`Позиция кросс-секции               : ${f1(curve.crossSectionPosition * 100)} %`);
		lines.push(`Наклон плоскости кросс-секции      : ${f1(curve.crossSectionTiltDeg)} град.`);
	} else {
		lines.push("Зубная дуга не размечена.");
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("4. СПЕЦИФИКАЦИЯ НАВИГАЦИОННОГО ХИРУРГИЧЕСКОГО ШАБЛОНА");
	lines.push("--------------------------------------------------------------------------------");

	if (plan.surgicalGuide) {
		const guide = plan.surgicalGuide;
		lines.push(`Внутренний диаметр втулок (Sleeve) : ${f1(guide.sleeveDiameterMm)} мм`);
		lines.push(`Высота направляющих втулок         : ${f1(guide.sleeveHeightMm)} мм`);
		lines.push(`Технологический зазор посадки      : ${f2(guide.offsetClearanceMm)} мм`);
		lines.push(`Толщина каркаса шаблона (Wall)     : ${f1(guide.wallThicknessMm)} мм`);
		lines.push(`Количество пинов фиксации          : ${guide.fixationPins.length}`);
		if (guide.fixationPins.length > 0) {
			for (let p = 0; p < guide.fixationPins.length; p++) {
				const pin = guide.fixationPins[p]!;
				lines.push(
					`  Пин №${p + 1}: Позиция [${f1(pin[0])}, ${f1(pin[1])}, ${f1(pin[2])}], Направление [${f2(pin[3])}, ${f2(pin[4])}, ${f2(pin[5])}]`,
				);
			}
		}
	} else {
		lines.push("Навигационный хирургический шаблон не спланирован.");
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("5. РЕГЛАМЕНТНЫЕ ПОРОГИ БЕЗОПАСНОСТИ");
	lines.push("--------------------------------------------------------------------------------");
	lines.push(
		`Минимальный зазор до канала IAN    : ${f1(plan.safetyLimits.minCanalDistanceMm)} мм (Порог >= 2.0 мм)`,
	);
	lines.push(
		`Минимальный зазор до корней зубов  : ${f1(plan.safetyLimits.minRootDistanceMm)} мм (Порог >= 1.5 мм)`,
	);
	lines.push(
		`Минимальный кортикальный зазор     : ${f1(plan.safetyLimits.minCorticalClearanceMm)} мм (Порог >= 1.0 мм)`,
	);

	if (plan.notes) {
		lines.push("");
		lines.push("--------------------------------------------------------------------------------");
		lines.push("6. КЛИНИЧЕСКИЕ ПРИМЕЧАНИЯ И ОСОБЫЕ УКАЗАНИЯ");
		lines.push("--------------------------------------------------------------------------------");
		lines.push(plan.notes);
	}

	lines.push("");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("7. ЮРИДИЧЕСКОЕ ЗАКЛЮЧЕНИЕ И ПОДПИСЬ ВРАЧА");
	lines.push("--------------------------------------------------------------------------------");
	lines.push("План хирургической операции дентальной имплантации сформирован на основе");
	lines.push("данных КЛКТ-томографии в строгом соответствии со стандартами клинических");
	lines.push("рекомендаций СтАР (Стоматологической ассоциации России).");
	lines.push("");
	lines.push(`Врач хирург-имплантолог: ____________________ / ${plan.doctorId ?? "..."} /`);
	lines.push("");
	lines.push("М.П. Клиники");
	lines.push("================================================================================");

	return lines.join("\n");
}
