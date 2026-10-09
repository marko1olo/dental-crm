/**
 * ============================================================================
 * CHAIRSIDE CONSENT ENGINE - CRYPTOGRAPHIC SHA-256 & INTEGRITY HASH (LAYER 2)
 * FIPS 180-4 / 63-ФЗ ПЭП / Неизменяемый хеш документа
 * ============================================================================
 */

import type { ChairsideConsentPackage } from "./types.js";

function rightRotate(value: number, amount: number): number {
	return (value >>> amount) | (value << (32 - amount));
}

/**
 * Криптографический расчет хеша SHA-256 (FIPS 180-4)
 */
export function generateSha256(asciiString: string): string {
	const maxWord = Math.pow(2, 32);

	const hash = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	]);

	const k = new Uint32Array([
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
	]);

	const utf8Bytes: number[] = [];
	for (let c = 0; c < asciiString.length; c++) {
		let code = asciiString.charCodeAt(c);
		if (code < 0x80) {
			utf8Bytes.push(code);
		} else if (code < 0x800) {
			utf8Bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		} else if (code < 0xd800 || code >= 0xe000) {
			utf8Bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
		} else {
			c++;
			code = 0x10000 + (((code & 0x3ff) << 10) | (asciiString.charCodeAt(c) & 0x3ff));
			utf8Bytes.push(
				0xf0 | (code >> 18),
				0x80 | ((code >> 12) & 0x3f),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f),
			);
		}
	}

	const utf8BitLength = utf8Bytes.length * 8;

	utf8Bytes.push(0x80);
	while ((utf8Bytes.length % 64) !== 56) {
		utf8Bytes.push(0);
	}

	const highBits = Math.floor(utf8BitLength / maxWord);
	const lowBits = utf8BitLength >>> 0;

	for (let b = 3; b >= 0; b--) {
		utf8Bytes.push((highBits >>> (b * 8)) & 0xff);
	}
	for (let b = 3; b >= 0; b--) {
		utf8Bytes.push((lowBits >>> (b * 8)) & 0xff);
	}

	const wordsCount = utf8Bytes.length / 4;
	const words = new Uint32Array(wordsCount);
	for (let b = 0; b < wordsCount; b++) {
		const offset = b * 4;
		const b0 = utf8Bytes[offset] ?? 0;
		const b1 = utf8Bytes[offset + 1] ?? 0;
		const b2 = utf8Bytes[offset + 2] ?? 0;
		const b3 = utf8Bytes[offset + 3] ?? 0;
		words[b] = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
	}

	const w = new Uint32Array(64);

	for (let j = 0; j < wordsCount; j += 16) {
		for (let i = 0; i < 16; i++) {
			w[i] = words[j + i] ?? 0;
		}
		for (let i = 16; i < 64; i++) {
			const w15 = w[i - 15] ?? 0;
			const w2 = w[i - 2] ?? 0;
			const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
			const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
			w[i] = ((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) | 0;
		}

		let a = hash[0] ?? 0;
		let b = hash[1] ?? 0;
		let c = hash[2] ?? 0;
		let d = hash[3] ?? 0;
		let e = hash[4] ?? 0;
		let f = hash[5] ?? 0;
		let g = hash[6] ?? 0;
		let h = hash[7] ?? 0;

		for (let i = 0; i < 64; i++) {
			const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp1 = (h + S1 + ch + (k[i] ?? 0) + (w[i] ?? 0)) | 0;
			const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (S0 + maj) | 0;

			h = g;
			g = f;
			f = e;
			e = (d + temp1) | 0;
			d = c;
			c = b;
			b = a;
			a = (temp1 + temp2) | 0;
		}

		hash[0] = ((hash[0] ?? 0) + a) | 0;
		hash[1] = ((hash[1] ?? 0) + b) | 0;
		hash[2] = ((hash[2] ?? 0) + c) | 0;
		hash[3] = ((hash[3] ?? 0) + d) | 0;
		hash[4] = ((hash[4] ?? 0) + e) | 0;
		hash[5] = ((hash[5] ?? 0) + f) | 0;
		hash[6] = ((hash[6] ?? 0) + g) | 0;
		hash[7] = ((hash[7] ?? 0) + h) | 0;
	}

	let hexString = "";
	for (let i = 0; i < 8; i++) {
		const hex = ((hash[i] ?? 0) >>> 0).toString(16).padStart(8, "0");
		hexString += hex;
	}

	return hexString;
}

