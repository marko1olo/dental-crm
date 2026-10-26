/**
 * paidContract/contractSignHash.ts
 * Simple Electronic Signature (ПЭП) OTP generation, verification & hash (Mandate 8b <= 120 lines)
 */

import type { PaidContractData } from "./contractDataTypes";
import { generateSha256 } from "./sha256Digest";

function getCryptoRandomOtpCode(): string {
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		const buffer = new Uint32Array(1);
		crypto.getRandomValues(buffer);
		return String(1000 + ((buffer[0] ?? 0) % 9000));
	}
	const time = Date.now();
	return String(1000 + ((time ^ (time >> 4)) % 9000));
}

export function generateSmsSignOtp(phone: string): {
	code: string;
	sentAt: number;
	expiresAt: number;
	phoneMasked: string;
} {
	const code = getCryptoRandomOtpCode();
	const now = Date.now();
	const expiresAt = now + 5 * 60 * 1000;
	const cleanPhone = (phone || "").replace(/\D/g, "");
	const phoneMasked = cleanPhone.length >= 10
		? `+7 (${cleanPhone.slice(-10, -7)}) ***-**-${cleanPhone.slice(-2)}`
		: phone;

	return { code, sentAt: now, expiresAt, phoneMasked };
}

export function verifySmsSignOtp(
	inputCode: string,
	otpState: { code: string; sentAt: number; expiresAt: number },
): { success: boolean; error?: string } {
	const trimmed = (inputCode || "").trim();
	if (!trimmed) {
		return { success: false, error: "Введите 4-значный код из СМС." };
	}
	if (Date.now() > otpState.expiresAt) {
		return { success: false, error: "Срок действия СМС-кода истек. Запросите новый код." };
	}
	if (trimmed !== otpState.code) {
		return { success: false, error: "Неверный код подтверждения. Проверьте цифры из СМС." };
	}
	return { success: true };
}

export function generatePaidContractIntegrityHash(
	contract: PaidContractData,
	otpCodeOrMethod = "PAPER_DECREE_736",
	verifiedAtIso?: string,
): string {
	const canonicalPayload = [
		`CONTRACT:${contract.contractNumber}:${contract.contractDate}`,
		`CLINIC:${contract.clinic.inn}:${contract.clinic.ogrn}:${contract.clinic.licenseNumber}`,
		`PATIENT:${contract.patient.fullName}:${contract.patient.passportSeries}${contract.patient.passportNumber}:${contract.patient.phone}`,
		`AMOUNT_KOP:${contract.totalAmountKopecks}`,
		`SERVICES:${(contract.services || []).map((s) => `${s.code || ""}:${s.name}:${s.totalKopecks}`).join(";")}`,
		`OTP_DIGEST:${generateSha256(otpCodeOrMethod)}`,
		`TIMESTAMP:${verifiedAtIso || contract.signedAt || contract.contractDate}`,
	].join("\n");
	return generateSha256(canonicalPayload);
}
