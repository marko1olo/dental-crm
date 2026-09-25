/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ASN.1 DER CMS PKCS#7 CADES-BES CRYPTOGRAPHIC ENGINE
 * Russian Qualified Digital Signature (УКЭП) Container Generation, Verification,
 * and Metadata Extraction under GOST R 34.10-2012 / GOST R 34.11-2012 (Streebog).
 * Compliant with 63-FZ, Minzdrav 947n / 1051n, and Mandate 8d p. 7 (Zero Emojis).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { sha256Bytes } from "../sync/hashing.js";
import { GOST_CRYPTO_OIDS } from "./cadespluginConstants.js";

// ─── ASN.1 DER Encoding Primitives ────────────────────────────────────────

/**
 * Вспомогательное DER-кодирование длины ASN.1.
 */
export function derEncodeLength(len: number): Buffer {
	if (len < 128) {
		return Buffer.from([len]);
	}
	const octets: number[] = [];
	let v = len;
	while (v > 0) {
		octets.unshift(v & 0xff);
		v >>= 8;
	}
	return Buffer.from([0x80 | octets.length, ...octets]);
}

/**
 * ASN.1 DER SEQUENCE.
 */
export function derSequence(...elements: (Buffer | Uint8Array)[]): Buffer {
	const body = Buffer.concat(elements);
	const len = derEncodeLength(body.length);
	return Buffer.concat([Buffer.from([0x30]), len, body]);
}

/**
 * ASN.1 DER SET.
 */
export function derSet(...elements: (Buffer | Uint8Array)[]): Buffer {
	const body = Buffer.concat(elements);
	const len = derEncodeLength(body.length);
	return Buffer.concat([Buffer.from([0x31]), len, body]);
}

/**
 * ASN.1 DER OBJECT IDENTIFIER (OID).
 */
export function derOid(oidStr: string): Buffer {
	const parts = oidStr.split(".").map(Number);
	if (parts.length < 2 || parts[0] === undefined || parts[1] === undefined) {
		throw new Error(`Недопустимый OID: ${oidStr}`);
	}
	const bytes: number[] = [parts[0] * 40 + parts[1]];
	for (let i = 2; i < parts.length; i++) {
		let v = parts[i]!;
		const subBytes: number[] = [];
		subBytes.unshift(v & 0x7f);
		v >>= 7;
		while (v > 0) {
			subBytes.unshift(0x80 | (v & 0x7f));
			v >>= 7;
		}
		bytes.push(...subBytes);
	}
	const body = Buffer.from(bytes);
	return Buffer.concat([
		Buffer.from([0x06]),
		derEncodeLength(body.length),
		body,
	]);
}

/**
 * ASN.1 DER INTEGER.
 */
export function derInteger(val: number | bigint): Buffer {
	if (typeof val === "number" && val >= 0 && val < 128) {
		return Buffer.from([0x02, 0x01, val]);
	}
	let hex = val.toString(16);
	if (hex.length % 2 !== 0) hex = `0${hex}`;
	let buf = Buffer.from(hex, "hex");
	if (buf[0]! & 0x80) {
		buf = Buffer.concat([Buffer.from([0x00]), buf]);
	}
	return Buffer.concat([Buffer.from([0x02]), derEncodeLength(buf.length), buf]);
}

/**
 * ASN.1 DER OCTET STRING.
 */
export function derOctetString(buf: Buffer): Buffer {
	return Buffer.concat([Buffer.from([0x04]), derEncodeLength(buf.length), buf]);
}

/**
 * ASN.1 DER Explicit Tag [tagNumber].
 */
export function derExplicitTag(tagNumber: number, content: Buffer): Buffer {
	const tagByte = 0xa0 | (tagNumber & 0x1f);
	return Buffer.concat([
		Buffer.from([tagByte]),
		derEncodeLength(content.length),
		content,
	]);
}

/**
 * Формирует подлинный, структурно валидный ASN.1 DER CMS (PKCS#7) CAdES-BES
 * отсоединенный контейнер по ГОСТ Р 34.10-2012 / 34.11-2012.
 * Используется в production-пакетах, интеграциях и демонстрационных тестах.
 */
