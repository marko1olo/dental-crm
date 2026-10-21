/**
 * apps/web/src/components/treatment-plans/qr/qrCapacity.ts
 *
 * Определение емкости и версии QR-кода под размер текста.
 */

import type { QrErrorCorrectionLevel } from "./qrTypes";

export interface QrCapacityInfo {
	readonly version: number;
	readonly totalDataBytes: number;
	readonly ecBytes: number;
	readonly matrixSize: number;
}

export function getQrVersionAndCapacity(
	dataLength: number,
	_ecLevel: QrErrorCorrectionLevel,
): QrCapacityInfo {
	// Базовая таблица для версий 1-10 (Error Correction Level M/L)
	const capacityTable: {
		version: number;
		dataBytesM: number;
		ecBytesM: number;
		size: number;
	}[] = [
		{ version: 1, dataBytesM: 16, ecBytesM: 10, size: 21 },
		{ version: 2, dataBytesM: 28, ecBytesM: 16, size: 25 },
		{ version: 3, dataBytesM: 44, ecBytesM: 26, size: 29 },
		{ version: 4, dataBytesM: 64, ecBytesM: 36, size: 33 },
		{ version: 5, dataBytesM: 86, ecBytesM: 48, size: 37 },
		{ version: 6, dataBytesM: 108, ecBytesM: 64, size: 41 },
		{ version: 7, dataBytesM: 124, ecBytesM: 72, size: 45 },
		{ version: 8, dataBytesM: 154, ecBytesM: 88, size: 49 },
		{ version: 9, dataBytesM: 182, ecBytesM: 110, size: 53 },
		{ version: 10, dataBytesM: 216, ecBytesM: 130, size: 57 },
	];

	const neededBytes = dataLength + 3;
	for (const row of capacityTable) {
		if (row.dataBytesM >= neededBytes) {
			return {
				version: row.version,
				totalDataBytes: row.dataBytesM,
				ecBytes: row.ecBytesM,
				matrixSize: row.size,
			};
		}
	}

	const last = capacityTable[capacityTable.length - 1] ?? {
		version: 10,
		dataBytesM: 216,
		ecBytesM: 130,
		size: 57,
	};
	return {
		version: last.version,
		totalDataBytes: last.dataBytesM,
		ecBytes: last.ecBytesM,
		matrixSize: last.size,
	};
}
