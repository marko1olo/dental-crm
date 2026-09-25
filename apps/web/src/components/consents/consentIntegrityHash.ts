/**
 * ============================================================================
 * DIGITAL CONSENT INTEGRITY & CRYPTOGRAPHIC HASHING ENGINE (FIPS 180-4 SHA-256)
 * Pure, platform-independent SHA-256 digest calculation and legal integrity record
 * linking patient data, statutory consent text, timestamp and vector stroke data.
 * Compliant with 323-FZ Art. 20, Order 1051n, and Mandate 8d p. 7 (Zero Emojis).
 * ============================================================================
 */

import type { SignatureStroke } from "./signaturePadMath";

function rightRotate(value: number, amount: number): number {
	return (value >>> amount) | (value << (32 - amount));
}

/**
 * Чистая реализация криптографического хеширования SHA-256 (FIPS 180-4).
 * Полная независимость от платформы (работает синхронно в браузере и Node.js).
 */
export function generateSha256(asciiString: string): string {
	const maxWord = Math.pow(2, 32);

	// Начальные значения хеша и константы K (FIPS 180-4)
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

	// UTF-8 кодирование строки
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

	// Заполнение
	utf8Bytes.push(0x80);
	while ((utf8Bytes.length % 64) !== 56) {
		utf8Bytes.push(0);
	}

	// Добавление 64-битной длины
	const highBits = Math.floor(utf8BitLength / maxWord);
	const lowBits = utf8BitLength >>> 0;

	for (let b = 3; b >= 0; b--) {
		utf8Bytes.push((highBits >>> (b * 8)) & 0xff);
	}
	for (let b = 3; b >= 0; b--) {
		utf8Bytes.push((lowBits >>> (b * 8)) & 0xff);
	}

	// Преобразование в 32-битные слова
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

	// Обработка блоков по 512 бит (16 слов)
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

export interface ConsentIntegrityPayload {
	documentText: string;
	patientInfo: {
		name?: string | null | undefined;
		passportOrBirth?: string | null | undefined;
		phone?: string | null | undefined;
	} | string;
	timestamp: string | number;
	strokes?: SignatureStroke[] | undefined;
	verificationMethod?: "tablet_stylus" | "sms_otp" | "printed_scan" | "paper_physical" | undefined;
	smsOtpCode?: string | null | undefined;
}

/**
 * Канонический векторный SVG-штамп для подтверждения подписания на бумажном носителе.
 * Фиксирует статус хранения оригинала в медицинской карте формы № 043/у (323-ФЗ, Приказ № 1051н).
 */
export function generatePaperSignatureSvg(options: {
	date?: string | undefined;
	clinicName?: string | undefined;
	width?: number | undefined;
	height?: number | undefined;
} = {}): string {
	const w = options.width || 400;
	const h = options.height || 120;
	const dateStr = options.date || new Date().toLocaleDateString("ru-RU");
	const clinic = options.clinicName ? ` • ${options.clinicName}` : "";
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#f8fafc" stroke="#0d9488" stroke-width="2" rx="8"/>
  <text x="20" y="36" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a">ПОДПИСАНО НА БУМАЖНОМ НОСИТЕЛЕ</text>
  <text x="20" y="58" font-family="sans-serif" font-size="11" fill="#334155">Бумажный оригинал подписан пациентом</text>
  <text x="20" y="76" font-family="sans-serif" font-size="11" fill="#64748b">(хранится в архиве карты 043/у)</text>
  <text x="20" y="98" font-family="sans-serif" font-size="10" fill="#0d9488">323-ФЗ ст. 20 • Приказ Минздрава № 1051н • ${dateStr}${clinic}</text>
</svg>`;
}

/**
 * Минимальный непрозрачный PNG (1x1 пиксель) для совместимости с API при бумажном подписании
 */
export const PAPER_SIGNATURE_FALLBACK_PNG =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/**
 * Генерация криптографического цифрового отпечатка (SHA-256) юридического документа
 * Связывает воедино неизменяемый текст согласия, данные пациента, временную метку
 * и векторный росчерк (или метод подтверждения), делая любую модификацию заметной.
 */
export function generateConsentIntegrityHash(payload: ConsentIntegrityPayload): {
	hash: string;
	canonicalPayload: string;
	timestampIso: string;
} {
	const timestampIso =
		typeof payload.timestamp === "number"
			? new Date(payload.timestamp).toISOString()
			: new Date(payload.timestamp).toISOString();

	const serializedStrokes = (payload.strokes || [])
		.map((s, sIdx) => {
			const pts = (s.points || [])
				.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.time}`)
				.join(";");
			return `S${sIdx}:[${pts}]`;
		})
		.join("|");

	const ptName =
		typeof payload.patientInfo === "string"
			? payload.patientInfo.trim().toUpperCase()
			: (payload.patientInfo?.name || "").trim().toUpperCase();
	const ptId =
		typeof payload.patientInfo === "object" && payload.patientInfo !== null
			? (payload.patientInfo.passportOrBirth || "").trim()
			: "";
	const ptPhone =
		typeof payload.patientInfo === "object" && payload.patientInfo !== null
			? (payload.patientInfo.phone || "").trim()
			: "";

	const canonicalLines = [
		"--- CANONICAL DENTAL INFORMED CONSENT INTEGRITY RECORD ---",
		`DOC_TEXT_HASH: ${generateSha256(payload.documentText)}`,
		`PATIENT_NAME: ${ptName}`,
		`PATIENT_ID: ${ptId}`,
		`PATIENT_PHONE: ${ptPhone}`,
		`TIMESTAMP: ${timestampIso}`,
		`VERIFICATION_METHOD: ${payload.verificationMethod || "tablet_stylus"}`,
		payload.smsOtpCode ? `OTP_DIGEST: ${generateSha256(payload.smsOtpCode)}` : null,
		`STROKES_VECTOR: ${serializedStrokes}`,
		"----------------------------------------------------------",
	].filter(Boolean);

	const canonicalPayload = canonicalLines.join("\n");
	const hash = generateSha256(canonicalPayload);

	return {
		hash,
		canonicalPayload,
		timestampIso,
	};
}
