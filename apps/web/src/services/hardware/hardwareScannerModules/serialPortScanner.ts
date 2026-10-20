/**
 * serialPortScanner.ts — Web Serial API and COM port scanner for clinic peripherals:
 * ATOL / Shtrikh-M fiscal cash registers (54-FZ) and COM barcode scanners.
 */

import type { HardwareDevice, HardwareDeviceKind } from "./types.js";

// Known USB-to-UART and Fiscal Register Vendor IDs
const KNOWN_SERIAL_VENDORS: Record<number, { name: string; kind: HardwareDeviceKind }> = {
	0x2912: { name: "АТОЛ Фискальный регистратор ККТ", kind: "fiscal_kkt" },
	0x1fc9: { name: "Штрих-М Фискальный регистратор ККТ", kind: "fiscal_kkt" },
	0x067b: { name: "Prolific USB-Serial COM адаптер", kind: "unknown" },
	0x0403: { name: "FTDI USB-Serial адаптер", kind: "unknown" },
	0x10c4: { name: "Silicon Labs CP210x UART Bridge", kind: "unknown" },
	0x1a86: { name: "CH340/CH341 USB-Serial Bridge", kind: "unknown" },
};

export const COMMON_BAUD_RATES = [9600, 115200, 57600, 38400, 19200] as const;

export function isWebSerialSupported(): boolean {
	return typeof navigator !== "undefined" && "serial" in navigator;
}

interface SerialPortInfo {
	usbVendorId?: number | undefined;
	usbProductId?: number | undefined;
}

interface SerialPortLike {
	getInfo(): SerialPortInfo;
	open(options: { baudRate: number }): Promise<void>;
	close(): Promise<void>;
	readable?: unknown;
	writable?: unknown;
}

function mapSerialPortToDevice(port: SerialPortLike, index: number): HardwareDevice {
	const info = port.getInfo();
	const vendorId = info.usbVendorId;
	const productId = info.usbProductId;

	const known = vendorId ? KNOWN_SERIAL_VENDORS[vendorId] : undefined;
	const name = known?.name ?? `Последовательный порт COM${index + 1}`;
	const kind: HardwareDeviceKind = known?.kind ?? "unknown";

	const hexVendor = vendorId ? `0x${vendorId.toString(16).padStart(4, "0")}` : undefined;
	const hexProduct = productId ? `0x${productId.toString(16).padStart(4, "0")}` : undefined;

	return {
		id: `serial-${vendorId ?? "gen"}-${productId ?? index}`,
		name,
		kind,
		portKind: "serial_com",
		status: "connected",
		vendorId: hexVendor,
		productId: hexProduct,
		address: `COM${index + 1}`,
		baudRate: 115200,
		lastSeenTimestamp: Date.now(),
		details: {
			rawVendorId: vendorId,
			rawProductId: productId,
		},
	};
}

/**
 * Enumerates all already-authorized Web Serial COM ports.
 */
export async function getAvailableSerialPorts(): Promise<HardwareDevice[]> {
	if (!isWebSerialSupported()) {
		return [];
	}

	try {
		// biome-ignore lint/suspicious/noExplicitAny: Web Serial API standard call
		const ports: SerialPortLike[] = await (navigator as any).serial.getPorts();
		return ports.map((port, idx) => mapSerialPortToDevice(port, idx));
	} catch (err) {
		console.warn("[SerialPortScanner] Failed to enumerate ports:", err);
		return [];
	}
}

/**
 * Prompts user with native Web Serial browser picker to grant access to a COM device.
 */
export async function requestSerialPort(options?: {
	filters?: Array<{ usbVendorId?: number; usbProductId?: number }>;
}): Promise<HardwareDevice | null> {
	if (!isWebSerialSupported()) {
		return null;
	}

	try {
		// Default filters include Atol & Shtrikh-M
		const defaultFilters = [
			{ usbVendorId: 0x2912 }, // ATOL
			{ usbVendorId: 0x1fc9 }, // Shtrikh-M
			{ usbVendorId: 0x067b }, // Prolific
			{ usbVendorId: 0x0403 }, // FTDI
			{ usbVendorId: 0x10c4 }, // CP210x
			{ usbVendorId: 0x1a86 }, // CH340
		];

		const filters = options?.filters ?? defaultFilters;
		// biome-ignore lint/suspicious/noExplicitAny: Web Serial API standard call
		const port: SerialPortLike = await (navigator as any).serial.requestPort({ filters });
		if (!port) return null;

		return mapSerialPortToDevice(port, 0);
	} catch (err) {
		// User cancellation is not an error
		const name = (err as { name?: string })?.name;
		if (name !== "NotFoundError" && name !== "AbortError") {
			console.warn("[SerialPortScanner] Serial port request cancelled or failed:", err);
		}
		return null;
	}
}

/**
 * Registers lifecycle listeners for serial port connection/disconnection with auto cleanup.
 */
export function subscribeSerialPortEvents(
	onConnect: (device: HardwareDevice) => void,
	onDisconnect: () => void,
): () => void {
	if (!isWebSerialSupported()) {
		return () => {};
	}

	// biome-ignore lint/suspicious/noExplicitAny: Web Serial API standard target
	const serial = (navigator as any).serial;

	const handleConnect = (event: Event) => {
		try {
			// biome-ignore lint/suspicious/noExplicitAny: event.port
			const port = (event as any).port as SerialPortLike;
			if (port) {
				onConnect(mapSerialPortToDevice(port, 0));
			}
		} catch (err) {
			console.warn("[SerialPortScanner] Connect event handling error:", err);
		}
	};

	const handleDisconnect = () => {
		try {
			onDisconnect();
		} catch (err) {
			console.warn("[SerialPortScanner] Disconnect event handling error:", err);
		}
	};

	serial.addEventListener("connect", handleConnect);
	serial.addEventListener("disconnect", handleDisconnect);

	return () => {
		serial.removeEventListener("connect", handleConnect);
		serial.removeEventListener("disconnect", handleDisconnect);
	};
}
