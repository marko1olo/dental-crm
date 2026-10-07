/**
 * @dental/shared/hardware — Hardware Contracts, Communication Protocols & IPC Definitions.
 *
 * Defines unified cross-platform interfaces for:
 * 1. Windows COM / USB Serial Ports & Hardware Devices (2D Scanners, Button Boxes, KKT).
 * 2. TWAIN Dental Radiography Sensors & Intraoral Cameras.
 * 3. 54-FZ Fiscal Registrars (АТОЛ Драйвер ККТ 10, Штрих-М) via TCP & COM.
 * 4. Thermal Label Printers (TSPL / ZPL / ESC-POS / HTML) for SanPiN 3.3686-21 sterilization.
 * 5. Local Offline Database Server Engine (SQLite / Embedded Postgres) for isolated clinics.
 * 6. IPC Protocol Schemas between Electron/Tauri host and Web/Mobile renderer.
 */

import { z } from "zod";

export const serialBaudRateSchema = z.enum([
	"4800",
	"9600",
	"19200",
	"38400",
	"57600",
	"115200",
]);
export type SerialBaudRate = z.infer<typeof serialBaudRateSchema>;

export interface HardwareSerialPortDescriptor {
	readonly path: string;
	readonly manufacturer?: string | undefined;
	readonly serialNumber?: string | undefined;
	readonly vendorId?: string | undefined;
	readonly productId?: string | undefined;
	readonly isOpen?: boolean | undefined;
}

export interface SerialPortConfig {
	readonly path: string;
	readonly baudRate: number;
	readonly dataBits?: 5 | 6 | 7 | 8 | undefined;
	readonly stopBits?: 1 | 1.5 | 2 | undefined;
	readonly parity?: "none" | "even" | "odd" | "mark" | "space" | undefined;
	readonly rtscts?: boolean | undefined;
	readonly xon?: boolean | undefined;
	readonly xoff?: boolean | undefined;
}

export interface TwainDeviceDescriptor {
	readonly id: string;
	readonly name: string;
	readonly manufacturer?: string | undefined;
	readonly productFamily?: string | undefined;
	readonly type: "sensor" | "scanner" | "camera";
	readonly connected: boolean;
	readonly resolutionDpi?: number | undefined;
}

export interface TwainCaptureRequest {
	readonly deviceId: string;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly toothCode?: string | undefined;
	readonly resolutionDpi?: number | undefined;
	readonly timeoutMs?: number | undefined;
}

export interface TwainCaptureResponse {
	readonly success: boolean;
	readonly dataBase64?: string | undefined;
	readonly widthPx?: number | undefined;
	readonly heightPx?: number | undefined;
	readonly bitDepth?: number | undefined;
	readonly toothCode?: string | undefined;
	readonly patientId?: string | undefined;
	readonly modality: "IO" | "DX" | "PX" | "CR" | "CT";
	readonly error?: string | undefined;
	readonly errorCategory?: string | undefined;
}

/**
 * Local Clinic Server Run-Mode for clinics without persistent internet
 */
export const localDatabaseEngineTypeSchema = z.enum([
	"postgres_native",
	"postgres_embedded",
	"sqlite_standalone",
	"cloud_primary",
]);
export type LocalDatabaseEngineType = z.infer<typeof localDatabaseEngineTypeSchema>;

export const clinicSyncModeSchema = z.enum([
	"isolated_offline",
	"lan_primary_sync",
	"hybrid_cloud_mesh",
	"online_managed",
]);
export type ClinicSyncMode = z.infer<typeof clinicSyncModeSchema>;

export interface LocalClinicServerConfig {
	readonly engineType: LocalDatabaseEngineType;
	readonly syncMode: ClinicSyncMode;
	readonly host: string;
	readonly port: number;
	readonly databaseName: string;
	readonly isOfflineCapable: boolean;
	readonly lastSyncTimestamp?: string | null | undefined;
	readonly pendingMutationsCount: number;
	readonly maxOfflineStorageMb?: number | undefined;
}

export interface LocalClinicServerHealth {
	readonly isRunning: boolean;
	readonly engine: LocalDatabaseEngineType;
	readonly latencyMs: number;
	readonly activeConnections: number;
	readonly databaseSizeBytes: number;
	readonly canAcceptWrites: boolean;
	readonly lastBackupTimestamp?: string | undefined;
	readonly error?: string | undefined;
}

/**
 * Safe IPC Message Channels for Desktop/Mobile Native Communication
 */
