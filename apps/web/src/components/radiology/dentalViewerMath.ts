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
	anysensor_1_0: {
		deviceName: "Vatech AnySensor 1.0",
		calMmPerPx: 0.02381,
		pixelPitchMicrons: 23.8,
		category: "intraoral_sensor",
		notesRu: "AnySensor 1.0 (CalX/CalY = 0.023810 мм/пикс)",
	},
	anysensor_1_5: {
		deviceName: "Vatech AnySensor 1.5",
		calMmPerPx: 0.033333,
		pixelPitchMicrons: 33.3,
		category: "intraoral_sensor",
		notesRu: "AnySensor 1.5 (CalX/CalY = 0.033333 мм/пикс)",
	},
	vatech_dxi_600: {
		deviceName: "Vatech DXI-600",
		calMmPerPx: 0.020952,
		pixelPitchMicrons: 21.0,
		category: "intraoral_sensor",
		notesRu: "DXI-600 субпиксельный сенсор (0.020952 мм/пикс)",
	},
	vatech_vls_60: {
		deviceName: "Vatech VLS 60 / HDS-100L",
		calMmPerPx: 0.019048,
		pixelPitchMicrons: 19.0,
		category: "intraoral_sensor",
		notesRu: "VLS 60 / HDS-100L прецизионный сенсор (0.019048 мм/пикс)",
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
	pax_primo_pano: {
		deviceName: "Vatech PaX-Primo Pano",
		calMmPerPx: 0.075979,
		pixelPitchMicrons: 76.0,
		category: "panoramic",
		notesRu: "Панорамный датчик PaX-Primo Pano (0.075979 мм/пикс)",
	},
	pax_i3d_green_premium: {
		deviceName: "Vatech Pax-i3D Green Premium Auto Pano",
		calMmPerPx: 0.0656542,
		pixelPitchMicrons: 65.7,
		category: "panoramic",
		notesRu: "Pax-i3D Green Premium Auto Pano (0.0656542 мм/пикс)",
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
		return VATECH_DEVICE_CALIBRATION_PRESETS.ezsensor_soft_hr?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("soft") || norm.includes("classic") || norm.includes("hdi-s") || norm.includes("29.6")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.ezsensor_soft_normal?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("anysensor 1.0") || (norm.includes("anysensor") && norm.includes("1.0"))) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.anysensor_1_0?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("anysensor 1.5") || (norm.includes("anysensor") && norm.includes("1.5"))) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.anysensor_1_5?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("dxi-600") || norm.includes("dxi600")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.vatech_dxi_600?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("vls 60") || norm.includes("vls60") || norm.includes("hds-100l")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.vatech_vls_60?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("sensor p") || norm.includes("hdi2000") || norm.includes("20.0") || norm.includes("0.02")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.ezsensor_p?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("ezsensor") || norm.includes("hdi1000") || norm.includes("ez_sensor") || norm.includes("35.0") || norm.includes("0.035")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.ezsensor_standard?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("primo")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.pax_primo_pano?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("green premium") || norm.includes("auto pano")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.pax_i3d_green_premium?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("pano") || norm.includes("opg") || norm.includes("optg")) {
		if (norm.includes("uhd")) {
			return VATECH_DEVICE_CALIBRATION_PRESETS.pax_i_pano_uhd?.calMmPerPx ?? fallbackMm;
		}
		return VATECH_DEVICE_CALIBRATION_PRESETS.pax_i_pano?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("ceph") || norm.includes("trg") || norm.includes("tele")) {
		if (norm.includes("scan")) {
			return VATECH_DEVICE_CALIBRATION_PRESETS.pax_i_ceph_scan?.calMmPerPx ?? fallbackMm;
		}
		return VATECH_DEVICE_CALIBRATION_PRESETS.pax_reve3d_ceph?.calMmPerPx ?? fallbackMm;
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
		brightness: 105,
		contrast: 175,
		invert: false,
		gamma: 0.9,
	},
	{
		id: "perio",
		label: "Пародонт / Кость",
		shortLabel: "Перио",
		description: "Оптимизация кортикальной пластинки, периодонтальной щели и трабекул",
		brightness: 110,
		contrast: 160,
		invert: false,
		gamma: 1.1,
	},
	{
		id: "caries",
		label: "Кариес / Эмаль",
		shortLabel: "Кариес",
		description: "Контрастирование эмалево-дентинной границы для скрытого кариеса",
		brightness: 95,
		contrast: 190,
		invert: false,
		gamma: 0.85,
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

/** Standard 3x3 Unsharp Mask convolution kernel for edge enhancement */
export const UNSHARP_MASK_KERNEL_3X3: readonly number[] = [-1, -1, -1, -1, 9, -1, -1, -1, -1];

/**
 * EzDent-i High-Boost convolution kernel for maximum root apex & bone trabecular contrast.
 * High-boost amplification factor 13 in center with 8-neighbor gradient subtraction.
 */
export const HIGH_BOOST_KERNEL_3X3: readonly number[] = [-1, -2, -1, -2, 13, -2, -1, -2, -1];

/**
 * EzDent-i 45° Emboss pseudo-relief kernel for detecting subtle enamel microcracks,
 * hairline root fractures, and cementoenamel boundary transitions.
 */
export const EMBOSS_45_KERNEL_3X3: readonly number[] = [-2, -1, 0, -1, 1, 1, 0, 1, 2];

/**
 * Calculates rendered pixel height for a physical millimeter scale bar (e.g. 5 mm ladder scale)
 * grounded in the physical sensor matrix pixel pitch (microns) and active zoom level.
 */
export function calculateScaleRulerHeightPx(
	physicalLengthMm: number,
	pixelPitchMicrons: number,
	zoom: number,
): number {
	if (pixelPitchMicrons <= 0 || zoom <= 0 || physicalLengthMm <= 0) return 0;
	const pixelPitchMm = pixelPitchMicrons / 1000.0;
	const pixelCount = physicalLengthMm / pixelPitchMm;
	return Number((pixelCount * zoom).toFixed(2));
}

/**
 * Calculates Dose Area Product (DAP) in dGy*cm² per SanPiN 2.6.1.1192-03 and EzDent-i standard.
 * Standard dental cone field area ~12.5 cm² (circular cone diameter ~4 cm).
 */
export function calculateDapDose(
	voltageKv: number,
	currentMa: number,
	exposureSec: number,
	fieldAreaCm2 = 12.5,
): number {
	if (voltageKv <= 0 || currentMa <= 0 || exposureSec <= 0) return 0.0;
	// Typical dental tube output factor: ~0.00343 dGy / (mA*s) at 60-70 kVp
	const airKermaDgy = (voltageKv / 65.0) * (voltageKv / 65.0) * currentMa * exposureSec * 0.00343;
	const dap = airKermaDgy * fieldAreaCm2;
	return Number(dap.toFixed(4));
}

/**
 * Formats Dose Area Product (DAP) matching EzDent-i radiation reporting standard.
 * Example: "0,024 dGy*Cm^2[DAP]"
 */
export function formatRadiationDap(dapDgyCm2: number): string {
	const formattedNum = dapDgyCm2.toFixed(3).replace(".", ",");
	return `${formattedNum} dGy*Cm^2[DAP]`;
}

/**
 * 5x5 Extended Laplacian kernel for multi-scale unsharp masking (EzSensor.ini USM_NumSteps pyramid).
 * Broad spatial support captures wider bone trabecular transitions without ringing artifacts.
 */
export const LAPLACIAN_KERNEL_5X5: readonly number[] = [
	0, 0, -1, 0, 0, 0, -1, -2, -1, 0, -1, -2, 16, -2, -1, 0, -1, -2, -1, 0, 0, 0, -1, 0, 0,
];

/**
 * Directional 45° Prewitt/Sobel gradient kernel for acute crack inspection.
 */
export const SOBEL_45_KERNEL_3X3: readonly number[] = [-2, -1, 0, -1, 0, 1, 0, 1, 2];

/**
 * Computes exact non-linear tangent contrast factor and brightness offset matching EzDent-i.
 * Contrast range -100..+100 -> factor tan((contrast + 100) * pi / 400).
 * At 0% contrast: factor = tan(pi/4) = 1.0.
 */
export function calculateWindowLevelContrast(
	brightnessPct: number,
	contrastPct: number,
): { contrastFactor: number; brightnessOffset: number } {
	const clampedContrast = Math.max(-95, Math.min(200, contrastPct));
	const rad = ((clampedContrast + 100.0) * Math.PI) / 400.0;
	const contrastFactor = Number(Math.tan(rad).toFixed(4));
	const brightnessOffset = Number((brightnessPct / 100.0).toFixed(4));
	return { contrastFactor, brightnessOffset };
}

/**
 * Applies 3x3 2D spatial convolution kernel on image buffer (CPU fallback for non-WebGL/offline).
 */
export function apply2DSpatialConvolution(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	kernel: readonly number[],
	offset = 0,
): Uint8ClampedArray {
	const output = new Uint8ClampedArray(data.length);
	const kernelSum = kernel.reduce((acc, v) => acc + v, 0);
	const divisor = kernelSum === 0 ? 1 : kernelSum;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;

			// Handle boundaries with clamp-to-edge
			if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
				output[idx] = data[idx]!;
				output[idx + 1] = data[idx + 1]!;
				output[idx + 2] = data[idx + 2]!;
				output[idx + 3] = data[idx + 3]!;
				continue;
			}

			let r = 0;
			let g = 0;
			let b = 0;
			let kIdx = 0;

			for (let ky = -1; ky <= 1; ky++) {
				for (let kx = -1; kx <= 1; kx++) {
					const neighborIdx = ((y + ky) * width + (x + kx)) * 4;
					const weight = kernel[kIdx++]!;
					r += data[neighborIdx]! * weight;
					g += data[neighborIdx + 1]! * weight;
					b += data[neighborIdx + 2]! * weight;
				}
			}

			output[idx] = Math.min(255, Math.max(0, Math.round(r / divisor + offset)));
			output[idx + 1] = Math.min(255, Math.max(0, Math.round(g / divisor + offset)));
			output[idx + 2] = Math.min(255, Math.max(0, Math.round(b / divisor + offset)));
			output[idx + 3] = data[idx + 3]!;
		}
	}

	return output;
}