/**
 * Хеширование PIN-кода врача
 */
export function hashDoctorPin(pin: string): string {
	const sanitized = (pin || "").trim();
	return generateSha256("DENTAL_DOCTOR_PIN_SALT_" + sanitized);
}

/**
 * Проверка введенного PIN-кода врача
 */
export function verifyDoctorPin(pin: string, expectedHash: string | undefined): boolean {
	if (!expectedHash) {
		return hashDoctorPin(pin) === hashDoctorPin("1234");
	}
	return hashDoctorPin(pin) === expectedHash;
}

/**
 * Проверка формата PIN-кода (от 4 до 6 цифр)
 */
export function isValidPinFormat(pin: string): boolean {
	return /^\d{4,6}$/.test((pin || "").trim());
}

/**
 * Формирование официального юридического штампа ПЭП в строгом соответствии с 63-ФЗ
 */
export function generateLegalPepStamp(params: {
	otpCode: string;
	hash: string;
	phoneMasked: string;
	signedAtFormatted: string;
}): string {
	const codeMasked = params.otpCode ? "****" : "****";
	return `Документ подписан простой электронной подписью (ПЭП) в соответствии с 63-ФЗ. Код подтвержден: ${codeMasked}, Хэш: SHA-256 (${params.hash}), Телефон: ${params.phoneMasked}, Дата: ${params.signedAtFormatted}`;
}

/**
 * Генерация криптографического отпечатка SHA-256 пакета документов ПЭП
 */
export function generateDocumentPackageIntegrityHash(
	pkg: ChairsideConsentPackage,
	otpCode: string,
	phone: string,
	timestampIso: string,
): { hash: string; canonicalData: string } {
	const docsDigests = pkg.documents
		.map((d) => `${d.type}:${d.code}:${generateSha256(d.title + d.sections.map((s) => s.content).join(""))}`)
		.join(";");

	const estimateDigest = pkg.treatmentItems
		.map((it) => `${it.serviceCode}:${it.toothNumber || ""}:${it.quantity}:${it.totalKopecks}`)
		.join(";");

	const canonicalLines = [
		"=== CANONICAL DENTAL CHAIRSIDE PEP CONSENT RECORD (63-FZ / 323-FZ) ===",
		"PACKAGE_ID: " + pkg.packageId,
		"TIMESTAMP_ISO: " + timestampIso,
		"PATIENT_FULL_NAME: " + pkg.patient.fullName.trim().toUpperCase(),
		"PATIENT_BIRTH_DATE: " + pkg.patient.birthDate.trim(),
		"PATIENT_PASSPORT: " + (pkg.patient.passport || "").trim(),
		"PATIENT_PHONE: " + (phone || pkg.patient.phone || "").trim(),
		"FORM_043U_CARD: " + (pkg.patient.cardNumber || "").trim(),
		"DOCTOR_FULL_NAME: " + pkg.doctor.fullName.trim().toUpperCase(),
		"CLINIC_OGRN: " + pkg.clinic.ogrn.trim(),
		"CLINIC_INN: " + pkg.clinic.inn.trim(),
		"DOCUMENTS_DIGEST: " + docsDigests,
		"ESTIMATE_TOTAL_KOPECKS: " + pkg.totalEstimateKopecks,
		"ESTIMATE_DIGEST: " + estimateDigest,
		"PEP_AUTH_METHOD: SMS_OTP_63FZ",
		"OTP_DIGEST: " + generateSha256(otpCode),
		"======================================================================",
	];

	const canonicalData = canonicalLines.join("\n");
	const hash = generateSha256(canonicalData);

	return { hash, canonicalData };
}
