/**
 * types.ts — Types, contracts and interfaces for clinic hardware devices and scanners.
 */

import type {
	BarcodeFormat,
	CameraScanOptions,
	HardwareScanResult,
	KraftPackageVerificationVerdict,
} from "@dental/shared";

export type {
	BarcodeFormat,
	CameraScanOptions,
	HardwareScanResult,
	KraftPackageVerificationVerdict,
};

export type HardwareScannerState =
	| "idle"
	| "starting_camera"
	| "scanning"
	| "paused"
	| "error";

export type HardwareScannerSubscriber = (result: HardwareScanResult) => void;
export type HardwareScannerErrorSubscriber = (error: string, code: string) => void;

export type DevicePortKind =
	| "serial_com"
	| "web_usb"
	| "lan_network"
	| "camera_webrtc"
	| "twain_pacs";

export type HardwareDeviceKind =
	| "barcode_2d_mdlp"
	| "fiscal_kkt"
	| "visiograph_sensor"
	| "twain_scanner"
	| "thermal_printer"
	| "smartcard_reader"
	| "unknown";

export type HardwareDeviceConnectionStatus =
	| "connected"
	| "disconnected"
	| "scanning"
	| "error"
	| "unauthorized";

export interface HardwareDevice {
	id: string;
	name: string;
	kind: HardwareDeviceKind;
	portKind: DevicePortKind;
	status: HardwareDeviceConnectionStatus;
	vendorId?: string | number | undefined;
	productId?: string | number | undefined;
	serialNumber?: string | undefined;
	address?: string | undefined;
	baudRate?: number | undefined;
	lastSeenTimestamp?: number | undefined;
	details?: Record<string, unknown> | undefined;
}

export interface DeviceScanOptions {
	timeoutMs?: number | undefined;
	baudRates?: number[] | undefined;
	ipRange?: string[] | undefined;
	portList?: number[] | undefined;
	requestUserPermission?: boolean | undefined;
}

declare global {
	interface Window {
		BarcodeDetector?: {
			new (options?: { formats: string[] }): {
				detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string; format: string }>>;
			};
			getSupportedFormats(): Promise<string[]>;
		};
	}
}
