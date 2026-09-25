/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CADESCOM / CAPICOM CONSTANTS & CRYPTOGRAPHIC OIDS (ГОСТ Р 34.10-2012 / CMS)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { EGISZ_OIDS } from "../cda/oids.js";

// ─── CAdESCOM / CAPICOM Constants ──────────────────────────────────────────

export const CADES_CONSTANTS = {
	CADESCOM_CADES_BES: 1,
	CADESCOM_CADES_DEFAULT: 0,
	CADESCOM_CADES_X_LONG_TYPE_1: 0x5d,
	CADESCOM_BASE64_TO_BINARY: 0x01,
	CADESCOM_STRING_TO_UCS2LE: 0x00,
	CADESCOM_CONTAINER_STORE: 100,
	CAPICOM_MY_STORE: "My",
	CAPICOM_STORE_OPEN_READ_ONLY: 0,
	CAPICOM_CERTIFICATE_FIND_SHA1_HASH: 0,
	CAPICOM_CERTIFICATE_FIND_TIME_VALID: 9,
	CAPICOM_CERTIFICATE_FIND_EXTENDED_PROPERTY: 6,
	CAPICOM_PROPID_KEY_PROV_INFO: 2,
} as const;

// ─── Cryptographic OIDs (ГОСТ Р 34.10-2012 / 34.11-2012 / CMS) ────────────

export const CADES_GOST_CRYPTO_OIDS = {
	/** CMS SignedData ContentType */
	CMS_SIGNED_DATA: "1.2.840.113549.1.7.2",
	/** CMS Data ContentType */
	CMS_DATA: "1.2.840.113549.1.7.1",

	/** ГОСТ Р 34.10-2012 256 бит (ЭЦП) */
	GOST_3410_2012_256: EGISZ_OIDS.GOST_3410_2012_256,
	/** ГОСТ Р 34.10-2012 512 бит (ЭЦП) */
	GOST_3410_2012_512: EGISZ_OIDS.GOST_3410_2012_512,

	/** ГОСТ Р 34.11-2012 256 бит (хэширование «Стрибог») */
	GOST_3411_2012_256: EGISZ_OIDS.GOST_3411_2012_256,
	/** ГОСТ Р 34.11-2012 512 бит (хэширование «Стрибог») */
	GOST_3411_2012_512: EGISZ_OIDS.GOST_3411_2012_512,

	/** Legacy ГОСТ Р 34.10-2001 (ЭЦП) */
	GOST_3410_2001: "1.2.643.2.2.19",
	/** Legacy ГОСТ Р 34.11-94 (хэш) */
	GOST_3411_94: "1.2.643.2.2.9",

	/** OID сертификата медицинского работника (ЕГИСЗ Минздрав РФ) */
	EGISZ_MEDICAL_WORKER: "1.2.643.5.1.13.13.1.1",
	/** OID сертификата главной медицинской организации (ЕГИСЗ Минздрав РФ) */
	EGISZ_HEALTHCARE_ORG: "1.2.643.5.1.13.13.1.2",
} as const;

export const GOST_CRYPTO_OIDS = CADES_GOST_CRYPTO_OIDS;
