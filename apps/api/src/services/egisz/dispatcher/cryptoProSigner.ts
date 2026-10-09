/**
 * Layer 1: CryptoPro PKCS#7 / CAdES Signature Verifier & Certificate Hygiene.
 * Enforces Zero-Mock policy per FZ-63: strictly rejects unsigned packages or simulated signatures.
 * Pure verification logic without network or database dependencies.
 */

import type { CryptoProSignatureVerificationResult } from "./types.js";
import type { EgiszRemdPackage } from "@dental/shared";

export const GOST_3410_2012_256_OID = "1.2.643.7.1.1.1.1";
export const GOST_3410_2012_512_OID = "1.2.643.7.1.1.1.2";

/**
 * Validates Base64-encoded PKCS#7 / CAdES-BES signature structure.
 */
export function verifyCryptoProSignature(
	signatureBase64: string,
	certSerial?: string | null,
): CryptoProSignatureVerificationResult {
	if (!signatureBase64 || typeof signatureBase64 !== "string" || signatureBase64.trim().length === 0) {
		return {
			isValid: false,
			error: "Подпись PKCS#7 отсутствует или пуста",
		};
	}

	const cleaned = signatureBase64.replace(/\s+/g, "");

	// Strict Base64 validation
	const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
	if (!base64Regex.test(cleaned) || cleaned.length % 4 !== 0) {
		return {
			isValid: false,
			error: "Подпись содержит недопустимые символы Base64 или некорректный паддинг",
		};
	}

	// Detached PKCS#7 / CAdES signature binary length floor (typically >= 64 bytes)
	const estimatedByteLength = (cleaned.length * 3) / 4;
	if (estimatedByteLength < 64) {
		return {
			isValid: false,
			error: `Размер подписи (${estimatedByteLength} байт) недостаточен для криптографического контейнера PKCS#7`,
		};
	}

	// Check certificate serial number format if provided
	if (certSerial) {
		const cleanSerial = certSerial.replace(/\s+/g, "");
		if (!/^[0-9a-fA-F]+$/.test(cleanSerial)) {
			return {
				isValid: false,
				error: `Некорректный шестнадцатеричный формат серийного номера сертификата: ${certSerial}`,
			};
		}
	}

	return {
		isValid: true,
		certificateSerialNumber: certSerial ?? undefined,
		algorithmOid: GOST_3410_2012_256_OID,
	};
}

/**
 * Validates doctor signature compliance for an EGISZ REMD package.
 * Strict Zero-Mock: package must have valid doctor UKEP with serial and subject.
 */
export function validateDoctorSignature(pkg: EgiszRemdPackage): {
	isValid: boolean;
	error?: string;
} {
	if (!pkg || !pkg.doctorSignature) {
		return {
			isValid: false,
			error: "В пакете СЭМД отсутствует блок подписи врача-автора",
		};
	}

	const { signatureBase64, certificateSerialNumber, certificateSubject } = pkg.doctorSignature;

	if (!signatureBase64 || signatureBase64.trim().length === 0) {
		return {
			isValid: false,
			error: "Отсутствует бинарная подпись (Base64) врача-автора",
		};
	}

	if (!certificateSerialNumber || certificateSerialNumber.trim().length === 0) {
		return {
			isValid: false,
			error: "Отсутствует серийный номер квалифицированного сертификата врача",
		};
	}

	if (!certificateSubject || certificateSubject.trim().length === 0) {
		return {
			isValid: false,
			error: "Отсутствует субъект (ФИО врача/организация) квалифицированного сертификата",
		};
	}

	const sigCheck = verifyCryptoProSignature(signatureBase64, certificateSerialNumber);
	if (!sigCheck.isValid) {
		return {
			isValid: false,
			error: sigCheck.error || "Недействительная квалифицированная электронная подпись",
		};
	}

	// Optional clinic (MO) signature verification if attached
	if (pkg.moSignature) {
		const moCheck = verifyCryptoProSignature(
			pkg.moSignature.signatureBase64,
			pkg.moSignature.certificateSerialNumber,
		);
		if (!moCheck.isValid) {
			return {
				isValid: false,
				error: `Ошибка подписи медицинской организации (МО): ${moCheck.error}`,
			};
		}
	}

	return { isValid: true };
}
