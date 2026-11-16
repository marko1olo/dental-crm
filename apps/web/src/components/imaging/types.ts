/**
 * types.ts — Типы данных и интерфейсы модуля лучевой диагностики
 * Mandate 8b: строго <= 120 строк.
 */

import type { CSSProperties } from "react";
import type { ToothState } from "../../store/visitStore.js";
import type { ViewerRulerMeasurement } from "./ClinicalImageViewer.js";
import type { MprWindowPreset } from "../../imagingUiLabels.js";

export type { ViewerRulerMeasurement, MprWindowPreset };
export {
	IMAGING_QUICK_CHIPS,
	IMAGING_DESCRIPTION_TEMPLATES,
	imagingDescriptionTemplate,
	imagingStudyHasFile,
} from "./imagingTemplates.js";

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
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	kind: ImagingStudyKind;
	title: string;
	region?: string | null | undefined;
	toothCode?: string | null | undefined;
	sourceKind?: string | undefined;
	sourceName?: string | undefined;
	storagePath?: string | null | undefined;
	previewUrl?: string | null | undefined;
	capturedAt: string;
	status?: string | undefined;
	aiSummary?: string | null | undefined;
	aiToothUpdates?: unknown[] | undefined;
	dicomStudyUid?: string | null | undefined;
	studyInstanceUid?: string | null | undefined;
	studyUid?: string | null | undefined;
	dicomSeriesUid?: string | null | undefined;
	seriesInstanceUid?: string | null | undefined;
	seriesUid?: string | null | undefined;
	hasDicomweb?: boolean | undefined;
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
