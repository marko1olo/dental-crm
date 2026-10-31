/**
 * visiographCatalogData.ts — Единый канонический SSOT-каталог исследований визиографа и лучевой диагностики.
 *
 * Архитектурные стандарты:
 * - Мандат 8b: Sweet Spot 280–350 строк.
 * - Мандат 8e: Автономия врача (0 блокировок, 1-клик выбор фильтров и зуба).
 * - Мандат 8n: Суверенитет соло-врача и клиники 1-3 кресла (ноль бюрократии).
 * - Мандат 8am: Единый клинический дизайн-код DENTE.
 */

// ─── 1. ТРИ ТИПА РЕНТГЕНОВСКИХ СНИМКОВ (MODALITY) ───────────────────────────
export type StudyModality = "rvg" | "opg" | "cbct" | "photo";

export interface ModalityMetadata {
	readonly id: StudyModality;
	readonly name: string;
	readonly shortName: string;
	readonly description: string;
	readonly typicalDoseMsv: number;
	readonly defaultPitchMm: number;
	readonly defaultWindowWidth: number;
	readonly defaultWindowCenter: number;
	readonly fileExtensions: readonly string[];
}

export const MODALITY_CATALOG: Record<StudyModality, ModalityMetadata> = {
	rvg: {
		id: "rvg",
		name: "Прицельная радиовизиография (RVG 2D)",
		shortName: "Прицельный снимок",
		description: "Высокодетальный цифровой 2D-снимок зуба и периапикальной зоны с датчика у кресла",
		typicalDoseMsv: 0.02,
		defaultPitchMm: 0.035,
		defaultWindowWidth: 2000,
		defaultWindowCenter: 500,
		fileExtensions: [".dcm", ".tif", ".tiff", ".png", ".jpg", ".jpeg"],
	},
	opg: {
		id: "opg",
		name: "Панорамная ортопантомография (ОПТГ)",
		shortName: "Панорама челюстей",
		description: "Обзорный снимок зубных рядов, нижнечелюстного канала и верхнечелюстных пазух",
		typicalDoseMsv: 0.05,
		defaultPitchMm: 0.05,
		defaultWindowWidth: 2800,
		defaultWindowCenter: 400,
		fileExtensions: [".dcm", ".tif", ".tiff", ".png", ".jpg"],
	},
	cbct: {
		id: "cbct",
		name: "Конусно-лучевая 3D томография (КЛКТ)",
		shortName: "3D томография",
		description: "Трехмерное объемное сканирование зубочелюстной системы и анатомических срезов",
		typicalDoseMsv: 0.08,
		defaultPitchMm: 0.1,
		defaultWindowWidth: 4000,
		defaultWindowCenter: 1500,
		fileExtensions: [".dcm", ".zip", ".bin"],
	},
	photo: {
		id: "photo",
		name: "Клинический фотопротокол",
		shortName: "Фотопротокол",
		description: "Интраоральная и портретная фотосъемка этапов лечения и эстетической реабилитации",
		typicalDoseMsv: 0.0,
		defaultPitchMm: 0.05,
		defaultWindowWidth: 255,
		defaultWindowCenter: 128,
		fileExtensions: [".jpg", ".jpeg", ".png", ".webp"],
	},
};

// ─── 2. ПРИВЯЗКА К ЗУБУ FDI (11–48) И ДАТЕ ПРИЁМА ──────────────────────────
export function isValidFdiTooth(tooth: string | number): boolean {
	const code = Number(tooth);
	if (!Number.isInteger(code)) return false;
	const quad = Math.floor(code / 10);
	const num = code % 10;
	if (quad >= 1 && quad <= 4) return num >= 1 && num <= 8;
	if (quad >= 5 && quad <= 8) return num >= 1 && num <= 5;
	return false;
}

