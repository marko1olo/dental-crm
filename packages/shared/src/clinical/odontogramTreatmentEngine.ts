/**
 * packages/shared/src/clinical/odontogramTreatmentEngine.ts
 *
 * DENTE Dental CRM — Odontogram Multi-Tooth Treatment & Surface Condition Engine (Wave 131).
 * Reverse-engineered & adapted from DentalPin odontogram module (constants.py, models.py, schemas.py, service.py).
 *
 * Clinical & Regulatory Standards:
 * - FDI World Dental Federation / ISO 3950 Two-Digit Notation (11..48 adult, 51..85 child).
 * - 5 Anatomical Tooth Surfaces: Mesial (M), Distal (D), Occlusal/Incisal (O), Vestibular (V), Lingual/Palatal (L).
 * - Mandate 8e: 1-click physiological norm preset ("All teeth healthy/intact").
 * - Multi-tooth bridge prosthetics with pillar (abutment), pontic (artificial tooth), and cantilever roles.
 * - Arch continuity and contiguous span validation for multi-tooth restorations.
 * - WHO / Minzdrav RF Caries-Missing-Filled index (индекс КПУ зубов: К, П, У).
 * - Official Russian Ministry of Health Form 043/u Ambulatory Card Protocol (Strictly 0 emojis per Mandate 8d item 7).
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// FDI TOOTH CONSTANTS & QUADRANTS (ISO 3950)
// ─────────────────────────────────────────────────────────────────────────────

/** FDI Permanent Teeth Quadrant 1 (Upper Right / 18..11) */
export const PERMANENT_TEETH_QUADRANT_1 = [18, 17, 16, 15, 14, 13, 12, 11] as const;

/** FDI Permanent Teeth Quadrant 2 (Upper Left / 21..28) */
export const PERMANENT_TEETH_QUADRANT_2 = [21, 22, 23, 24, 25, 26, 27, 28] as const;

/** FDI Permanent Teeth Quadrant 3 (Lower Left / 31..38) */
export const PERMANENT_TEETH_QUADRANT_3 = [31, 32, 33, 34, 35, 36, 37, 38] as const;

/** FDI Permanent Teeth Quadrant 4 (Lower Right / 48..41) */
export const PERMANENT_TEETH_QUADRANT_4 = [48, 47, 46, 45, 44, 43, 42, 41] as const;

/** All 32 permanent teeth (Adult) */
export const PERMANENT_TEETH = [
	...PERMANENT_TEETH_QUADRANT_1,
	...PERMANENT_TEETH_QUADRANT_2,
	...PERMANENT_TEETH_QUADRANT_3,
	...PERMANENT_TEETH_QUADRANT_4,
] as const;

/** FDI Deciduous Teeth Quadrant 5 (Upper Right / 55..51) */
export const DECIDUOUS_TEETH_QUADRANT_5 = [55, 54, 53, 52, 51] as const;

/** FDI Deciduous Teeth Quadrant 6 (Upper Left / 61..65) */
export const DECIDUOUS_TEETH_QUADRANT_6 = [61, 62, 63, 64, 65] as const;

/** FDI Deciduous Teeth Quadrant 7 (Lower Left / 71..75) */
export const DECIDUOUS_TEETH_QUADRANT_7 = [71, 72, 73, 74, 75] as const;

/** FDI Deciduous Teeth Quadrant 8 (Lower Right / 85..81) */
export const DECIDUOUS_TEETH_QUADRANT_8 = [85, 84, 83, 82, 81] as const;

/** All 20 deciduous teeth (Child) */
export const DECIDUOUS_TEETH = [
	...DECIDUOUS_TEETH_QUADRANT_5,
	...DECIDUOUS_TEETH_QUADRANT_6,
	...DECIDUOUS_TEETH_QUADRANT_7,
	...DECIDUOUS_TEETH_QUADRANT_8,
] as const;

/** Total 52 teeth tracked across permanent and deciduous dentition */
export const ALL_FDI_TEETH = [...PERMANENT_TEETH, ...DECIDUOUS_TEETH] as const;

/** Upper arch contiguous sequence from right to left (18 to 28) */
export const UPPER_ARCH_SEQUENCE = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
] as const;

/** Lower arch contiguous sequence from right to left (48 to 38) */
export const LOWER_ARCH_SEQUENCE = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
] as const;

