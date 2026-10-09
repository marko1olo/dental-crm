/**
 * twainAndUsbDrivers.ts — Layer 1: Драйверные профили TWAIN 2.x DSM, прямого USB сопоставления и конфигурация DICOM C-STORE SCP.
 *
 * Implements Mandates 8e (Zero USB locking collision), 8s.
 */

import type { TwainDataSourceItem, UsbSensorMatch, DicomScpConfig } from "./types";
import { SENSOR_VENDOR_PROFILES, UNIVERSAL_SENSOR_CATALOG } from "./sensorCatalogs";

/* ─────────────────────────────────────────────────────────────
 * 2. TWAIN 2.x DSM INTERFACE
 * ───────────────────────────────────────────────────────────── */

export const KNOWN_TWAIN_DATA_SOURCES: readonly TwainDataSourceItem[] = [
	{ id: "ds_vatech_ezsensor", name: "EzSensor TWAIN Data Source", manufacturer: "Vatech Co., Ltd.", productFamily: "EzSensor", version: "2.4.1", isDefault: true, protocol: "twain_2_4" },
	{ id: "ds_carestream_rvg", name: "Carestream RVG TWAIN Source", manufacturer: "Carestream Dental LLC", productFamily: "RVG", version: "2.3.0", isDefault: false, protocol: "twain_2_4" },
	{ id: "ds_planmeca_prosensor", name: "Planmeca ProSensor TWAIN DSM", manufacturer: "Planmeca Oy", productFamily: "ProSensor", version: "2.4.0", isDefault: false, protocol: "twain_2_4" },
	{ id: "ds_schick_cdr", name: "Schick Technologies TWAIN DS", manufacturer: "Sirona Dental", productFamily: "Schick 33 / Elite", version: "2.2.0", isDefault: false, protocol: "twain_2_4" },
	{ id: "ds_acteon_sopix", name: "Sopix Series TWAIN Data Source", manufacturer: "Acteon Group", productFamily: "Sopix ACE", version: "2.1.8", isDefault: false, protocol: "twain_2_4" },
	{ id: "ds_woodpecker_isensor", name: "Woodpecker i-Sensor TWAIN", manufacturer: "Guilin Woodpecker", productFamily: "i-Sensor H1/H2", version: "2.4.0", isDefault: false, protocol: "twain_2_4" },
	{ id: "ds_kavo_gxs700", name: "Gendex GXS-700 TWAIN DS", manufacturer: "KaVo Dental", productFamily: "GXS-700", version: "2.3.1", isDefault: false, protocol: "twain_2_4" },
	{ id: "ds_duerr_vistaray", name: "Dürr Dental VistaRay TWAIN DS", manufacturer: "Dürr Dental SE", productFamily: "VistaRay / VistaIntra", version: "2.4.0", isDefault: false, protocol: "twain_2_4" },
	{ id: "ds_dexis_platinum", name: "Dexis Digital TWAIN Source", manufacturer: "Dexis LLC", productFamily: "Platinum / Titanium", version: "2.4.0", isDefault: false, protocol: "twain_2_4" },
	{ id: "ds_handy_hdr", name: "Handy HDR Series TWAIN", manufacturer: "Handy Dental", productFamily: "HDR-500/600", version: "2.0.4", isDefault: false, protocol: "twain_2_4" },
	{ id: "ds_owandy_quickvision", name: "Owandy QuickVision TWAIN DS", manufacturer: "Owandy Radiology", productFamily: "Opteo", version: "2.2.5", isDefault: false, protocol: "twain_2_4" },
	{ id: "ds_generic_dsm", name: "Generic Windows TWAIN 2.x DSM", manufacturer: "TWAIN Working Group", productFamily: "Universal DSM", version: "2.4.0", isDefault: false, protocol: "twain_2_4" },
];

export function getAvailableTwainSources(): readonly TwainDataSourceItem[] {
	return KNOWN_TWAIN_DATA_SOURCES;
}

/* ─────────────────────────────────────────────────────────────
 * 4. DIRECT USB VID/PID REGISTRY (30+ DENTAL SENSORS)
 * ───────────────────────────────────────────────────────────── */

/**
 * Checks a USB Vendor ID (and optional Product ID) against the dental sensor hardware database.
 */