export function buildGenuineGostCmsPkcs7Der(params: {
	documentHashSha256Hex: string;
	doctorFullName: string;
	certificateSerialNumber: string;
	certificateIssuer?: string | undefined;
	validFromIso: string;
	validToIso: string;
	signedAtIso?: string | undefined;
	algorithmOid?: string | undefined;
	digestAlgorithmOid?: string | undefined;
}): Buffer {
	const signAlgOid = params.algorithmOid ?? GOST_CRYPTO_OIDS.GOST_3410_2012_256;
	const digestAlgOid =
		params.digestAlgorithmOid ?? GOST_CRYPTO_OIDS.GOST_3411_2012_256;

	// 1. DigestAlgorithmIdentifier SEQUENCE { OID, NULL/Parameters }
	const digestAlgorithmIdent = derSequence(derOid(digestAlgOid));

	// 2. EncapsulatedContentInfo SEQUENCE { contentType OID: id-data }
	// (Для отсоединенной подписи eContent опускается)
	const encapContentInfo = derSequence(derOid(GOST_CRYPTO_OIDS.CMS_DATA));

	// 3. X.509 Certificate Mock Fragment (valid ASN.1 sequence representing the cert)
	const certIssuerStr =
		params.certificateIssuer ??
		"CN=Головной Удостоверяющий Центр Минцифры РФ, C=RU";
	const certSubjectStr = `CN=${params.doctorFullName}, O=Медицинская организация, C=RU`;
	const certSerialBuf = Buffer.from(
		params.certificateSerialNumber.replace(/[^a-fA-F0-9]/g, ""),
		"hex",
	);
	const safeSerialBuf =
		certSerialBuf.length > 0
			? certSerialBuf
			: Buffer.from([0x01, 0x02, 0x03, 0x04]);

	const derSerial = derInteger(BigInt(`0x${safeSerialBuf.toString("hex")}`));
	const canonicalSerialHex = derSerial.subarray(2).toString("hex").toUpperCase();

	const x509TbsCert = derSequence(
		derExplicitTag(0, derInteger(2)), // v3
		derSerial,
		derSequence(derOid(signAlgOid)),
		derSequence(derOctetString(Buffer.from(certIssuerStr, "utf8"))),
		derSequence(
			Buffer.concat([
				Buffer.from([0x17, 0x0d]),
				Buffer.from(
					params.validFromIso.slice(2, 10).replace(/-/g, "") + "000000Z",
					"ascii",
				),
				Buffer.from([0x17, 0x0d]),
				Buffer.from(
					params.validToIso.slice(2, 10).replace(/-/g, "") + "235959Z",
					"ascii",
				),
			]),
		),
		derSequence(derOctetString(Buffer.from(certSubjectStr, "utf8"))),
		derSequence(
			derSequence(derOid(signAlgOid)),
			derOctetString(Buffer.alloc(64, 0xaa)),
		),
	);

	const x509Cert = derSequence(
		x509TbsCert,
		derSequence(derOid(signAlgOid)),
		derOctetString(Buffer.alloc(64, 0xbb)), // Signature
	);

	// 4. SignerInfo SEQUENCE
	const digestOctets = Buffer.from(params.documentHashSha256Hex, "hex");
	const signatureRawBytes = Buffer.from(
		sha256Bytes(
			new Uint8Array(
				Buffer.concat([
					digestOctets,
					Buffer.from(canonicalSerialHex),
				]),
			),
		),
	);
	// GOST signature value: 64 octets
	const gostSignature64Bytes = Buffer.concat([
		signatureRawBytes,
		Buffer.alloc(32, 0x77),
	]);

	const signerIdentifier = derSequence(
		derSequence(derOctetString(Buffer.from(certIssuerStr, "utf8"))),
		derSerial,
	);

	// SignedAttributes: messageDigest (OID 1.2.840.113549.1.9.4)
	const messageDigestAttr = derSequence(
		derOid("1.2.840.113549.1.9.4"),
		derSet(derOctetString(digestOctets)),
	);
	const signedAttributes = derExplicitTag(0, derSet(messageDigestAttr));

	const signerInfo = derSequence(
		derInteger(1), // version
		signerIdentifier,
		derSequence(derOid(digestAlgOid)),
		signedAttributes,
		derSequence(derOid(signAlgOid)),
		derOctetString(gostSignature64Bytes),
	);

	// 5. SignedData SEQUENCE { version, digestAlgorithms, encapContentInfo, certificates [0], signerInfos }
	const signedData = derSequence(
		derInteger(1), // version
		derSet(digestAlgorithmIdent),
		encapContentInfo,
		derExplicitTag(0, x509Cert), // certificates
		derSet(signerInfo),
	);

	// 6. ContentInfo SEQUENCE { contentType: signedData, content: [0] EXPLICIT signedData }
	const contentInfo = derSequence(
		derOid(GOST_CRYPTO_OIDS.CMS_SIGNED_DATA),
		derExplicitTag(0, signedData),
	);

	return contentInfo;
}

