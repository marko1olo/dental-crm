/**
 * @file batchValidationAndLabeling.ts
 * Валидация серийных партий, кодов маркировки и штрихкодов (Мандат 8b).
 */

import { getDefaultExpirationDate, normalizeDateToIso } from "../fefo/dateUtils.js";

export interface BatchIdentification {
	readonly batchNumber: string;
	readonly expirationDate: string;
	readonly manufactureDate: string | null;
	readonly barcode: string | null;
	readonly isMarkedItem: boolean;
}

/**
 * Валидирует и нормализует параметры приходуемой партии материалов.
 * Поддерживает DataMatrix коды маркировки, стандартные серии и EAN-13 штрихкоды.
 */
export function validateAndNormalizeBatch(input: {
	readonly rawBatchNumber?: string | null;
	readonly rawExpirationDate?: string | null;
	readonly rawManufactureDate?: string | null;
	readonly rawBarcode?: string | null;
}): BatchIdentification {
	const trimmedBarcode = input.rawBarcode?.trim() || null;

	// Распознавание кода маркировки DataMatrix (Честный Знак: GTIN + Serial)
	const isDataMatrix = Boolean(
		trimmedBarcode &&
			(trimmedBarcode.startsWith("01") || trimmedBarcode.includes("\u001d")),
	);

	let inferredBatch = input.rawBatchNumber?.trim();
	if (!inferredBatch && isDataMatrix && trimmedBarcode) {
		// Извлечение серийного номера из маркировочной строки при необходимости
		const serialMatch = trimmedBarcode.match(/21([A-Za-z0-9_-]{6,13})/);
		if (serialMatch?.[1]) {
			inferredBatch = `MARK-${serialMatch[1]}`;
		}
	}

	const batchNumber =
		inferredBatch ||
		`LOT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

	const expirationDate =
		normalizeDateToIso(input.rawExpirationDate) || getDefaultExpirationDate();
	const manufactureDate = normalizeDateToIso(input.rawManufactureDate);

	return {
		batchNumber,
		expirationDate,
		manufactureDate,
		barcode: trimmedBarcode,
		isMarkedItem: isDataMatrix,
	};
}
