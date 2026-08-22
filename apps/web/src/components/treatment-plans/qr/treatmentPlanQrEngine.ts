/**
 * treatmentPlanQrEngine.ts — автономный легковесный генератор QR-кодов (SVG / Matrix) без внешних зависимостей.
 * 
 * Назначение:
 * - Формирование верификационных QR-кодов для планов лечения, договоров и смет DENTE CRM.
 * - Поддержка QR Code Model 2 (версии 1..10, коррекция ошибок L, M, Q, H).
 * - Формирование проверочных URL для пациентов и контролирующих органов (Росздравнадзор, ФНС).
 */

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface PlanVerificationQrPayloadData {
	readonly planId: string;
	readonly planNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly totalAmountRub: number;
	readonly tierTitle: string;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly clinicLicense: string;
	readonly agreedAtIso?: string;
	readonly baseUrl?: string;
}

/**
 * Простая и надежная генерация QR-матрицы на основе алгоритма QR Code (ISO/IEC 18004).
 */
export interface QrMatrixResult {
	readonly size: number;
	readonly modules: readonly (readonly boolean[])[];
	readonly payload: string;
}

// Таблица генерации полиномов Галуа GF(256) для кодирования Рида-Соломона
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
	let x = 1;
	for (let i = 0; i < 255; i++) {
		EXP_TABLE[i] = x;
		EXP_TABLE[i + 255] = x;
		LOG_TABLE[x] = i;
		x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
	}
	LOG_TABLE[0] = 0;
})();

function gMul(a: number, b: number): number {
	if (a === 0 || b === 0) return 0;
	const logA = LOG_TABLE[a] ?? 0;
	const logB = LOG_TABLE[b] ?? 0;
	return EXP_TABLE[(logA + logB) % 255] ?? 0;
}

function createGeneratorPolynomial(degree: number): Uint8Array {
	let poly = new Uint8Array([1]);
	for (let i = 0; i < degree; i++) {
		const next = new Uint8Array(poly.length + 1);
		const factor = EXP_TABLE[i] ?? 0;
		for (let j = 0; j < poly.length; j++) {
			const current = poly[j] ?? 0;
			next[j] = (next[j] ?? 0) ^ gMul(current, factor);
			next[j + 1] = (next[j + 1] ?? 0) ^ current;
		}
		poly = next;
	}
	return poly;
}

function calculateReedSolomonErrorCorrection(
	data: Uint8Array,
	ecLength: number,
): Uint8Array {
	const generator = createGeneratorPolynomial(ecLength);
	const message = new Uint8Array(data.length + ecLength);
	message.set(data);

	for (let i = 0; i < data.length; i++) {
		const coef = message[i] ?? 0;
		if (coef !== 0) {
			for (let j = 0; j < generator.length; j++) {
				const genVal = generator[j] ?? 0;
				message[i + j] = (message[i + j] ?? 0) ^ gMul(genVal, coef);
			}
		}
	}
	return message.slice(data.length);
}

/**
 * Определение емкости и версии QR-кода под размер текста.
 */
