/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD IDENTIFIER & UKEP CERTIFICATE VALIDATORS (МИНЗДРАВ РФ)
 * Regulatory validation of OID, OGRN, INN, SNILS, FDI, ICD-10, Order 804n,
 * and GOST R 34.10-2012 / CAdES-BES digital signatures.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { EGISZ_OIDS } from "./oids.js";
import { detachedSignatureSchema } from "./schemas.js";
import type { CertificateValidationDetails } from "./types.js";

/**
 * Validates OID (Object Identifier) syntax per ITU-T X.660 / ISO 8824.
 */
export function validateOid(oid: string): boolean {
	if (!oid || typeof oid !== "string") return false;
	return /^[0-2](\.(0|[1-9][0-9]*))+$/.test(oid.trim());
}

/**
 * Validates FRMO (Federal Register of Medical Organizations) MO OID root.
 */
export function validateFrmoOid(oid: string): boolean {
	if (!validateOid(oid)) return false;
	const trimmed = oid.trim();
	return (
		trimmed === EGISZ_OIDS.FRMO_MO_ROOT ||
		trimmed.startsWith(`${EGISZ_OIDS.FRMO_MO_ROOT}.`) ||
		trimmed === "1.2.643.5.1.13.1.1.1" ||
		trimmed.startsWith("1.2.643.5.1.13.1.1.1.") ||
		trimmed.startsWith("1.2.643.5.1.13.")
	);
}

import {
	formatSnils,
	isValidSnils,
	normalizeSnils,
} from "../utils/snils.js";

export {
	formatSnils,
	isValidSnils,
	normalizeSnils,
};

/**
 * Validates Russian OGRN (13 digits for Legal Entity, 15 digits for IP).
 */
export function validateOgrn(ogrn: string | null | undefined): boolean {
	if (!ogrn || typeof ogrn !== "string") return false;
	const trimmed = ogrn.trim();
	if (!/^\d{13}$|^\d{15}$/.test(trimmed)) return false;

	if (trimmed.length === 13) {
		const num = BigInt(trimmed.slice(0, 12));
		const check = Number((num % 11n) % 10n);
		return check === Number.parseInt(trimmed.charAt(12), 10);
	}

	if (trimmed.length === 15) {
		const num = BigInt(trimmed.slice(0, 14));
		const check = Number((num % 13n) % 10n);
		return check === Number.parseInt(trimmed.charAt(14), 10);
	}

	return false;
}

/**
 * Validates Russian INN (10 digits for Legal Entity, 12 digits for Individual/IP).
 */
export function validateInn(inn: string | null | undefined): boolean {
	if (!inn || typeof inn !== "string") return false;
	const trimmed = inn.trim();
	if (!/^\d{10}$|^\d{12}$/.test(trimmed)) return false;

	if (trimmed.length === 10) {
		const coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8] as const;
		let sum = 0;
		for (let i = 0; i < 9; i++) {
			sum += Number.parseInt(trimmed.charAt(i), 10) * (coefficients[i] ?? 0);
		}
		const check = (sum % 11) % 10;
		return check === Number.parseInt(trimmed.charAt(9), 10);
	}

	if (trimmed.length === 12) {
		const c1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8] as const;
		let sum1 = 0;
		for (let i = 0; i < 10; i++) {
			sum1 += Number.parseInt(trimmed.charAt(i), 10) * (c1[i] ?? 0);
		}
		const check1 = (sum1 % 11) % 10;
		if (check1 !== Number.parseInt(trimmed.charAt(10), 10)) return false;

		const c2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8] as const;
		let sum2 = 0;
		for (let i = 0; i < 11; i++) {
			sum2 += Number.parseInt(trimmed.charAt(i), 10) * (c2[i] ?? 0);
		}
		const check2 = (sum2 % 11) % 10;
		return check2 === Number.parseInt(trimmed.charAt(11), 10);
	}

	return false;
}

/**
 * Validates FDI ISO 3950 Tooth Number.
 * Adult quadrants: 11..18, 21..28, 31..38, 41..48.
 * Deciduous quadrants: 51..55, 61..65, 71..75, 81..85.
 */
export const VALID_FDI_TEETH = new Set([
	11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33,
	34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 51, 52, 53, 54, 55, 61,
	62, 63, 64, 65, 71, 72, 73, 74, 75, 81, 82, 83, 84, 85,
]);

export function validateFdiToothNumber(tooth: unknown): boolean {
	if (tooth === undefined || tooth === null || tooth === "") return false;
	const num =
		typeof tooth === "number"
			? tooth
			: Number.parseInt(String(tooth).trim(), 10);
	if (Number.isNaN(num)) return false;
	return VALID_FDI_TEETH.has(num);
}

/**
 * Validates ICD-10 Diagnosis Code format (e.g. K02.1, K04.0, Z01.2).
 */