export const DENTE_IPC_CHANNELS = {
	SERIAL_LIST: "dente:list-serial-ports",
	SERIAL_OPEN: "dente:open-serial-port",
	SERIAL_CLOSE: "dente:close-serial-port",
	SERIAL_WRITE: "dente:write-serial-port",
	SERIAL_DATA_EVENT: "dente:serial-data-received",
	TWAIN_LIST: "dente:list-twain-devices",
	TWAIN_ACQUIRE: "dente:acquire-twain-image",
	PRINTERS_LIST: "dente:list-printers",
	PRINT_THERMAL_LABEL: "dente:print-thermal-label",
	PRINT_ESCPOS_RECEIPT: "dente:print-escpos-receipt",
	PRINT_FISCAL_RECEIPT_TCP: "dente:print-fiscal-receipt-tcp",
	CHECK_KKT_STATUS_TCP: "dente:check-kkt-status-tcp",
	WATCH_DICOM_FOLDER: "dente:watch-dicom-folder",
	UNWATCH_DICOM_FOLDER: "dente:unwatch-dicom-folder",
	DICOM_FILE_DETECTED: "dente:dicom-file-detected",
	TOGGLE_FULLSCREEN: "dente:toggle-fullscreen",
	TOGGLE_KIOSK: "dente:toggle-kiosk",
	GET_WINDOW_STATE: "dente:get-window-state",
	GET_LOCAL_SERVER_STATUS: "dente:get-local-server-status",
	SWITCH_LOCAL_DATABASE_MODE: "dente:switch-local-database-mode",
	CHECK_FOR_UPDATES: "dente:check-for-updates",
	INSTALL_UPDATE: "dente:install-update",
	UPDATE_AVAILABLE: "dente:update-available",
} as const;

// ============================================================================
// 7. HARDWARE PERFORMANCE TIERS & CANONICAL PROFILING CONTRACTS
// ============================================================================

export const hardwareTierSchema = z.enum([
	"potato",
	"low",
	"balanced",
	"ultra",
]);
export type HardwareTier = z.infer<typeof hardwareTierSchema>;

export const hardwareGpuTypeSchema = z.enum([
	"discrete",
	"integrated",
	"apple_silicon",
	"software",
	"unknown",
]);
export type HardwareGpuType = z.infer<typeof hardwareGpuTypeSchema>;

/**
 * Universal Hardware Profile — canonical hardware performance evaluation.
 * Evaluated at application boot (<15ms) and cached for 24h with reactive invalidation.
 */
export interface HardwareProfile {
	/** Canonical performance tier */
	readonly tier: HardwareTier;
	/** Computed capability score from 0 (bare minimal) to 100 (top-tier workstation) */
	readonly score: number;
	/** Device memory in GiB from navigator.deviceMemory (Chromium privacy-capped) */
	readonly deviceMemoryGb: number | null;
	/** Logical processor cores from navigator.hardwareConcurrency */
	readonly cpuCores: number | null;
	/** Detected GPU architecture/class */
	readonly gpuType: HardwareGpuType;
	/** Full unmasked GPU renderer string from WebGL debug extension */
	readonly gpuRenderer: string | null;
	/** Detected GPU vendor string */
	readonly gpuVendor: string | null;
	/** True if WebGL 2 is available and functional */
	readonly webgl2Supported: boolean;
	/** True if WebGPU is available in runtime */
	readonly webgpuSupported: boolean;
	/** Maximum 2D texture dimension in pixels */
	readonly maxTextureSize: number | null;
	/** Maximum 3D volume texture dimension in pixels (for CBCT / DICOM MPR) */
	readonly max3dTextureSize: number | null;
	/** Micro-benchmark fillrate score (0..100) or null if skipped/unsupported */
	readonly fillrateScore: number | null;
	/** Whether device is running on battery <= 20% without AC power */
	readonly isBatterySaving: boolean;
	/** Whether navigator reports Save-Data connection header */
	readonly isSaveDataActive: boolean;
	/** Effective connection type ('slow-2g' | '2g' | '3g' | '4g' or null) */
	readonly effectiveConnectionType: string | null;
	/** OS prefers-reduced-motion accessibility preference */
	readonly prefersReducedMotion: boolean;
	/** Whether storage / disk benchmark identified slow mechanical HDD (5400 RPM) */
	readonly isSlowDisk?: boolean | undefined;
	/** Whether hybrid dual-GPU topology is detected (e.g. Intel/AMD iGPU + discrete NVIDIA/AMD) */
	readonly isHybridGraphics?: boolean | undefined;
	/** Secondary / discrete GPU renderer or name detected via WebGPU adapter enumeration */
	readonly discreteGpuRenderer?: string | null | undefined;
	/** Guidance message for doctor/user if dual-GPU is running on integrated */
	readonly hybridGraphicsNotice?: string | null | undefined;
	/** Diagnostic activation reasons and factor weights */
	readonly reasons: readonly string[];
	/** Timestamp when profile was evaluated */
	readonly detectedAt: number;
	/** Profile schema version for cache invalidation */
	readonly version: number;
}

export const hardwareProfileSchema = z.object({
	tier: hardwareTierSchema,
	score: z.number().min(0).max(100),
	deviceMemoryGb: z.number().nullable(),
	cpuCores: z.number().nullable(),
	gpuType: hardwareGpuTypeSchema,
	gpuRenderer: z.string().nullable(),
	gpuVendor: z.string().nullable(),
	webgl2Supported: z.boolean(),
	webgpuSupported: z.boolean(),
	maxTextureSize: z.number().nullable(),
	max3dTextureSize: z.number().nullable(),
	fillrateScore: z.number().nullable(),
	isBatterySaving: z.boolean(),
	isSaveDataActive: z.boolean(),
	effectiveConnectionType: z.string().nullable(),
	prefersReducedMotion: z.boolean(),
	isSlowDisk: z.boolean().optional(),
	isHybridGraphics: z.boolean().optional(),
	discreteGpuRenderer: z.string().nullable().optional(),
	hybridGraphicsNotice: z.string().nullable().optional(),
	reasons: z.array(z.string()),
	detectedAt: z.number(),
	version: z.number(),
});

