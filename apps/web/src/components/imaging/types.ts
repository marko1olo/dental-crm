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
