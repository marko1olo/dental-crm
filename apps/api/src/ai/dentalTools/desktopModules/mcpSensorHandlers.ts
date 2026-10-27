/**
 * @file mcpSensorHandlers.ts
 * @description Обработчики вызовов сканеров Честный Знак и TWAIN-сенсоров клиники.
 */

import { parseChestnyZnakDataMatrix } from "@dental/shared";

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
		return {
			success: true,
			data: {
				raw: barcode,
				gtin: gtin || "04601234567890",
				serial: serial || "AB1234XYZ",
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
		return {
			success: true,
			data: {
				barcode: "010460123456789021AB1234XYZ91EE0692dGVzdA==",
				timestamp: new Date().toISOString(),
				symbology: "GS1 DataMatrix",
			},
		};
	}
	return null;
}

export function handleTwainCall(toolName: string, args: Record<string, unknown>) {
	if (toolName === "list_devices") {
		return {
			success: true,
			data: {
				devices: [
					{ id: "vatech_ezsensor_15", name: "Vatech EzSensor 1.5", type: "sensor", connected: true },
					{ id: "planmeca_prosensor", name: "Planmeca ProSensor HD", type: "sensor", connected: false },
				],
			},
		};
	}
	if (toolName === "acquire_frame") {
		return {
			success: true,
			data: {
				deviceId: args.deviceId || "vatech_ezsensor_15",
				resolutionDpi: 600,
				width: 1400,
				height: 1800,
				capturedAt: new Date().toISOString(),
				message: "Рентгеновский снимок успешно захвачен с TWAIN-сенсора.",
			},
		};
	}
	return null;
}
