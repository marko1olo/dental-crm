/**
 * @dental/shared/hardware/escpos — Layer 1: 2D QR Code & 1D Barcode Generators
 *
 * Implements standard ESC/POS Model 2 QR-code command stream (GS ( k)
 * and Code 128 barcode command stream (GS k 73) with Code Set B prefix.
 */

import type { EscPosBarcode128Options, EscPosQrOptions } from "./types.js";

/**
 * Generates ESC/POS standard Model 2 QR-code command stream (GS ( k).
 */
export function buildEscPosQrCodeBuffer(
	payload: string,
	options: EscPosQrOptions = {},
): Uint8Array {
	const moduleSize = Math.max(1, Math.min(16, options.moduleSize ?? 4));
	const ecLevel = options.errorCorrection ?? "M";
	const ecByte =
		ecLevel === "L" ? 0x30 : ecLevel === "M" ? 0x31 : ecLevel === "Q" ? 0x32 : 0x33;

	const qrData = new TextEncoder().encode(payload);
	const dataLen = qrData.length + 3;
	const pL = dataLen & 0xff;
	const pH = (dataLen >> 8) & 0xff;

	const bytes: number[] = [];

	if (options.centerAlign) {
		bytes.push(0x1b, 0x61, 0x01); // Center align
	}

	// 1. Function 165: Select QR Model 2 (GS ( k 0x04 0x00 0x31 0x41 0x32 0x00)
	bytes.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);

	// 2. Function 167: Set QR Module Size (GS ( k 0x03 0x00 0x31 0x43 n)
	bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize);

	// 3. Function 169: Set Error Correction Level (GS ( k 0x03 0x00 0x31 0x45 n)
	bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, ecByte);

	// 4. Function 180: Store QR Data in Symbol Storage Area (GS ( k pL pH 0x31 0x50 0x30 d1..dk)
	bytes.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
	for (let i = 0; i < qrData.length; i++) {
		bytes.push(qrData[i]!);
	}

	// 5. Function 181: Print the QR Symbol (GS ( k 0x03 0x00 0x31 0x51 0x30)
	bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);

	return new Uint8Array(bytes);
}

/**
 * Generates ESC/POS Code 128 barcode command stream (GS k 73).
 */
export function buildEscPosBarcode128Buffer(
	code: string,
	options: EscPosBarcode128Options = {},
): Uint8Array {
	const height = Math.max(1, Math.min(255, options.heightDots ?? 64));
	const width = Math.max(2, Math.min(6, options.moduleWidth ?? 2));
	const hri = options.hriPosition ?? 2;

	const bytes: number[] = [];

	if (options.centerAlign) {
		bytes.push(0x1b, 0x61, 0x01);
	}

	// Set barcode height (GS h n)
	bytes.push(0x1d, 0x68, height);
	// Set barcode module width (GS w n)
	bytes.push(0x1d, 0x77, width);
	// Set HRI text position (GS H n)
	bytes.push(0x1d, 0x48, hri);

	// Code 128 command (GS k 73 len bytes)
	// Prefix with Code Set B: {B (0x7B, 0x42)
	const codeSetB = "{B";
	const fullPayload = `${codeSetB}${code}`;
	const rawPayload = new TextEncoder().encode(fullPayload);

	bytes.push(0x1d, 0x6b, 0x49, rawPayload.length);
	for (let i = 0; i < rawPayload.length; i++) {
		bytes.push(rawPayload[i]!);
	}

	return new Uint8Array(bytes);
}
