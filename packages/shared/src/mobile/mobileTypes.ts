/**
 * @dental/shared/mobile — Mobile Hardware Bridges & Cross-Platform Contracts
 *
 * Defines typed contracts for:
 * 1. Hardware 2D DataMatrix / Barcode Camera Scanner (WebRTC vs Native Google ML Kit).
 * 2. 54-FZ Fiscal & Thermal Receipt Printer (Web Print vs Bluetooth LE / SPP ESC/POS CP866).
 * 3. Native Incoming SIP Telephony Bridge (CallKit / Android ConnectionService).
 */

import { z } from "zod";

// ============================================================================
// 1. HARDWARE SCANNER CONTRACTS
// ============================================================================

export const barcodeFormatSchema = z.enum([
	"data_matrix",
	"qr_code",
	"code_128",
	"ean_13",
	"ean_8",
	"code_39",
	"upc_a",
	"unknown",
]);
export type BarcodeFormat = z.infer<typeof barcodeFormatSchema>;

export interface CameraScanOptions {
	readonly facingMode?: "environment" | "user" | undefined;
	readonly torch?: boolean | undefined;
	readonly continuousFocus?: boolean | undefined;
	readonly targetFps?: number | undefined;
	readonly formats?: readonly BarcodeFormat[] | undefined;
	readonly debounceMs?: number | undefined;
}

export interface HardwareScanResult {
	readonly success: boolean;
	readonly rawCode: string;
	readonly format: BarcodeFormat;
	readonly timestamp: number;
	readonly source: "camera_webrtc" | "camera_mlkit_native" | "usb_hid_keyboard" | "manual_input";
	readonly durationMs?: number | undefined;
	readonly error?: string | undefined;
}

export interface KraftPackageVerificationVerdict {
	readonly isValid: boolean;
	readonly rawBarcode: string;
	readonly status: "sterile_valid" | "expired" | "damaged" | "invalid_format";
	readonly batchId?: string | undefined;
	readonly serialNumber?: number | undefined;
	readonly autoclaveId?: string | undefined;
	readonly cycleNumber?: number | undefined;
	readonly packDateFormatted?: string | undefined;
	readonly expDateFormatted?: string | undefined;
	readonly daysLifespan?: number | undefined;
	readonly daysRemaining?: number | undefined;
	readonly isExpired?: boolean | undefined;
	readonly toolSetNameRu?: string | undefined;
	readonly operatorNameRu?: string | undefined;
	readonly indicatorStatusRu?: string | undefined;
	readonly statutoryReference: string;
	readonly failureReasonRu?: string | undefined;
}

// ============================================================================
// 2. HARDWARE PRINTER CONTRACTS (54-FZ & THERMAL ESC/POS)
// ============================================================================

export const printerInterfaceSchema = z.enum([
	"bluetooth_le",
	"bluetooth_spp",
	"lan_tcp",
	"usb_serial",
	"browser_dialog",
	"http_proxy",
]);
export type PrinterInterface = z.infer<typeof printerInterfaceSchema>;

export interface BluetoothPrinterDevice {
	readonly id: string;
	readonly name: string;
	readonly address?: string | undefined;
	readonly connected: boolean;
	readonly signalStrengthRssi?: number | undefined;
	readonly interfaceType: "bluetooth_le" | "bluetooth_spp";
}

export interface HardwarePrinterConfig {
	readonly preferredInterface: PrinterInterface;
	readonly bluetoothDeviceAddress?: string | undefined;
	readonly lanHost?: string | undefined;
	readonly lanPort?: number | undefined;
	readonly paperWidthMm: 58 | 80;
	readonly characterEncoding: "CP866" | "UTF-8";
	readonly autoCut: boolean;
	readonly printCopies: number;
}

export interface HardwarePrintResult {
	readonly success: boolean;
	readonly status: "printed" | "queued" | "failed" | "cancelled";
	readonly interfaceUsed: PrinterInterface;
	readonly printedAt: string;
	readonly bytesWritten?: number | undefined;
	readonly fiscalSign?: string | undefined;
	readonly fiscalDocNum?: string | undefined;
	readonly error?: string | undefined;
}

// ============================================================================
// 3. CALLKIT & NATIVE TELEPHONY BRIDGE CONTRACTS
// ============================================================================

export interface CallKitCallPayload {
	readonly callId: string;
	readonly callerNumber: string;
	readonly callerName: string;
	readonly patientId?: string | null | undefined;
	readonly hasVideo?: boolean | undefined;
	readonly timestamp: number;
}

export interface CallKitEventMap {
	readonly onCallAnswered: (callId: string) => void;
	readonly onCallEnded: (callId: string, reason?: string | undefined) => void;
	readonly onMuteToggled: (callId: string, isMuted: boolean) => void;
	readonly onHoldToggled: (callId: string, isHeld: boolean) => void;
}
