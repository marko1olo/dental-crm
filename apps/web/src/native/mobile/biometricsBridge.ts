/**
 * DENTE CRM — Staff Biometric Authentication & PIN Bridge (Layer 2)
 *
 * Fingerprint / FaceID / TouchID auth with constant-time PIN fallback and security lockout handling.
 */

import type {
	BiometricFallbackReason,
	MobileBiometricAuthResult,
} from "./types";
import { getMobileNativeApi } from "./platform";

/**
 * Classifies raw biometric exception/status into structured fallback reasons.
 */
export function classifyBiometricFallbackReason(errorMsg = ""): {
	fallbackRequired: boolean;
	reason: BiometricFallbackReason;
} {
	const lower = errorMsg.toLowerCase();

	if (lower.includes("not enrolled") || lower.includes("no biometric") || lower.includes("not_enrolled")) {
		return { fallbackRequired: true, reason: "not_enrolled" };
	}
	if (lower.includes("lock") || lower.includes("too many attempts") || lower.includes("locked_out")) {
		return { fallbackRequired: true, reason: "locked_out" };
	}
	if (lower.includes("cancel") || lower.includes("user_cancel") || lower.includes("отменен")) {
		return { fallbackRequired: true, reason: "user_fallback" };
	}
	if (lower.includes("pin") || lower.includes("password") || lower.includes("passcode") || lower.includes("fallback")) {
		return { fallbackRequired: true, reason: "user_fallback" };
	}
	return { fallbackRequired: true, reason: "hardware_unavailable" };
}

/**
 * Validates 4 to 6-digit staff PIN code format.
 */
export function isValidStaffPinFormat(pin: string): boolean {
	return typeof pin === "string" && /^\d{4,6}$/.test(pin.trim());
}

/**
 * Verifies staff PIN code against stored secret/hash in constant-time.
 */
export function verifyStaffPinCode(enteredPin: string, expectedPin: string): boolean {
	if (!isValidStaffPinFormat(enteredPin) || !expectedPin) {
		return false;
	}

	const a = enteredPin.trim();
	const b = expectedPin.trim();

	if (a.length !== b.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

/**
 * Staff biometric authentication (Fingerprint / TouchID / FaceID) with graceful PIN fallback.
 */
export async function authenticateBiometricStaff(
	promptMessage = "Подтвердите вход в клиническую систему DENTE",
): Promise<MobileBiometricAuthResult> {
	const api = getMobileNativeApi();
	if (!api) {
		return {
			success: false,
			authenticated: false,
			authMethod: "pin",
			biometryType: "none",
			fallbackRequired: true,
			fallbackReason: "hardware_unavailable",
			error: "Биометрическая аутентификация доступна на мобильных устройствах. Переключение на защищенный PIN-код.",
		};
	}

	try {
		const result = await api.authenticateBiometric(promptMessage);
		if (result.authenticated) {
			return {
				...result,
				authMethod: "biometric",
				fallbackRequired: false,
			};
		}

		const fallback = classifyBiometricFallbackReason(result.error || "");
		return {
			...result,
			authMethod: fallback.fallbackRequired ? "pin" : undefined,
			fallbackRequired: fallback.fallbackRequired,
			fallbackReason: fallback.reason,
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Ошибка биометрической аутентификации";
		const fallback = classifyBiometricFallbackReason(message);
		return {
			success: false,
			authenticated: false,
			authMethod: "pin",
			fallbackRequired: true,
			fallbackReason: fallback.reason,
			error: message,
		};
	}
}