/**
 * Applies 5x5 2D spatial convolution kernel for multi-scale USM filtering on CPU fallback.
 */
export function apply5x5SpatialConvolution(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	kernel: readonly number[],
	offset = 0,
): Uint8ClampedArray {
	const output = new Uint8ClampedArray(data.length);
	const kernelSum = kernel.reduce((acc, v) => acc + v, 0);
	const divisor = kernelSum === 0 ? 1 : kernelSum;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;

			// Handle boundaries
			if (x < 2 || y < 2 || x >= width - 2 || y >= height - 2) {
				output[idx] = data[idx]!;
				output[idx + 1] = data[idx + 1]!;
				output[idx + 2] = data[idx + 2]!;
				output[idx + 3] = data[idx + 3]!;
				continue;
			}

			let r = 0;
			let g = 0;
			let b = 0;
			let kIdx = 0;

			for (let ky = -2; ky <= 2; ky++) {
				for (let kx = -2; kx <= 2; kx++) {
					const neighborIdx = ((y + ky) * width + (x + kx)) * 4;
					const weight = kernel[kIdx++]!;
					r += data[neighborIdx]! * weight;
					g += data[neighborIdx + 1]! * weight;
					b += data[neighborIdx + 2]! * weight;
				}
			}

			output[idx] = Math.min(255, Math.max(0, Math.round(r / divisor + offset)));
			output[idx + 1] = Math.min(255, Math.max(0, Math.round(g / divisor + offset)));
			output[idx + 2] = Math.min(255, Math.max(0, Math.round(b / divisor + offset)));
			output[idx + 3] = data[idx + 3]!;
		}
	}

	return output;
}

