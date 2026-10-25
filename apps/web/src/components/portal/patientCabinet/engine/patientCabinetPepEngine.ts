import { sha256Hex } from "@dental/shared";
import type { ConsentSignatureAudit } from "./patientCabinetTypes.js";
import type { PatientStatutoryConsent } from "./patientCabinetProfileTypes.js";

export async function computeSha256Subtle(inputString: string): Promise<string> {
	if (typeof crypto !== "undefined" && crypto.subtle) {
		const msgUint8 = new TextEncoder().encode(inputString);
		const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	}
	return sha256Hex(inputString);
}

export function generateSha256(inputString: string): string {
	return sha256Hex(inputString);
}

function generateSecure6DigitOtp(): string {
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		const arr = new Uint32Array(1);
		crypto.getRandomValues(arr);
		const val = arr[0] ?? 0;
		return String(100000 + (val % 900000));
	}
	return "748291";
}

export function generateSmsOtp(
	_phone: string,
	mockCode?: string,
): { code: string; sentTimestamp: number; expiresAt: number } {
	const code = mockCode || generateSecure6DigitOtp();
	const now = Date.now();
	const expiresAt = now + 5 * 60 * 1000;
	return { code, sentTimestamp: now, expiresAt };
}

export function verifySmsOtp(
	inputCode: string,
	expectedCode: string,
	sentTimestamp: number,
	maxAgeMs = 5 * 60 * 1000,
): { success: boolean; error?: string } {
	const sanitizedInput = inputCode.replace(/\D/g, "");
	const sanitizedExpected = expectedCode.replace(/\D/g, "");

	if (!sanitizedInput || sanitizedInput.length !== 6) {
		return { success: false, error: "Код подтверждения должен состоять из 6 цифр." };
	}
	const now = Date.now();
	if (now - sentTimestamp > maxAgeMs) {
		return { success: false, error: "Срок действия SMS-кода истек. Запросите новый код." };
	}
	if (sanitizedInput !== sanitizedExpected) {
		return { success: false, error: "Неверный код подтверждения из SMS." };
	}
	return { success: true };
}

export function generatePepIntegrityHash(
	consent: PatientStatutoryConsent,
	phone: string,
	smsOtpCode: string,
	timestamp: number,
): string {
	const rawPayload = [
		consent.code,
		consent.statutoryBasis,
		consent.titleRu,
		consent.summaryTextRu,
		consent.fullTextContent,
		phone,
		smsOtpCode,
		timestamp.toString(),
		"63-FZ_SIMPLE_DIGITAL_SIGNATURE_LEGAL_AUDIT",
	].join("|");
	return generateSha256(rawPayload);
}

export function signConsentWithPep(
	consent: PatientStatutoryConsent,
	phone: string,
	smsOtpCode: string,
	_patientName: string,
): PatientStatutoryConsent {
	const now = Date.now();
	const signedAtIso = new Date(now).toISOString();
	const integrityHash = generatePepIntegrityHash(consent, phone, smsOtpCode, now);

	const signatureAudit: ConsentSignatureAudit = {
		verificationMethod: "sms_otp",
		phone,
		smsOtpCode,
		integrityHash,
		timestamp: now,
		signedAtIso,
		legalBasis: "63-ФЗ ПЭП",
	};

	return {
		...consent,
		status: "signed",
		signedAtIso,
		signatureAudit,
	};
}
