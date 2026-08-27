import type { DentalRadiologyStudyType, RadiologyReferralGoal } from "@dental/shared";
import type {
	AlveolarRidgeCaliperMeasurement,
	MandibularNerveSpline,
	Point2D,
	Point3D,
} from "./cbctCaliperNerveMath";

export type {
	AlveolarRidgeCaliperMeasurement,
	MandibularNerveSpline,
	Point2D,
	Point3D,
};


/** Модальности лучевой диагностики */
export type RadiologyModality =
	| "cbct_3d"
	| "optg_panoramic"
	| "intraoral_rvg"
	| "trg_ceph"
	| "bitewing"
	| "photo_clinical";

export interface RadiologyModalityInfo {
	id: RadiologyModality;
	studyType: DentalRadiologyStudyType;
	label: string;
	shortLabel: string;
	description: string;
	typicalDoseMicrosv: number; // мкЗв
	typicalDoseMsv: number; // мЗв
	iconName: string;
}

export const RADIOLOGY_MODALITIES: Record<RadiologyModality, RadiologyModalityInfo> = {
	cbct_3d: {
		id: "cbct_3d",
		studyType: "cbct_jaw_8x8",
		label: "3D КЛКТ (Конусно-лучевая компьютерная томография)",
		shortLabel: "3D КЛКТ",
		description: "Объемная 3D-томография челюстно-лицевой области для имплантации и хирургии",
		typicalDoseMicrosv: 55.0,
		typicalDoseMsv: 0.055,
		iconName: "Box",
	},
	optg_panoramic: {
		id: "optg_panoramic",
		studyType: "optg_digital_panoramic",
		label: "ОПТГ (Ортопантомограмма / Панорамный снимок)",
		shortLabel: "ОПТГ",
		description: "Панорамный обзорный 2D-снимок зубных рядов, челюстей и височно-нижнечелюстных суставов",
		typicalDoseMicrosv: 18.0,
		typicalDoseMsv: 0.018,
		iconName: "Scan",
	},
	intraoral_rvg: {
		id: "intraoral_rvg",
		studyType: "intraoral_radiovisiography",
		label: "Прицельная радиовизиография (RVG)",
		shortLabel: "Визиограф",
		description: "Прицельный снимок 1–3 зубов с максимальным разрешением для контроля эндодонтии",
		typicalDoseMicrosv: 3.0,
		typicalDoseMsv: 0.003,
		iconName: "Target",
	},
	trg_ceph: {
		id: "trg_ceph",
		studyType: "trg_cephalometric_lateral",
		label: "ТРГ (Телерентгенограмма / Цефалометрия)",
		shortLabel: "ТРГ",
		description: "Телерентгенограмма черепа в боковой или прямой проекции для ортодонтического расчета",
		typicalDoseMicrosv: 10.0,
		typicalDoseMsv: 0.010,
		iconName: "Maximize2",
	},
	bitewing: {
		id: "bitewing",
		studyType: "intraoral_radiovisiography",
		label: "Интерпроксимальный снимок (Bite-wing)",
		shortLabel: "Bite-wing",
		description: "Снимок коронковых частей для выявления скрытого апроксимального кариеса",
		typicalDoseMicrosv: 3.5,
		typicalDoseMsv: 0.0035,
		iconName: "Layers",
	},
	photo_clinical: {
		id: "photo_clinical",
		studyType: "intraoral_radiovisiography",
		label: "Клинический фотопротокол",
		shortLabel: "Фотопротокол",
		description: "Интраоральные и портретные дентальные фотографии без лучевой нагрузки",
		typicalDoseMicrosv: 0.0,
		typicalDoseMsv: 0.0,
		iconName: "Camera",
	},
};

/** Интерактивная 2-точечная измерительная линейка */
export interface MeasurementRuler {
	id: string;
	startX: number; // 0..100 (%) относительно ширины изображения
	startY: number; // 0..100 (%) относительно высоты изображения
	endX: number;
	endY: number;
	distanceMm: number; // измеренная длина в миллиметрах
	label?: string;
	color?: string;
}

/** Анатомическая метка зуба / ориентир */
export interface LandmarkPin {
	id: string;
	x: number; // 0..100 (%)
	y: number; // 0..100 (%)
	toothFdi: string; // Номер зуба по FDI: "11"-"48"
	label: string; // Описание метки
	type: "tooth" | "apex" | "canal" | "sinus" | "nerve" | "implant_site" | "caries" | "custom";
	notes?: string;
	color?: string;
}

/** Пресет яркости/контрастности/окна (WW/WL) */
export interface WindowLevelPreset {
	id: string;
	label: string;
	description: string;
	brightness: number; // 0..200 (100 = стандарт)
	contrast: number; // 0..300 (100 = стандарт)
	gamma?: number; // 0.5..2.0
	invert?: boolean; // инверсия цветов
}

