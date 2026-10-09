/**
 * types.ts — Layer 0: Канонические типы данных аппаратного шлюза визиографов и сенсоров.
 *
 * Implements Mandates 8e (Doctor Autonomy, zero sensor lock-in), 8s (Canonical Authority).
 */

export type SensorBrandId =
	| "vatech"
	| "carestream"
	| "planmeca"
	| "sirona"
	| "dexis"
	| "acteon"
	| "woodpecker"
	| "handy"
	| "kavo"
	| "fona"
	| "myray"
	| "owandy"
	| "eighteeth"
	| "xpect_vision"
	| "duerr"
	| "generic";

export type SensorIntakeProtocol =
	| "twain_dsm"
	| "hot_folder"
	| "usb_direct"
	| "dicom_cstore"
	| "hybrid";

export interface UniversalSensorModel {
	readonly id: string;
	readonly name: string;
	readonly brand: SensorBrandId;
	readonly brandName: string;
	readonly resolution: string;
	readonly pixelSpacing: number; // in mm (e.g. 0.035, 0.0148, 0.019)
	readonly pixelSpacingMicrons: number; // in µm (e.g. 35.0, 14.8, 19.0)
	readonly opticalResolutionLpMm: number; // line pairs / mm (e.g. 29.2, 33.7)
	readonly dimensions: string; // e.g. "1920x1440"
	readonly bitDepth: 12 | 14 | 16;
	readonly sensorSize: "Size 1" | "Size 1.5" | "Size 2" | "PSP Plate";
	readonly activeAreaMm: string;
	readonly technology: "CMOS" | "Fiber-Optic CMOS" | "CCD" | "Photon-Counting" | "PSP Storage Phosphor";
	readonly isDirectUsbSupported: boolean;
	readonly isTwainSupported: boolean;
	readonly recommendedHotFolder: string;
}

export interface SensorVendorProfile {
	readonly brand: SensorBrandId;
	readonly name: string;
	readonly country: string;
	readonly defaultDriverType: SensorIntakeProtocol;
	readonly defaultHotFolders: readonly string[];
	readonly knownVidPids: readonly {
		readonly vid: number;
		readonly pid?: number | undefined;
		readonly controllerChip: string;
		readonly description: string;
	}[];
}

export interface TwainDataSourceItem {
	readonly id: string;
	readonly name: string;
	readonly manufacturer: string;
	readonly productFamily: string;
	readonly version: string;
	readonly isDefault: boolean;
	readonly protocol: "twain_2_4";
}

export interface HotFolderRouteMatch {
	readonly matchedFolder: string;
	readonly brand: SensorBrandId;
	readonly defaultModelId: string;
	readonly confidence: number;
}

export interface UsbSensorMatch {
	readonly brand: SensorBrandId;
	readonly brandName: string;
	readonly defaultModelId: string;
	readonly controllerChip: string;
	readonly deviceDescription: string;
	readonly isMatch: boolean;
}

export interface DicomScpConfig {
	readonly aeTitle: string;
	readonly port: number;
	readonly timeoutSec: number;
	readonly supportedSopClasses: readonly string[];
	readonly supportedTransferSyntaxes: readonly string[];
}

export interface SensorDetectionResult {
	readonly isDetected: boolean;
	readonly sensorModelId: string;
	readonly sensorModelName: string;
	readonly brand: SensorBrandId;
	readonly brandName: string;
	readonly intakeChannel: SensorIntakeProtocol;
	readonly calibratedPixelSpacingMm: number;
	readonly calibratedResolution: string;
	readonly statusMessage: string;
	readonly details: string;
	readonly nonConflictingNotice?: string;
}

export interface SensorConnectionStatus {
	readonly isReady: boolean;
	readonly statusText: string;
	readonly latencyMs: number;
	readonly timestampIso: string;
	readonly calibratedPixelSpacingMm: number;
	readonly calibratedResolution: string;
	readonly bitDepth: number;
	readonly temperatureCelsius?: number | undefined;
	readonly intakeChannel?: SensorIntakeProtocol | undefined;
	readonly nonConflictingNotice?: string | undefined;
}