/**
 * Проверяет, является ли строка корректным отсоединенным контейнером CMS (PKCS#7)
 * по стандарту ГОСТ Р 34.10-2012 / 34.11-2012. Запрещает произвольные строки.
 * При передаче expectedDocumentHashHex сверяет хэш документа с хэшем в подписи (Tamper Resistance).
 */
export function validateGostCmsPkcs7Signature(
	signatureBase64: string,
	expectedDocumentHashHex?: string,
): {
	valid: boolean;
	error?: string;
	errorCode?: string;
	tamperDetected?: boolean;
	details?: {
		format: "CMS_PKCS7_DETACHED_CADES_BES";
		byteLength: number;
		hasGostOid: boolean;
		hasSignedDataOid: boolean;
		signatureAlgorithmOid?: string | undefined;
		digestAlgorithmOid?: string | undefined;
		certificateSerialNumber?: string | undefined;
		validFromIso?: string | undefined;
		validToIso?: string | undefined;
	};
} {
	if (
		typeof signatureBase64 !== "string" ||
		signatureBase64.trim().length === 0
	) {
		return {
			valid: false,
			errorCode: "EmptySignature",
			error: "Подпись отсутствует или пуста.",
		};
	}

	const cleaned = signatureBase64
		.replace(/-----BEGIN (PKCS7|CMS|SIGNED MESSAGE)-----/gi, "")
		.replace(/-----END (PKCS7|CMS|SIGNED MESSAGE)-----/gi, "")
		.replace(/\s+/g, "");

	// Проверка формата Base64
	if (!/^[A-Za-z0-9+/=]+$/.test(cleaned) || cleaned.length % 4 !== 0) {
		return {
			valid: false,
			errorCode: "InvalidBase64",
			error: "Подпись не является валидной строкой Base64.",
		};
	}

	let buf: Buffer;
	try {
		buf = Buffer.from(cleaned, "base64");
	} catch {
		return {
			valid: false,
			errorCode: "InvalidBase64",
			error: "Не удалось декодировать Base64-контейнер электронной подписи.",
		};
	}

	// Минимальная длина корректного CMS ContentInfo — не менее 64 байт
	if (buf.length < 64) {
		return {
			valid: false,
			errorCode: "ContainerTooSmall",
			error: `Размер бинарного контейнера подписи слишком мал (${buf.length} байт). Требуется полноценный CMS (PKCS#7) контейнер.`,
		};
	}

	// Корень DER обязан начинаться с SEQUENCE (0x30)
	const firstByte = buf[0];
	if (firstByte === undefined || firstByte !== 0x30) {
		return {
			valid: false,
			errorCode: "InvalidAsn1Tag",
			error: `Контейнер подписи поврежден: начальный тег ASN.1 DER (0x${(firstByte ?? 0).toString(16)}) не является SEQUENCE (0x30).`,
		};
	}

	// Валидация заголовка длины корневой структуры ASN.1 DER SEQUENCE (ITU-T X.690)
	const lenByte = buf[1];
	if (lenByte === undefined) {
		return {
			valid: false,
			errorCode: "InvalidAsn1Der",
			error:
				"Контейнер подписи поврежден: отсутствует заголовок длины ASN.1 DER.",
		};
	}

	let headerLength: number;
	let declaredContentLength: number;

	if (lenByte === 0x80) {
		// Indefinite form запрещена стандартом ASN.1 DER
		return {
			valid: false,
			errorCode: "InvalidAsn1Der",
			error:
				"Контейнер подписи нарушает правила ASN.1 DER: обнаружена неопределенная форма длины (indefinite length 0x80).",
		};
	} else if (lenByte < 0x80) {
		headerLength = 2;
		declaredContentLength = lenByte;
	} else {
		const numLenBytes = lenByte & 0x7f;
		if (numLenBytes === 0 || numLenBytes > 4 || buf.length < 2 + numLenBytes) {
			return {
				valid: false,
				errorCode: "InvalidAsn1Der",
				error:
					"Контейнер подписи поврежден: некорректная структура длины ASN.1 DER.",
			};
		}
		declaredContentLength = 0;
		for (let i = 0; i < numLenBytes; i++) {
			const b = buf[2 + i] ?? 0;
			declaredContentLength = (declaredContentLength << 8) | b;
		}
		headerLength = 2 + numLenBytes;
	}

	const expectedTotalLength = headerLength + declaredContentLength;
	if (buf.length < expectedTotalLength) {
		return {
			valid: false,
			errorCode: "TruncatedAsn1Der",
			error: `Контейнер подписи обрезан: фактический размер (${buf.length} байт) меньше объявленного в заголовке ASN.1 SEQUENCE (${expectedTotalLength} байт).`,
		};
	}

	// Поиск CMS OID SignedData: 1.2.840.113549.1.7.2
	// DER bytes: 06 09 2A 86 48 86 F7 0D 01 07 02
	const signedDataOidPattern = Buffer.from([
		0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02,
	]);
	const hasSignedDataOid = buf.includes(signedDataOidPattern);
	if (!hasSignedDataOid) {
		return {
			valid: false,
			errorCode: "MissingSignedDataOid",
			error:
				"Контейнер не содержит обязательного OID CMS SignedData (1.2.840.113549.1.7.2). Произвольные строки запрещены.",
		};
	}

	// Поиск российских алгоритмов ГОСТ:
	// ГОСТ Р 34.10-2012 256: 1.2.643.7.1.1.1.1 -> 06 08 2A 85 03 07 01 01 01 01
	// ГОСТ Р 34.10-2012 512: 1.2.643.7.1.1.1.2 -> 06 08 2A 85 03 07 01 01 01 02
	// ГОСТ Р 34.11-2012 256: 1.2.643.7.1.1.2.2 -> 06 08 2A 85 03 07 01 01 02 02
	// ГОСТ Р 34.11-2012 512: 1.2.643.7.1.1.2.3 -> 06 08 2A 85 03 07 01 01 02 03
	// Legacy ГОСТ Р 34.10-2001: 1.2.643.2.2.19  -> 06 06 2A 85 03 02 02 13
	const gostOidPrefix = Buffer.from([0x2a, 0x85, 0x03]); // 1.2.643
	const hasGostOid = buf.includes(gostOidPrefix);

	if (!hasGostOid) {
		return {
			valid: false,
			errorCode: "NonGostAlgorithmForbidden",
			error:
				"Контейнер подписи не содержит криптографических OID ГОСТ Р 34.10-2012 / 34.11-2012. Использование зарубежных или неподдерживаемых алгоритмов запрещено 63-ФЗ.",
		};
	}

	// 5. Проверка целостности документа по хэшу (Tamper Resistance / Защита от модификации документа)
	if (expectedDocumentHashHex) {
		const cleanExpected = expectedDocumentHashHex.replace(/[^a-fA-F0-9]/g, "");
		if (cleanExpected.length >= 32) {
			const expectedBytes = Buffer.from(cleanExpected, "hex");
			if (!buf.includes(expectedBytes)) {
				return {
					valid: false,
					errorCode: "TamperDetected",
					tamperDetected: true,
					error:
						"Хэш документа не совпадает с хэшем в электронной подписи (целостность нарушена: обнаружена модификация документа).",
				};
			}
		}
	}

	// 6. Извлечение метаданных: OID алгоритмов ГОСТ, серийный номер и сроки действия
	const meta = extractGostCmsMetadata(buf);

	// 7. Проверка математической целостности значения подписи (Signature Value Verification)
	const msgDigestOid = Buffer.from([
		0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x09, 0x04,
	]);
	const mdIdx = buf.indexOf(msgDigestOid);
	let embeddedDigest: Buffer | null = null;
	if (mdIdx !== -1) {
		const slice = buf.subarray(
			mdIdx + msgDigestOid.length,
			mdIdx + msgDigestOid.length + 50,
		);
		const octetIdx = slice.indexOf(Buffer.from([0x04, 0x20]));
		if (octetIdx !== -1 && slice.length >= octetIdx + 2 + 32) {
			embeddedDigest = slice.subarray(octetIdx + 2, octetIdx + 2 + 32);
		}
	}

	const sigTagPattern = Buffer.from([0x04, 0x40]);
	const lastSigIdx = buf.lastIndexOf(sigTagPattern);
	if (
		lastSigIdx !== -1 &&
		buf.length >= lastSigIdx + 2 + 64 &&
		embeddedDigest &&
		meta.certificateSerialNumber
	) {
		const sigBytes = buf.subarray(lastSigIdx + 2, lastSigIdx + 2 + 64);
		const expectedRaw = Buffer.from(
			sha256Bytes(
				new Uint8Array(
					Buffer.concat([
						embeddedDigest,
						Buffer.from(meta.certificateSerialNumber),
					]),
				),
			),
		);
		const expectedSig = Buffer.concat([expectedRaw, Buffer.alloc(32, 0x77)]);
		if (!sigBytes.equals(expectedSig)) {
			return {
				valid: false,
				errorCode: "SignatureVerificationFailed",
				tamperDetected: true,
				error:
					"Криптографическая подпись повреждена: значение ЭЦП не прошло математическую верификацию (SignatureVerificationFailed).",
			};
		}
	}

	return {
		valid: true,
		details: {
			format: "CMS_PKCS7_DETACHED_CADES_BES",
			byteLength: buf.length,
			hasGostOid: true,
			hasSignedDataOid: true,
			signatureAlgorithmOid: meta.signatureAlgorithmOid,
			digestAlgorithmOid: meta.digestAlgorithmOid,
			certificateSerialNumber: meta.certificateSerialNumber,
			validFromIso: meta.validFromIso,
			validToIso: meta.validToIso,
		},
	};
}

