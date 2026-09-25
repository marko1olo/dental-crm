/**
 * DENTE DENTAL CRM — 2D Radiology Viewer Mathematical and Clinical Engine
 * Calibrated distance calculations, FDI tooth quadrant mappings, W/L presets.
 */

export interface ViewerPoint2D {
	x: number;
	y: number;
}

export interface ViewerRulerMeasurement {
	id: string;
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	lengthMm: number;
	label?: string;
	color?: string;
}

export interface ClinicalWlPreset {
	id: string;
	label: string;
	shortLabel: string;
	description: string;
	brightness: number; // 0..200 (100 = default)
	contrast: number; // 0..300 (100 = default)
	invert: boolean;
	gamma: number; // 0.5..2.0
}

/** Standard pixel spacing in millimeters for dental modalities */
export const DEFAULT_MODALITY_PIXEL_SPACING = {
	rvg: 0.04, // 25 lp/mm CCD/CMOS sensor (KaVo, Vatech, Carestream)
	intraoral_rvg: 0.04,
	periapical: 0.04,
	bitewing: 0.04,
	opg: 0.1, // Panoramic digital sensor
	optg_panoramic: 0.1,
	cbct: 0.125, // 125 micron typical dental CBCT voxel
	cbct_3d: 0.125,
	cbct_slice: 0.125,
	other: 0.08,
} as const;

export type DentalModalityKey = keyof typeof DEFAULT_MODALITY_PIXEL_SPACING;

/** High-utility dental radiography presets */
export const CLINICAL_2D_WL_PRESETS: readonly ClinicalWlPreset[] = [
	{
		id: "standard",
		label: "Стандарт",
		shortLabel: "Стандарт",
		description: "Естественная гамма и сбалансированная плотность снимка",
		brightness: 100,
		contrast: 100,
		invert: false,
		gamma: 1.0,
	},
	{
		id: "endo",
		label: "Эндодонтия",
		shortLabel: "Эндо",
		description: "Повышенный контраст для визуализации апекса, устьев и качества обтурации каналов",
		brightness: 110,
		contrast: 175,
		invert: false,
		gamma: 0.9,
	},
	{
		id: "implant_bone",
		label: "Кость / Импланты",
		shortLabel: "Импланты",
		description: "Подавление засветов металла и визуализация кортикальной пластинки альвеолы",
		brightness: 85,
		contrast: 220,
		invert: false,
		gamma: 1.2,
	},
	{
		id: "negative_invert",
		label: "Негатив (Инверсия)",
		shortLabel: "Негатив",
		description: "Инвертированное рентгеновское отображение для выявления микротрещин и очагов деструкции",
		brightness: 100,
		contrast: 125,
		invert: true,
		gamma: 1.0,
	},
	{
		id: "soft_tissue",
		label: "Мягкие ткани / Пазухи",
		shortLabel: "Ткани",
		description: "Контрастирование слизистой гайморовых пазух и десневого края",
		brightness: 125,
		contrast: 135,
		invert: false,
		gamma: 1.1,
	},
];

/**
 * Calculates real physical distance in millimeters between two points on the radiograph.
 * @param p1 Point 1 in image pixel coordinates
 * @param p2 Point 2 in image pixel coordinates
 * @param mmPerPixel Spatial calibration factor (mm per image pixel)
 */
export function calculatePhysicalDistanceMm(
	p1: ViewerPoint2D,
	p2: ViewerPoint2D,
	mmPerPixel: number,
): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const pixelDistance = Math.hypot(dx, dy);
	const distanceMm = pixelDistance * mmPerPixel;
	return Math.round(distanceMm * 10) / 10;
}

/** Formats millimeters with Russian unit suffix */
export function formatDistanceMm(distanceMm: number): string {
	return `${distanceMm.toFixed(1)} мм`;
}

/**
 * Calibrates mm/pixel ratio based on a known reference distance (e.g. known implant width or 10mm ball).
 */
export function calibrateSpatialScale(
	p1: ViewerPoint2D,
	p2: ViewerPoint2D,
	knownPhysicalMm: number,
): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const pixelDistance = Math.hypot(dx, dy);
	if (pixelDistance <= 0 || knownPhysicalMm <= 0) return 0.04;
	return knownPhysicalMm / pixelDistance;
}

/**
 * Standard adult FDI tooth numbers partitioned by quadrants.
 */
export const FDI_QUADRANTS = {
	q1_upper_right: ["18", "17", "16", "15", "14", "13", "12", "11"],
	q2_upper_left: ["21", "22", "23", "24", "25", "26", "27", "28"],
	q3_lower_left: ["38", "37", "36", "35", "34", "33", "32", "31"],
	q4_lower_right: ["41", "42", "43", "44", "45", "46", "47", "48"],
} as const;

/** All 32 permanent teeth */
export const ALL_FDI_TEETH = [
	...FDI_QUADRANTS.q1_upper_right,
	...FDI_QUADRANTS.q2_upper_left,
	...FDI_QUADRANTS.q3_lower_left,
	...FDI_QUADRANTS.q4_lower_right,
] as const;

/** Checks if string is a valid FDI permanent tooth number */
export function isValidFdiTooth(code: string): boolean {
	const num = Number.parseInt(code, 10);
	if (Number.isNaN(num)) return false;
	const quadrant = Math.floor(num / 10);
	const toothIndex = num % 10;
	return quadrant >= 1 && quadrant <= 4 && toothIndex >= 1 && toothIndex <= 8;
}

/** Standard anatomical names of teeth for tooltip and patient presentation */
export const TOOTH_ANATOMICAL_NAMES: Record<string, string> = {
	"11": "Центральный резец ВЧ справа",
	"12": "Боковой резец ВЧ справа",
	"13": "Клык ВЧ справа",
	"14": "Первый премоляр ВЧ справа",
	"15": "Второй премоляр ВЧ справа",
	"16": "Первый моляр ВЧ справа",
	"17": "Второй моляр ВЧ справа",
	"18": "Третий моляр (зуб мудрости) ВЧ справа",
	"21": "Центральный резец ВЧ слева",
	"22": "Боковой резец ВЧ слева",
	"23": "Клык ВЧ слева",
	"24": "Первый премоляр ВЧ слева",
	"25": "Второй премоляр ВЧ слева",
	"26": "Первый моляр ВЧ слева",
	"27": "Второй моляр ВЧ слева",
	"28": "Третий моляр (зуб мудрости) ВЧ слева",
	"31": "Центральный резец НЧ слева",
	"32": "Боковой резец НЧ слева",
	"33": "Клык НЧ слева",
	"34": "Первый премоляр НЧ слева",
	"35": "Второй премоляр НЧ слева",
	"36": "Первый моляр НЧ слева",
	"37": "Второй моляр НЧ слева",
	"38": "Третий моляр (зуб мудрости) НЧ слева",
	"41": "Центральный резец НЧ справа",
	"42": "Боковой резец НЧ справа",
	"43": "Клык НЧ справа",
	"44": "Первый премоляр НЧ справа",
	"45": "Второй премоляр НЧ справа",
	"46": "Первый моляр НЧ справа",
	"47": "Второй моляр НЧ справа",
	"48": "Третий моляр (зуб мудрости) НЧ справа",
};