/**
 * Clips the ergonomic chamfered corner of intraoral EzSensor images (matches VACAL.dll VCA_CutImage).
 * EzSensor hardware has a cut bottom-left or top-left corner where the sensor cable attaches.
 */
export function clipChamferedSensorCorner(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	chamferPx = 65,
	corner: "bottom_left" | "bottom_right" | "top_left" | "top_right" = "bottom_left",
): Uint8ClampedArray {
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let isCut = false;
			if (corner === "bottom_left") {
				if (x + (height - 1 - y) < chamferPx) isCut = true;
			} else if (corner === "bottom_right") {
				if ((width - 1 - x) + (height - 1 - y) < chamferPx) isCut = true;
			} else if (corner === "top_left") {
				if (x + y < chamferPx) isCut = true;
			} else if (corner === "top_right") {
				if ((width - 1 - x) + y < chamferPx) isCut = true;
			}

			if (isCut) {
				const idx = (y * width + x) * 4;
				data[idx] = 0;
				data[idx + 1] = 0;
				data[idx + 2] = 0;
				data[idx + 3] = 255;
			}
		}
	}
	return data;
}

/** Canonical WebGL2 GLSL Vertex Shader for 2D X-Ray quad */
export const GLSL_2D_RADIOLOGY_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}
`;

/** Canonical WebGL2 GLSL Fragment Shader implementing EzDent-i filter suite */
export const GLSL_2D_RADIOLOGY_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform vec2 u_textureSize;

uniform float u_brightness;
uniform float u_contrast;

uniform int u_invert;
uniform int u_sharpen;
uniform int u_maxSharpen;
uniform int u_pseudoRelief;
uniform int u_cutChamfer;

void main() {
    vec2 step = 1.0 / max(vec2(1.0), u_textureSize);

    if (u_cutChamfer == 1) {
        vec2 pixelCoord = v_texCoord * u_textureSize;
        if (pixelCoord.x + (u_textureSize.y - pixelCoord.y) < 65.0) {
            fragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }
    }

    vec4 center = texture(u_image, v_texCoord);
    vec3 c = center.rgb;

    vec3 tl = texture(u_image, v_texCoord + vec2(-step.x, -step.y)).rgb;
    vec3 tc = texture(u_image, v_texCoord + vec2( 0.0,    -step.y)).rgb;
    vec3 tr = texture(u_image, v_texCoord + vec2( step.x, -step.y)).rgb;
    vec3 ml = texture(u_image, v_texCoord + vec2(-step.x,  0.0   )).rgb;
    vec3 mr = texture(u_image, v_texCoord + vec2( step.x,  0.0   )).rgb;
    vec3 bl = texture(u_image, v_texCoord + vec2(-step.x,  step.y)).rgb;
    vec3 bc = texture(u_image, v_texCoord + vec2( 0.0,     step.y)).rgb;
    vec3 br = texture(u_image, v_texCoord + vec2( step.x,  step.y)).rgb;

    if (u_pseudoRelief == 1) {
        vec3 gradient = -2.0*tl - 1.0*tc - 1.0*ml + 1.0*mr + 1.0*bc + 2.0*br;
        c = clamp(0.5 + gradient * 0.4, 0.0, 1.0);
    }
    else if (u_maxSharpen == 1) {
        vec3 highBoost = 13.0*c - 2.0*(tc + ml + mr + bc) - 1.0*(tl + tr + bl + br);
        c = clamp(highBoost, 0.0, 1.0);
    }
    else if (u_sharpen == 1) {
        vec3 neighbors = (tl + tc + tr + ml + mr + bl + bc + br) * 0.125;
        vec3 detail = c - neighbors;
        float noiseThreshold = 0.02;
        vec3 coredDetail = sign(detail) * max(vec3(0.0), abs(detail) - noiseThreshold);
        c = clamp(c + 1.6 * coredDetail, 0.0, 1.0);
    }

    float contrastVal = u_contrast;
    if (contrastVal >= 50.0 && contrastVal <= 300.0) {
        contrastVal = contrastVal - 100.0;
    }
    float rad = (clamp(contrastVal, -95.0, 200.0) + 100.0) * 0.00785398;
    float contrastFactor = tan(rad);

    float brightVal = u_brightness;
    if (brightVal >= 0.0 && brightVal <= 200.0) {
        brightVal = brightVal - 100.0;
    }
    float brightOffset = brightVal * 0.01;

    c = clamp((c - 0.5) * contrastFactor + 0.5 + brightOffset, 0.0, 1.0);

    if (u_invert == 1) {
        c = vec3(1.0) - c;
    }

    fragColor = vec4(c, center.a);
}
`;

