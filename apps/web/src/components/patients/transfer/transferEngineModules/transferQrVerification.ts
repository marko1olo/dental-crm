/**
 * transferQrVerification.ts — Генерация и верификация QR-кодов трансфера (ISO/IEC 18004).
 * Лимит <= 120 строк по Мандату 8b.
 */

import { generateQrCodeSvg, generateQrMatrix } from "@dental/shared";
import type { PatientClinicalSnapshot, TransferVerificationQrMatrixResult } from "./types.js";

export function generateTransferVerificationQrPayload(snapshot: PatientClinicalSnapshot): string {
	return `DENTE:TRF:${snapshot.snapshotId}:${snapshot.patientId}:${snapshot.checksumSha256.slice(0, 16)}`;
}

export function generateTransferVerificationQrMatrix(
	payloadOrSnapshot: string | PatientClinicalSnapshot,
): TransferVerificationQrMatrixResult {
	const payload =
		typeof payloadOrSnapshot === "string"
			? payloadOrSnapshot
			: generateTransferVerificationQrPayload(payloadOrSnapshot);
	const res = generateQrMatrix(payload, "M");
	return {
		matrix: res.matrix,
		size: res.size,
		version: res.version,
		payload,
	};
}

export function generateTransferVerificationQrSvg(
	payloadOrSnapshot: string | PatientClinicalSnapshot,
	size = 180,
	options: {
		readonly margin?: number;
		readonly fgColor?: string;
		readonly bgColor?: string;
	} = {},
): string {
	const payload =
		typeof payloadOrSnapshot === "string"
			? payloadOrSnapshot
			: generateTransferVerificationQrPayload(payloadOrSnapshot);
	return generateQrCodeSvg(payload, {
		size,
		margin: options.margin ?? 4,
		foregroundColor: options.fgColor ?? "#000000",
		backgroundColor: options.bgColor ?? "#ffffff",
	});
}

export function generateTransferVerificationQrDataUri(
	payloadOrSnapshot: string | PatientClinicalSnapshot,
	size = 180,
	options: {
		readonly margin?: number;
		readonly fgColor?: string;
		readonly bgColor?: string;
	} = {},
): string {
	const svg = generateTransferVerificationQrSvg(payloadOrSnapshot, size, options);
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
