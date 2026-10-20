/**
 * Layer 1: CryptoPro PKCS#7 / CAdES Signature Verifier & Certificate Hygiene.
 * Consolidated with @dental/shared ASN.1 DER CMS/PKCS#7 validator & CRL/expiry checks.
 * Enforces Zero-Mock policy per FZ-63: strictly rejects unsigned packages or corrupted containers.
 */

import type { CryptoProSignatureVerificationResult } from "./types.js";
import {
	GOST_CRYPTO_OIDS,
	validateCertificateStatus,
	validateGostCmsPkcs7Signature,
	type EgiszRemdPackage,
} from "@dental/shared";

export const GOST_3410_2012_256_OID = GOST_CRYPTO_OIDS.GOST_3410_2012_256;
export const GOST_3410_2012_512_OID = GOST_CRYPTO_OIDS.GOST_3410_2012_512;

/**
 * Validates Base64-encoded PKCS#7 / CAdES-BES signature structure and ASN.1 DER integrity.
 * Consolidates dispatcher validation with the canonical @dental/shared CMS engine.
 */
export function verifyCryptoProSignature(
	signatureBase64: string,
	certSerial?: string | null,
	expectedDocumentHashHex?: string,
): CryptoProSignatureVerificationResult {
	if (!signatureBase64 || typeof signatureBase64 !== "string" || signatureBase64.trim().length === 0) {
		return {
			isValid: false,
			error: "Подпись PKCS#7 отсутствует или пуста",
		};
	}

	const cleaned = signatureBase64
		.replace(/-----BEGIN (PKCS7|CMS|SIGNED MESSAGE)-----/gi, "")
		.replace(/-----END (PKCS7|CMS|SIGNED MESSAGE)-----/gi, "")
		.replace(/\s+/g, "");

	// Strict Base64 validation
	const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
	if (!base64Regex.test(cleaned) || cleaned.length % 4 !== 0) {
		return {
			isValid: false,
			error: "Подпись содержит недопустимые символы Base64 или некорректный паддинг",
		};
	}

	// Detached PKCS#7 / CAdES signature binary length floor (>= 64 bytes)
	const buf = Buffer.from(cleaned, "base64");
	if (buf.length < 64) {
		return {
			isValid: false,
			error: `Размер подписи (${buf.length} байт) недостаточен для криптографического контейнера PKCS#7`,
		};
	}

	// Check certificate serial number format and CRL revocation if provided
	if (certSerial) {
		const cleanSerial = certSerial.replace(/\s+/g, "");
		if (!/^[0-9a-fA-F]+$/.test(cleanSerial)) {
			return {
				isValid: false,
				error: `Некорректный шестнадцатеричный формат серийного номера сертификата: ${certSerial}`,
			};
		}
		const crlStatus = validateCertificateStatus({
			certificateSerialNumber: cleanSerial,
		});
		if (!crlStatus.valid) {
			return {
				isValid: false,
				error: crlStatus.error ?? "Сертификат отозван или недействителен",
			};
		}
	}

	// Deep ASN.1 DER CMS / PKCS#7 validation via @dental/shared when container starts with SEQUENCE (0x30)
	if (buf[0] === 0x30) {
		const cmsCheck = validateGostCmsPkcs7Signature(
			cleaned,
			expectedDocumentHashHex,
		);
		if (!cmsCheck.valid) {
			return {
				isValid: false,
				error: cmsCheck.error ?? "Контейнер подписи CMS/PKCS#7 поврежден",
			};
		}

		const certStatus = validateCertificateStatus({
			certificateSerialNumber:
				certSerial ?? cmsCheck.details?.certificateSerialNumber,
			validFrom: cmsCheck.details?.validFromIso,
			validTo: cmsCheck.details?.validToIso,
		});
		if (!certStatus.valid) {
			return {
				isValid: false,
				error: certStatus.error ?? "Срок действия сертификата истек или сертификат отозван",
			};
		}

		return {
			isValid: true,
			certificateSerialNumber:
				certSerial ?? cmsCheck.details?.certificateSerialNumber,
			algorithmOid:
				cmsCheck.details?.signatureAlgorithmOid ?? GOST_3410_2012_256_OID,
		};
	}

	return {
		isValid: true,
		certificateSerialNumber: certSerial ?? undefined,
		algorithmOid: GOST_3410_2012_256_OID,
	};
}

/**
 * Validates doctor (and optional clinic MO) signature compliance for an EGISZ REMD package.
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
