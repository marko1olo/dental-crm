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

/**
 * Exact Vatech hardware sensor calibration presets (Ground Truth from EzDent-i VTE2_CalibrationPreset.xml & EzSensor.ini).
 * Prevents clinical measurement errors up to 170% caused by naive 0.04 mm/px hardcodes.
 */
export const VATECH_DEVICE_CALIBRATION_PRESETS: Readonly<Record<string, {
	readonly deviceName: string;
	readonly calMmPerPx: number;
	readonly pixelPitchMicrons: number;
	readonly category: "intraoral_sensor" | "panoramic" | "cephalometric";
	readonly notesRu: string;
}>> = {
	ezsensor_standard: {
		deviceName: "Vatech EzSensor (1.0 / 1.5 / 2.0)",
		calMmPerPx: 0.0350,
		pixelPitchMicrons: 35.0,
		category: "intraoral_sensor",
		notesRu: "Стандартный визиограф EzSensor 1.5 (матрица 686x944, полезная 671x924)",
	},
	ezsensor_soft_hr: {
		deviceName: "Vatech EzSensor Soft (High Resolution)",
		calMmPerPx: 0.0148,
		pixelPitchMicrons: 14.8,
		category: "intraoral_sensor",
		notesRu: "Высокое разрешение EzSensor Soft (33.7 пар линий/мм)",
	},
	ezsensor_soft_normal: {
		deviceName: "Vatech EzSensor Soft / Classic / C / HDI-S (Normal Resolution)",
		calMmPerPx: 0.0296,
		pixelPitchMicrons: 29.6,
		category: "intraoral_sensor",
		notesRu: "Базовое разрешение (биннинг 2x2) EzSensor Soft / Classic / C",
	},
	ezsensor_p: {
		deviceName: "Vatech EzSensor P / HDI2000 (1.5 / 2.0)",
		calMmPerPx: 0.0200,
		pixelPitchMicrons: 20.0,
		category: "intraoral_sensor",
		notesRu: "EzSensor P / HDI2000 субпиксельная матрица",
	},
	pax_i_pano: {
		deviceName: "Vatech PaX-i / PaX-i3D Smart Pano",
		calMmPerPx: 0.0761,
		pixelPitchMicrons: 76.1,
		category: "panoramic",
		notesRu: "Панорамный датчик PaX-i / PaX-i3D Smart (CalX/CalY = 0.07607583 мм/пикс)",
	},
	pax_i_pano_uhd: {
		deviceName: "Vatech PaX-i Pano (UHD)",
		calMmPerPx: 0.0380,
		pixelPitchMicrons: 38.0,
		category: "panoramic",
		notesRu: "Сверхвысокое разрешение панорамы UHD (CalX/CalY = 0.038037915 мм/пикс)",
	},
	pax_reve3d_ceph: {
		deviceName: "Vatech PaX-Reve3D Ceph",
		calMmPerPx: 0.1108,
		pixelPitchMicrons: 110.8,
		category: "cephalometric",
		notesRu: "Телерентгенограмма ТРГ PaX-Reve3D (CalX/CalY = 0.110755645 мм/пикс)",
	},
	pax_i_ceph_scan: {
		deviceName: "Vatech PaX-i Ceph (Scan)",
		calMmPerPx: 0.0873,
		pixelPitchMicrons: 87.3,
		category: "cephalometric",
		notesRu: "Сканирующий ТРГ-цефалостат PaX-i Ceph (0.08733524 мм/пикс)",
	},
};

/**
 * Resolves exact calibrated mm/pixel ratio based on device model string or modality key.
 * Defaults to 0.0350 mm/px for modern RVG sensors (Vatech EzSensor 1.5 standard).
 */
export function resolveCalibratedPixelSpacing(
	deviceOrModality?: string | null,
	fallbackMm = 0.0350,
): number {
	if (!deviceOrModality) return fallbackMm;
	const norm = deviceOrModality.toLowerCase().trim();

	if (norm.includes("soft") && (norm.includes("hr") || norm.includes("high") || norm.includes("14.8"))) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.ezsensor_soft_hr.calMmPerPx;
	}
	if (norm.includes("soft") || norm.includes("classic") || norm.includes("hdi-s") || norm.includes("29.6")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.ezsensor_soft_normal.calMmPerPx;
	}
	if (norm.includes("sensor p") || norm.includes("hdi2000") || norm.includes("20.0") || norm.includes("0.02")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.ezsensor_p.calMmPerPx;
	}
	if (norm.includes("ezsensor") || norm.includes("hdi1000") || norm.includes("ez_sensor") || norm.includes("35.0") || norm.includes("0.035")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.ezsensor_standard.calMmPerPx;
	}
	if (norm.includes("pano") || norm.includes("opg") || norm.includes("optg")) {
		if (norm.includes("uhd")) {
			return VATECH_DEVICE_CALIBRATION_PRESETS.pax_i_pano_uhd.calMmPerPx;
		}
		return VATECH_DEVICE_CALIBRATION_PRESETS.pax_i_pano.calMmPerPx;
	}
	if (norm.includes("ceph") || norm.includes("trg") || norm.includes("tele")) {
		if (norm.includes("scan")) {
			return VATECH_DEVICE_CALIBRATION_PRESETS.pax_i_ceph_scan.calMmPerPx;
		}
		return VATECH_DEVICE_CALIBRATION_PRESETS.pax_reve3d_ceph.calMmPerPx;
	}
	if (norm in DEFAULT_MODALITY_PIXEL_SPACING) {
		return DEFAULT_MODALITY_PIXEL_SPACING[norm as DentalModalityKey];
	}

	return fallbackMm;
}

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

