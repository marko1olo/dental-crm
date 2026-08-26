import crypto from "node:crypto";
import type {
	PublicAuthMethod,
	PublicEstimateDetail,
	PublicEstimateSignature,
} from "@dental/shared";

/**
 * 2FA Public Treatment Plan & Budget Verification Guard.
 * Inspired by dentalpin ADR 0006.
 *
 * Prevents unauthorized medical data leakage when patient treatment plans
 * or estimates are shared via mobile web links.
 *
 * Verification cascade (Zero SMS cost):
 * 1. Factor 1: Public Token (UUID v4 in URL)
 * 2. Factor 2: Knowledge Factor:
 *    - `phone_last4`: Last 4 digits of patient's verified mobile phone
 *    - `dob`: Date of birth (YYYY-MM-DD or DD.MM.YYYY) as fallback
 *    - `manual_code` / `verbalPin`: 4-6 digit verbal security code set by clinic reception
 *
 * Implements anti-bruteforce lockouts (max 5 attempts per 15 min, permanent token revocation after 10 failures).
 */

export interface PublicPlanPatientRecord {
	readonly id: string;
	readonly publicToken: string;
	readonly phone?: string | null | undefined;
	readonly birthDate?: string | null | undefined; // YYYY-MM-DD
	readonly verbalPinHash?: string | null | undefined;
	readonly failedAttempts: number;
	readonly totalFailures?: number | undefined;
	readonly isLocked: boolean;
	readonly lockedUntil?: Date | null | undefined;
	readonly publicLockedAt?: Date | null | undefined;
}

export interface VerificationAttemptResult {
	readonly success: boolean;
	readonly error?: string | undefined;
	readonly errorCode?: "locked" | "expired" | "rate_limited" | "invalid" | "method_mismatch" | undefined;
	readonly isLocked?: boolean | undefined;
	readonly isPermanentlyLocked?: boolean | undefined;
	readonly remainingAttempts?: number | undefined;
	readonly sessionToken?: string | undefined;
}

export const MAX_CONSECUTIVE_FAILURES = 5;
export const TOTAL_FAILURES_PERMANENT_LOCKOUT = 10;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function hashVerbalPin(pin: string, salt = "dente_2fa_salt"): string {
	return crypto.createHash("sha256").update(`${pin}_${salt}`).digest("hex");
}

/**
 * Resolves the verification method deterministically at send time based on available patient data
 */
export function resolvePublicAuthMethod(
	patient: {
		readonly phone?: string | null | undefined;
		readonly birthDate?: string | null | undefined;
		readonly verbalPinHash?: string | null | undefined;
	},
	clinicDisabled = false,
): PublicAuthMethod {
	if (clinicDisabled) {
		return "none";
	}

	const cleanPhone = (patient.phone || "").replace(/\D/g, "");
	if (cleanPhone.length >= 4) {
		return "phone_last4";
	}

	if (patient.birthDate && patient.birthDate.trim().length > 0) {
		return "dob";
	}

	return "manual_code";
}

/**
 * Validates the patient knowledge factor with constant-time comparisons and lockout counters
 */