/** Deciduous upper arch contiguous sequence (55 to 65) */
export const DECIDUOUS_UPPER_ARCH_SEQUENCE = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65] as const;

/** Deciduous lower arch contiguous sequence (85 to 75) */
export const DECIDUOUS_LOWER_ARCH_SEQUENCE = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75] as const;

// ─────────────────────────────────────────────────────────────────────────────
// TOOTH SURFACES & ANATOMICAL NOMENCLATURE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 5 Standard tooth surfaces according to international dental notation:
 * - M: Mesial (медиальная / к средней линии)
 * - D: Distal (дистальная / от средней линии)
 * - O: Occlusal / Incisal (окклюзионная / режущий край)
 * - V: Vestibular (вестибулярная / щёчная / губная)
 * - L: Lingual / Palatal (язычная / нёбная)
 */
export const TOOTH_SURFACES = ["M", "D", "O", "V", "L"] as const;
export type Surface = (typeof TOOTH_SURFACES)[number];

export const SURFACE_NAMES_RU: Readonly<Record<Surface, string>> = Object.freeze({
	M: "Медиальная (M)",
	D: "Дистальная (D)",
	O: "Окклюзионная/Режущая (O)",
	V: "Вестибулярная (V)",
	L: "Язычная/Нёбная (L)",
});

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL CONDITIONS & PROSTHETIC ROLES
// ─────────────────────────────────────────────────────────────────────────────

/** Clinical tooth conditions stored in odontogram */
export const TOOTH_CONDITIONS = [
	"healthy",
	"caries",
	"filling",
	"crown",
	"missing",
	"root_canal",
	"implant",
	"extraction_indicated",
	"sealant",
	"fracture",
] as const;
export type ToothCondition = (typeof TOOTH_CONDITIONS)[number];

export const CONDITION_LABELS_RU: Readonly<Record<ToothCondition, string>> = Object.freeze({
	healthy: "Здоровый",
	caries: "Кариес",
	filling: "Пломбирован",
	crown: "Искусственная коронка",
	missing: "Отсутствует",
	root_canal: "Эндодонтически лечен",
	implant: "Дентальный имплантат",
	extraction_indicated: "Показано удаление",
	sealant: "Герметик",
	fracture: "Перелом/скол",
});

/** Roles for teeth in bridge / orthopedic multi-tooth constructions */
export const BRIDGE_TOOTH_ROLES = ["pillar", "pontic", "cantilever"] as const;
export type BridgeToothRole = (typeof BRIDGE_TOOTH_ROLES)[number];

export const BRIDGE_ROLE_LABELS_RU: Readonly<Record<BridgeToothRole, string>> = Object.freeze({
	pillar: "Опорный зуб (коронка)",
	pontic: "Промежуточная часть (искусственный зуб)",
	cantilever: "Консольная опора",
});

/** Treatment status */
export const TREATMENT_STATUSES = ["planned", "performed"] as const;
export type TreatmentStatus = (typeof TREATMENT_STATUSES)[number];

