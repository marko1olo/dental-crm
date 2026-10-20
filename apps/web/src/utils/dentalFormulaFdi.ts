/**
 * apps/web/src/utils/dentalFormulaFdi.ts
 *
 * FDI World Dental Federation (ISO 3950) Canonical Clinical Engine for DENTE Dental CRM.
 * 
 * Supports:
 * - Adult permanent dentition (11–48)
 * - Pediatric deciduous dentition (51–85)
 * - Mixed dentition quadrants
 * - Anatomical surfaces MODPV:
 *     M: Medial / Mesial (Медиальная)
 *     O: Occlusal / Incisal (Окклюзионная / Режущий край)
 *     D: Distal (Дистальная)
 *     P: Palatal / Lingual (Небная / Язычная)
 *     V: Vestibular / Buccal / Labial (Вестибулярная / Щечная)
 * - 0-click Tier 1 fast status palette
 * - Non-destructive batch serialization for PostgreSQL 18
 */

export type FdiToothNumber = number;

export type FdiQuadrantId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type ToothSurfaceCode = "M" | "O" | "D" | "P" | "V";

export interface ToothSurfaceDescriptor {
	readonly code: ToothSurfaceCode;
	readonly shortLabel: string;
	readonly fullLabelRu: string;
	readonly description: string;
}

export const FDI_TOOTH_SURFACES: readonly ToothSurfaceDescriptor[] = [
	{
		code: "M",
		shortLabel: "M",
		fullLabelRu: "Медиальная (мезиальная)",
		description: "Передняя контактная поверхность зуба",
	},
	{
		code: "O",
		shortLabel: "O",
		fullLabelRu: "Окклюзионная",
		description: "Жевательная поверхность или режущий край",
	},
	{
		code: "D",
		shortLabel: "D",
		fullLabelRu: "Дистальная",
		description: "Задняя контактная поверхность зуба",
	},
	{
		code: "P",
		shortLabel: "P",
		fullLabelRu: "Небная / Язычная",
		description: "Внутренняя поверхность, обращенная к нёбу или языку",
	},
	{
		code: "V",
		shortLabel: "V",
		fullLabelRu: "Вестибулярная",
		description: "Наружная поверхность, обращенная к губе или щеке",
	},
] as const;

export const ADULT_PERMANENT_TEETH: readonly number[] = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41,
	31, 32, 33, 34, 35, 36, 37, 38,
] as const;

export const PEDIATRIC_PRIMARY_TEETH: readonly number[] = [
	55, 54, 53, 52, 51,
	61, 62, 63, 64, 65,
	85, 84, 83, 82, 81,
	71, 72, 73, 74, 75,
] as const;

export interface QuadrantDefinition {
	readonly id: FdiQuadrantId;
	readonly labelRu: string;
	readonly shortName: string;
	readonly isPrimary: boolean;
	readonly teeth: readonly number[];
}

export const FDI_QUADRANTS: Record<FdiQuadrantId, QuadrantDefinition> = {
	1: {
		id: 1,
		labelRu: "Верхний правый (18–11)",
		shortName: "Q1",
		isPrimary: false,
		teeth: [18, 17, 16, 15, 14, 13, 12, 11],
	},
	2: {
		id: 2,
		labelRu: "Верхний левый (21–28)",
		shortName: "Q2",
		isPrimary: false,
		teeth: [21, 22, 23, 24, 25, 26, 27, 28],
	},
	3: {
		id: 3,
		labelRu: "Нижний левый (31–38)",
		shortName: "Q3",
		isPrimary: false,
		teeth: [31, 32, 33, 34, 35, 36, 37, 38],
	},
	4: {
		id: 4,
		labelRu: "Нижний правый (48–41)",
		shortName: "Q4",
		isPrimary: false,
		teeth: [48, 47, 46, 45, 44, 43, 42, 41],
	},
	5: {
		id: 5,
		labelRu: "Верхний правый молочный (55–51)",
		shortName: "Q5",
		isPrimary: true,
		teeth: [55, 54, 53, 52, 51],
	},
	6: {
		id: 6,
		labelRu: "Верхний левый молочный (61–65)",
		shortName: "Q6",
		isPrimary: true,
		teeth: [61, 62, 63, 64, 65],
	},
	7: {
		id: 7,
		labelRu: "Нижний левый молочный (71–75)",
		shortName: "Q7",
		isPrimary: true,
		teeth: [71, 72, 73, 74, 75],
	},
	8: {
		id: 8,
		labelRu: "Нижний правый молочный (85–81)",
		shortName: "Q8",
		isPrimary: true,
		teeth: [85, 84, 83, 82, 81],
	},
};