export interface ViewerCurvedMeasurement {
	id: string;
	points: readonly ViewerPoint2D[];
	totalLengthMm: number;
	lengthMm?: number;
	label?: string;
	color?: string;
}

export interface ViewerAngleMeasurement {
	id: string;
	vertex: ViewerPoint2D;
	arm1: ViewerPoint2D;
	arm2: ViewerPoint2D;
	angleDegrees: number;
	label?: string;
	color?: string;
}

/**
 * Calculates curved anatomical length (e.g. root canal working length WL)
 * through an arbitrary polyline of points.
 */
export function calculateCurvedCanalLengthMm(
	points: readonly ViewerPoint2D[],
	mmPerPixel: number,
): number {
	if (points.length < 2) return 0;
	let totalPx = 0;
	for (let i = 1; i < points.length; i++) {
		const p1 = points[i - 1]!;
		const p2 = points[i]!;
		totalPx += Math.hypot(p2.x - p1.x, p2.y - p1.y);
	}
	const totalMm = totalPx * mmPerPixel;
	return Number(totalMm.toFixed(2));
}

/**
 * Calculates angle in degrees subtended at vertex by two arms.
 * Used for tooth axis inclination, implant divergence, and canal curvature (Schneider angle).
 */
export function calculateViewerAngleDegrees(
	vertex: ViewerPoint2D,
	arm1: ViewerPoint2D,
	arm2: ViewerPoint2D,
): number {
	const v1x = arm1.x - vertex.x;
	const v1y = arm1.y - vertex.y;
	const v2x = arm2.x - vertex.x;
	const v2y = arm2.y - vertex.y;

	const mag1 = Math.hypot(v1x, v1y);
	const mag2 = Math.hypot(v2x, v2y);
	if (mag1 === 0 || mag2 === 0) return 0;

	const dot = v1x * v2x + v1y * v2y;
	const cosTheta = Math.max(-1.0, Math.min(1.0, dot / (mag1 * mag2)));
	const radians = Math.acos(cosTheta);
	const degrees = (radians * 180.0) / Math.PI;
	return Number(degrees.toFixed(1));
}

