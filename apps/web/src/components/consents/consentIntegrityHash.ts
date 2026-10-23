/**
 * DIGITAL CONSENT INTEGRITY & CRYPTOGRAPHIC HASHING ENGINE (FIPS 180-4 SHA-256)
 */

import type { SignatureStroke } from "./signaturePadMath";
import { generateSha256 } from "./integrity/sha256";

export { generateSha256 } from "./integrity/sha256";
export {
	generatePaperSignatureSvg,
	generateSmsPepSignatureSvg,
	PAPER_SIGNATURE_FALLBACK_PNG,
} from "./integrity/stamps";

export interface ConsentIntegrityPayload {
	documentText: string;
	patientInfo: {
		name?: string | null | undefined;
		passportOrBirth?: string | null | undefined;
		phone?: string | null | undefined;
	} | string;
	timestamp: string | number;
	strokes?: SignatureStroke[] | undefined;
	verificationMethod?: "tablet_stylus" | "sms_otp" | "printed_scan" | "paper_physical" | undefined;
	smsOtpCode?: string | null | undefined;
}

/**
 * Генерация криптографического цифрового отпечатка (SHA-256) юридического документа
 */
export function generateConsentIntegrityHash(payload: ConsentIntegrityPayload): {
	hash: string;
	canonicalPayload: string;
	timestampIso: string;
} {
	const timestampIso =
		typeof payload.timestamp === "number"
			? new Date(payload.timestamp).toISOString()
			: new Date(payload.timestamp).toISOString();

	const serializedStrokes = (payload.strokes || [])
		.map((s, sIdx) => {
			const pts = (s.points || [])
				.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.time}`)
				.join(";");
			return `S${sIdx}:[${pts}]`;
		})
		.join("|");

	const ptName =
		typeof payload.patientInfo === "string"
			? payload.patientInfo.trim().toUpperCase()
			: (payload.patientInfo?.name || "").trim().toUpperCase();
	const ptId =
		typeof payload.patientInfo === "object" && payload.patientInfo !== null
			? (payload.patientInfo.passportOrBirth || "").trim()
			: "";
	const ptPhone =
		typeof payload.patientInfo === "object" && payload.patientInfo !== null
			? (payload.patientInfo.phone || "").trim()
			: "";

	const canonicalLines = [
		"--- CANONICAL DENTAL INFORMED CONSENT INTEGRITY RECORD ---",
		`DOC_TEXT_HASH: ${generateSha256(payload.documentText)}`,
		`PATIENT_NAME: ${ptName}`,
		`PATIENT_ID: ${ptId}`,
		`PATIENT_PHONE: ${ptPhone}`,
		`TIMESTAMP: ${timestampIso}`,
		`VERIFICATION_METHOD: ${payload.verificationMethod || "tablet_stylus"}`,
		payload.smsOtpCode ? `OTP_DIGEST: ${generateSha256(payload.smsOtpCode)}` : null,
		`STROKES_VECTOR: ${serializedStrokes}`,
		"----------------------------------------------------------",
	].filter(Boolean);

	const canonicalPayload = canonicalLines.join("\n");
	const hash = generateSha256(canonicalPayload);

	return {
		hash,
		canonicalPayload,
		timestampIso,
	};
}
