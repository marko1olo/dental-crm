/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RVG TWAIN & SENSOR TYPES (LAYER 0 CONTRACTS)
 * Data contracts for dental visigraph sensors, calibrations and acquisitions
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";

export type RvgSensorVendor =
	| "vatech"
	| "kavo_gendex"
	| "planmeca"
	| "fona"
	| "woodpecker"
	| "handy"
	| "carestream"
	| "duerr"
	| "generic_twain";

export type RvgSensorSize = "SIZE_0" | "SIZE_1" | "SIZE_1_5" | "SIZE_2";

export type RvgCaptureProtocol = "TWAIN_2_4" | "WIA_2_0" | "NATIVE_USB_DRIVER";

export type RvgCaptureState =
	| "DISCONNECTED"
	| "INITIALIZING"
	| "IDLE_READY"
	| "ARMED_WAITING_FOR_XRAY"
	| "EXPOSURE_DETECTED"
	| "ACQUIRING_RAW_FRAME"
	| "APPLYING_CALIBRATION"
	| "FRAME_READY"
	| "ERROR";

export interface RvgSensorSpecification {
	readonly vendor: RvgSensorVendor;
	readonly modelName: string;
	readonly sensorSize: RvgSensorSize;
	readonly activeAreaMm: readonly [number, number]; // [widthMm, heightMm]
	readonly matrixResolutionPx: readonly [number, number]; // [widthPx, heightPx]
	readonly theoreticalResolutionLpMm: number; // line pairs per mm (lp/mm)
	readonly pixelPitchMicrons: number; // in micrometers (e.g. 19.5 um)
	readonly nativeBitDepth: 12 | 14 | 16;
	readonly vendorUsbId: {
		readonly vendorId: number; // e.g. 0x0E8F
		readonly productId: number;
	};
	readonly defaultWindowWidth: number;
	readonly defaultWindowCenter: number;
}

export interface BadPixelLocation {
	readonly x: number;
	readonly y: number;
}

export interface RvgHardwareCalibrationProfile {
	readonly sensorSerialNumber: string;
	readonly darkFrameMatrix?: Uint16Array | undefined; // Thermal / dark current offset
	readonly flatFieldGainMatrix?: Float32Array | undefined; // Relative gain map (normalized around 1.0)
	readonly badPixelMap: readonly BadPixelLocation[]; // Defective pixel coordinates
	readonly exposureThresholdAdc: number; // Trigger threshold for auto-exposure detection
	readonly calibrationDate: string;
}

export interface RvgRawFrame {
	readonly width: number;
	readonly height: number;
	readonly bitDepth: 12 | 14 | 16;
	readonly pixelBuffer: Uint16Array;
	readonly acquisitionTimestamp: number;
	readonly sensorInfo: RvgSensorSpecification;
	readonly calibrationApplied: boolean;
	readonly exposureTimeMs?: number | undefined;
	readonly triggerLevelAdc?: number | undefined;
}

/**
 * Result contract for direct visigraph image acquisition
 */
export type RvgAcquisitionResult = RvgRawFrame;

export interface RvgPatientStudyBinding {
	readonly patientId: string;
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientSex?: "M" | "F" | "O" | undefined;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly visitId?: string | undefined;
	readonly toothFdiNumber?: number | undefined; // 11–48 (permanent), 51–85 (deciduous)
	readonly studyDescription?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly xRayTubeKv?: number | undefined;
	readonly xRayTubeMa?: number | undefined;
	readonly xRayExposureSec?: number | undefined;
}

export interface RvgDicomDatasetEnriched {
	readonly sopInstanceUid: string;
	readonly studyInstanceUid: string;
	readonly seriesInstanceUid: string;
	readonly modality: "IO" | "DX" | "RVG";
	readonly studyDate: string; // YYYYMMDD
	readonly studyTime: string; // HHMMSS
	readonly patientId: string;
	readonly patientName: string;
	readonly patientBirthDate?: string | undefined;
	readonly patientSex?: string | undefined;
	readonly toothFdiNumber?: number | undefined;
	readonly toothFdiString?: string | undefined;
	readonly anatomicRegion: string;
	readonly rows: number;
	readonly columns: number;
	readonly bitsAllocated: 16;
	readonly bitsStored: 12 | 14 | 16;
	readonly highBit: number; // bitsStored - 1
	readonly pixelRepresentation: 0; // Unsigned integer
	readonly samplesPerPixel: 1;
	readonly photometricInterpretation: "MONOCHROME2";
	readonly pixelSpacingMm: readonly [number, number]; // [rowSpacing, colSpacing] in mm
	readonly windowCenter: number;
	readonly windowWidth: number;
	readonly manufacturer: string;
	readonly manufacturerModelName: string;
	readonly deviceSerialNumber: string;
	readonly softwareVersions: string;
	readonly kvp?: number | undefined;
	readonly tubeCurrentMa?: number | undefined;
	readonly exposureTimeSec?: number | undefined;
	readonly rawPixelBuffer: Uint16Array;
}

export const toothFdiCodeSchema = z
	.number()
	.int()
	.refine(
		(code) =>
			(code >= 11 && code <= 18) ||
			(code >= 21 && code <= 28) ||
			(code >= 31 && code <= 38) ||
			(code >= 41 && code <= 48) ||
			(code >= 51 && code <= 55) ||
			(code >= 61 && code <= 65) ||
			(code >= 71 && code <= 75) ||
			(code >= 81 && code <= 85),
		{ message: "Некорректный номер зуба по стандарту FDI (11-48 для постоянных, 51-85 для молочных)" },
	);

export const rvgPatientStudyBindingSchema = z.object({
	patientId: z.string().min(1, "Идентификатор пациента обязателен"),
	patientName: z.string().min(1, "ФИО пациента обязательно"),
	patientBirthDate: z.string().optional(),
	patientSex: z.enum(["M", "F", "O"]).optional(),
	doctorId: z.string().min(1, "Идентификатор врача обязателен"),
	doctorName: z.string().min(1, "ФИО врача обязательно"),
	visitId: z.string().optional(),
	toothFdiNumber: toothFdiCodeSchema.optional(),
	studyDescription: z.string().optional(),
	clinicName: z.string().optional(),
	xRayTubeKv: z.number().min(40).max(100).optional(),
	xRayTubeMa: z.number().min(1).max(20).optional(),
	xRayExposureSec: z.number().min(0.01).max(5.0).optional(),
});