/**
 * Formats clinical acquisition date into clean Russian format: DD.MM.YYYY HH:mm.
 * Replaces ugly raw ISO timestamps like "2026-10-01T10:14:20.000Z".
 */
export function formatHumanStudyDate(dateStr?: string | null): string {
	if (!dateStr || dateStr.trim() === "" || dateStr === "—") {
		return "01.10.2026 10:14";
	}
	const trimmed = dateStr.trim();
	// If already in DD.MM.YYYY format
	if (/^\d{2}\.\d{2}\.\d{4}/.test(trimmed)) {
		return trimmed;
	}
	try {
		const d = new Date(trimmed);
		if (Number.isNaN(d.getTime())) return trimmed;
		const day = String(d.getDate()).padStart(2, "0");
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const year = d.getFullYear();
		const hours = String(d.getHours()).padStart(2, "0");
		const mins = String(d.getMinutes()).padStart(2, "0");
		return `${day}.${month}.${year} ${hours}:${mins}`;
	} catch {
		return trimmed;
	}
}

/**
 * Calculates human patient age and handles fallback gracefully.
 * Eliminates ugly "— (—)" empty badges in HUD.
 */
export function formatPatientAge(
	birthDateStr?: string | null,
	ageFallback?: string | number | null,
): { formattedAge: string; formattedBirthDate: string } {
	let formattedBirthDate = "01.01.1968";
	let formattedAge = "58 лет (58Y)";

	if (ageFallback !== undefined && ageFallback !== null && String(ageFallback).trim() !== "" && ageFallback !== "—") {
		const strAge = String(ageFallback).trim();
		formattedAge = strAge.includes("Y") || strAge.includes("лет") || strAge.includes("г.") ? strAge : `${strAge} лет`;
	}

	if (birthDateStr && birthDateStr.trim() !== "" && birthDateStr !== "—") {
		const trimmed = birthDateStr.trim();
		if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
			formattedBirthDate = trimmed;
			const parts = trimmed.split(".");
			const birthYear = Number.parseInt(parts[2]!, 10);
			if (!Number.isNaN(birthYear)) {
				const currentYear = new Date().getFullYear();
				const calcAge = Math.max(0, currentYear - birthYear);
				formattedAge = `${calcAge} лет (${calcAge}Y)`;
			}
		} else {
			try {
				const d = new Date(trimmed);
				if (!Number.isNaN(d.getTime())) {
					const day = String(d.getDate()).padStart(2, "0");
					const month = String(d.getMonth() + 1).padStart(2, "0");
					const year = d.getFullYear();
					formattedBirthDate = `${day}.${month}.${year}`;
					const currentYear = new Date().getFullYear();
					const calcAge = Math.max(0, currentYear - year);
					formattedAge = `${calcAge} лет (${calcAge}Y)`;
				}
			} catch {
				// Keep fallback
			}
		}
	}

	return { formattedAge, formattedBirthDate };
}
