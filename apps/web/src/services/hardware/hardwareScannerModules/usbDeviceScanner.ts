/**
 * usbDeviceScanner.ts — WebUSB API scanner for clinic USB devices:
 * 2D DataMatrix Honest Sign (Честный ЗНАК) scanners, smart card readers, and USB POS peripherals.
 */

import type { HardwareDevice, HardwareDeviceKind } from "./types.js";

// Known Medical & Retail Barcode Scanner Vendors (Chestny ZNAK 2D DataMatrix)
const KNOWN_BARCODE_VENDORS: Record<number, { name: string; kind: HardwareDeviceKind }> = {
	0x0c2e: { name: "Honeywell 2D Сканер маркировки (Честный ЗНАК)", kind: "barcode_2d_mdlp" },
	0x05e0: { name: "Zebra / Symbol 2D Сканер штрихкодов", kind: "barcode_2d_mdlp" },
	0x05f9: { name: "Datalogic QuickScan 2D Сканер", kind: "barcode_2d_mdlp" },
	0x1eab: { name: "Newland HR 2D Сканер маркировки", kind: "barcode_2d_mdlp" },
	0x2dd6: { name: "Mindeo MD 2D Сканер", kind: "barcode_2d_mdlp" },
	0x0483: { name: "Sunlux / STM 2D Сканер", kind: "barcode_2d_mdlp" },
	0x04b8: { name: "Seiko Epson USB Устройство", kind: "thermal_printer" },
	0x072f: { name: "ACS ACR122U Считыватель смарт-карт и полисов ОМС", kind: "smartcard_reader" },
	0x076b: { name: "HID Omnikey Считыватель смарт-карт", kind: "smartcard_reader" },
	0x0a89: { name: "Identiv Считыватель смарт-карт", kind: "smartcard_reader" },
	0x24dc: { name: "Рутокен ЭЦП врача (Актив)", kind: "smartcard_reader" },
};

export function isWebUsbSupported(): boolean {
	return typeof navigator !== "undefined" && "usb" in navigator;
}

interface UsbDeviceLike {
	vendorId: number;
	productId: number;
	productName?: string | undefined;
	manufacturerName?: string | undefined;
	serialNumber?: string | undefined;
	opened?: boolean;
	open?(): Promise<void>;
	close?(): Promise<void>;
}

function mapUsbDeviceToHardwareDevice(dev: UsbDeviceLike): HardwareDevice {
	const vendorId = dev.vendorId;
	const productId = dev.productId;

	const known = KNOWN_BARCODE_VENDORS[vendorId];
	const name = known?.name ?? (dev.productName ? `${dev.manufacturerName ? `${dev.manufacturerName} ` : ""}${dev.productName}` : "USB Устройство клиники");
	const kind: HardwareDeviceKind = known?.kind ?? "unknown";

	const hexVendor = `0x${vendorId.toString(16).padStart(4, "0")}`;
	const hexProduct = `0x${productId.toString(16).padStart(4, "0")}`;

	return {
		id: `usb-${vendorId}-${productId}-${dev.serialNumber ?? "0"}`,
		name,
		kind,
		portKind: "web_usb",
		status: "connected",
		vendorId: hexVendor,
		productId: hexProduct,
		serialNumber: dev.serialNumber,
		address: `USB [${hexVendor}:${hexProduct}]`,
		lastSeenTimestamp: Date.now(),
		details: {
			productName: dev.productName,
			manufacturerName: dev.manufacturerName,
		},
	};
}

/**
 * Enumerates all already-paired WebUSB devices.
 */
export async function getAvailableUsbDevices(): Promise<HardwareDevice[]> {
	if (!isWebUsbSupported()) {
		return [];
	}

	try {
		// biome-ignore lint/suspicious/noExplicitAny: WebUSB API standard call
		const devices: UsbDeviceLike[] = await (navigator as any).usb.getDevices();
		return devices.map((d) => mapUsbDeviceToHardwareDevice(d));
	} catch (err) {
		console.warn("[UsbDeviceScanner] Failed to enumerate WebUSB devices:", err);
		return [];
	}
}

/**
 * Prompts user with native WebUSB browser picker to grant access to a 2D scanner or reader.
 */
export async function requestUsbDevice(): Promise<HardwareDevice | null> {
	if (!isWebUsbSupported()) {
		return null;
	}

	try {
		const filters = [
			{ vendorId: 0x0c2e }, // Honeywell
			{ vendorId: 0x05e0 }, // Zebra
			{ vendorId: 0x05f9 }, // Datalogic
			{ vendorId: 0x1eab }, // Newland
			{ vendorId: 0x2dd6 }, // Mindeo
			{ vendorId: 0x072f }, // ACS
			{ vendorId: 0x076b }, // Omnikey
			{ vendorId: 0x24dc }, // Rutoken
		];

		// biome-ignore lint/suspicious/noExplicitAny: WebUSB API standard call
		const device: UsbDeviceLike = await (navigator as any).usb.requestDevice({ filters });
		if (!device) return null;

		return mapUsbDeviceToHardwareDevice(device);
	} catch (err) {
		const name = (err as { name?: string })?.name;
		if (name !== "NotFoundError" && name !== "AbortError") {
			console.warn("[UsbDeviceScanner] USB device request cancelled or failed:", err);
		}
		return null;
	}
}

/**
 * Registers lifecycle listeners for USB device attachment/detachment with auto cleanup.
 */
export function subscribeUsbDeviceEvents(
	onConnect: (device: HardwareDevice) => void,
	onDisconnect: () => void,
): () => void {
	if (!isWebUsbSupported()) {
		return () => {};
	}

	// biome-ignore lint/suspicious/noExplicitAny: WebUSB API standard target
	const usb = (navigator as any).usb;

	const handleConnect = (event: Event) => {
		try {
			// biome-ignore lint/suspicious/noExplicitAny: event.device
			const device = (event as any).device as UsbDeviceLike;
			if (device) {
				onConnect(mapUsbDeviceToHardwareDevice(device));
			}
		} catch (err) {
			console.warn("[UsbDeviceScanner] Connect event handling error:", err);
		}
	};

	const handleDisconnect = () => {
		try {
			onDisconnect();
		} catch (err) {
			console.warn("[UsbDeviceScanner] Disconnect event handling error:", err);
		}
	};

	usb.addEventListener("connect", handleConnect);
	usb.addEventListener("disconnect", handleDisconnect);

	return () => {
		usb.removeEventListener("connect", handleConnect);
		usb.removeEventListener("disconnect", handleDisconnect);
	};
}