/** Dentition type classification */
export const DENTITION_TYPES = ["adult", "child", "mixed"] as const;
export type DentitionType = (typeof DENTITION_TYPES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// ZOD SCHEMAS & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export const toothConditionSchema = z.enum(TOOTH_CONDITIONS);
export const surfaceSchema = z.enum(TOOTH_SURFACES);
export const bridgeToothRoleSchema = z.enum(BRIDGE_TOOTH_ROLES);
export const treatmentStatusSchema = z.enum(TREATMENT_STATUSES);
export const dentitionTypeSchema = z.enum(DENTITION_TYPES);

export interface ToothState {
	toothNumber: number;
	toothType: "permanent" | "deciduous";
	generalCondition: ToothCondition;
	surfaces: Record<Surface, ToothCondition>;
	bridgeRole?: BridgeToothRole;
	bridgeId?: string;
	isDisplaced?: boolean;
	isRotated?: boolean;
	notes?: string;
}

export interface BridgeToothConfig {
	toothNumber: number;
	role: BridgeToothRole;
}

export interface MultiToothTreatment {
	id: string;
	type: "bridge" | "splint";
	material?: string;
	status: TreatmentStatus;
	teeth: BridgeToothConfig[];
	notes?: string;
	createdAt?: string;
}

export interface OdontogramState {
	dentitionType: DentitionType;
	teeth: Record<number, ToothState>;
	treatments: MultiToothTreatment[];
}

export interface OdontogramStats {
	decayed: number; // К (Кариозные)
	filled: number; // П (Пломбированные)
	missing: number; // У (Удаленные / Отсутствующие)
	kpuIndex: number; // КПУ = К + П + У
	intactCount: number; // Интактные зубы
	crownsCount: number; // Коронки
	implantsCount: number; // Имплантаты
	rootCanalsCount: number; // Эндодонтически леченые зубы
	totalTeethTracked: number; // Общее количество зубов в карте
}

export const toothStateSchema = z.object({
	toothNumber: z.number().int(),
	toothType: z.enum(["permanent", "deciduous"]),
	generalCondition: toothConditionSchema,
	surfaces: z.record(surfaceSchema, toothConditionSchema),
	bridgeRole: bridgeToothRoleSchema.optional(),
	bridgeId: z.string().optional(),
	isDisplaced: z.boolean().optional(),
	isRotated: z.boolean().optional(),
	notes: z.string().optional(),
});

export const bridgeToothConfigSchema = z.object({
	toothNumber: z.number().int(),
	role: bridgeToothRoleSchema,
});

export const multiToothTreatmentSchema = z.object({
	id: z.string(),
	type: z.enum(["bridge", "splint"]),
	material: z.string().optional(),
	status: treatmentStatusSchema,
	teeth: z.array(bridgeToothConfigSchema),
	notes: z.string().optional(),
	createdAt: z.string().optional(),
});

export const odontogramStateSchema = z.object({
	dentitionType: dentitionTypeSchema,
	teeth: z.record(z.coerce.number(), toothStateSchema),
	treatments: z.array(multiToothTreatmentSchema),
});

export const odontogramStatsSchema = z.object({
	decayed: z.number().int().nonnegative(),
	filled: z.number().int().nonnegative(),
	missing: z.number().int().nonnegative(),
	kpuIndex: z.number().int().nonnegative(),
	intactCount: z.number().int().nonnegative(),
	crownsCount: z.number().int().nonnegative(),
	implantsCount: z.number().int().nonnegative(),
	rootCanalsCount: z.number().int().nonnegative(),
	totalTeethTracked: z.number().int().nonnegative(),
});

// ─────────────────────────────────────────────────────────────────────────────
// FDI & ANATOMICAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function isPermanentTooth(toothNumber: number): boolean {
	return (PERMANENT_TEETH as readonly number[]).includes(toothNumber);
}

export function isDeciduousTooth(toothNumber: number): boolean {
	return (DECIDUOUS_TEETH as readonly number[]).includes(toothNumber);
}

export function isValidFdiTooth(toothNumber: number): boolean {
	return isPermanentTooth(toothNumber) || isDeciduousTooth(toothNumber);
}

export function getToothDentitionType(toothNumber: number): "permanent" | "deciduous" {
	if (isPermanentTooth(toothNumber)) return "permanent";
	if (isDeciduousTooth(toothNumber)) return "deciduous";
	throw new Error(`Invalid FDI tooth number: ${toothNumber}`);
}

export function getToothArch(toothNumber: number): "upper" | "lower" {
	if (
		(UPPER_ARCH_SEQUENCE as readonly number[]).includes(toothNumber) ||
		(DECIDUOUS_UPPER_ARCH_SEQUENCE as readonly number[]).includes(toothNumber)
	) {
		return "upper";
	}
	if (
		(LOWER_ARCH_SEQUENCE as readonly number[]).includes(toothNumber) ||
		(DECIDUOUS_LOWER_ARCH_SEQUENCE as readonly number[]).includes(toothNumber)
	) {
		return "lower";
	}
	throw new Error(`Invalid FDI tooth number: ${toothNumber}`);
}

export function getArchSequenceForTooth(toothNumber: number): readonly number[] {
	if (isPermanentTooth(toothNumber)) {
		return getToothArch(toothNumber) === "upper" ? UPPER_ARCH_SEQUENCE : LOWER_ARCH_SEQUENCE;
	}
	return getToothArch(toothNumber) === "upper"
		? DECIDUOUS_UPPER_ARCH_SEQUENCE
		: DECIDUOUS_LOWER_ARCH_SEQUENCE;
}

