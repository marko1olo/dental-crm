/**
 * hardwareCapabilities/types.ts — Layer 0: Contracts & Interface Definitions
 *
 * Defines complete domain types for hardware capabilities profiler,
 * performance adaptation engine, and clinic hardware device drivers
 * (KKM 54-FZ, POS payment terminals, digital imaging sensors, discovery).
 */

import type {
	HardwareTier,
	HardwareGpuType,
	HardwareProfile,
	HardwareAdaptiveSettings,
} from "@dental/shared";

// Re-export shared domain types
export type {
	HardwareTier,
	HardwareGpuType,
	HardwareProfile,
	HardwareAdaptiveSettings,
};

/**
 * Legacy interface retained for 100% backwards compatibility with existing call sites.
 */
export interface HardwareCapabilities {
	/** Estimated device memory in GiB from navigator.deviceMemory */
	deviceMemoryGb: number | null;
	/** Number of logical processor cores from navigator.hardwareConcurrency */
	cpuCores: number | null;
	/** Whether device is running on low battery / battery saver */
	isBatterySaving: boolean;
	/** Whether browser network/system reports Save-Data mode */
	isSaveDataActive: boolean;
	/** Whether OS preference prefers reduced motion */
	prefersReducedMotion: boolean;
	/** Detected GPU renderer string from WebGL debug info, if available */
	gpuRenderer: string | null;
	/** Whether the GPU appears to be integrated / low-spec (Intel HD, software) */
	isIntegratedGpu: boolean;
	/** Whether low-spec hardware profile is active (tier === "potato" || tier === "low") */
	isLowSpec: boolean;
	/** Reasons that triggered tier activation */
	reasons: string[];
}

export interface ExtendedNavigator extends Navigator {
	deviceMemory?: number;
	connection?: {
		saveData?: boolean;
		effectiveType?: string;
	};
	getBattery?: () => Promise<{
		charging: boolean;
		level: number;
		addEventListener?: (type: string, listener: () => void) => void;
		removeEventListener?: (type: string, listener: () => void) => void;
	}>;
}

export interface GpuDetails {
	renderer: string | null;
	vendor: string | null;
	gpuType: HardwareGpuType;
	webgl2Supported: boolean;
	maxTextureSize: number | null;
	max3dTextureSize: number | null;
}

export interface WebGpuAdapterInfo {
	vendor: string | null;
	architecture: string | null;
	device: string | null;
	description: string | null;
	isDiscrete: boolean;
}

export interface HybridGpuDetectionResult {
	isHybridGraphics: boolean;
	primaryRenderer: string | null;
	discreteGpuRenderer: string | null;
	hybridGraphicsNotice: string | null;
	shouldPromoteToDiscrete: boolean;
}

export interface EvaluateProfileOptions {
	forceFresh?: boolean | undefined;
	batteryState?: { charging: boolean; level: number } | undefined;
	isSlowDisk?: boolean | undefined;
}

export type PerfState = "healthy" | "degraded";

export type PerfStateListener = (state: PerfState) => void;
export type CtActiveListener = (active: boolean) => void;
export type HardwareProfileListener = (profile: HardwareProfile) => void;
export type LegacyHardwareListener = (caps: HardwareCapabilities) => void;

// ============================================================================
// CLINICAL HARDWARE DEVICE INTEGRATIONS (KKM, POS, IMAGING, DISCOVERY)
// ============================================================================

export type HardwareDeviceType =
	| "fiscal_kkm"
	| "pos_terminal"
	| "visiodent_sensor"
	| "intraoral_camera"
	| "rfid_reader"
	| "barcode_scanner";

export type HardwareConnectionProtocol =
	| "com_serial"
	| "usb_direct"
	| "lan_tcp"
	| "twain_driver"
	| "web_media";

export type DeviceHealthStatus =
	| "online"
	| "offline"
	| "busy"
	| "paper_out"
	| "fn_warning"
	| "tampered";

export interface HardwareDevice {
	id: string;
	name: string;
	type: HardwareDeviceType;
	protocol: HardwareConnectionProtocol;
	port?: string | undefined;
	host?: string | undefined;
	baudRate?: number | undefined;
	model?: string | undefined;
	serialNumber?: string | undefined;
	isDefault?: boolean | undefined;
}

export interface DeviceHealth {
	deviceId: string;
	status: DeviceHealthStatus;
	latencyMs: number;
	lastCheckedAt: number;
	errorMessage?: string | undefined;
	firmwareVersion?: string | undefined;
	paperRemainingPct?: number | undefined;
	fnDaysRemaining?: number | undefined;
}

export interface FiscalReceiptItem {
	name: string;
	price: number;
	quantity: number;
	amount: number;
	taxRate?: "vat20" | "vat10" | "vat0" | "no_vat" | undefined;
	paymentType?: "full_prepayment" | "full_payment" | "advance" | undefined;
	itemType?: "commodity" | "service" | undefined;
	markingCode?: string | undefined; // DataMatrix for marked medicines
}

export interface FiscalReceiptPayload {
	receiptNumber: string;
	cashierName: string;
	cashierInn?: string | undefined;
	operationType: "sell" | "sell_return" | "buy" | "buy_return";
	items: FiscalReceiptItem[];
	totalAmount: number;
	cashAmount?: number | undefined;
	electronicAmount?: number | undefined;
	patientEmailOrPhone?: string | undefined;
}

export interface FiscalShiftReport {
	shiftNumber: number;
	totalReceiptsCount: number;
	totalCashRevenue: number;
	totalElectronicRevenue: number;
	fnNumber: string;
	openedAt: string;
	closedAt?: string | undefined;
}

export interface PosPaymentPayload {
	amount: number;
	currency?: string | undefined;
	orderId: string;
	patientId?: string | undefined;
	idempotencyKey: string;
}

export interface PosPaymentResult {
	success: boolean;
	transactionId?: string | undefined;
	authCode?: string | undefined;
	cardMask?: string | undefined;
	cardIssuer?: string | undefined;
	amountPaid: number;
	slipText?: string | undefined;
	errorMessage?: string | undefined;
}

export interface ImagingCaptureOptions {
	toothCode?: number | undefined;
	viewCategory?: "macro" | "bite_wing" | "periapical" | "panoramic" | undefined;
	exposureTimeMs?: number | undefined;
	resolution?: "macro" | "high" | "standard" | undefined;
}

export interface ImagingFrameData {
	success: boolean;
	dataUrl?: string | undefined;
	width: number;
	height: number;
	capturedAt: number;
	sensorModel?: string | undefined;
	error?: string | undefined;
}

export interface DiscoveredDevicePort {
	path: string;
	manufacturer?: string | undefined;
	serialNumber?: string | undefined;
	vendorId?: string | undefined;
	productId?: string | undefined;
	friendlyName?: string | undefined;
	guessedType?: HardwareDeviceType | undefined;
}