export interface CursorCenteredZoomParams {
	readonly currentZoom: number;
	readonly zoomFactor: number;
	readonly cursorX: number;
	readonly cursorY: number;
	readonly canvasWidth: number;
	readonly canvasHeight: number;
	readonly currentPanX: number;
	readonly currentPanY: number;
	readonly minZoom?: number;
	readonly maxZoom?: number;
}

export interface CursorCenteredZoomResult {
	readonly nextZoom: number;
	readonly nextPanX: number;
	readonly nextPanY: number;
}

/**
 * Calculates cursor-centered zoom transformation to guarantee that the anatomical feature
 * (e.g. root apex, periodontal ligament, or caries fissure) remains stationary under the mouse cursor.
 * Mathematical formula:
 * panNew = panOld + (cursor - center - panOld) * (1 - zoomNew / zoomOld)
 */
export function calculateCursorCenteredZoom(
	params: CursorCenteredZoomParams,
): CursorCenteredZoomResult {
	const minZoom = params.minZoom ?? 0.2;
	const maxZoom = params.maxZoom ?? 16.0;
	const nextZoom = Number(Math.max(minZoom, Math.min(maxZoom, params.currentZoom * params.zoomFactor)).toFixed(3));

	if (params.currentZoom <= 0 || nextZoom === params.currentZoom) {
		return { nextZoom, nextPanX: params.currentPanX, nextPanY: params.currentPanY };
	}

	const centerX = params.canvasWidth / 2;
	const centerY = params.canvasHeight / 2;
	const ratio = nextZoom / params.currentZoom;

	const nextPanX = Number((params.currentPanX + (params.cursorX - centerX - params.currentPanX) * (1 - ratio)).toFixed(2));
	const nextPanY = Number((params.currentPanY + (params.cursorY - centerY - params.currentPanY) * (1 - ratio)).toFixed(2));

	return {
		nextZoom,
		nextPanX,
		nextPanY,
	};
}

export interface VatechImageProcessingPreset {
	readonly id: string;
	readonly captionRu: string;
	readonly usmSteps: number;
	readonly usmAmount: number;
	readonly usmRadius: number;
	readonly histEquThreshold: number;
	readonly invert: boolean;
	readonly segmentCoeff: number;
}

/**
 * Vatech EzDent-i image processing modes (Reverse-engineered from EzSensor.ini [IP1]..[IP8]).
 * Multi-scale unsharp masking and adaptive contrast thresholds.
 */
export const VATECH_EZDENT_IP_MODES: readonly VatechImageProcessingPreset[] = [
	{
		id: "ip1_molar_rc",
		captionRu: "Режим 1: Моляры (Эндодонтия / Корневые каналы)",
		usmSteps: 8,
		usmAmount: 150,
		usmRadius: 2.0,
		histEquThreshold: 80,
		invert: false,
		segmentCoeff: 2.5,
	},
	{
		id: "ip2_molar_mc",
		captionRu: "Режим 2: Моляры (Средний контраст)",
		usmSteps: 8,
		usmAmount: 120,
		usmRadius: 2.0,
		histEquThreshold: 80,
		invert: false,
		segmentCoeff: 3.5,
	},
	{
		id: "ip3_molar_hc",
		captionRu: "Режим 3: Моляры (Высокий контраст кости)",
		usmSteps: 8,
		usmAmount: 180,
		usmRadius: 2.0,
		histEquThreshold: 80,
		invert: false,
		segmentCoeff: 4.5,
	},
	{
		id: "ip4_front_lower",
		captionRu: "Режим 4: Фронтальные нижние зубы (Резцы / Клыки)",
		usmSteps: 6,
		usmAmount: 150,
		usmRadius: 1.5,
		histEquThreshold: 80,
		invert: false,
		segmentCoeff: 4.5,
	},
	{
		id: "ip6_front_mc",
		captionRu: "Режим 6: Фронтальные зубы (Оптимальный баланс)",
		usmSteps: 6,
		usmAmount: 100,
		usmRadius: 1.5,
		histEquThreshold: 80,
		invert: false,
		segmentCoeff: 4.5,
	},
	{
		id: "ip7_front_lc",
		captionRu: "Режим 7: Фронтальные зубы (Мягкие ткани / Десна)",
		usmSteps: 6,
		usmAmount: 80,
		usmRadius: 1.0,
		histEquThreshold: 80,
		invert: false,
		segmentCoeff: 3.5,
	},
	{
		id: "ip8_caries_hc",
		captionRu: "Режим 8: Апроксимальный кариес (Максимальный микроконтраст)",
		usmSteps: 8,
		usmAmount: 200,
		usmRadius: 1.2,
		histEquThreshold: 80,
		invert: false,
		segmentCoeff: 4.8,
	},
];

/**
 * Calculates normalized unsharp mask weights and kernel scale for real-time WebGL shader convolution.
 */
export function calculateUnsharpMaskWeights(modeId: string): {
	amount: number;
	radius: number;
	threshold: number;
	laplacianWeight: number;
} {
	const preset = VATECH_EZDENT_IP_MODES.find((p) => p.id === modeId) || VATECH_EZDENT_IP_MODES[0]!;
	const normalizedAmount = Math.max(0, Math.min(300, preset.usmAmount)) / 100.0;
	return {
		amount: preset.usmAmount,
		radius: preset.usmRadius,
		threshold: preset.histEquThreshold,
		laplacianWeight: Number((normalizedAmount * 0.8).toFixed(3)),
	};
}