export const FDI_PERMANENT_TEETH: readonly string[] = [
	"18", "17", "16", "15", "14", "13", "12", "11",
	"21", "22", "23", "24", "25", "26", "27", "28",
	"48", "47", "46", "45", "44", "43", "42", "41",
	"31", "32", "33", "34", "35", "36", "37", "38",
];

export interface RadiologyStudyRecord {
	readonly id: string;
	readonly modality: StudyModality;
	readonly title: string;
	readonly toothCode: string | null;
	readonly patientName: string;
	readonly patientId: string;
	readonly date: string;
	readonly doseMsv: number;
	readonly sensorModel: string;
	readonly pixelPitchMm: number;
	readonly imageUrl: string;
	readonly measurementsCount: number;
	readonly hasLesion: boolean;
	readonly note?: string;
}

// ─── 3. 4 БАЗОВЫХ КЛИНИЧЕСКИХ ФИЛЬТРА (CSS / CANVAS) ────────────────────────
export type VisiographFilterId = "normal" | "contrast" | "invert" | "sharpness";

export interface ClinicalFilterPreset {
	readonly id: VisiographFilterId;
	readonly label: string;
	readonly shortLabel: string;
	readonly icon: string;
	readonly description: string;
	readonly cssFilter: string;
	readonly params: {
		readonly brightness: number;
		readonly contrast: number;
		readonly invert: boolean;
		readonly sharpness: number;
	};
}

export const CLINICAL_FILTER_PRESETS: readonly ClinicalFilterPreset[] = [
	{
		id: "normal",
		label: "Норма (исходный снимок)",
		shortLabel: "Норма",
		icon: "☀️",
		description: "Исходный радиовизиографический снимок с физиологической плотностью датчика",
		cssFilter: "none",
		params: { brightness: 0, contrast: 0, invert: false, sharpness: 0 },
	},
	{
		id: "contrast",
		label: "Контраст (эмаль и дентин)",
		shortLabel: "Контраст",
		icon: "🌓",
		description: "Эмалево-дентинная граница, выявление скрытого апроксимального кариеса",
		cssFilter: "contrast(1.5) brightness(1.05)",
		params: { brightness: 5, contrast: 50, invert: false, sharpness: 20 },
	},
	{
		id: "invert",
		label: "Инверсия (негатив апекса)",
		shortLabel: "Негатив",
		icon: "🔄",
		description: "Исследование периапикальных очагов, кист, гранулём и микротрещин у верхушки корня",
		cssFilter: "invert(1) contrast(1.3)",
		params: { brightness: 0, contrast: 30, invert: true, sharpness: 40 },
	},
	{
		id: "sharpness",
		label: "Резкость (контур пломб)",
		shortLabel: "Резкость",
		icon: "⚡",
		description: "Нерезкое маскирование (Unsharp Masking) для оценки контура пломбы и прилегания коронки",
		cssFilter: "contrast(1.4) drop-shadow(0 0 1px rgba(0,0,0,0.8))",
		params: { brightness: -5, contrast: 40, invert: false, sharpness: 80 },
	},
];

export function getClinicalFilterCss(filterId: VisiographFilterId): string {
	const preset = CLINICAL_FILTER_PRESETS.find((f) => f.id === filterId);
	return preset ? preset.cssFilter : "none";
}

// ─── 4. ИНСТРУМЕНТ ЛИНЕЙКИ ИЗМЕРЕНИЯ И КАЛИБРОВКИ (1 ММ) ───────────────────
export interface Point2D {
	x: number;
	y: number;
}

export interface LinearMeasurement {
	id: string;
	p1: Point2D;
	p2: Point2D;
	lengthPx: number;
	lengthMm: number;
	label?: string;
}

export const DEFAULT_PIXEL_SCALE_MM = 0.035;

export type CalibrationReferenceKind = "implant_1mm" | "sphere_5mm" | "pitch_0_8mm";

export interface CalibrationReferenceDef {
	readonly id: CalibrationReferenceKind;
	readonly label: string;
	readonly knownMm: number;
	readonly description: string;
}

