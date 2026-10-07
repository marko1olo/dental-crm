/**
 * @dental/shared/hardware — Cross-Platform Clinic Hardware & Peripheral Type Definitions.
 *
 * Covers:
 * 1. Thermal ESC/POS receipt printers (USB / LAN TCP 9100 / Bluetooth).
 * 2. TSPL / ZPL label printers for SanPiN 3.3686-21 sterilized instrument pouches.
 * 3. 2D Barcode scanners (HID Keyboard Wedge / Virtual COM CDC / DataMatrix).
 * 4. 54-FZ Fiscal cash registers (АТОЛ ДККТ 10, Штрих-М, Эвотор) over COM / TCP.
 * 5. Cross-platform discovery results & hardware test patterns.
 */

import { z } from "zod";

// ============================================================================
// 1. ENUMS & CORE SCHEMAS
// ============================================================================

export const deviceTypeSchema = z.enum([
	"thermal_receipt",
	"label_printer",
	"document_printer",
	"fiscal_kkt",
	"barcode_scanner",
	"twain_sensor",
	"cash_drawer",
]);
export type DeviceType = z.infer<typeof deviceTypeSchema>;

export const deviceInterfaceSchema = z.enum([
	"usb",
	"tcp_raw",
	"serial_com",
	"bluetooth",
	"system_spooler",
]);
export type DeviceInterface = z.infer<typeof deviceInterfaceSchema>;

export const deviceStatusSchema = z.enum([
	"online",
	"offline",
	"busy",
	"paper_out",
	"cover_open",
	"error",
	"unknown",
]);
export type DeviceStatus = z.infer<typeof deviceStatusSchema>;

export const thermalPaperWidthMmSchema = z.union([z.literal(58), z.literal(80)]);
export type ThermalPaperWidthMm = z.infer<typeof thermalPaperWidthMmSchema>;

export const labelPrinterEmulationSchema = z.enum([
	"tspl",
	"zpl",
	"epl",
	"escpos",
]);
export type LabelPrinterEmulation = z.infer<typeof labelPrinterEmulationSchema>;

// ============================================================================
// 2. HARDWARE DEVICE DESCRIPTORS
// ============================================================================

export interface HardwareDeviceDescriptor {
	readonly id: string;
	readonly name: string;
	readonly type: DeviceType;
	readonly interface: DeviceInterface;
	readonly status: DeviceStatus;
	readonly isDefault: boolean;
	readonly manufacturer?: string | undefined;
	readonly model?: string | undefined;
	readonly port?: string | undefined;
	readonly ipAddress?: string | undefined;
	readonly rawTcpPort?: number | undefined;
	readonly serialNumber?: string | undefined;
	readonly emulation?: LabelPrinterEmulation | undefined;
	readonly paperWidthMm?: ThermalPaperWidthMm | undefined;
	readonly details?: Record<string, unknown> | undefined;
}

export interface PrinterStatusReport {
	readonly online: boolean;
	readonly paperPresent: boolean;
	readonly coverClosed: boolean;
	readonly hasError: boolean;
	readonly status: DeviceStatus;
	readonly rawStatusByte?: number | undefined;
	readonly errorMessage?: string | undefined;
}

// ============================================================================
// 3. BARCODE SCANNERS & 54-FZ KKT
// ============================================================================

export type ScannerMode = "keyboard_wedge" | "virtual_com" | "hid_pos";

export interface ScannerDeviceDescriptor extends HardwareDeviceDescriptor {
	readonly mode: ScannerMode;
	readonly vendorId?: string | undefined;
	readonly productId?: string | undefined;
	readonly baudRate?: number | undefined;
	readonly dataMatrixSupported: boolean;
}

export type KktProtocolFamily = "atol10" | "shtrih_m" | "evotor" | "custom";

export interface KktDeviceDescriptor extends HardwareDeviceDescriptor {
	readonly protocol: KktProtocolFamily;
	readonly fnNumber?: string | undefined;
	readonly kktSerialNumber?: string | undefined;
	readonly ffdVersion?: "1.05" | "1.2" | undefined;
	readonly isShiftOpen?: boolean | undefined;
}

// ============================================================================
// 4. SANPIN 3.3686-21 AUTOCLAVE POUCH LABEL PAYLOAD
// ============================================================================

