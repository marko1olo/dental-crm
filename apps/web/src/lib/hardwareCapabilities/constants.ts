/**
 * hardwareCapabilities/constants.ts — Layer 0: Profiler Constants & Device Presets
 *
 * Defines storage keys, cache TTL, deterministic fingerprint generator,
 * and hardware presets for clinical equipment.
 */

import type { HardwareDeviceType, HardwareConnectionProtocol } from "./types";
import { getHardwareAdaptiveSettings } from "@dental/shared";
export { getHardwareAdaptiveSettings };

// ============================================================================
// STORAGE KEYS & CACHE SETTINGS
// ============================================================================

export const LOW_SPEC_STORAGE_KEY = "dente:low-spec-mode";
export const HARDWARE_PROFILE_STORAGE_KEY = "dente_hardware_profile_v1";
export const HARDWARE_PROFILE_LEGACY_KEY = "dente:hardware-profile-v1";
export const HARDWARE_TIER_OVERRIDE_KEY = "dente:hardware-tier-override";
export const HARDWARE_PROFILE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (604,800,000 ms)
export const HARDWARE_PROFILE_SCHEMA_VERSION = 1;
export const WEBGPU_ADAPTER_STORAGE_KEY = "dente:webgpu-adapter-info";

/**
 * Computes deterministic hardware fingerprint string from vendor, renderer, and CPU cores.
 * Used for instant cache validation (0ms overhead on F5) and automatic cache invalidation
 * if physical GPU hardware or CPU topology changes.
 */
export function computeHardwareFingerprint(
	vendor: string | null,
	renderer: string | null,
	cpuCores: number | null,
	discreteGpu?: string | null,
): string {
	const v = (vendor ?? "unknown").trim().toLowerCase();
	const r = (renderer ?? "unknown").trim().toLowerCase();
	const c = cpuCores ?? "unknown";
	const base = `${v}|${r}|${c}`;
	if (
		discreteGpu &&
		discreteGpu.trim().length > 0 &&
		discreteGpu.trim().toLowerCase() !== r
	) {
		return `${base}|${discreteGpu.trim().toLowerCase()}`;
	}
	return base;
}

// ============================================================================
// CLINICAL HARDWARE PRESETS & TIMEOUTS
// ============================================================================

export const DEFAULT_COM_BAUD_RATES = [
	9600,
	19200,
	38400,
	57600,
	115200,
] as const;

export const DEFAULT_HARDWARE_TIMEOUTS_MS = {
	connect: 5000,
	ping: 2000,
	fiscalPrint: 15000,
	posPayment: 60000,
	sensorCapture: 10000,
} as const;

export interface DevicePreset {
	model: string;
	type: HardwareDeviceType;
	protocol: HardwareConnectionProtocol;
	defaultBaudRate?: number;
	description: string;
}

export const FISCAL_REGISTER_PRESETS: readonly DevicePreset[] = [
	{
		model: "ATOL_54FZ",
		type: "fiscal_kkm",
		protocol: "com_serial",
		defaultBaudRate: 115200,
		description: "АТОЛ 25Ф / 30Ф / 55Ф (Драйвер ККТ 10.x, протокол 54-ФЗ ФФД 1.2)",
	},
	{
		model: "SHTRIH_M_54FZ",
		type: "fiscal_kkm",
		protocol: "com_serial",
		defaultBaudRate: 115200,
		description: "Штрих-М / Ритейл-01Ф (Протокол Штрих-М 54-ФЗ ФФД 1.2)",
	},
	{
		model: "ATOL_TCP_LAN",
		type: "fiscal_kkm",
		protocol: "lan_tcp",
		description: "Сетевой регистратор АТОЛ по Ethernet / Wi-Fi",
	},
] as const;

export const POS_TERMINAL_PRESETS: readonly DevicePreset[] = [
	{
		model: "SBERBANK_ARCUS2",
		type: "pos_terminal",
		protocol: "com_serial",
		defaultBaudRate: 115200,
		description: "Сбербанк Эквайринг (Протокол Arcus-2 / TTK через USB/COM)",
	},
	{
		model: "INPAS_DUAL_CONNECTOR",
		type: "pos_terminal",
		protocol: "lan_tcp",
		description: "INPAS SmartPos / Verifone (DualConnector TCP)",
	},
	{
		model: "TINKOFF_POS_USB",
		type: "pos_terminal",
		protocol: "com_serial",
		defaultBaudRate: 115200,
		description: "Тинькофф Эквайринг (Pax / Verifone через USB Virtual COM)",
	},
] as const;

export const IMAGING_CAPTURE_PRESETS: readonly DevicePreset[] = [
	{
		model: "TWAIN_VISIOGRAPH",
		type: "visiodent_sensor",
		protocol: "twain_driver",
		description: "Цифровой радиовизиограф TWAIN (Vatech, Dexis, Planmeca)",
	},
	{
		model: "USB_INTRAORAL_CAM",
		type: "intraoral_camera",
		protocol: "web_media",
		description: "Интраоральная видеокамера с кнопкой захвата (UVC DirectShow)",
	},
] as const;
