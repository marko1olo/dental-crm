/**
 * CLINICAL DENTAL WARRANTY ENGINE — ID & CRYPTO UTILITIES
 * Mandate 8b: strict file length budget <= 120 lines.
 */

import { generateQrCodeSvg, sha256Hex } from "@dental/shared";

export { generateQrCodeSvg, sha256Hex };

let certificateSequenceCounter = 0;

/**
 * Генерация уникального детерминированного серийного номера гарантийного паспорта
 * Формат: WAR-ГГГГ-NNNNN
 */
export function generateCertificateId(prefix = "WAR", seqNumber?: number | string | null | undefined): string {
	const year = new Date().getFullYear();
	let seqStr: string;
	if (seqNumber !== undefined && seqNumber !== null && String(seqNumber).trim() !== "") {
		const numOnly = String(seqNumber).replace(/\D/g, "");
		seqStr = (numOnly || "1").padStart(5, "0").slice(-5);
	} else {
		certificateSequenceCounter = (certificateSequenceCounter + 1) % 100000;
		if (certificateSequenceCounter === 0) certificateSequenceCounter = 1;
		seqStr = String(certificateSequenceCounter).padStart(5, "0");
	}
	return `${prefix}-${year}-${seqStr}`;
}

/**
 * Генерация криптографически надежного RFC 9562 UUIDv7
 */
export function generateUuidV7(): string {
	const now = Date.now();
	const bytes = new Uint8Array(16);
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < 16; i++) {
			bytes[i] = ((now >> (i * 2)) ^ (i * 37)) & 0xff;
		}
	}

	bytes[0] = (now / 0x10000000000) & 0xff;
	bytes[1] = (now / 0x100000000) & 0xff;
	bytes[2] = (now / 0x1000000) & 0xff;
	bytes[3] = (now / 0x10000) & 0xff;
	bytes[4] = (now / 0x100) & 0xff;
	bytes[5] = now & 0xff;

	bytes[6] = (bytes[6]! & 0x0f) | 0x70;
	bytes[8] = (bytes[8]! & 0x3f) | 0x80;

	let hex = "";
	for (let i = 0; i < 16; i++) {
		hex += bytes[i]!.toString(16).padStart(2, "0");
	}
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Алиас для криптографического SHA-256 хеширования гарантийных бланков и актов
 */
export function generateSha256(inputString: string): string {
	return sha256Hex(inputString);
}

let remediationOrderCounter = 0;

/**
 * Генерация регламентного номера наряда на гарантийную переделку/рекламацию
 * Формат: ГП-ГГГГ-NNNN
 */
export function generateRemediationOrderNumber(year = new Date().getFullYear(), seq?: number | string | null | undefined): string {
	let seqStr: string;
	if (seq !== undefined && seq !== null && String(seq).trim() !== "") {
		const numOnly = String(seq).replace(/\D/g, "");
		seqStr = (numOnly || "1").padStart(4, "0").slice(-4);
	} else {
		remediationOrderCounter = (remediationOrderCounter + 1) % 10000;
		if (remediationOrderCounter === 0) remediationOrderCounter = 1;
		seqStr = String(remediationOrderCounter).padStart(4, "0");
	}
	return `ГП-${year}-${seqStr}`;
}