export interface AutoclavePouchLabelPayload {
	/** Unique sterilization batch identifier (e.g. "B2026-09-28-01") */
	readonly batchNumber: string;
	/** Autoclave cycle number within the day/session */
	readonly cycleNumber: number | string;
	/** Sterilization date (DD.MM.YYYY or ISO) */
	readonly sterilizationDate: string;
	/** Pouch expiry date according to package type & SanPiN 3.3686-21 */
	readonly expiryDate: string;
	/** Full name or surname with initials of the responsible medical operator/nurse */
	readonly operatorName: string;
	/** Autoclave model (e.g. "Melag Vacuklav 23B+", "DGM AND 45") */
	readonly autoclaveModel?: string | undefined;
	/** Packaging type */
	readonly packageType?: "pouch" | "kraft_bag" | "cassette" | "bix" | undefined;
	/** Sterilization program/regime (e.g. "134°C / 2.1 bar / 5 мин") */
	readonly program?: string | undefined;
	/** Chemical indicator class (Class 4 or Class 5) */
	readonly indicatorClass?: 4 | 5 | undefined;
	/** Content of the pouch (e.g. "Набор хирурга №3", "Зеркало + зонд") */
	readonly contentsDescription?: string | undefined;
	/** DataMatrix 2D barcode payload for fast chairside scanning */
	readonly dataMatrixCode: string;
	/** Label physical width in millimeters (default: 50mm) */
	readonly labelWidthMm?: number | undefined;
	/** Label physical height in millimeters (default: 30mm) */
	readonly labelHeightMm?: number | undefined;
	/** Gap between labels in millimeters (default: 2mm) */
	readonly gapMm?: number | undefined;
	/** Print speed 1..6 (default: 3) */
	readonly speed?: number | undefined;
	/** Print darkness/density 1..15 (default: 8) */
	readonly density?: number | undefined;
	/** Rotation 0, 90, 180, 270 (default: 0) */
	readonly rotation?: 0 | 90 | 180 | 270 | undefined;
}

// ============================================================================
// 5. HARDWARE DISCOVERY PROTOCOLS
// ============================================================================

export interface HardwareDiscoveryOptions {
	/** If true, scan local subnets on raw TCP port 9100 for network thermal printers */
	readonly probeNetworkTcp?: boolean | undefined;
	/** Subnets to scan, e.g. ["192.168.1", "192.168.0"]. Defaults to local network interfaces */
	readonly networkSubnets?: readonly string[] | undefined;
	/** Ports to probe for network raw printers (defaults to [9100]) */
	readonly networkPorts?: readonly number[] | undefined;
	/** Socket connect timeout in milliseconds (default: 400ms per IP) */
	readonly timeoutMs?: number | undefined;
	/** If false, exclude devices confirmed offline */
	readonly includeOffline?: boolean | undefined;
}

export interface HardwareDiscoverySummary {
	readonly total: number;
	readonly online: number;
	readonly printers: number;
	readonly scanners: number;
	readonly kkt: number;
}

export interface HardwareDiscoveryResult {
	readonly timestamp: string;
	readonly hostPlatform: "win32" | "darwin" | "linux";
	readonly devices: readonly HardwareDeviceDescriptor[];
	readonly summary: HardwareDiscoverySummary;
}

// ============================================================================
// 6. TEST PRINT SCHEMAS & PROTOCOLS
// ============================================================================

export const testPrintPatternTypeSchema = z.enum([
	"escpos_receipt",
	"sanpin_label",
	"grid_alignment",
	"text_ping",
]);
export type TestPrintPatternType = z.infer<typeof testPrintPatternTypeSchema>;

export interface TestPrintTarget {
	readonly deviceId?: string | undefined;
	readonly deviceType: DeviceType;
	readonly interface: DeviceInterface;
	readonly ipAddress?: string | undefined;
	readonly rawTcpPort?: number | undefined;
	readonly systemPrinterName?: string | undefined;
	readonly serialPort?: string | undefined;
	readonly paperWidthMm?: ThermalPaperWidthMm | undefined;
	readonly emulation?: LabelPrinterEmulation | undefined;
	readonly testPatternType?: TestPrintPatternType | undefined;
	readonly labelData?: AutoclavePouchLabelPayload | undefined;
	readonly customMessage?: string | undefined;
}

export interface TestPrintResult {
	readonly success: boolean;
	readonly bytesSent: number;
	readonly timestamp: string;
	readonly message: string;
	readonly rawHexPreview?: string | undefined;
	readonly targetSummary: string;
	readonly error?: string | undefined;
}

// ============================================================================
// 7. DYNAMIC RUNTIME TELEMETRY & LOAD STATE
// ============================================================================

export const dynamicLoadStateSchema = z.enum([
	"HEALTHY",
	"WARNING",
	"DEGRADED",
	"CRITICAL",
]);
export type DynamicLoadState = z.infer<typeof dynamicLoadStateSchema>;

export interface DynamicPerformanceMetrics {
	readonly instantFps: number;
	readonly averageFps: number;
	readonly minFps: number;
	readonly maxFps: number;
	readonly jitterMs: number;
	readonly p95FrameTimeMs: number;
	readonly sampleCount: number;
	readonly longTaskCount: number;
	readonly totalLongTaskDurationMs: number;
	readonly maxLongTaskDurationMs: number;
	readonly memoryPressureRatio: number | null;
	readonly usedHeapMb: number | null;
	readonly heapLimitMb: number | null;
	readonly isTabVisible: boolean;
}

export interface DynamicPerformanceSnapshot {
	readonly timestamp: number;
	readonly state: DynamicLoadState;
	readonly previousState: DynamicLoadState;
	readonly stateChangedAt: number;
	readonly metrics: DynamicPerformanceMetrics;
	readonly isThrottlingRecommended: boolean;
	readonly downscaleFactor: number;
	readonly targetFpsCap: number;
	readonly recommendedBlurDisabled: boolean;
	readonly isBatteryThrottling?: boolean | undefined;
}
