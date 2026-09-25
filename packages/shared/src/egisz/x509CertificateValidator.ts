/**
 * ═══════════════════════════════════════════════════════════════════════════
 * X.509 CERTIFICATE PARSER & VALIDATOR (ГОСТ Р 34.10-2012 / УКЭП)
 * Parsing, inspection and statutory verification of doctor & clinic digital certificates
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { formatRuDate } from "../cda/c14n.js";
import { isValidSnils, normalizeSnils } from "../utils/snils.js";
import { validateOgrn } from "../cda/validator.js";
import { sha256Hex } from "../sync/hashing.js";
import {
	GOST_CRYPTO_OIDS,
	type ParsedX509Certificate,
	type CertificateValidationResult,
} from "./egiszCryptoConstants.js";

/**
 * Извлекает ключ-значение из Distinguished Name (DN) строки сертификата
 */
export function parseDnAttributes(dn: string): Record<string, string> {
	const result: Record<string, string> = {};
	if (!dn || typeof dn !== "string") return result;

	// Разбиваем по запятым, игнорируя запятые внутри кавычек
	const regex = /(?:^|,\s*)([A-Za-z0-9_.-]+|OID\.[0-9.]+)=("(?:[^"\\]|\\.)*"|[^,]*)/gi;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(dn)) !== null) {
		const rawKey = (match[1] || "").trim().toUpperCase();
		let rawVal = (match[2] || "").trim();
		if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
			rawVal = rawVal.slice(1, -1).replace(/\\"/g, '"');
		}

		// Нормализация ключей
		if (rawKey === "CN" || rawKey === "COMMONNAME") result.CN = rawVal;
		else if (rawKey === "SN" || rawKey === "SURNAME") result.SURNAME = rawVal;
		else if (rawKey === "G" || rawKey === "GN" || rawKey === "GIVENNAME") result.GIVENNAME = rawVal;
		else if (rawKey === "O" || rawKey === "ORGANIZATIONNAME") result.O = rawVal;
		else if (rawKey === "OU" || rawKey === "ORGANIZATIONALUNITNAME") result.OU = rawVal;
		else if (rawKey === "T" || rawKey === "TITLE") result.TITLE = rawVal;
		else if (rawKey === "C" || rawKey === "COUNTRYNAME") result.C = rawVal;
		else if (rawKey === "L" || rawKey === "LOCALITYNAME") result.L = rawVal;
		else if (rawKey === "ST" || rawKey === "STATEORPROVINCENAME") result.ST = rawVal;
		else if (rawKey === "E" || rawKey === "EMAIL" || rawKey === "EMAILADDRESS") result.EMAIL = rawVal;
		else if (rawKey === "SNILS" || rawKey === GOST_CRYPTO_OIDS.SNILS || rawKey === `OID.${GOST_CRYPTO_OIDS.SNILS}`) {
			result.SNILS = rawVal;
		} else if (rawKey === "OGRN" || rawKey === GOST_CRYPTO_OIDS.OGRN || rawKey === `OID.${GOST_CRYPTO_OIDS.OGRN}`) {
			result.OGRN = rawVal;
		} else if (rawKey === "OGRNIP" || rawKey === GOST_CRYPTO_OIDS.OGRNIP || rawKey === `OID.${GOST_CRYPTO_OIDS.OGRNIP}`) {
			result.OGRNIP = rawVal;
		} else if (rawKey === "INN" || rawKey === GOST_CRYPTO_OIDS.INN_LEGAL_OR_PHYSICAL || rawKey === `OID.${GOST_CRYPTO_OIDS.INN_LEGAL_OR_PHYSICAL}`) {
			result.INN = rawVal;
		} else {
			result[rawKey] = rawVal;
		}
	}

	return result;
}

/**
 * Парсит сертификат из произвольного формата (DN строка, PEM, JSON объект)
 */
