/**
 * ============================================================================
 * SANPIN 3.3686-21 PACKAGE BARCODE & DIGITAL STAMP GENERATOR (LAYER 1)
 * Генерация детерминированных идентификаторов циклов, цифровых хеш-штампов,
 * серийных номеров крафт-пакетов и штрихкодов со сроками годности.
 * ============================================================================
 */

import { sha256Hex } from "@dental/shared";
import type {
	PackageBarcodeInfo,
	PackageBarcodePayloadParams,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CYCLE ID & DIGITAL STAMP CRYPTOGRAPHIC HASH
// ─────────────────────────────────────────────────────────────────────────────

export function generateForm257RecordId(date: string, cycleNumber: number, sterilizerCode: string): string {
	const cleanDate = date.replace(/[^0-9]/g, "");
	const paddedCycle = String(cycleNumber).padStart(2, "0");
	const cleanCode = sterilizerCode.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, "").toUpperCase();
	return `F257-${cleanDate}-${cleanCode}-C${paddedCycle}`;
}

/**
 * Вычисляет цифровой хеш-штамп валидации записи журнала Формы № 257/у
 * (предотвращает подделку записей и фиксирует неизменность параметров).
 */
export function calculateDigitalStampHash(data: {
	id: string;
	date: string;
	cycleNumber: number;
	sterilizerCode: string;
	actualTemp: number;
	actualPressure: number;
	actualTime: number;
	isPassed: boolean;
	operatorName: string;
}): string {
	const raw = `${data.id}|${data.date}|${data.cycleNumber}|${data.sterilizerCode}|${data.actualTemp}|${data.actualPressure}|${data.actualTime}|${data.isPassed}|${data.operatorName}`;
	const hex = sha256Hex(raw).toUpperCase();
	return `DENTE-CSO-257-${hex}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. KRAFT PACKAGE SERIAL & BARCODE GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Расчет даты истечения срока стерильности крафт-пакета.
 */
export function calculatePackageExpirationDate(packDate: string, shelfLifeDays = 30): string {
	const [y, m, d] = packDate.slice(0, 10).split("-").map(Number);
	if (!y || !m || !d) {
		const fallback = new Date();
		fallback.setDate(fallback.getDate() + shelfLifeDays);
		return fallback.toISOString().slice(0, 10);
	}
	const expDateObj = new Date(Date.UTC(y, m - 1, d));
	expDateObj.setUTCDate(expDateObj.getUTCDate() + shelfLifeDays);
	const yyyy = expDateObj.getUTCFullYear();
	const mm = String(expDateObj.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(expDateObj.getUTCDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

/**
 * Генерация уникального серийного номера крафт-пакета в рамках цикла стерилизации.
 */
export function generatePackageSerialNumber(cycleRecordId: string, packIndex: number): string {
	const paddedIndex = String(packIndex).padStart(3, "0");
	return `${cycleRecordId}-P${paddedIndex}`;
}

/**
 * Генерация строкового пейлоада штрихкода (Code128 / DataMatrix) для термоэтикетки стерильного пакета.
 * Формат: DENTE-CSO|CYCLE_ID|SERIAL|DATE|EXP_DATE
 */
export function generatePackageBarcodePayload(params: PackageBarcodePayloadParams): string {
	const cycleId = generateForm257RecordId(params.packDate, params.cycleNumber, params.sterilizerCode);
	const serial = generatePackageSerialNumber(cycleId, params.packIndex);
	const expDate = calculatePackageExpirationDate(params.packDate, params.shelfLifeDays ?? 30);
	return `DENTE-CSO|${cycleId}|${serial}|${params.packDate.slice(0, 10)}|${expDate}`;
}

/**
 * Формирование полного объекта данных маркировки стерильного крафт-пакета.
 */
export function generatePackageBarcodeInfo(params: PackageBarcodePayloadParams): PackageBarcodeInfo {
	const shelfLife = params.shelfLifeDays ?? 30;
	const cycleId = generateForm257RecordId(params.packDate, params.cycleNumber, params.sterilizerCode);
	const serialNumber = generatePackageSerialNumber(cycleId, params.packIndex);
	const expirationDate = calculatePackageExpirationDate(params.packDate, shelfLife);
	const barcodePayload = generatePackageBarcodePayload(params);

	return {
		serialNumber,
		barcodePayload,
		packDate: params.packDate.slice(0, 10),
		expirationDate,
		shelfLifeDays: shelfLife,
		cycleId,
	};
}
