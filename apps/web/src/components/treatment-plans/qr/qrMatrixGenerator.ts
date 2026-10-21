/**
 * apps/web/src/components/treatment-plans/qr/qrMatrixGenerator.ts
 *
 * Генерация QR-матрицы битов на основе алгоритма ISO/IEC 18004.
 */

import type { QrErrorCorrectionLevel, QrMatrixResult } from "./qrTypes";
import { getQrVersionAndCapacity } from "./qrCapacity";
import { calculateReedSolomonErrorCorrection } from "./reedSolomon";
import { drawFinderPattern, drawTimingPatterns, drawAlignmentPattern } from "./qrPatterns";

export function generateQrMatrix(
	text: string,
	ecLevel: QrErrorCorrectionLevel = "M",
): QrMatrixResult {
	const utf8Bytes = new TextEncoder().encode(text);
	const { version, totalDataBytes, ecBytes, matrixSize } = getQrVersionAndCapacity(
		utf8Bytes.length,
		ecLevel,
	);

	const matrix: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));
	const reserved: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

	drawFinderPattern(matrix, reserved, matrixSize, 0, 0);
	drawFinderPattern(matrix, reserved, matrixSize, 0, matrixSize - 7);
	drawFinderPattern(matrix, reserved, matrixSize, matrixSize - 7, 0);
	drawTimingPatterns(matrix, reserved, matrixSize);
	if (version >= 2) {
		drawAlignmentPattern(matrix, reserved, matrixSize);
	}

	const bitStream: number[] = [];
	const pushBits = (val: number, len: number) => {
		for (let i = len - 1; i >= 0; i--) bitStream.push((val >> i) & 1);
	};

	pushBits(0b0100, 4); // Byte mode
	pushBits(utf8Bytes.length, 8); // 8-bit length
	for (let i = 0; i < utf8Bytes.length; i++) {
		pushBits(utf8Bytes[i] ?? 0, 8);
	}
	pushBits(0, 4); // Terminator
	while (bitStream.length % 8 !== 0) bitStream.push(0);

	const rawData: number[] = [];
	for (let i = 0; i < bitStream.length; i += 8) {
		let byte = 0;
		for (let j = 0; j < 8; j++) byte = (byte << 1) | (bitStream[i + j] || 0);
		rawData.push(byte);
	}

	const padBytes = [0xec, 0x11] as const;
	let padIdx = 0;
	while (rawData.length < totalDataBytes) {
		rawData.push(padBytes[padIdx % 2] ?? 0xec);
		padIdx++;
	}

	const dataUint8 = new Uint8Array(rawData.slice(0, totalDataBytes));
	const ecUint8 = calculateReedSolomonErrorCorrection(dataUint8, ecBytes);
	const finalCodewords = new Uint8Array(totalDataBytes + ecBytes);
	finalCodewords.set(dataUint8);
	finalCodewords.set(ecUint8, totalDataBytes);

	const allBits: boolean[] = [];
	for (let i = 0; i < finalCodewords.length; i++) {
		const byte = finalCodewords[i] ?? 0;
		for (let b = 7; b >= 0; b--) allBits.push(((byte >> b) & 1) === 1);
	}

	let bitIdx = 0;
	let upwards = true;
	for (let right = matrixSize - 1; right > 0; right -= 2) {
		if (right === 6) right--;
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
					const maskBit = (r + col) % 2 === 0;
					mRow[col] = bit ? !maskBit : maskBit;
					bitIdx++;
				}
			}
		}
		upwards = !upwards;
	}

	return { size: matrixSize, modules: matrix, payload: text };
}