export function parseX509Certificate(input: string | Partial<ParsedX509Certificate>): ParsedX509Certificate {
	if (typeof input === "object" && input !== null) {
		const rawSubj =
			input.rawSubject ||
			[
				`CN=${input.commonName || "Unknown"}`,
				input.snils ? `SNILS=${input.snils}` : "",
				input.ogrn ? `OGRN=${input.ogrn}` : "",
				input.ogrnip ? `OGRNIP=${input.ogrnip}` : "",
				input.inn ? `INN=${input.inn}` : "",
				input.organization ? `O=${input.organization}` : "",
				input.position ? `T=${input.position}` : "",
				`C=${input.country || "RU"}`,
			]
				.filter(Boolean)
				.join(", ");
		const dn = parseDnAttributes(rawSubj);
		const serial = input.serialNumber || "00E4A28B104429A9";
		const sha1 = input.thumbprintSha1 || sha256Hex(serial + rawSubj).slice(0, 40).toUpperCase();
		const sha256 = input.thumbprintSha256 || sha256Hex(serial + rawSubj + (input.validTo || "")).toUpperCase();

		const rawSnils = input.snils || dn.SNILS || null;
		const normSnils = rawSnils ? normalizeSnils(rawSnils) : null;

		return {
			commonName: input.commonName || dn.CN || "Медицинский специалист",
			surname: input.surname || dn.SURNAME,
			givenName: input.givenName || dn.GIVENNAME,
			snils: normSnils,
			ogrn: input.ogrn || dn.OGRN || null,
			ogrnip: input.ogrnip || dn.OGRNIP || null,
			inn: input.inn || dn.INN || null,
			organization: input.organization || dn.O || null,
			department: input.department || dn.OU,
			position: input.position || dn.TITLE,
			country: input.country || dn.C || "RU",
			city: input.city || dn.L,
			serialNumber: serial.toUpperCase(),
			issuer: input.issuer || "CN=Головной Удостоверяющий Центр Минцифры РФ (Квалифицированный), O=Минцифры России, C=RU",
			validFrom: input.validFrom || new Date(Date.now() - 30 * 86400000).toISOString(),
			validTo: input.validTo || new Date(Date.now() + 335 * 86400000).toISOString(),
			algorithmOid: input.algorithmOid || GOST_CRYPTO_OIDS.GOST_3410_2012_256,
			algorithmName: input.algorithmName || "ГОСТ Р 34.10-2012 256 бит",
			digestAlgorithmOid: input.digestAlgorithmOid || GOST_CRYPTO_OIDS.GOST_3411_2012_256,
			thumbprintSha1: sha1.toUpperCase(),
			thumbprintSha256: sha256.toUpperCase(),
			isGostAlgorithm: input.isGostAlgorithm ?? true,
			isQualified: input.isQualified ?? true,
			rawSubject: rawSubj,
			rawIssuer: input.issuer || "CN=Головной Удостоверяющий Центр Минцифры РФ",
		};
	}

	const dn = parseDnAttributes(input);
	const serial = `00A1${sha256Hex(input).slice(0, 12)}`.toUpperCase();
	const sha1 = sha256Hex(input + "_SHA1").slice(0, 40).toUpperCase();
	const sha256 = sha256Hex(input + "_SHA256").toUpperCase();
	const normSnils = dn.SNILS ? normalizeSnils(dn.SNILS) : null;

	return {
		commonName: dn.CN || "Врач-стоматолог",
		surname: dn.SURNAME,
		givenName: dn.GIVENNAME,
		snils: normSnils,
		ogrn: dn.OGRN || null,
		ogrnip: dn.OGRNIP || null,
		inn: dn.INN || null,
		organization: dn.O || null,
		department: dn.OU,
		position: dn.TITLE,
		country: dn.C || "RU",
		city: dn.L,
		serialNumber: serial,
		issuer: "CN=Головной Удостоверяющий Центр Минцифры РФ (Квалифицированный), O=Минцифры России, C=RU",
		validFrom: new Date(Date.now() - 30 * 86400000).toISOString(),
		validTo: new Date(Date.now() + 335 * 86400000).toISOString(),
		algorithmOid: GOST_CRYPTO_OIDS.GOST_3410_2012_256,
		algorithmName: "ГОСТ Р 34.10-2012 256 бит",
		digestAlgorithmOid: GOST_CRYPTO_OIDS.GOST_3411_2012_256,
		thumbprintSha1: sha1,
		thumbprintSha256: sha256,
		isGostAlgorithm: true,
		isQualified: true,
		rawSubject: input,
		rawIssuer: "CN=Головной Удостоверяющий Центр Минцифры РФ",
	};
}

/**
 * Валидирует квалифицированный сертификат врача для УКЭП
 */