function createDefaultSurfaces(condition: ToothCondition = "healthy"): Record<Surface, ToothCondition> {
	return {
		M: condition,
		D: condition,
		O: condition,
		V: condition,
		L: condition,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE ODONTOGRAM ENGINE METHODS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an intact physiological norm odontogram state in 1 click (Mandate 8e).
 * - 'adult': all 32 permanent teeth (11..48)
 * - 'child': all 20 deciduous teeth (51..85)
 * - 'mixed': all 52 FDI teeth (11..48, 51..85)
 */
export function createIntactOdontogram(dentitionType: DentitionType = "adult"): OdontogramState {
	let toothNumbers: readonly number[];
	if (dentitionType === "adult") {
		toothNumbers = PERMANENT_TEETH;
	} else if (dentitionType === "child") {
		toothNumbers = DECIDUOUS_TEETH;
	} else {
		toothNumbers = ALL_FDI_TEETH;
	}

	const teeth: Record<number, ToothState> = {};
	for (const num of toothNumbers) {
		teeth[num] = {
			toothNumber: num,
			toothType: getToothDentitionType(num),
			generalCondition: "healthy",
			surfaces: createDefaultSurfaces("healthy"),
		};
	}

	return {
		dentitionType,
		teeth,
		treatments: [],
	};
}

/**
 * Applies a condition to specific surfaces or the entire tooth.
 * When surfaces are provided (e.g. MOD caries), only those surfaces are affected.
 * When surfaces is omitted or empty, updates the whole tooth condition and all 5 surfaces.
 */
export function applyToothCondition(
	odontogram: OdontogramState,
	toothNumber: number,
	condition: ToothCondition,
	surfaces?: Surface[],
): OdontogramState {
	if (!isValidFdiTooth(toothNumber)) {
		throw new Error(`Invalid FDI tooth number: ${toothNumber}`);
	}

	const teeth = { ...odontogram.teeth };
	const existing = teeth[toothNumber];
	const toothType = getToothDentitionType(toothNumber);

	const baseTooth: ToothState = existing
		? { ...existing, surfaces: { ...existing.surfaces } }
		: {
				toothNumber,
				toothType,
				generalCondition: "healthy",
				surfaces: createDefaultSurfaces("healthy"),
			};

	if (surfaces && surfaces.length > 0) {
		for (const s of surfaces) {
			if (!TOOTH_SURFACES.includes(s)) {
				throw new Error(`Invalid tooth surface: ${s}. Must be one of ${TOOTH_SURFACES.join(", ")}`);
			}
			baseTooth.surfaces[s] = condition;
		}

		if (condition !== "healthy") {
			baseTooth.generalCondition = condition;
		} else {
			const allHealthy = TOOTH_SURFACES.every((s) => baseTooth.surfaces[s] === "healthy");
			if (allHealthy) {
				baseTooth.generalCondition = "healthy";
			}
		}
	} else {
		baseTooth.generalCondition = condition;
		baseTooth.surfaces = createDefaultSurfaces(condition);
	}

	teeth[toothNumber] = baseTooth;

	return {
		...odontogram,
		teeth,
	};
}

/**
 * Validates and constructs a multi-tooth bridge treatment across abutments (pillars) and pontics.
 * Validates:
 * 1. Minimum 2 teeth in the construction.
 * 2. No duplicate teeth.
 * 3. At least one pillar (abutment) tooth.
 * 4. All teeth must belong to the same dental arch (upper or lower).
 * 5. Teeth must form a strictly contiguous span along the dental arch without gaps.
 */
export function createBridgeTreatment(
	odontogram: OdontogramState,
	teethConfig: BridgeToothConfig[],
	material?: string,
): OdontogramState {
	if (!Array.isArray(teethConfig) || teethConfig.length < 2) {
		throw new Error("Bridge construction requires at least 2 teeth");
	}

	const toothNums = teethConfig.map((t) => t.toothNumber);
	if (new Set(toothNums).size !== toothNums.length) {
		throw new Error("Duplicate tooth numbers in bridge configuration");
	}

	for (const num of toothNums) {
		if (!isValidFdiTooth(num)) {
			throw new Error(`Invalid FDI tooth number in bridge: ${num}`);
		}
	}

	const hasPillar = teethConfig.some((t) => t.role === "pillar");
	if (!hasPillar) {
		throw new Error("Bridge construction requires at least one pillar (abutment) tooth");
	}

	const arches = toothNums.map((n) => getToothArch(n));
	const firstArch = arches[0];
	if (!firstArch || !arches.every((a) => a === firstArch)) {
		throw new Error("All bridge teeth must belong to the same dental arch (upper or lower)");
	}

	// Validate continuity along arch sequence
	const firstTooth = toothNums[0];
	if (firstTooth === undefined) {
		throw new Error("Bridge construction requires at least 2 teeth");
	}
	const archSequence = getArchSequenceForTooth(firstTooth);
	const indices = toothNums.map((n) => archSequence.indexOf(n));
	if (indices.some((idx) => idx === -1)) {
		throw new Error("Bridge teeth belong to incompatible dental arch categories");
	}

	const sortedIndices = [...indices].sort((a, b) => a - b);
	for (let i = 0; i < sortedIndices.length - 1; i++) {
		const currentIdx = sortedIndices[i];
		const nextIdx = sortedIndices[i + 1];
		if (currentIdx === undefined || nextIdx === undefined) {
			continue;
		}
		if (nextIdx !== currentIdx + 1) {
			const toothA = archSequence[currentIdx] ?? "unknown";
			const toothB = archSequence[nextIdx] ?? "unknown";
			throw new Error(
				`Bridge teeth must form a contiguous sequence along the dental arch without gaps. Found gap between tooth ${toothA} and tooth ${toothB}`,
			);
		}
	}

	const bridgeId = `bridge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const newTreatment: MultiToothTreatment = {
		id: bridgeId,
		type: "bridge",
		material: material || "Металлокерамика",
		status: "planned",
		teeth: teethConfig.map((t) => ({ toothNumber: t.toothNumber, role: t.role })),
		createdAt: new Date().toISOString(),
	};

	const updatedTeeth = { ...odontogram.teeth };
	for (const cfg of teethConfig) {
		const existing = updatedTeeth[cfg.toothNumber];
		const toothType = getToothDentitionType(cfg.toothNumber);
		const tooth: ToothState = existing
			? { ...existing, surfaces: { ...existing.surfaces } }
			: {
					toothNumber: cfg.toothNumber,
					toothType,
					generalCondition: "healthy",
					surfaces: createDefaultSurfaces("healthy"),
				};

		tooth.bridgeRole = cfg.role;
		tooth.bridgeId = bridgeId;

		if (cfg.role === "pillar" || cfg.role === "cantilever") {
			if (tooth.generalCondition === "healthy") {
				tooth.generalCondition = "crown";
			}
		} else if (cfg.role === "pontic") {
			tooth.generalCondition = "missing";
			tooth.surfaces = createDefaultSurfaces("missing");
		}

		updatedTeeth[cfg.toothNumber] = tooth;
	}

	return {
		...odontogram,
		teeth: updatedTeeth,
		treatments: [...odontogram.treatments, newTreatment],
	};
}

/**
 * Calculates WHO / Minzdrav RF Caries-Missing-Filled index (КПУ) and clinical statistics.
 * - Decayed (К): teeth with caries, extraction_indicated, or surface caries
 * - Filled (П): non-decayed teeth with fillings or sealants
 * - Missing (У): teeth missing or replaced by pontic
 * - kpuIndex: Decayed + Filled + Missing
 * - intactCount: healthy teeth with all 5 healthy surfaces and no bridge attached
 * - crownsCount: teeth with crown or bridge pillar/cantilever
 * - implantsCount: teeth with dental implant
 * - rootCanalsCount: teeth with endodontic treatment
 */
export function calculateOdontogramStats(odontogram: OdontogramState): OdontogramStats {
	let decayed = 0;
	let filled = 0;
	let missing = 0;
	let intactCount = 0;
	let crownsCount = 0;
	let implantsCount = 0;
	let rootCanalsCount = 0;

	const teethList = Object.values(odontogram.teeth);
	const totalTeethTracked = teethList.length;

	for (const tooth of teethList) {
		const isMissing = tooth.generalCondition === "missing";
		const hasCaries =
			tooth.generalCondition === "caries" ||
			tooth.generalCondition === "extraction_indicated" ||
			TOOTH_SURFACES.some(
				(s) => tooth.surfaces[s] === "caries" || tooth.surfaces[s] === "extraction_indicated",
			);
		const hasFilling =
			!hasCaries &&
			(tooth.generalCondition === "filling" ||
				tooth.generalCondition === "sealant" ||
				TOOTH_SURFACES.some(
					(s) => tooth.surfaces[s] === "filling" || tooth.surfaces[s] === "sealant",
				));

		if (isMissing) {
			missing++;
		} else if (hasCaries) {
			decayed++;
		} else if (hasFilling) {
			filled++;
		}

		const isIntact =
			tooth.generalCondition === "healthy" &&
			!tooth.bridgeRole &&
			TOOTH_SURFACES.every((s) => tooth.surfaces[s] === "healthy");

		if (isIntact) {
			intactCount++;
		}

		if (
			tooth.generalCondition === "crown" ||
			tooth.bridgeRole === "pillar" ||
			tooth.bridgeRole === "cantilever"
		) {
			crownsCount++;
		}

		if (tooth.generalCondition === "implant") {
			implantsCount++;
		}

		if (tooth.generalCondition === "root_canal") {
			rootCanalsCount++;
		}
	}

	const kpuIndex = decayed + filled + missing;

	return {
		decayed,
		filled,
		missing,
		kpuIndex,
		intactCount,
		crownsCount,
		implantsCount,
		rootCanalsCount,
		totalTeethTracked,
	};
}

/**
 * Returns the standardized Russian letter code for Form 043/u table cell.
 */
export function getToothStatusForm043Code(tooth?: ToothState): string {
	if (!tooth) return "-";
	if (tooth.bridgeRole === "pontic") return "ИР";
	if (tooth.generalCondition === "missing") return "О";
	if (tooth.generalCondition === "caries") return "С";
	if (TOOTH_SURFACES.some((s) => tooth.surfaces[s] === "caries")) return "С";
	if (tooth.generalCondition === "filling") return "П";
	if (TOOTH_SURFACES.some((s) => tooth.surfaces[s] === "filling")) return "П";
	if (tooth.generalCondition === "crown") return "К";
	if (tooth.bridgeRole === "pillar" || tooth.bridgeRole === "cantilever") return "К";
	if (tooth.generalCondition === "implant") return "И";
	if (tooth.generalCondition === "root_canal") return "R";
	if (tooth.generalCondition === "extraction_indicated") return "Уд";
	if (tooth.generalCondition === "sealant") return "Г";
	if (tooth.generalCondition === "fracture") return "Фр";
	return "-";
}

/**
 * Formats official Russian Form 043/u dental formula protocol for A4 ambulatory chart.
 * Strictly 0 cartoon emojis per Mandate 8d item 7!
 */
export function formatOdontogramForm043A4Protocol(
	odontogram: OdontogramState,
	patientName = "Не указан",
	doctorName = "Не указан",
): string {
	const stats = calculateOdontogramStats(odontogram);

	const isChild = odontogram.dentitionType === "child";
	const upperRow1 = isChild ? [55, 54, 53, 52, 51] : [18, 17, 16, 15, 14, 13, 12, 11];
	const upperRow2 = isChild ? [61, 62, 63, 64, 65] : [21, 22, 23, 24, 25, 26, 27, 28];
	const lowerRow1 = isChild ? [85, 84, 83, 82, 81] : [48, 47, 46, 45, 44, 43, 42, 41];
	const lowerRow2 = isChild ? [71, 72, 73, 74, 75] : [31, 32, 33, 34, 35, 36, 37, 38];

	const pad = (s: string | number, n = 4) => String(s).padStart(n, " ");

	const upperTeethStr = `${upperRow1.map((t) => pad(t)).join("")}  |${upperRow2.map((t) => pad(t)).join("")}`;
	const upperStatusStr = `${upperRow1.map((t) => pad(getToothStatusForm043Code(odontogram.teeth[t]))).join("")}  |${upperRow2.map((t) => pad(getToothStatusForm043Code(odontogram.teeth[t]))).join("")}`;

	const lowerStatusStr = `${lowerRow1.map((t) => pad(getToothStatusForm043Code(odontogram.teeth[t]))).join("")}  |${lowerRow2.map((t) => pad(getToothStatusForm043Code(odontogram.teeth[t]))).join("")}`;
	const lowerTeethStr = `${lowerRow1.map((t) => pad(t)).join("")}  |${lowerRow2.map((t) => pad(t)).join("")}`;

	const separator = "-".repeat(upperTeethStr.length);

	// Pathology details
	const pathologyList: string[] = [];
	for (const tooth of Object.values(odontogram.teeth)) {
		if (tooth.generalCondition !== "healthy" || tooth.bridgeRole) {
			const affectedSurfaces = TOOTH_SURFACES.filter((s) => tooth.surfaces[s] !== "healthy");
			const surfaceText =
				affectedSurfaces.length > 0
					? ` (поверхности: ${affectedSurfaces.join("")})`
					: "";
			const roleText = tooth.bridgeRole ? ` [${BRIDGE_ROLE_LABELS_RU[tooth.bridgeRole]}]` : "";
			pathologyList.push(
				`Зуб ${tooth.toothNumber}: ${CONDITION_LABELS_RU[tooth.generalCondition]}${surfaceText}${roleText}`,
			);
		}
	}

	const pathologySection =
		pathologyList.length > 0
			? pathologyList.join("\n")
			: "Патологических изменений не выявлено. Зубной ряд интактен.";

	// Orthopedic treatments
	const treatmentsList: string[] = [];
	for (const tr of odontogram.treatments) {
		const teethRoles = tr.teeth
			.map((t) => `${t.toothNumber} (${BRIDGE_ROLE_LABELS_RU[t.role]})`)
			.join(", ");
		treatmentsList.push(
			`- Мостовидный протез [${tr.id}]: состав: ${teethRoles}. Материал: ${tr.material || "Металлокерамика"}. Статус: ${tr.status === "performed" ? "Выполнено" : "Запланировано"}.`,
		);
	}
	const treatmentsSection =
		treatmentsList.length > 0
			? treatmentsList.join("\n")
			: "Ортопедические конструкции не зарегистрированы.";

	const dentitionLabel =
		odontogram.dentitionType === "adult"
			? "Постоянный (взрослый)"
			: odontogram.dentitionType === "child"
				? "Временный (детский)"
				: "Сменный прикус";

	return `МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ
МЕДИЦИНСКАЯ ДОКУМЕНТАЦИЯ: ФОРМА N 043/У
ПРОТОКОЛ СТОМАТОЛОГИЧЕСКОГО ОБСЛЕДОВАНИЯ И ЗУБНАЯ ФОРМУЛА
Пациент: ${patientName}
Врач: ${doctorName}
Вид прикуса: ${dentitionLabel}
================================================================================
1. ЗУБНАЯ ФОРМУЛА (FDI / ISO 3950):

ВЕРХНЯЯ ЧЕЛЮСТЬ (ПРАВЫЙ СЕГМЕНТ | ЛЕВЫЙ СЕГМЕНТ):
Зубы:   ${upperTeethStr}
Статус: ${upperStatusStr}
${separator}
НИЖНЯЯ ЧЕЛЮСТЬ (ПРАВЫЙ СЕГМЕНТ | ЛЕВЫЙ СЕГМЕНТ):
Статус: ${lowerStatusStr}
Зубы:   ${lowerTeethStr}

Условные обозначения:
- : Интактный (здоровый)
С : Кариес
П : Пломбирован
К : Искусственная коронка
И : Дентальный имплантат
R : Эндодонтически леченый зуб
О : Отсутствует
ИР: Промежуточная часть мостовидного протеза (искусственный зуб)
Уд: Показано удаление
Г : Герметик
Фр: Перелом/скол

================================================================================
2. ДЕТАЛЬНЫЙ РЕЕСТР ПАТОЛОГИЙ И РЕСТАВРАЦИЙ:
${pathologySection}

================================================================================
3. ОРТОПЕДИЧЕСКИЕ КОНСТРУКЦИИ:
${treatmentsSection}

================================================================================
4. КЛИНИЧЕСКИЕ ИНДЕКСЫ И СТАТИСТИКА:
- Индекс КПУ (интенсивность кариеса): ${stats.kpuIndex} (К=${stats.decayed}, П=${stats.filled}, У=${stats.missing})
- Число интактных зубов: ${stats.intactCount}
- Искусственных коронок: ${stats.crownsCount}
- Дентальных имплантатов: ${stats.implantsCount}
- Эндодонтически леченых зубов: ${stats.rootCanalsCount}
- Всего зубов в формуле: ${stats.totalTeethTracked}

Документ сформирован в соответствии с Приказом Минздрава РФ N 834н.
Подпись лечащего врача: ____________________ / ${doctorName} /`;
}