export function lookupSensorByUsbVidPid(vid: number, pid?: number | undefined): UsbSensorMatch | null {
	for (const profile of SENSOR_VENDOR_PROFILES) {
		for (const entry of profile.knownVidPids) {
			if (entry.vid === vid && (pid === undefined || entry.pid === undefined || entry.pid === pid)) {
				const defaultModel = UNIVERSAL_SENSOR_CATALOG.find((s) => s.brand === profile.brand) || UNIVERSAL_SENSOR_CATALOG[0]!;
				return {
					brand: profile.brand,
					brandName: profile.name,
					defaultModelId: defaultModel.id,
					controllerChip: entry.controllerChip,
					deviceDescription: entry.description,
					isMatch: true,
				};
			}
		}
	}

	// Generic microcontroller / bridge chips used in custom OEM dental sensors
	if (vid === 0x04b4 || vid === 0x0547) {
		return {
			brand: "generic",
			brandName: "Cypress FX2/FX3 Dental USB Bridge",
			defaultModelId: "vatech_ezsensor_hd",
			controllerChip: "Cypress CY7C68013A / FX3",
			deviceDescription: "Универсальный внутриротовой USB-сенсор (Cypress)",
			isMatch: true,
		};
	}
	if (vid === 0x0403) {
		return {
			brand: "handy",
			brandName: "FTDI USB Dental Controller",
			defaultModelId: "handy_hdr_500",
			controllerChip: "FTDI FT232R",
			deviceDescription: "Handy / OEM USB RVG Sensor",
			isMatch: true,
		};
	}
	if (vid === 0x10c4) {
		return {
			brand: "woodpecker",
			brandName: "Silicon Labs CP210x Dental Bridge",
			defaultModelId: "woodpecker_isensor_h1",
			controllerChip: "CP2102 USB-to-UART",
			deviceDescription: "Woodpecker / DTE Sensor Bridge",
			isMatch: true,
		};
	}
	if (vid === 0x0483) {
		return {
			brand: "woodpecker",
			brandName: "STM32 USB Dental Device",
			defaultModelId: "woodpecker_isensor_h2",
			controllerChip: "STM32 Microelectronics",
			deviceDescription: "Woodpecker / Eighteeth Dental RVG",
			isMatch: true,
		};
	}

	return null;
}

/* ─────────────────────────────────────────────────────────────
 * 5. DICOM C-STORE STORAGE SCP CONFIGURATION
 * ───────────────────────────────────────────────────────────── */

export const DEFAULT_DICOM_SCP_CONFIG: DicomScpConfig = {
	aeTitle: "DENTE_SCP",
	port: 11112,
	timeoutSec: 30,
	supportedSopClasses: [
		"1.2.840.10008.5.1.4.1.1.1.3", // Digital Intraoral X-Ray Image Storage
		"1.2.840.10008.5.1.4.1.1.1.1", // Digital X-Ray Image Storage
		"1.2.840.10008.5.1.4.1.1.1",   // Computed Radiography Image Storage (CR / PSP)
		"1.2.840.10008.5.1.4.1.1.7",   // Secondary Capture Image Storage
	],
	supportedTransferSyntaxes: [
		"1.2.840.10008.1.2",      // Implicit VR Little Endian
		"1.2.840.10008.1.2.1",    // Explicit VR Little Endian
		"1.2.840.10008.1.2.4.70", // JPEG Lossless, Nonhierarchical (Process 14)
		"1.2.840.10008.1.2.4.50", // JPEG Baseline (Process 1)
	],
};

/* ─────────────────────────────────────────────────────────────
 * 6. SENSOR DETECTION & CONNECTION DIAGNOSTICS (MANDATE 8e)
 * ───────────────────────────────────────────────────────────── */

export const NON_CONFLICTING_USB_POLICY = {
	notice: "Работает параллельно с Vatech EzDent-i, Carestream, Romexis без конфликта за USB",
	preferredIntake: "hot_folder" as const,
	twainBridge: "Подключение через локальный мост TWAIN",
	hotFolderStatus: "Ожидание снимка (Hot Folder / Автоподхват)",
	rationale:
		"Штатные драйверы визиографов в Windows монопольно захватывают USB-дескриптор сенсора. DENTE CRM использует бесконфликтную архитектуру (Hot Folder + TWAIN 2.x DSM bridge + Drag-and-Drop + Clipboard Ctrl+V), исключая аппаратные сбои и конфликты за USB-порт прямо на приёме врача.",
};