export function verifyPatientKnowledgeFactor(
	patient: PublicPlanPatientRecord,
	inputFactor: {
		readonly method?: PublicAuthMethod | undefined;
		readonly value?: string | undefined;
		readonly phoneLast4?: string | undefined;
		readonly birthDate?: string | undefined;
		readonly verbalPin?: string | undefined;
	},
	secretKey: string,
): VerificationAttemptResult {
	const now = Date.now();

	// Permanent Lockout Gate
	if (patient.publicLockedAt || (patient.totalFailures && patient.totalFailures >= TOTAL_FAILURES_PERMANENT_LOCKOUT)) {
		return {
			success: false,
			errorCode: "locked",
			error: "Ссылка заблокирована администратором безопасности. Обратитесь в клинику для повторного выпуска.",
			isLocked: true,
			isPermanentlyLocked: true,
			remainingAttempts: 0,
		};
	}

	// Rolling Window Lockout Gate
	if (patient.isLocked || (patient.lockedUntil && patient.lockedUntil.getTime() > now)) {
		return {
			success: false,
			errorCode: "rate_limited",
			error: "Превышено число попыток ввода. Доступ временно заблокирован на 15 минут.",
			isLocked: true,
			remainingAttempts: 0,
		};
	}

	let isMatch = false;
	const expectedMethod = resolvePublicAuthMethod(patient);

	if (inputFactor.method === "none") {
		isMatch = true;
	} else if (inputFactor.method && inputFactor.value) {
		const val = inputFactor.value.trim();
		if (inputFactor.method === "phone_last4" && patient.phone) {
			const cleanPhone = patient.phone.replace(/\D/g, "");
			const expectedLast4 = cleanPhone.slice(-4);
			const cleanInput = val.replace(/\D/g, "");
			if (cleanPhone.length >= 4 && cleanInput.length === 4) {
				isMatch = crypto.timingSafeEqual(Buffer.from(cleanInput), Buffer.from(expectedLast4));
			}
		} else if (inputFactor.method === "dob" && patient.birthDate) {
			const normPatientDob = normalizeIsoDate(patient.birthDate);
			const normInputDob = normalizeIsoDate(val);
			if (normPatientDob && normInputDob) {
				isMatch = crypto.timingSafeEqual(Buffer.from(normInputDob), Buffer.from(normPatientDob));
			}
		} else if (inputFactor.method === "manual_code" && patient.verbalPinHash) {
			const inputHash = hashVerbalPin(val);
			isMatch = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(patient.verbalPinHash));
		}
	} else {
		// Backwards-compatible legacy args (phoneLast4 / birthDate / verbalPin)
		if (inputFactor.phoneLast4 && patient.phone) {
			const cleanPhone = patient.phone.replace(/\D/g, "");
			const expectedLast4 = cleanPhone.slice(-4);
			const cleanInput = inputFactor.phoneLast4.replace(/\D/g, "");
			if (cleanPhone.length >= 4 && cleanInput === expectedLast4) {
				isMatch = true;
			}
		}
		if (!isMatch && inputFactor.birthDate && patient.birthDate) {
			const normP = normalizeIsoDate(patient.birthDate);
			const normI = normalizeIsoDate(inputFactor.birthDate);
			if (normP && normI && normP === normI) {
				isMatch = true;
			}
		}
		if (!isMatch && inputFactor.verbalPin && patient.verbalPinHash) {
			const inputHash = hashVerbalPin(inputFactor.verbalPin.trim());
			if (inputHash === patient.verbalPinHash) {
				isMatch = true;
			}
		}
	}

	if (!isMatch) {
		const newConsecutive = (patient.failedAttempts || 0) + 1;
		const newTotal = (patient.totalFailures || 0) + 1;
		const remaining = Math.max(0, MAX_CONSECUTIVE_FAILURES - newConsecutive);
		const willPermanentLock = newTotal >= TOTAL_FAILURES_PERMANENT_LOCKOUT;
		const willRollingLock = newConsecutive >= MAX_CONSECUTIVE_FAILURES;

		return {
			success: false,
			errorCode: willPermanentLock ? "locked" : willRollingLock ? "rate_limited" : "invalid",
			error: willPermanentLock
				? "Превышен суммарный лимит попыток. Ссылка аннулирована, обратитесь в клинику."
				: willRollingLock
					? "Превышено число попыток ввода. Доступ заблокирован на 15 минут."
					: `Неверные данные для подтверждения личности. Осталось попыток: ${remaining}`,
			isLocked: willRollingLock || willPermanentLock,
			isPermanentlyLocked: willPermanentLock,
			remainingAttempts: remaining,
		};
	}

	// Success: generate signed session token with 30 min expiration
	const expiresAt = now + SESSION_TTL_MS;
	const payload = `${patient.id}:${patient.publicToken}:${expiresAt}`;
	const signature = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
	const sessionToken = Buffer.from(`${payload}:${signature}`).toString("base64url");

	return {
		success: true,
		sessionToken,
	};
}

export function validatePublicPlanSessionToken(
	token: string,
	expectedPatientId: string,
	expectedPublicToken: string,
	secretKey: string,
): boolean {
	try {
		const decoded = Buffer.from(token, "base64url").toString("utf-8");
		const parts = decoded.split(":");
		if (parts.length !== 4) return false;

		const [patientId, publicToken, expiresAtStr, signature] = parts;
		if (!patientId || !publicToken || !expiresAtStr || !signature) return false;

		if (patientId !== expectedPatientId || publicToken !== expectedPublicToken) {
			return false;
		}

		const expiresAt = Number.parseInt(expiresAtStr, 10);
		if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
			return false;
		}

		const payload = `${patientId}:${publicToken}:${expiresAtStr}`;
		const expectedSignature = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");

		return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
	} catch {
		return false;
	}
}

/**
 * Normalizes dates (YYYY-MM-DD or DD.MM.YYYY) to standard ISO YYYY-MM-DD string
 */
function normalizeIsoDate(rawDate: string): string | null {
	const trimmed = rawDate.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		return trimmed;
	}
	const dotMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
	if (dotMatch && dotMatch[1] && dotMatch[2] && dotMatch[3]) {
		return `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`;
	}
	const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (slashMatch && slashMatch[1] && slashMatch[2] && slashMatch[3]) {
		return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
	}
	return null;
}
