import type { CSSProperties } from "react";
import type { ToothState } from "../../store/visitStore";
import type { ViewerRulerMeasurement } from "./ShadowAnalystImageSlider";
import type { MprWindowPreset } from "../../imagingUiLabels";

export type { ViewerRulerMeasurement, MprWindowPreset };

export type ImagingStudyKind =
	| "periapical"
	| "bitewing"
	| "opg"
	| "ceph"
	| "cbct"
	| "photo"
	| "other"
	| string;

export interface ImagingStudy {
	id: string;
	patientId?: string;
	visitId?: string | null;
	kind: ImagingStudyKind;
	title: string;
	region?: string | null;
	toothCode?: string | null;
	sourceKind?: string;
	sourceName?: string;
	storagePath?: string | null;
	previewUrl?: string | null;
	capturedAt: string;
	status?: string;
	aiSummary?: string | null;
	aiToothUpdates?: unknown[];
	dicomStudyUid?: string;
	studyInstanceUid?: string;
	studyUid?: string;
	dicomSeriesUid?: string;
	seriesInstanceUid?: string;
	seriesUid?: string;
	hasDicomweb?: boolean;
	[key: string]: unknown;
}

export interface ImagingViewerState {
	zoom?: number;
	pan?: { x: number; y: number };
	rotationDeg?: number;
	flipHorizontal?: boolean;
	brightness?: number;
	contrast?: number;
	inverted?: boolean;
	[key: string]: unknown;
}

export type ImagingTool =
	| "window_level"
	| "pan"
	| "zoom"
	| "ruler"
	| "angle"
	| "annotation"
	| "implant"
	| "nerve"
	| "density";

export interface ImagingMeasurement {
	id: string;
	type: "ruler" | "angle" | "nerve" | "density";
	points: Array<{ x: number; y: number }>;
	valueMm?: number;
	angleDeg?: number;
	densityHU?: number;
	label?: string;
	color?: string;
}

export interface ImagingAnnotation {
	id: string;
	label: string;
	toothCode?: string | null;
	updatedAt: string;
	x?: number;
	y?: number;
	note?: string;
}

export interface ImagingExportOptions {
	format: "jpg" | "png" | "dicom" | "pdf";
	withPatientData: boolean;
	withMeasurements: boolean;
	withAnnotations: boolean;
	quality: number;
}

export interface AiProposal {
	studyId: string;
	detectedCodes: string[];
	detectedToothStates: Record<string, ToothState>;
	aiDiagnoses: Record<string, string>;
}

export const IMAGING_QUICK_CHIPS = [
	"Норма (периапикальные ткани б/о, периодонтальная щель равномерная)",
	"Кариес дентина",
	"Хронический гранулирующий периодонтит",
	"Атрофия костной ткани горизонтальная",
	"Хронический пульпит",
	"Неполная обтурация корневого канала",
	"Имплантат стабилен, остеоинтеграция б/о",
	"Ретенция / Дистопия",
];

export const IMAGING_DESCRIPTION_TEMPLATES: Record<string, string[]> = {
	periapical: [
		"Коронковая часть:",
		"Полость зуба:",
		"Корневые каналы:",
		"Периапикальные ткани:",
		"Заключение:",
	],
	bitewing: [
		"Контактные поверхности:",
		"Уровень костной ткани:",
		"Наддесневые и поддесневые отложения:",
		"Заключение:",
	],
	opg: [
		"Зубная формула:",
		"Уровень костной ткани:",
		"Гайморовы пазухи:",
		"Височно-челюстные суставы:",
		"Ретинированные и непрорезавшиеся зубы:",
		"Заключение:",
	],
	ceph: [
		"Профиль лица:",
		"Скелетный класс:",
		"Углы SNA / SNB / ANB:",
		"Положение резцов:",
		"Заключение:",
	],
	cbct: [
		"Область исследования:",
		"Плотность костной ткани:",
		"Высота и ширина кости:",
		"Анатомические структуры (канал, пазуха, дно носа):",
		"Патологические изменения:",
		"Заключение:",
	],
	photo: [
		"Область съёмки:",
		"Состояние мягких тканей:",
		"Гигиена:",
		"Заключение:",
	],
	other: ["Область:", "Описание:", "Заключение:"],
};

export function imagingDescriptionTemplate(
	kind: string | null | undefined,
	toothCode: string | null | undefined,
	region: string | null | undefined,
): string {
	const lines =
		IMAGING_DESCRIPTION_TEMPLATES[kind ?? "other"] ??
		IMAGING_DESCRIPTION_TEMPLATES.other ?? [];
	const header = toothCode
		? `Зуб: ${toothCode}`
		: region
			? `Область: ${region}`
			: null;
	const body = header
		? [header, ...(lines ?? []).filter((line) => !line.startsWith("Область:"))]
		: (lines ?? []);
	return body.join("\n");
}

export function imagingStudyHasFile(study: unknown): boolean {
	if (!study || typeof study !== "object") return false;
	const s = study as Record<string, unknown>;
	return typeof s.storagePath === "string" && s.storagePath.trim().length > 0;
}
