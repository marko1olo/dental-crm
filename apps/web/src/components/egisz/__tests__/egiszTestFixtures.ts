/**
 * egiszTestFixtures.ts
 *
 * Тестовые фикстуры и генераторы подписей ГОСТ Р 34.10-2012 для unit-тестов ЕГИСЗ РЭМД.
 * Вынесены из боевого модуля egiszRemdEngine.ts (Мандаты 8k, 8s: Zero Mocks в продакшене).
 */

import type { GostSignatureInfo } from "../egiszRemdEngine.js";
import { EGISZ_REMD_OIDS } from "../egiszRemdEngine.js";

export function createMockGostSignature(
	doctorName: string,
	doctorSnils: string,
	clinicName: string
): GostSignatureInfo {
	const cleanSnils = doctorSnils.replace(/\D/g, "").padEnd(11, "0");
	const serialHex = `00E4A28B${cleanSnils.slice(0, 8).toUpperCase()}`;

	const mockBytes = `UKEP_GOST3410_2012_DOC_${cleanSnils}_FIXTURE`;
	const signatureBase64 =
		typeof btoa === "function"
			? btoa(mockBytes)
			: Buffer.from(mockBytes).toString("base64");

	const validFrom = "2026-01-01T00:00:00.000Z";
	const validTo = "2027-12-31T23:59:59.000Z";

	return {
		signatureBase64,
		certificateSerialNumber: serialHex,
		certificateSubject: `CN=${doctorName}, SNILS=${doctorSnils}, O=${clinicName}, C=RU`,
		certificateIssuer:
			"CN=Головной Удостоверяющий Центр Минцифры РФ (Квалифицированный), O=Минцифры России, C=RU",
		validFrom,
		validTo,
		signedAt: "2026-01-01T12:00:00.000Z",
		algorithmOid: EGISZ_REMD_OIDS.GOST_3410_2012_256,
		digestAlgorithmOid: EGISZ_REMD_OIDS.GOST_3411_2012_256,
		signatureValueHex: `A1B2C3D4E5F60718293A4B5C6D7E8F90${cleanSnils.padEnd(32, "0").slice(0, 32)}`.toUpperCase(),
	};
}

export function createMockMoGostSignature(
	clinicName: string,
	clinicOgrn: string
): GostSignatureInfo {
	const cleanOgrn = clinicOgrn.replace(/\D/g, "").padEnd(13, "0");
	const serialHex = `00B17F9A${cleanOgrn.slice(0, 8).toUpperCase()}`;

	const mockBytes = `UKEP_MO_GOST3410_2012_ORG_${cleanOgrn}_FIXTURE`;
	const signatureBase64 =
		typeof btoa === "function"
			? btoa(mockBytes)
			: Buffer.from(mockBytes).toString("base64");

	const validFrom = "2026-01-01T00:00:00.000Z";
	const validTo = "2027-12-31T23:59:59.000Z";

	return {
		signatureBase64,
		certificateSerialNumber: serialHex,
		certificateSubject: `O=${clinicName}, OGRN=${clinicOgrn}, C=RU`,
		certificateIssuer:
			"CN=УЦ ФНС России (Квалифицированный для юридических лиц), O=Федеральная налоговая служба, C=RU",
		validFrom,
		validTo,
		signedAt: "2026-01-01T12:00:00.000Z",
		algorithmOid: EGISZ_REMD_OIDS.GOST_3410_2012_256,
		digestAlgorithmOid: EGISZ_REMD_OIDS.GOST_3411_2012_256,
		signatureValueHex: `B2C3D4E5F60718293A4B5C6D7E8F90A1${cleanOgrn.padEnd(32, "0").slice(0, 32)}`.toUpperCase(),
	};
}