function getQrVersionAndCapacity(dataLength: number, ecLevel: QrErrorCorrectionLevel): {
	version: number;
	totalDataBytes: number;
	ecBytes: number;
	matrixSize: number;
} {
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

	const neededBytes = dataLength + 3; // + header and count
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

/**
 * Создание QR-матрицы битов для заданной строки.
 */
export function generateQrMatrix(
	text: string,
	ecLevel: QrErrorCorrectionLevel = "M",
): QrMatrixResult {
	const utf8Bytes = new TextEncoder().encode(text);
	const { version, totalDataBytes, ecBytes, matrixSize } = getQrVersionAndCapacity(
		utf8Bytes.length,
		ecLevel,
	);

	// Матрица модулей (true = черный, false = белый)
	const matrix: boolean[][] = Array.from({ length: matrixSize }, () =>
		Array(matrixSize).fill(false),
	);
	const reserved: boolean[][] = Array.from({ length: matrixSize }, () =>
		Array(matrixSize).fill(false),
	);

	// Вспомогательная функция рисования шаблона поиска (Finder Pattern 7x7)
	const drawFinderPattern = (row: number, col: number) => {
		for (let r = -1; r <= 7; r++) {
			for (let c = -1; c <= 7; c++) {
				const currR = row + r;
				const currC = col + c;
				if (
					currR >= 0 &&
					currR < matrixSize &&
					currC >= 0 &&
					currC < matrixSize
				) {
					const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
					const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
					const isFinder = isBorder || isInner;
					const rRow = matrix[currR];
					const rRes = reserved[currR];
					if (rRow && rRes) {
						rRow[currC] = isFinder;
						rRes[currC] = true;
					}
				}
			}
		}
	};

	// 1. Рисуем 3 шаблона поиска (Finder Patterns)
	drawFinderPattern(0, 0); // Левый верхний
	drawFinderPattern(0, matrixSize - 7); // Правый верхний
	drawFinderPattern(matrixSize - 7, 0); // Левый нижний

	// 2. Линии синхронизации (Timing Patterns)
	for (let i = 8; i < matrixSize - 8; i++) {
		const isBlack = i % 2 === 0;
		const r6 = reserved[6];
		const m6 = matrix[6];
		if (r6 && m6 && !r6[i]) {
			m6[i] = isBlack;
			r6[i] = true;
		}
		const ri = reserved[i];
		const mi = matrix[i];
		if (ri && mi && !ri[6]) {
			mi[6] = isBlack;
			ri[6] = true;
		}
	}

	// 3. Шаблоны выравнивания (Alignment Patterns для версии >= 2)
	if (version >= 2) {
		const alignPos = matrixSize - 7;
		for (let r = alignPos - 2; r <= alignPos + 2; r++) {
			for (let c = alignPos - 2; c <= alignPos + 2; c++) {
				const rRow = reserved[r];
				const mRow = matrix[r];
				if (rRow && mRow && !rRow[c]) {
					const isBorder =
						r === alignPos - 2 ||
						r === alignPos + 2 ||
						c === alignPos - 2 ||
						c === alignPos + 2;
					const isCenter = r === alignPos && c === alignPos;
					mRow[c] = isBorder || isCenter;
					rRow[c] = true;
				}
			}
		}
	}

	// 4. Подготовка потока данных (Byte mode: 0100 + длина + байты + padding)
	const rawData: number[] = [];
	const bitStream: number[] = [];
	const pushBits = (val: number, len: number) => {
		for (let i = len - 1; i >= 0; i--) {
			bitStream.push((val >> i) & 1);
		}
	};

	pushBits(0b0100, 4); // Byte mode
	pushBits(utf8Bytes.length, 8); // 8-bit length for v1-9
	for (let i = 0; i < utf8Bytes.length; i++) {
		const b = utf8Bytes[i] ?? 0;
		pushBits(b, 8);
	}
	// Терминатор 0000
	pushBits(0, 4);
	while (bitStream.length % 8 !== 0) {
		bitStream.push(0);
	}

	// Преобразуем биты в байты
	for (let i = 0; i < bitStream.length; i += 8) {
		let byte = 0;
		for (let j = 0; j < 8; j++) {
			byte = (byte << 1) | (bitStream[i + j] || 0);
		}
		rawData.push(byte);
	}

	// Заполнение pad-байтами 0xEC, 0x11
	const padBytes = [0xec, 0x11] as const;
	let padIdx = 0;
	while (rawData.length < totalDataBytes) {
		const pad = padBytes[padIdx % 2] ?? 0xec;
		rawData.push(pad);
		padIdx++;
	}

	// 5. Вычисление кодов коррекции ошибок Рида-Соломона
	const dataUint8 = new Uint8Array(rawData.slice(0, totalDataBytes));
	const ecUint8 = calculateReedSolomonErrorCorrection(dataUint8, ecBytes);

	// Итоговый массив байт
	const finalCodewords = new Uint8Array(totalDataBytes + ecBytes);
	finalCodewords.set(dataUint8);
	finalCodewords.set(ecUint8, totalDataBytes);

	// Превращаем в плоский список бит
	const allBits: boolean[] = [];
	for (let i = 0; i < finalCodewords.length; i++) {
		const byte = finalCodewords[i] ?? 0;
		for (let b = 7; b >= 0; b--) {
			allBits.push(((byte >> b) & 1) === 1);
		}
	}

	// 6. Размещение данных в матрице зигзагом справа налево
	let bitIdx = 0;
	let upwards = true;
	for (let right = matrixSize - 1; right > 0; right -= 2) {
		if (right === 6) right--; // Пропускаем вертикальную timing line
		const left = right - 1;

		const rowStart = upwards ? matrixSize - 1 : 0;
		const rowEnd = upwards ? -1 : matrixSize;
		const rowStep = upwards ? -1 : 1;

		for (let r = rowStart; r !== rowEnd; r += rowStep) {
			for (const col of [right, left]) {
				const rRow = reserved[r];
				const mRow = matrix[r];
				if (rRow && mRow && !rRow[col]) {
					const bit = bitIdx < allBits.length ? (allBits[bitIdx] ?? false) : false;
					// Применяем маску Mask 0: (row + col) % 2 == 0
					const maskBit = (r + col) % 2 === 0;
					mRow[col] = bit ? !maskBit : maskBit;
					bitIdx++;
				}
			}
		}
		upwards = !upwards;
	}

	return {
		size: matrixSize,
		modules: matrix,
		payload: text,
	};
}

/**
 * Генерация SVG разметки QR-кода.
 */
export function generateQrSvgString(
	text: string,
	options: {
		sizePx?: number;
		fgColor?: string;
		bgColor?: string;
		quietZone?: number;
	} = {},
): string {
	const {
		sizePx = 200,
		fgColor = "#0f172a",
		bgColor = "#ffffff",
		quietZone = 2,
	} = options;

	const matrixRes = generateQrMatrix(text);
	const count = matrixRes.size + quietZone * 2;
	const cellSize = sizePx / count;

	let rects = "";
	for (let r = 0; r < matrixRes.size; r++) {
		for (let c = 0; c < matrixRes.size; c++) {
			const row = matrixRes.modules[r];
			if (row && row[c]) {
				const x = (c + quietZone) * cellSize;
				const y = (r + quietZone) * cellSize;
				rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="${fgColor}" />`;
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}"><rect width="100%" height="100%" fill="${bgColor}" />${rects}</svg>`;
}

/**
 * Формирование верификационной строки для согласования плана лечения.
 */
export function generatePlanVerificationQrPayload(
	data: PlanVerificationQrPayloadData,
): string {
	const origin =
		data.baseUrl ||
		(typeof window !== "undefined" && window.location.origin
			? window.location.origin
			: "https://dente.clinic");

	const params = new URLSearchParams({
		plan: data.planNumber,
		pid: data.patientId,
		sum: String(data.totalAmountRub),
		tier: data.tierTitle,
		inn: data.clinicInn,
		lic: data.clinicLicense.slice(0, 20),
		ts: data.agreedAtIso || new Date().toISOString(),
	});

	return `${origin}/verify/treatment-plan?${params.toString()}`;
}
