/**
 * VisiographExportTypes.ts
 * Type definitions and label formatters for radiological snapshots and clinical export.
 */

import type { VisiographWindowPreset } from "./VisiographWindowPresets";

export interface HighDpiCaptureOptions {
	pixelRatio?: number | undefined;
	contrast?: number | undefined;
	brightness?: number | undefined;
	invert?: boolean | undefined;
	mimeType?: "image/jpeg" | "image/png" | undefined;
	quality?: number | undefined;
	burnInHeader?: {
		patientId?: string | undefined;
		toothCode?: string | undefined;
		capturedAt?: string | undefined;
		finding?: string | undefined;
	} | undefined;
}

export interface ClinicalSnapshotPayload {
	patientId: string;
	imageDataUri: string;
	thumbnailDataUri?: string | undefined;
	viewKind?:
		| "mpr_axial"
		| "mpr_sagittal"
		| "mpr_coronal"
		| "panoramic_mpr"
		| "visiograph_3d"
		| "periapical_2d"
		| "bitewing"
		| "tele_xray"
		| undefined;
	fdiToothCode?: string | undefined;
	toothCode?: string | undefined;
	preset?: VisiographWindowPreset | undefined;
	nerveDistanceMm?: number | undefined;
	boneDensity?: { averageHU?: number; opticalDensity?: number; classification: string } | undefined;
	implantDetails?: { diameterMm: number; lengthMm: number; system?: string | undefined } | undefined;
	aiProtocolLog?: string | undefined;
	clinicalNote?: string | undefined;
	radiologicalFinding?: string | undefined;
	capturedAt?: string | undefined;
	exposureTimeSec?: number | undefined;
	exposureParameters?: {
		exposureTimeSec?: number | undefined;
		mAs?: number | undefined;
		kVp?: number | undefined;
		sensorType?: string | undefined;
	} | undefined;
	contrast?: number | undefined;
	brightness?: number | undefined;
	gamma?: number | undefined;
	sharpness?: number | undefined;
	calibration?: { scaleMmPerPx: number; referenceType?: string | undefined; referenceMm?: number | undefined } | undefined;
	measurements?: {
		rulers?: Array<{ label?: string | undefined; lengthMm: number }> | undefined;
		angles?: Array<{ label?: string | undefined; angleDeg: number; deviationFromVerticalDeg?: number | undefined }> | undefined;
		lesions?: Array<{ areaMm2: number; equivalentDiameterMm: number; classificationLabel: string; treatmentRecommendation?: string | undefined }> | undefined;
	} | undefined;
}

export interface ClinicalExportOutcome {
	success: boolean;
	scanId?: string | undefined;
	message: string;
	protocol043Text: string;
}

export function formatViewKindLabel(kind?: string): string {
	switch (kind) {
		case "mpr_axial":
			return "3D КЛКТ / Аксиальный срез (Axial MPR)";
		case "mpr_sagittal":
			return "3D КЛКТ / Сагиттальный срез (Sagittal MPR)";
		case "mpr_coronal":
			return "3D КЛКТ / Корональный срез (Coronal MPR)";
		case "panoramic_mpr":
			return "Панорамная томография (Curved Panoramic MPR / ОПТГ)";
		case "visiograph_3d":
			return "3D Визиография / Объемная реконструкция КЛКТ";
		case "periapical_2d":
			return "Прицельная 2D визиография (Периапикальный снимок)";
		case "bitewing":
			return "Интерпроксимальная визиография (Bitewing)";
		case "tele_xray":
			return "Телерентгенография ТРГ (Cephalometric)";
		default:
			return "Рентгенологическое исследование зубочелюстной системы";
	}
}