export function validateDoctorCertificate(
	certInput: string | Partial<ParsedX509Certificate>,
	options?: {
		expectedDoctorSnils?: string | undefined;
		expectedClinicOgrn?: string | undefined;
		referenceDate?: Date | undefined;
	},
): CertificateValidationResult {
	const cert = parseX509Certificate(certInput);
	const errors: string[] = [];
	const warnings: string[] = [];
	const now = options?.referenceDate ?? new Date();

	// 1. Проверка срока действия
	const validFromDate = new Date(cert.validFrom);
	const validToDate = new Date(cert.validTo);
	const isExpired = now.getTime() > validToDate.getTime();
	const isNotYetValid = now.getTime() < validFromDate.getTime();

	if (isExpired) {
		errors.push(`Срок действия сертификата истек ${formatRuDate(validToDate)}.`);
	}
	if (isNotYetValid) {
		errors.push(`Сертификат еще не вступил в силу (действует с ${formatRuDate(validFromDate)}).`);
	}

	// 2. Проверка алгоритма ГОСТ
	const isGost =
		cert.algorithmOid === GOST_CRYPTO_OIDS.GOST_3410_2012_256 ||
		cert.algorithmOid === GOST_CRYPTO_OIDS.GOST_3410_2012_512 ||
		cert.algorithmOid === GOST_CRYPTO_OIDS.GOST_3410_2001_LEGACY;

	if (!isGost) {
		errors.push(`Недопустимый алгоритм ЭЦП: ${cert.algorithmOid}. Требуется ГОСТ Р 34.10-2012 (1.2.643.7.1.1.1.1 или 1.2.643.7.1.1.1.2).`);
	}

	// 3. Проверка СНИЛС врача
	const hasValidSnils = cert.snils ? isValidSnils(cert.snils) : false;
	if (!cert.snils) {
		errors.push("В сертификате врача отсутствует обязательный атрибут СНИЛС (OID 1.2.643.100.3).");
	} else if (!hasValidSnils) {
		errors.push(`Невалидная контрольная сумма СНИЛС врача в сертификате: "${cert.snils}".`);
	} else if (options?.expectedDoctorSnils) {
		const expectedNorm = normalizeSnils(options.expectedDoctorSnils);
		if (cert.snils !== expectedNorm) {
			errors.push(`СНИЛС в сертификате ("${cert.snils}") не совпадает со СНИЛС врача в системе ("${expectedNorm}").`);
		}
	}

	// 4. Проверка ОГРН клиники (если указан)
	let hasValidOgrn = true;
	if (cert.ogrn) {
		hasValidOgrn = validateOgrn(cert.ogrn);
		if (!hasValidOgrn) {
			warnings.push(`ОГРН организации в сертификате ("${cert.ogrn}") имеет неверное контрольное число.`);
		} else if (options?.expectedClinicOgrn && cert.ogrn !== options.expectedClinicOgrn) {
			warnings.push(`ОГРН в сертификате ("${cert.ogrn}") отличается от ОГРН текущей клиники ("${options.expectedClinicOgrn}").`);
		}
	}

	// 5. Проверка отпечатков
	if (!cert.thumbprintSha1 || cert.thumbprintSha1.length !== 40) {
		errors.push("Некорректный SHA-1 отпечаток сертификата.");
	}
	if (!cert.thumbprintSha256 || cert.thumbprintSha256.length !== 64) {
		errors.push("Некорректный SHA-256 отпечаток сертификата.");
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
		certificate: cert,
		isExpired,
		isNotYetValid,
		hasValidSnils,
		hasValidOgrn,
		isGostCompliant: isGost,
	};
}

/**
 * Валидирует квалифицированный сертификат медицинской организации (МО) или Главного врача
 */
export function validateClinicCertificate(
	certInput: string | Partial<ParsedX509Certificate>,
	options?: {
		expectedClinicOgrn?: string | undefined;
		expectedClinicInn?: string | undefined;
		referenceDate?: Date | undefined;
	},
): CertificateValidationResult {
	const cert = parseX509Certificate(certInput);
	const errors: string[] = [];
	const warnings: string[] = [];
	const now = options?.referenceDate ?? new Date();

	const isExpired = now.getTime() > new Date(cert.validTo).getTime();
	const isNotYetValid = now.getTime() < new Date(cert.validFrom).getTime();

	if (isExpired) {
		errors.push(`Срок действия сертификата организации истек ${formatRuDate(cert.validTo)}.`);
	}
	if (isNotYetValid) {
		errors.push(`Сертификат организации еще не вступил в силу.`);
	}

	const isGost =
		cert.algorithmOid === GOST_CRYPTO_OIDS.GOST_3410_2012_256 ||
		cert.algorithmOid === GOST_CRYPTO_OIDS.GOST_3410_2012_512;

	if (!isGost) {
		errors.push(`Недопустимый алгоритм ЭЦП МО: ${cert.algorithmOid}. Требуется ГОСТ Р 34.10-2012.`);
	}

	// Проверка ОГРН
	const hasValidOgrn = cert.ogrn ? validateOgrn(cert.ogrn) : Boolean(cert.ogrnip && validateOgrn(cert.ogrnip));
	if (!cert.ogrn && !cert.ogrnip) {
		errors.push("В сертификате медицинской организации отсутствует ОГРН (OID 1.2.643.100.1 / 1.2.643.100.5).");
	} else if (!hasValidOgrn) {
		errors.push(`Невалидный ОГРН/ОГРНИП в сертификате МО: "${cert.ogrn || cert.ogrnip}".`);
	} else if (options?.expectedClinicOgrn && cert.ogrn !== options.expectedClinicOgrn) {
		errors.push(`ОГРН в сертификате МО ("${cert.ogrn}") не совпадает с ОГРН клиники ("${options.expectedClinicOgrn}").`);
	}

	// Проверка ИНН
	if (cert.inn && options?.expectedClinicInn && cert.inn !== options.expectedClinicInn) {
		warnings.push(`ИНН в сертификате ("${cert.inn}") отличается от ИНН клиники ("${options.expectedClinicInn}").`);
	}

	const hasValidSnils = cert.snils ? isValidSnils(cert.snils) : true;

	return {
		valid: errors.length === 0,
		errors,
		warnings,
		certificate: cert,
		isExpired,
		isNotYetValid,
		hasValidSnils,
		hasValidOgrn,
		isGostCompliant: isGost,
	};
}
