/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TWAIN 2.4, WIA 2.0 & DICOM PROTOCOL BRIDGE (LAYER 1)
 * Protocol codes, DSM states, UID generation & date formatting
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { RvgCaptureProtocol } from "./types.js";

/**
 * TWAIN 2.4 Data Source Manager (DSM) & Capability Constants
 */
export const TWAIN_CONSTANTS = {
	DG_CONTROL: 0x0001,
	DG_IMAGE: 0x0002,
	DAT_IDENTITY: 0x0003,
	DAT_USERINTERFACE: 0x0009,
	DAT_IMAGEINFO: 0x0101,
	DAT_IMAGENATIVEXFER: 0x0104,
	DAT_IMAGEMEMXFER: 0x0103,
	DAT_CAPABILITY: 0x0001,
	MSG_OPENDSM: 0x0301,
	MSG_CLOSEDSM: 0x0302,
	MSG_OPENDS: 0x0401,
	MSG_CLOSEDS: 0x0402,
	MSG_ENABLEDS: 0x0501,
	MSG_DISABLEDS: 0x0502,
	MSG_XFERREADY: 0x0101,
	MSG_GET: 0x0001,
	MSG_SET: 0x0002,
	CAP_XFERMECH: 0x0103,
	TWSX_NATIVE: 0,
	TWSX_MEMORY: 2,
	TWRC_SUCCESS: 0,
	TWRC_CANCEL: 3,
	TWRC_NOTDSDONE: 8,
} as const;

/**
 * Windows Image Acquisition (WIA 2.0) Constants
 */
export const WIA_CONSTANTS = {
	WIA_IPA_DATATYPE: 4103,
	WIA_IPA_BITS_PER_PIXEL: 4104,
	WIA_IPA_BYTES_PER_LINE: 4106,
	WIA_IPA_NUMBER_OF_LINES: 4107,
	WIA_IPA_PIXELS_PER_LINE: 4108,
	WIA_IPS_BRIGHTNESS: 6147,
	WIA_IPS_CONTRAST: 6148,
	WIA_DATA_GRAYSCALE: 2,
	WIA_DATA_RAW: 3,
} as const;

let uidCounter = 1;

/**
 * Генерация уникального DICOM UID в пространстве РФ / Минздрав
 */
export function generateDicomUid(rootPrefix = "1.2.643.5.1.13.2"): string {
	const timestamp = Date.now();
	const count = uidCounter++;
	const random = Math.floor(Math.random() * 899999 + 100000);
	return `${rootPrefix}.${timestamp}.${count}.${random}`;
}

/**
 * Форматирование даты в стандартный DICOM VR DA (YYYYMMDD)
 */
export function formatDicomDate(d = new Date()): string {
	const y = d.getFullYear().toString().padStart(4, "0");
	const m = (d.getMonth() + 1).toString().padStart(2, "0");
	const day = d.getDate().toString().padStart(2, "0");
	return `${y}${m}${day}`;
}

/**
 * Форматирование времени в стандартный DICOM VR TM (HHMMSS)
 */
export function formatDicomTime(d = new Date()): string {
	const h = d.getHours().toString().padStart(2, "0");
	const m = d.getMinutes().toString().padStart(2, "0");
	const s = d.getSeconds().toString().padStart(2, "0");
	return `${h}${m}${s}`;
}

/**
 * Возвращает клиническое описание анатомической области по номеру зуба FDI (11-85)
 */
export function getFdiAnatomicRegionDescription(tooth: number): string {
	if (tooth >= 11 && tooth <= 18) return `Верхняя челюсть справа (квадрант 1, зуб ${tooth})`;
	if (tooth >= 21 && tooth <= 28) return `Верхняя челюсть слева (квадрант 2, зуб ${tooth})`;
	if (tooth >= 31 && tooth <= 38) return `Нижняя челюсть слева (квадрант 3, зуб ${tooth})`;
	if (tooth >= 41 && tooth <= 48) return `Нижняя челюсть справа (квадрант 4, зуб ${tooth})`;
	if (tooth >= 51 && tooth <= 55) return `Молочный зуб верхний правый (${tooth})`;
	if (tooth >= 61 && tooth <= 65) return `Молочный зуб верхний левый (${tooth})`;
	if (tooth >= 71 && tooth <= 75) return `Молочный зуб нижний левый (${tooth})`;
	if (tooth >= 81 && tooth <= 85) return `Молочный зуб нижний правый (${tooth})`;
	return `Зубная дуга (FDI ${tooth})`;
}

/**
 * Валидация протокола захвата
 */
export function isProtocolSupported(protocol: RvgCaptureProtocol): boolean {
	return protocol === "TWAIN_2_4" || protocol === "WIA_2_0" || protocol === "NATIVE_USB_DRIVER";
}