/**
 * Adaptive configuration for clinical UX, rendering, animations, and I/O pacing.
 */
export interface HardwareAdaptiveSettings {
	/** Whether to disable heavy CSS backdrop-filter blur and multi-layer box-shadows */
	readonly disableBackdropBlur: boolean;
	/** Whether to enforce flat 1px borders instead of heavy shadow blurs */
	readonly simplifyShadows: boolean;
	/** Whether to aggressively virtualize lists and large tables */
	readonly aggressiveVirtualization: boolean;
	/** Autosave debounce delay in milliseconds (e.g. 600ms ultra vs 2000ms potato) */
	readonly autosaveDebounceMs: number;
	/** Search input debounce delay in milliseconds (e.g. 200ms ultra vs 400ms potato) */
	readonly searchDebounceMs: number;
	/** Target batch size for CBCT/CT MPR slice streaming */
	readonly ctSliceBatchSize: number;
	/** Downsample factor for 3D/CBCT volume preview (1 = full, 2 = half, 4 = potato) */
	readonly ctDownsampleFactor: number;
	/** Polling interval multiplier (1.0x for ultra/balanced, 2.5x for potato) */
	readonly pollingIntervalMultiplier: number;
	/** Maximum in-memory LRU cache size in bytes */
	readonly maxLruCacheBytes: number;
	/** Target render frame-rate cap (e.g. 60 ultra/balanced, 30 low/battery-saving, 15 critical) */
	readonly targetFpsCap?: number | undefined;
	/** Raymarching step scale multiplier (1.0 normal, 1.8 - 2.5 battery-saving / low-power) */
	readonly raymarchingStepMultiplier?: number | undefined;
}

/**
 * Returns canonical adaptive settings for a given hardware tier.
 */
export function getHardwareAdaptiveSettings(
	tier: HardwareTier,
	options?: { isBatterySaving?: boolean | undefined },
): HardwareAdaptiveSettings {
	let base: HardwareAdaptiveSettings;
	switch (tier) {
		case "potato":
			base = {
				disableBackdropBlur: true,
				simplifyShadows: true,
				aggressiveVirtualization: true,
				autosaveDebounceMs: 2000,
				searchDebounceMs: 400,
				ctSliceBatchSize: 8,
				ctDownsampleFactor: 4,
				pollingIntervalMultiplier: 2.5,
				maxLruCacheBytes: 25 * 1024 * 1024, // 25 MB
				targetFpsCap: 15,
				raymarchingStepMultiplier: 2.5,
			};
			break;
		case "low":
			base = {
				disableBackdropBlur: true,
				simplifyShadows: true,
				aggressiveVirtualization: true,
				autosaveDebounceMs: 1500,
				searchDebounceMs: 350,
				ctSliceBatchSize: 16,
				ctDownsampleFactor: 2,
				pollingIntervalMultiplier: 1.75,
				maxLruCacheBytes: 40 * 1024 * 1024, // 40 MB
				targetFpsCap: 30,
				raymarchingStepMultiplier: 1.8,
			};
			break;
		case "balanced":
			base = {
				disableBackdropBlur: false,
				simplifyShadows: false,
				aggressiveVirtualization: false,
				autosaveDebounceMs: 800,
				searchDebounceMs: 280,
				ctSliceBatchSize: 48,
				ctDownsampleFactor: 1,
				pollingIntervalMultiplier: 1.0,
				maxLruCacheBytes: 100 * 1024 * 1024, // 100 MB
				targetFpsCap: 60,
				raymarchingStepMultiplier: 1.0,
			};
			break;
		case "ultra":
			base = {
				disableBackdropBlur: false,
				simplifyShadows: false,
				aggressiveVirtualization: false,
				autosaveDebounceMs: 600,
				searchDebounceMs: 200,
				ctSliceBatchSize: 128,
				ctDownsampleFactor: 1,
				pollingIntervalMultiplier: 1.0,
				maxLruCacheBytes: 250 * 1024 * 1024, // 250 MB
				targetFpsCap: 60,
				raymarchingStepMultiplier: 1.0,
			};
			break;
	}

	if (options?.isBatterySaving) {
		return {
			...base,
			disableBackdropBlur: true,
			simplifyShadows: true,
			targetFpsCap: 30,
			raymarchingStepMultiplier: Math.max(base.raymarchingStepMultiplier ?? 1.0, 1.8),
			ctSliceBatchSize: Math.min(base.ctSliceBatchSize, 16),
			ctDownsampleFactor: Math.max(base.ctDownsampleFactor, 2),
		};
	}

	return base;
}