export const DEFAULT_WW_WL_PRESETS: readonly WindowLevelPreset[] = [
	{
		id: "standard",
		label: "Стандарт",
		description: "Естественная гамма и сбалансированная яркость снимка",
		brightness: 100,
		contrast: 100,
		invert: false,
	},
	{
		id: "bone_endo",
		label: "Кость / Эндодонтия",
		description: "Высококонтрастная визуализация костных трабекул, периодонтальной щели и каналов",
		brightness: 110,
		contrast: 165,
		invert: false,
	},
	{
		id: "enamel_dentin",
		label: "Эмаль / Дентин",
		description: "Четкое разделение эмалево-дентинной границы для поиска апроксимального кариеса",
		brightness: 95,
		contrast: 180,
		invert: false,
	},
	{
		id: "implant_metal",
		label: "Импланты / Металл",
		description: "Подавление артефактов металлических конструкций и визуализация кортикальной пластинки",
		brightness: 85,
		contrast: 220,
		invert: false,
	},
	{
		id: "soft_tissue",
		label: "Мягкие ткани",
		description: "Оптимизация контуров десны, слизистой и гайморовых пазух",
		brightness: 125,
		contrast: 135,
		invert: false,
	},
	{
		id: "negative_invert",
		label: "Негатив / Инверсия",
		description: "Инвертированное рентгеновское отображение для обнаружения микротрещин",
		brightness: 100,
		contrast: 120,
		invert: true,
	},
];

/** Метаданные исследования */
export interface RadiologyStudyMetadata {
	kv?: number; // Напряжение на трубке (кВ)
	ma?: number; // Ток трубки (мА)
	exposureSec?: number; // Время экспозиции (сек)
	pixelSpacingMm?: number; // Разрешение калибровки: мм на пиксель (по умолчанию 0.1)
	apparatusModel?: string; // Модель аппарата
	sensorType?: string; // Тип сенсора (CCD, CMOS, PSP)
	dimensions?: { width: number; height: number };
	dicomSeriesUid?: string;
	dicomStudyUid?: string;
}

/** Диагностические находки AI */
export interface RadiologyAiFindings {
	cariesCount?: number;
	periapicalLesions?: number;
	boneLossPercentage?: number;
	summary?: string;
	confidence?: number;
	flaggedTeeth?: string[];
}

/** Единица рентгенологического исследования */
export interface RadiologyStudy {
	id: string;
	patientId?: string;
	patientName?: string;
	patientBirthDate?: string;
	medicalCardNumber?: string;
	studyDate: string; // ISO date or YYYY-MM-DD HH:mm
	studyType: DentalRadiologyStudyType;
	modality: RadiologyModality;
	modalityLabel: string;
	anatomicalArea: string; // e.g. "Зуб 36", "Верхняя и нижняя челюсти", "Сегмент 2.4-2.7"
	teethFdi: string[]; // e.g. ["36", "37"]
	effectiveDoseMicrosv: number; // мкЗв (например, 45.0)
	effectiveDoseMsv: number; // мЗв (например, 0.045)
	imageUrl?: string | undefined;
	thumbnailUrl?: string;
	doctorName: string;
	doctorSpecialty?: string;
	clinicName?: string;
	status: "completed" | "in_progress" | "scheduled";
	diagnosisIcd10?: string;
	diagnosticNotes?: string;
	aiFindings?: RadiologyAiFindings;
	metadata?: RadiologyStudyMetadata;
	measurements?: MeasurementRuler[];
	landmarks?: LandmarkPin[];
	calipers?: AlveolarRidgeCaliperMeasurement[];
	nerves?: MandibularNerveSpline[];
	tags?: string[];
}

/** Активный инструмент кибер-просмотрщика */
export type RadiologyViewerTool =
	| "pan"
	| "zoom"
	| "ruler"
	| "caliper"
	| "nerve_tracer"
	| "landmark"
	| "window_level";

/** Состояние кибер-просмотрщика */
export interface RadiologyViewerState {
	zoom: number; // масштаб (1.0 = 100%)
	panX: number; // смещение в пикселях
	panY: number;
	rotation: number; // 0, 90, 180, 270
	flipHorizontal: boolean;
	activeTool: RadiologyViewerTool;
	activePresetId: string;
	brightness: number; // 0..200
	contrast: number; // 0..300
	invert: boolean;
	activeToothSelection: string | null;
	measurements: MeasurementRuler[];
	landmarks: LandmarkPin[];
	calipers: AlveolarRidgeCaliperMeasurement[];
	nerves: MandibularNerveSpline[];
	isHudVisible: boolean;
	isCalibrating: boolean;
	calibratedMmPerPixel: number; // по умолчанию 0.1 мм/пиксель
}