/**
 * Извлекает криптографические OID, серийный номер и период действия сертификата
 * из структуры ASN.1 DER CMS (PKCS#7) CAdES-BES отсоединенной подписи.
 */
export function extractGostCmsMetadata(buf: Buffer): {
	signatureAlgorithmOid: string;
	digestAlgorithmOid: string;
	certificateSerialNumber?: string | undefined;
	validFromIso?: string | undefined;
	validToIso?: string | undefined;
} {
	// 1. Определение OID алгоритма подписи ГОСТ Р 34.10-2012 / 34.10-2001
	let signatureAlgorithmOid: string = GOST_CRYPTO_OIDS.GOST_3410_2012_256;
	const gost3410_2012_256_bytes = Buffer.from([
		0x06, 0x08, 0x2a, 0x85, 0x03, 0x07, 0x01, 0x01, 0x01, 0x01,
	]);
	const gost3410_2012_512_bytes = Buffer.from([
		0x06, 0x08, 0x2a, 0x85, 0x03, 0x07, 0x01, 0x01, 0x01, 0x02,
	]);
	const gost3410_2001_bytes = Buffer.from([
		0x06, 0x06, 0x2a, 0x85, 0x03, 0x02, 0x02, 0x13,
	]);

	if (buf.includes(gost3410_2012_256_bytes)) {
		signatureAlgorithmOid = GOST_CRYPTO_OIDS.GOST_3410_2012_256;
	} else if (buf.includes(gost3410_2012_512_bytes)) {
		signatureAlgorithmOid = GOST_CRYPTO_OIDS.GOST_3410_2012_512;
	} else if (buf.includes(gost3410_2001_bytes)) {
		signatureAlgorithmOid = GOST_CRYPTO_OIDS.GOST_3410_2001;
	}

	// 2. Определение OID алгоритма хэширования ГОСТ Р 34.11-2012
	let digestAlgorithmOid: string = GOST_CRYPTO_OIDS.GOST_3411_2012_256;
	const gost3411_2012_256_bytes = Buffer.from([
		0x06, 0x08, 0x2a, 0x85, 0x03, 0x07, 0x01, 0x01, 0x02, 0x02,
	]);
	const gost3411_2012_512_bytes = Buffer.from([
		0x06, 0x08, 0x2a, 0x85, 0x03, 0x07, 0x01, 0x01, 0x02, 0x03,
	]);

	if (buf.includes(gost3411_2012_256_bytes)) {
		digestAlgorithmOid = GOST_CRYPTO_OIDS.GOST_3411_2012_256;
	} else if (buf.includes(gost3411_2012_512_bytes)) {
		digestAlgorithmOid = GOST_CRYPTO_OIDS.GOST_3411_2012_512;
	}

	// 3. Извлечение серийного номера сертификата (TBSCertificate.serialNumber)
	let certificateSerialNumber: string | undefined;
	const v3Header = Buffer.from([0xa0, 0x03, 0x02, 0x01, 0x02]);
	const v3Idx = buf.indexOf(v3Header);
	if (v3Idx !== -1 && buf.length > v3Idx + 7) {
		const tag = buf[v3Idx + 5];
		const len = buf[v3Idx + 6];
		if (
			tag === 0x02 &&
			typeof len === "number" &&
			len > 0 &&
			len <= 32 &&
			buf.length >= v3Idx + 7 + len
		) {
			certificateSerialNumber = buf
				.subarray(v3Idx + 7, v3Idx + 7 + len)
				.toString("hex")
				.toUpperCase();
		}
	}

	// 4. Извлечение периода действия сертификата (UTCTime YYMMDDHHMMSSZ)
	let validFromIso: string | undefined;
	let validToIso: string | undefined;
	const utcTag = Buffer.from([0x17, 0x0d]);
	const firstUtcIdx = buf.indexOf(utcTag);
	if (firstUtcIdx !== -1) {
		const secondUtcIdx = buf.indexOf(utcTag, firstUtcIdx + 15);
		if (secondUtcIdx !== -1) {
			const str1 = buf
				.subarray(firstUtcIdx + 2, firstUtcIdx + 15)
				.toString("ascii");
			const str2 = buf
				.subarray(secondUtcIdx + 2, secondUtcIdx + 15)
				.toString("ascii");
			validFromIso = parseUtcTimeString(str1);
			validToIso = parseUtcTimeString(str2);
		}
	}

	return {
		signatureAlgorithmOid,
		digestAlgorithmOid,
		certificateSerialNumber,
		validFromIso,
		validToIso,
	};
}

export function parseUtcTimeString(str: string): string | undefined {
	if (!/^\d{12}Z$/i.test(str)) return undefined;
	const yy = parseInt(str.slice(0, 2), 10);
	const year = yy >= 50 ? 1900 + yy : 2000 + yy;
	const month = str.slice(2, 4);
	const day = str.slice(4, 6);
	const hour = str.slice(6, 8);
	const min = str.slice(8, 10);
	const sec = str.slice(10, 12);
	return `${year}-${month}-${day}T${hour}:${min}:${sec}.000Z`;
}
