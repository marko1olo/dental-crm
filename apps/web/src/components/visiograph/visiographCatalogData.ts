/**
 * visiographCatalogData.ts — Единый канонический SSOT-каталог исследований визиографа и лучевой диагностики.
 *
 * Архитектурные стандарты:
 * - Мандат 8b: Sweet Spot 200–280 строк.
 * - Мандат 8e: Автономия врача (0 блокировок, 1-клик пресеты нормы).
 * - Мандат 8n: Суверенитет соло-врача и клиники 1-3 кресла (ноль бюрократии).
 * - Мандат 8am: Единый клинический дизайн-код DENTE.
 */

export type StudyModality = "rvg" | "opg" | "cbct" | "photo";

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
		name: "Прицельная радиовизиография (RVG)",
		shortName: "Прицельный снимок",
		description: "Высокодетальный цифровой снимок зуба и периапикальной зоны с датчика у кресла",
		typicalDoseMsv: 0.02,
		defaultPitchMm: 0.035,
		defaultWindowWidth: 2000,
		defaultWindowCenter: 500,
		fileExtensions: [".dcm", ".tif", ".tiff", ".png", ".jpg", ".jpeg"],
	},
	opg: {
		id: "opg",
		name: "Панорамная ортопантомография (ОПТГ)",
		shortName: "Панорама зубных рядов",
		description: "Обзорный снимок обеих челюстей, височно-нижнечелюстных суставов и верхнечелюстных пазух",
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

export interface SensorPresetDefinition {
	readonly id: string;
	readonly label: string;
	readonly shortLabel: string;
	readonly pixelSizeMm: number;
	readonly pixelPitchMicrons: number;
	readonly description: string;
}

export const CANONICAL_SENSOR_PRESETS: readonly SensorPresetDefinition[] = [
	{
		id: "vatech_ezsensor_1_5",
		label: "Vatech EzSensor 1.5 (35.0 мкм / 0.0350 мм/пикс)",
		shortLabel: "EzSensor 1.5 (35 мкм)",
		pixelSizeMm: 0.035,
		pixelPitchMicrons: 35.0,
		description: "Штатный визиограф клиники Vatech EzSensor 1.5 / 2.0",
	},
	{
		id: "vatech_ezsensor_soft_hr",
		label: "Vatech EzSensor Soft HR (14.8 мкм / 0.0148 мм/пикс)",
		shortLabel: "EzSensor Soft HR (14.8 мкм)",
		pixelSizeMm: 0.0148,
		pixelPitchMicrons: 14.8,
		description: "Сверхвысокое разрешение Vatech EzSensor Soft HR",
	},
	{
		id: "vatech_ezsensor_classic",
		label: "Vatech EzSensor Classic / Soft (29.6 мкм / 0.0296 мм/пикс)",
		shortLabel: "EzSensor Classic (29.6 мкм)",
		pixelSizeMm: 0.0296,
		pixelPitchMicrons: 29.6,
		description: "Базовое разрешение биннинга 2x2",
	},
	{
		id: "vatech_ezsensor_p",
		label: "Vatech EzSensor P / HDI2000 (20.0 мкм / 0.0200 мм/пикс)",
		shortLabel: "EzSensor P (20 мкм)",
		pixelSizeMm: 0.02,
		pixelPitchMicrons: 20.0,
		description: "Субпиксельный эндодонтический сенсор EzSensor P",
	},
	{
		id: "rvg_size_1",
		label: "Датчик RVG Размер 1 (20 мкм / 0.020 мм/пикс)",
		shortLabel: "RVG Р1 (20 мкм)",
		pixelSizeMm: 0.02,
		pixelPitchMicrons: 20.0,
		description: "Прицельный интраоральный датчик для резцов и премоляров",
	},
	{
		id: "rvg_size_2",
		label: "Датчик RVG Размер 2 (25 мкм / 0.025 мм/пикс)",
		shortLabel: "RVG Р2 (25 мкм)",
		pixelSizeMm: 0.025,
		pixelPitchMicrons: 25.0,
		description: "Универсальный молярный датчик для жевательной группы",
	},
	{
		id: "opg_standard",
		label: "ОПТГ стандарт (50 мкм / 0.050 мм/пикс)",
		shortLabel: "ОПТГ стандарт (50 мкм)",
		pixelSizeMm: 0.05,
		pixelPitchMicrons: 50.0,
		description: "Панорамная ортопантомография стандартная шкала",
	},
	{
		id: "opg_vatech_pax_i",
		label: "Vatech PaX-i ОПТГ (76.1 мкм / 0.0761 мм/пикс)",
		shortLabel: "PaX-i ОПТГ (76.1 мкм)",
		pixelSizeMm: 0.0761,
		pixelPitchMicrons: 76.1,
		description: "Панорамный аппарат Vatech PaX-i",
	},
	{
		id: "opg_vatech_pax_i_uhd",
		label: "Vatech PaX-i UHD ОПТГ (38.0 мкм / 0.0380 мм/пикс)",
		shortLabel: "PaX-i UHD (38.0 мкм)",
		pixelSizeMm: 0.038,
		pixelPitchMicrons: 38.0,
		description: "Сверхвысокое разрешение панорамы UHD Vatech PaX-i",
	},
	{
		id: "planmeca_prosensor",
		label: "Planmeca ProSensor HD (30.0 мкм / 0.0300 мм/пикс)",
		shortLabel: "Planmeca HD (30 мкм)",
		pixelSizeMm: 0.03,
		pixelPitchMicrons: 30.0,
		description: "Интраоральный сенсор Planmeca ProSensor HD",
	},
	{
		id: "sirona_xios_xg",
		label: "Dentsply Sirona XIOS XG Supreme (15.0 мкм / 0.0150 мм/пикс)",
		shortLabel: "Sirona XIOS (15 мкм)",
		pixelSizeMm: 0.015,
		pixelPitchMicrons: 15.0,
		description: "Цезиевый высокоточный визиограф Dentsply Sirona",
	},
];

export interface HotfolderConfig {
	readonly vendor: "vatech" | "planmeca" | "sirona" | "kavo" | "carestream";
	readonly name: string;
	readonly defaultLocalPath: string;
	readonly defaultNetworkShare: string;
	readonly supportedFormats: readonly string[];
}

export const CANONICAL_HOTFOLDERS: readonly HotfolderConfig[] = [
	{
		vendor: "vatech",
		name: "Vatech EzDent-i / Ez3D Plus",
		defaultLocalPath: "C:\\Vatech\\EzDent-i\\Bin\\Work\\",
		defaultNetworkShare: "\\\\XRAY-SERVER\\VatechDrop\\",
		supportedFormats: [".dcm", ".png", ".jpg", ".tif"],
	},
	{
		vendor: "planmeca",
		name: "Planmeca Romexis",
		defaultLocalPath: "C:\\Planmeca\\Romexis\\DropBox\\",
		defaultNetworkShare: "\\\\XRAY-SERVER\\RomexisExport\\",
		supportedFormats: [".dcm", ".tiff", ".png"],
	},
	{
		vendor: "sirona",
		name: "Dentsply Sirona Sidexis 4",
		defaultLocalPath: "C:\\PDATA\\",
		defaultNetworkShare: "\\\\SIDEXIS-PC\\PDATA\\",
		supportedFormats: [".dcm", ".bmp", ".tif"],
	},
	{
		vendor: "kavo",
		name: "KaVo CliniView / Gendex",
		defaultLocalPath: "C:\\KaVo\\CliniView\\Export\\",
		defaultNetworkShare: "\\\\KAVO-SERVER\\Gendex\\",
		supportedFormats: [".dcm", ".tif", ".jpg"],
	},
	{
		vendor: "carestream",
		name: "Carestream Trophy RVG / CS Imaging",
		defaultLocalPath: "C:\\Trophy\\Data\\Export\\",
		defaultNetworkShare: "\\\\TROPHY-PC\\SharedImages\\",
		supportedFormats: [".dcm", ".tif", ".jpg"],
	},
];

/** Валидация номера зуба по двухзначной номенклатуре FDI (постоянные 11-48, молочные 51-85) */
export function isValidFdiTooth(tooth: string | number): boolean {
	const code = Number(tooth);
	if (!Number.isInteger(code)) return false;
	const quad = Math.floor(code / 10);
	const num = code % 10;
	if (quad >= 1 && quad <= 4) return num >= 1 && num <= 8;
	if (quad >= 5 && quad <= 8) return num >= 1 && num <= 5;
	return false;
}

/** Список всех постоянных зубов взрослого приёма по квадрантам FDI */
export const FDI_PERMANENT_TEETH: readonly string[] = [
	"18", "17", "16", "15", "14", "13", "12", "11",
	"21", "22", "23", "24", "25", "26", "27", "28",
	"48", "47", "46", "45", "44", "43", "42", "41",
	"31", "32", "33", "34", "35", "36", "37", "38",
];

/** Демонстрационный набор снимков для витрины и тестов */
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