export const CALIBRATION_REFERENCES: readonly CalibrationReferenceDef[] = [
	{ id: "implant_1mm", label: "Имплантат / штифт (1.0 мм)", knownMm: 1.0, description: "Калибровка по шагу резьбы или диаметру пина 1.0 мм" },
	{ id: "sphere_5mm", label: "Калибровочный шарик (5.0 мм)", knownMm: 5.0, description: "Рентгеноконтрастная эталонная сфера 5.0 мм" },
	{ id: "pitch_0_8mm", label: "Шаг микрорезьбы (0.8 мм)", knownMm: 0.8, description: "Микрорезьба шейки имплантата 0.8 мм" },
];

export function calculateDistancePx(p1: Point2D, p2: Point2D): number {
	return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function calculateDistanceMm(p1: Point2D, p2: Point2D, mmPerPixel = DEFAULT_PIXEL_SCALE_MM): number {
	return Number((calculateDistancePx(p1, p2) * mmPerPixel).toFixed(2));
}

export function calibratePixelPitch(knownMm: number, measuredPx: number): number {
	if (measuredPx <= 0) return DEFAULT_PIXEL_SCALE_MM;
	return Number((knownMm / measuredPx).toFixed(6));
}

// ─── 5. HOTFOLDER ДЕТЕКЦИЯ СНИМКОВ ТОМОГРАФА (ROMEXIS, EZ3D, SIDEXIS) ────────
export interface HotfolderConfig {
	readonly vendor: "vatech" | "planmeca" | "sirona" | "kavo" | "carestream";
	readonly name: string;
	readonly defaultLocalPath: string;
	readonly defaultNetworkShare: string;
	readonly supportedFormats: readonly string[];
}

export const CANONICAL_HOTFOLDERS: readonly HotfolderConfig[] = [
	{ vendor: "vatech", name: "Vatech EzDent-i / Ez3D Plus", defaultLocalPath: "C:\\Vatech\\EzDent-i\\Bin\\Work\\", defaultNetworkShare: "\\\\XRAY-SERVER\\VatechDrop\\", supportedFormats: [".dcm", ".png", ".jpg", ".tif"] },
	{ vendor: "planmeca", name: "Planmeca Romexis", defaultLocalPath: "C:\\Planmeca\\Romexis\\DropBox\\", defaultNetworkShare: "\\\\XRAY-SERVER\\RomexisExport\\", supportedFormats: [".dcm", ".tiff", ".png"] },
	{ vendor: "sirona", name: "Dentsply Sirona Sidexis 4", defaultLocalPath: "C:\\PDATA\\", defaultNetworkShare: "\\\\SIDEXIS-PC\\PDATA\\", supportedFormats: [".dcm", ".bmp", ".tif"] },
	{ vendor: "kavo", name: "KaVo CliniView / Gendex", defaultLocalPath: "C:\\KaVo\\CliniView\\Export\\", defaultNetworkShare: "\\\\KAVO-SERVER\\Gendex\\", supportedFormats: [".dcm", ".tif", ".jpg"] },
	{ vendor: "carestream", name: "Carestream Trophy RVG / CS Imaging", defaultLocalPath: "C:\\Trophy\\Data\\Export\\", defaultNetworkShare: "\\\\TROPHY-PC\\SharedImages\\", supportedFormats: [".dcm", ".tif", ".jpg"] },
];

export interface DetectedHotfolderStudy {
	readonly id: string;
	readonly vendor: string;
	readonly detectedAt: string;
	readonly fileName: string;
	readonly toothCode: string;
	readonly patientName: string;
	readonly modality: StudyModality;
	readonly previewUrl: string;
}

export function detectLatestHotfolderStudy(
	vendorName = "Vatech EzDent-i",
	patientName = "Захаров Иван Дмитриевич",
	toothCode = "16",
): DetectedHotfolderStudy {
	return {
		id: `hot_${Date.now()}`,
		vendor: vendorName,
		detectedAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
		fileName: `CT_${toothCode}_${Date.now().toString().slice(-4)}.dcm`,
		toothCode,
		patientName,
		modality: "rvg",
		previewUrl: "/radiology/sample_rvg_tooth16.jpg",
	};
}

// ─── 6. ДЕМОНСТРАЦИОННЫЙ НАБОР СНИМКОВ (DEMO MODE & TESTS) ──────────────────
export const DEMO_VISIOGRAPH_STUDIES: readonly RadiologyStudyRecord[] = [
	{
		id: "study_rvg_16",
		modality: "rvg",
		title: "Прицельный снимок зуба #16 (Эндодонтия)",
		toothCode: "16",
		patientName: "Захаров Иван Дмитриевич",
		patientId: "pat_demo_01",
		date: "2026-10-30",
		doseMsv: 0.02,
		sensorModel: "Vatech EzSensor 1.5",
		pixelPitchMm: 0.035,
		imageUrl: "/radiology/sample_rvg_tooth16.jpg",
		measurementsCount: 2,
		hasLesion: true,
		note: "Апикальный периодонтит, рабочая длина дистального канала 21.4 мм",
	},
	{
		id: "study_opg_panoramic",
		modality: "opg",
		title: "Панорамная ортопантомография челюстей",
		toothCode: null,
		patientName: "Захаров Иван Дмитриевич",
		patientId: "pat_demo_01",
		date: "2026-10-28",
		doseMsv: 0.05,
		sensorModel: "Vatech PaX-i",
		pixelPitchMm: 0.05,
		imageUrl: "/radiology/sample_opg_panoramic.jpg",
		measurementsCount: 0,
		hasLesion: false,
		note: "Первичное комплексное обследование перед санацией",
	},
	{
		id: "study_rvg_36",
		modality: "rvg",
		title: "Контрольный снимок пломбировки #36",
		toothCode: "36",
		patientName: "Захаров Иван Дмитриевич",
		patientId: "pat_demo_01",
		date: "2026-10-25",
		doseMsv: 0.02,
		sensorModel: "Vatech EzSensor 1.5",
		pixelPitchMm: 0.035,
		imageUrl: "/radiology/sample_rvg_tooth36.jpg",
		measurementsCount: 1,
		hasLesion: false,
		note: "Гуттаперча до физиологического апекса без выхода за верхушку",
	},
];

// ─── 7. ПРЕСЕТЫ АППАРАТНЫХ ДАТЧИКОВ (СОВМЕСТИМОСТЬ) ──────────────────────────
export interface SensorPresetDefinition {
	readonly id: string;
	readonly label: string;
	readonly shortLabel: string;
	readonly pixelSizeMm: number;
	readonly pixelPitchMicrons: number;
	readonly description: string;
}

export const CANONICAL_SENSOR_PRESETS: readonly SensorPresetDefinition[] = [
	{ id: "vatech_ezsensor_1_5", label: "Vatech EzSensor 1.5 (35.0 мкм / 0.0350 мм/пикс)", shortLabel: "EzSensor 1.5 (35 мкм)", pixelSizeMm: 0.035, pixelPitchMicrons: 35.0, description: "Штатный визиограф клиники Vatech EzSensor 1.5 / 2.0" },
	{ id: "rvg_size_1", label: "Датчик RVG Размер 1 (20 мкм / 0.020 мм/пикс)", shortLabel: "RVG Р1 (20 мкм)", pixelSizeMm: 0.02, pixelPitchMicrons: 20.0, description: "Прицельный интраоральный датчик для резцов и премоляров" },
	{ id: "opg_standard", label: "ОПТГ стандарт (50 мкм / 0.050 мм/пикс)", shortLabel: "ОПТГ стандарт (50 мкм)", pixelSizeMm: 0.05, pixelPitchMicrons: 50.0, description: "Панорамная ортопантомография стандартная шкала" },
];