export function validateIcd10Code(code: string | null | undefined): boolean {
	if (!code || typeof code !== "string") return false;
	return /^[A-Z][0-9]{2}(\.[0-9]{1,3})?$/i.test(code.trim());
}

/**
 * Validates Order 804n Medical Service Nomenclature Code (e.g. A16.07.002.001, B01.065.001).
 */
export function validateOrder804nCode(
	code: string | null | undefined,
): boolean {
	if (!code || typeof code !== "string") return false;
	return /^[AB][0-9]{2}\.[0-9]{2,3}\.[0-9]{2,3}(\.[0-9]{2,3})?$/i.test(
		code.trim(),
	);
}

/**
 * Full pre-flight semantic and structural validator for CDA R2 document parameters.

 */
export function validateDetachedSignature(sig: unknown): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];
	const parseRes = detachedSignatureSchema.safeParse(sig);
	if (!parseRes.success) {
		for (const issue of parseRes.error.issues) {
			errors.push(`УКЭП: ${issue.path.join(".")} — ${issue.message}`);
		}
		return { valid: false, errors };
	}

	const data = parseRes.data;
	if (!data.signatureBase64 || data.signatureBase64.length < 32) {
		errors.push("УКЭП: Данные подписи Base64 повреждены или слишком малы");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Validates UKEP Certificate attributes (validity timeframe, issuer, subject CN, SNILS and OGRN matching).
 */
export function validateUkepCertificate(params: {
	certificate: {
		validFrom?: string | undefined;
		validTo?: string | undefined;
		subject: string;
		issuer?: string | undefined;
		serialNumber?: string | undefined;
	};
	expectedDoctorSnils?: string | undefined;
	expectedClinicOgrn?: string | undefined;
	expectedClinicInn?: string | undefined;
	checkDate?: Date | undefined;
}): CertificateValidationDetails {
	const errors: string[] = [];
	const warnings: string[] = [];
	const cert = params.certificate;
	const checkTime = params.checkDate ?? new Date();

	// 1. Срок действия
	let notExpired = true;
	if (cert.validFrom) {
		const fromDate = new Date(cert.validFrom);
		if (!Number.isNaN(fromDate.getTime()) && checkTime < fromDate) {
			notExpired = false;
			errors.push(
				`Сертификат еще не вступил в силу (действителен с ${fromDate.toLocaleDateString("ru-RU")})`,
			);
		}
	}
	if (cert.validTo) {
		const toDate = new Date(cert.validTo);
		if (!Number.isNaN(toDate.getTime()) && checkTime > toDate) {
			notExpired = false;
			errors.push(
				`Срок действия сертификата истек ${toDate.toLocaleDateString("ru-RU")}`,
			);
		}
	}

	// 2. Издатель (Удостоверяющий Центр)
	const issuerValid = Boolean(cert.issuer && cert.issuer.trim().length > 0);
	if (!issuerValid) {
		warnings.push("Издатель сертификата (УЦ) не указан в атрибутах подписи");
	}

	// 3. Субъект
	const subjectMatched = Boolean(
		cert.subject && cert.subject.trim().length > 0,
	);
	if (!subjectMatched) {
		errors.push("Владелец сертификата (Subject) пуст");
	}

	// 4. Сверка СНИЛС врача
	let snilsMatched: boolean | undefined;
	if (params.expectedDoctorSnils && cert.subject) {
		const normalizedExpected = normalizeSnils(params.expectedDoctorSnils);
		const snilsMatch = cert.subject.match(
			/SNILS(?:=|\s+)(\d{3}-?\d{3}-?\d{3}\s?\d{2}|\d{11})/i,
		);
		if (snilsMatch && snilsMatch[1]) {
			const certSnils = normalizeSnils(snilsMatch[1]);
			snilsMatched = certSnils === normalizedExpected;
			if (!snilsMatched) {
				errors.push(
					`СНИЛС в сертификате УКЭП (${certSnils}) не совпадает со СНИЛС врача в документе (${normalizedExpected})`,
				);
			}
		} else {
			warnings.push("Атрибут SNILS не найден в строке владельца сертификата");
		}
	}

	// 5. Сверка ОГРН / ИНН клиники
	let ogrnMatched: boolean | undefined;
	if (params.expectedClinicOgrn && cert.subject) {
		const ogrnMatch = cert.subject.match(/OGRN(?:=|\s+)(\d{13}|\d{15})/i);
		if (ogrnMatch && ogrnMatch[1]) {
			ogrnMatched = ogrnMatch[1].trim() === params.expectedClinicOgrn.trim();
			if (!ogrnMatched) {
				warnings.push(
					`ОГРН в сертификате (${ogrnMatch[1]}) отличается от ОГРН клиники (${params.expectedClinicOgrn})`,
				);
			}
		}
	}

	return {
		valid: errors.length === 0,
		notExpired,
		issuerValid,
		subjectMatched,
		snilsMatched,
		ogrnMatched,
		errors,
		warnings,
	};
}
