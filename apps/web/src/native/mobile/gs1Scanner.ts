/**
 * DENTE CRM — GS1 DataMatrix / Barcode Scanner (Layer 1)
 *
 * Parses GS1 DataMatrix strings (Честный ЗНАК / МДЛП / 86-ФЗ) and camera scanning.
 */

import type { MobileScanResult, ParsedGs1DataMatrix } from "./types";
import { getMobileNativeApi } from "./platform";

/**
 * Parses GS1 DataMatrix string used in Russian pharmaceutical tracking (Честный ЗНАК / МДЛП / 86-ФЗ).
 * Supports standard GS1 Application Identifiers:
 * (01) GTIN - 14 digits
 * (21) Serial number - up to 20 alphanumeric characters
 * (91) Crypto key - 4 characters
 * (92) Crypto signature / check code - 4 to 88 characters
 * (17) Expiration date - YYMMDD
 * (10) Batch / Lot number - alphanumeric
 */
export function parseGs1DataMatrix(rawCode: string): ParsedGs1DataMatrix {
	if (!rawCode || typeof rawCode !== "string") {
		return { raw: rawCode || "", isValidMdlp: false };
	}

	const cleaned = rawCode.trim();
	let gtin: string | undefined;
	let serialNumber: string | undefined;
	let cryptoKey: string | undefined;
	let cryptoSignature: string | undefined;
	let batchLot: string | undefined;
	let expirationDate: string | undefined;

	// Check if format uses GS1 FNC1 separator (ASCII 29 / \u001d) or parenthesized AI format
	const hasFnc1 = cleaned.includes("\u001d");
	const parts = hasFnc1 ? cleaned.split("\u001d") : [cleaned];

	for (const part of parts) {
		// AI 01 - GTIN (14 chars)
		const gtinMatch = part.match(/(?:(?:^|\u001d)01|\(01\))(\d{14})/);
		if (gtinMatch && !gtin) {
			gtin = gtinMatch[1];
			// If part continues after GTIN without FNC1, e.g. 01<14>21<serial>
			const afterGtin = part.slice(gtinMatch.index! + gtinMatch[0].length);
			if (afterGtin.startsWith("21") || afterGtin.startsWith("(21)")) {
				const snMatch = afterGtin.match(/^(?:\(21\)|21)([A-Za-z0-9_-]{7,20})/);
				if (snMatch && !serialNumber) {
					serialNumber = snMatch[1];
				}
			}
		}

		// AI 21 - Serial number (up to 7-20 chars)
		const snMatch = part.match(/(?:(?:^|\u001d)21|\(21\))([A-Za-z0-9_-]{7,20})/);
		if (snMatch && !serialNumber) {
			serialNumber = snMatch[1];
		}

		// AI 91 - Crypto Key (4 chars)
		const keyMatch = part.match(/(?:(?:^|\u001d)91|\(91\))([A-Za-z0-9+/=]{4})/);
		if (keyMatch && !cryptoKey) {
			cryptoKey = keyMatch[1];
		}

		// AI 92 - Crypto Signature (4 to 88 chars)
		const sigMatch = part.match(/(?:(?:^|\u001d)92|\(92\))([A-Za-z0-9+/=_-]{4,88})/);
		if (sigMatch && !cryptoSignature) {
			cryptoSignature = sigMatch[1];
		}

		// AI 17 - Expiry Date (6 digits YYMMDD)
		const expMatch = part.match(/(?:(?:^|\u001d)17|\(17\))(\d{6})/);
		if (expMatch && !expirationDate) {
			expirationDate = expMatch[1];
		}

		// AI 10 - Batch / Lot
		const lotMatch = part.match(/(?:(?:^|\u001d)10|\(10\))([A-Za-z0-9]{3,15})/);
		if (lotMatch && !batchLot) {
			batchLot = lotMatch[1];
		}
	}

	// Fallback direct parsing for contiguous string format: 01<14>21<13>91<4>92<44>
	if (!gtin && cleaned.length >= 29 && cleaned.startsWith("01")) {
		gtin = cleaned.slice(2, 16);
		const rest = cleaned.slice(16);
		if (rest.startsWith("21")) {
			const snEnd = rest.indexOf("91", 2);
			if (snEnd > 2) {
				serialNumber = rest.slice(2, snEnd);
				const cryptoPart = rest.slice(snEnd);
				if (cryptoPart.startsWith("91")) {
					cryptoKey = cryptoPart.slice(2, 6);
					if (cryptoPart.slice(6).startsWith("92")) {
						cryptoSignature = cryptoPart.slice(8);
					}
				}
			} else {
				serialNumber = rest.slice(2, 15);
			}
		}
	}

	const isValidMdlp = Boolean(gtin && (serialNumber || cryptoKey));

	return {
		raw: cleaned,
		gtin,
		serialNumber,
		cryptoKey,
		cryptoSignature,
		batchLot,
		expirationDate,
		isValidMdlp,
	};
}

/**
 * Triggers camera scanner on Android / Mobile or falls back to prompt in web browser.
 */
export async function scanDataMatrixWithCamera(): Promise<MobileScanResult> {
	const api = getMobileNativeApi();
	if (api) {
		return api.scanBarcode();
	}

	// Browser fallback: simulated camera or manual entry prompt
	return {
		success: false,
		error: "Аппаратный сканер камеры доступен в приложении DENTE для Android (.apk). В браузере введите код вручную или используйте 2D-сканер.",
	};
}
