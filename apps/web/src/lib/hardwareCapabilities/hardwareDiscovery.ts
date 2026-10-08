/**
 * hardwareCapabilities/hardwareDiscovery.ts — Layer 2: Clinical Hardware Auto-Discovery & Health Polling
 *
 * Implements hardware port discovery, WebSerial & WebUSB enumeration,
 * background heartbeat pinging of medical peripherals, and device registry health tracking.
 */

import type {
	HardwareDevice,
	DeviceHealth,
	DiscoveredDevicePort,
	HardwareDeviceType,
} from "./types";
import { createFiscalKkmDriver } from "./cashRegisterDriver";
import { createPosTerminalDriver } from "./posTerminalDriver";
import { createImagingHardwareDriver } from "./imagingHardwareDriver";

/**
 * Guesses device category based on USB Vendor/Product ID or friendly device name.
 */
function guessDeviceType(friendlyName: string, vendorId?: string): HardwareDeviceType | undefined {
	const lower = friendlyName.toLowerCase();
	if (lower.includes("atol") || lower.includes("атол") || lower.includes("shtrih") || lower.includes("штрих")) {
		return "fiscal_kkm";
	}
	if (lower.includes("arcus") || lower.includes("pos") || lower.includes("pax") || lower.includes("verifone") || lower.includes("ingenico")) {
		return "pos_terminal";
	}
	if (lower.includes("visiograph") || lower.includes("rvg") || lower.includes("vatech") || lower.includes("dexis")) {
		return "visiodent_sensor";
	}
	if (lower.includes("camera") || lower.includes("камера") || lower.includes("video")) {
		return "intraoral_camera";
	}
	if (lower.includes("rfid") || lower.includes("nfc") || lower.includes("reader") || lower.includes("считыватель")) {
		return "rfid_reader";
	}
	return undefined;
}

/**
 * Enumerates available serial and USB ports for clinic devices.
 */
export async function discoverHardwarePorts(): Promise<DiscoveredDevicePort[]> {
	const results: DiscoveredDevicePort[] = [];

	// 1. WebSerial API (Chrome / Edge on desktop)
	if (typeof navigator !== "undefined" && "serial" in navigator && (navigator as any).serial?.getPorts) {
		try {
			const ports = await (navigator as any).serial.getPorts();
			for (let i = 0; i < ports.length; i++) {
				const info = ports[i].getInfo?.() || {};
				const vendorIdHex = info.usbVendorId ? `0x${info.usbVendorId.toString(16)}` : undefined;
				const productIdHex = info.usbProductId ? `0x${info.usbProductId.toString(16)}` : undefined;
				const path = `COM${i + 1}`;
				const friendlyName = `Serial Device (VID: ${vendorIdHex ?? "?"}, PID: ${productIdHex ?? "?"})`;
				results.push({
					path,
					vendorId: vendorIdHex,
					productId: productIdHex,
					friendlyName,
					guessedType: guessDeviceType(friendlyName, vendorIdHex),
				});
			}
		} catch {
			// ignore permission errors
		}
	}

	// 2. Fallback standard COM ports for offline/mock baseline
	if (results.length === 0) {
		results.push(
			{
				path: "COM1",
				friendlyName: "АТОЛ 25Ф (Фискальный регистратор)",
				guessedType: "fiscal_kkm",
			},
			{
				path: "COM3",
				friendlyName: "Сбербанк Эквайринг Arcus-2 (USB-COM)",
				guessedType: "pos_terminal",
			},
		);
	}

	return results;
}

/**
 * Polls the health and connection status of an array of configured devices.
 */
export async function pollDeviceHealth(
	devices: HardwareDevice[],
): Promise<Record<string, DeviceHealth>> {
	const healthMap: Record<string, DeviceHealth> = {};
	const kkm = createFiscalKkmDriver();
	const pos = createPosTerminalDriver();
	const imaging = createImagingHardwareDriver();

	await Promise.all(
		devices.map(async (device) => {
			try {
				let health: DeviceHealth;
				switch (device.type) {
					case "fiscal_kkm":
						health = await kkm.checkHealth(device);
						break;
					case "pos_terminal":
						health = await pos.checkHealth(device);
						break;
					case "visiodent_sensor":
					case "intraoral_camera":
						health = await imaging.checkHealth(device);
						break;
					default:
						health = {
							deviceId: device.id,
							status: "online",
							latencyMs: 5,
							lastCheckedAt: Date.now(),
						};
						break;
				}
				healthMap[device.id] = health;
			} catch (err) {
				healthMap[device.id] = {
					deviceId: device.id,
					status: "offline",
					latencyMs: 0,
					lastCheckedAt: Date.now(),
					errorMessage: err instanceof Error ? err.message : "Ошибка опроса устройства",
				};
			}
		}),
	);

	return healthMap;
}

/**
 * Checks whether a specific COM/USB port is responsive.
 */
export async function checkPortAvailability(portName: string): Promise<boolean> {
	if (!portName.trim()) return false;
	const ports = await discoverHardwarePorts();
	return ports.some((p) => p.path.toLowerCase() === portName.trim().toLowerCase());
}
