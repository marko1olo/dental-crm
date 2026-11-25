/**
 * @file mcpSensorHandlers.ts
 * @description Обработчики вызовов сканеров Честный Знак и TWAIN-сенсоров клиники.
 */

import { parseChestnyZnakDataMatrix } from "@dental/shared";

export interface ScannedBarcodeRecord {
	barcode: string;
	timestamp: string;
	symbology: string;
	gtin?: string | undefined;
	serial?: string | undefined;
}

let lastScannedBarcode: ScannedBarcodeRecord | null = null;

export function setLastScannedBarcode(record: ScannedBarcodeRecord | null): void {
	lastScannedBarcode = record;
}

export function getLastScannedBarcode(): ScannedBarcodeRecord | null {
	return lastScannedBarcode;
}

export function handleScannerCall(toolName: string, args: Record<string, unknown>) {
	if (toolName === "parse_chestny_znak") {
		const barcode = String(args.rawBarcode || "").trim();
		if (!barcode) return { success: false, error: "Ошибка сканирования: строка штрихкода пуста." };
		const parsed = parseChestnyZnakDataMatrix(barcode);
		let gtin = parsed.gtin;
		let serial = parsed.serialNumber;
		const serialMatch = barcode.match(/(?:21|\(21\))([a-zA-Z0-9_-]+?)(?:91|92|\(91\)|\(92\)|$)/);
		if (serialMatch && (!serial || serial.includes("91") || serial.includes("92"))) serial = serialMatch[1];
		if (!gtin) {
			const gtinMatch = barcode.match(/(?:01|\(01\))(\d{14})/);
			if (gtinMatch) gtin = gtinMatch[1];
		}

		if (parsed.isValid || gtin || serial) {
			lastScannedBarcode = {
				barcode,
				timestamp: new Date().toISOString(),
				symbology: "GS1 DataMatrix",
				gtin: gtin || undefined,
				serial: serial || undefined,
			};
		}

		return {
			success: true,
			data: {
				raw: barcode,
				gtin: gtin || undefined,
				serial: serial || undefined,
				cryptoKey: parsed.cryptoKey,
				cryptoTail: parsed.cryptoTail,
				matchedTradeName: parsed.matchedTradeName,
				matchedProduct: parsed.matchedProduct,
				system: "Честный Знак (МДЛП / 54-ФЗ)",
				validGs1: parsed.isValid,
				checksumError: parsed.isValid ? undefined : parsed.errorMessage,
			},
		};
	}
	if (toolName === "get_last_scanned_barcode") {
		if (!lastScannedBarcode) {
			return {
				success: false,
				status: "NO_BARCODE_SCANNED",
				error: "Буфер 2D-сканера пуст: штрихкод еще не был отсканирован (NO_BARCODE_SCANNED).",
			};
		}
		return {
			success: true,
			data: { ...lastScannedBarcode },
		};
	}
	return null;
}

export function handleTwainCall(toolName: string, _args: Record<string, unknown>) {
	const bridgeUrl = process.env.TWAIN_BRIDGE_URL?.trim();
	if (toolName === "list_devices") {
		if (!bridgeUrl) {
			return {
				success: false,
				status: "native_bridge_unavailable",
				data: {
					devices: [],
				},
				message:
					"Нативный TWAIN-драйвер визиографа не подключён (TWAIN_BRIDGE_URL не настроен).",
				error:
					"TWAIN-мост не обнаружен в текущем окружении (native_bridge_unavailable).",
			};
		}
		return {
			success: false,
			status: "native_bridge_sync_required",
			data: {
				devices: [],
				bridgeUrlConfigured: true,
			},
			message:
				"Опрос TWAIN-устройств требует прямого вызова локального нативного агента визиографа.",
			error: "Синхронный опрос драйвера TWAIN без IPC-канала недоступен.",
		};
	}
	if (toolName === "acquire_frame") {
		return {
			success: false,
			status: bridgeUrl ? "native_bridge_sync_required" : "device_offline",
			message: "Визиограф не обнаружен",
			error: bridgeUrl
				? "Захват кадра с визиографа должен выполняться через асинхронный нативный TWAIN-мост."
				: "TWAIN-датчик не подключен к USB-порту или драйвер сенсора не установлен (device_offline)",
		};
	}
	return null;
}