/**
 * Validates if the given tooth number belongs to FDI notation.
 */
export function isValidFdiToothNumber(num: number | string): boolean {
	const val = typeof num === "string" ? Number.parseInt(num, 10) : num;
	if (!Number.isFinite(val)) return false;
	return (
		ADULT_PERMANENT_TEETH.includes(val) || PEDIATRIC_PRIMARY_TEETH.includes(val)
	);
}

/**
 * Returns quadrant number (1..8) for a tooth.
 */
export function getFdiQuadrant(toothNumber: number): FdiQuadrantId {
	const q = Math.floor(toothNumber / 10);
	if (q >= 1 && q <= 8) return q as FdiQuadrantId;
	return 1;
}

/**
 * Determines whether a tooth is primary (baby/deciduous).
 */
export function isPrimaryTooth(toothNumber: number): boolean {
	const q = Math.floor(toothNumber / 10);
	return q >= 5 && q <= 8;
}

/**
 * Returns human-readable anatomical name of tooth.
 */
export function getToothAnatomicalNameRu(toothNumber: number): string {
	const tooth = toothNumber % 10;
	const isBaby = isPrimaryTooth(toothNumber);
	const prefix = isBaby ? "Временный " : "";

	switch (tooth) {
		case 1:
			return `${prefix}центральный резец`;
		case 2:
			return `${prefix}боковой резец`;
		case 3:
			return `${prefix}клык`;
		case 4:
			return isBaby ? "первый моляр" : "первый премоляр";
		case 5:
			return isBaby ? "второй моляр" : "второй премоляр";
		case 6:
			return "первый моляр";
		case 7:
			return "второй моляр";
		case 8:
			return "третий моляр (зуб мудрости)";
		default:
			return `Зуб ${toothNumber}`;
	}
}

/**
 * Formats tooth surfaces list into readable clinical suffix.
 * e.g. ["M", "O", "D"] -> "MOD (медиально-окклюзионно-дистальная)"
 */
export function formatSurfacesRu(surfaces?: readonly string[] | null): string {
	if (!surfaces || surfaces.length === 0) return "";
	const upper = surfaces.map((s) => s.toUpperCase());
	const codes = upper.join("");
	const names = upper
		.map((code) => {
			const found = FDI_TOOTH_SURFACES.find((s) => s.code === code);
			return found ? found.fullLabelRu : code;
		})
		.join(", ");
	return `${codes} (${names})`;
}

/**
 * Normalizes clinical state for PostgreSQL 18 persistence.
 */
export function toCanonicalDbToothState(state: string): string {
	const s = String(state || "").trim().toLowerCase();
	if (!s || s === "healthy" || s === "norm" || s === "idle" || s === "0") return "Healthy";
	if (s.includes("caries") || s === "c") return "Caries";
	if (s.includes("pulp") || s === "p") return "Pulpitis";
	if (s.includes("perio") || s === "pt" || s.includes("treatment")) return "Periodontitis";
	if (s.includes("fill") || s.includes("done") || s === "f") return "Filled";
	if (s.includes("crown") || s.includes("cr")) return "Crown";
	if (s.includes("missing") || s.includes("extract") || s === "x") return "Missing";
	if (s.includes("implant") || s.includes("imp")) return "Implant";
	if (s.includes("planned")) return "Planned_Implant";
	if (s.includes("watch")) return "Watch";
	return "Healthy";
}
