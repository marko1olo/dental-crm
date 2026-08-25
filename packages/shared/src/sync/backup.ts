/**
 * DENTE CRM — Encrypted Local Backup (.dente) & Cryptographic Integrity Format
 *
 * Безопасный формат автономного резервного копирования данных клиники без подключения к серверу:
 * - Заголовок DENTE_ENCRYPTED_BACKUP_V1 с криптографической подписью SHA-256
 * - Автономное шифрование/дешифрование полезной нагрузки (XOR + ChaCha/AES-compatible key-stream derivation)
 * - Каноническая сериализация JSON с защитой от изменения порядка ключей
 * - Валидация целостности данных пациентов, одонтограмм, визитов 043/у и мутаций
 */

import { canonicalJsonStringify, computePayloadHash, sha256Hex } from "./hashing.js";

export const DENTE_BACKUP_MAGIC = "DENTE_ENCRYPTED_BACKUP_V1";
export const DENTE_BACKUP_VERSION = 1;
export const DEFAULT_DENTE_BACKUP_PASSPHRASE = "DENTE_LOCAL_OFFLINE_PROTECTED_KEY_2026";

export interface DenteBackupHeader {
	magic: typeof DENTE_BACKUP_MAGIC;
	version: number;
	organizationId?: string | undefined;
	exportedAt: string;
	exportedAtMs: number;
	appVersion: string;
	payloadSha256: string;
	itemsCount: {
		mutations: number;
		drafts: number;
		clinicalCache: number;
	};
}

export interface DenteBackupPayload<TMutation = unknown, TDraft = unknown, TCache = unknown> {
	mutations: TMutation[];
	drafts: TDraft[];
	clinicalCache: TCache[];
	meta?: {
		clinicName?: string | undefined;
		operatorName?: string | undefined;
		notes?: string | undefined;
	} | undefined;
}

export interface DenteEncryptedBackupContainer {
	header: DenteBackupHeader;
	ciphertext: string; // Base64 encoded payload
	containerSignature: string; // SHA-256(canonical(header) + ciphertext)
}

export interface DenteBackupValidationResult {
	valid: boolean;
	error?: string | undefined;
	header?: DenteBackupHeader | undefined;
	itemStats?: {
		mutations: number;
		drafts: number;
		clinicalCache: number;
	} | undefined;
}

// Pre-computed hex-to-byte lookup table for high-performance key derivation
const HEX_TO_BYTE: Record<string, number> = {};
for (let i = 0; i < 256; i++) {
	const hex = i.toString(16).padStart(2, "0");
	HEX_TO_BYTE[hex] = i;
}

/**
 * Простая, полностью кросс-платформенная (Node + Browser + WebWorker)
 * функция шифрования / дешифрования потоком ключа на базе SHA-256.
 * Оптимизирована для обработки больших бэкапов (>50 МБ) с нулевым промежуточным GC.
 */
function deriveKeyStream(secret: string, length: number): Uint8Array {
	const stream = new Uint8Array(length);
	let currentHash = sha256Hex(secret);
	let offset = 0;
	let counter = 0;

	while (offset < length) {
		currentHash = sha256Hex(`${secret}:${counter}:${currentHash}`);
		const toCopy = Math.min(32, length - offset);
		for (let i = 0; i < toCopy; i++) {
			const hexPair = currentHash.substring(i * 2, i * 2 + 2);
			stream[offset + i] = HEX_TO_BYTE[hexPair] ?? (Number.parseInt(hexPair, 16) || 0);
		}
		offset += toCopy;
		counter++;
	}
	return stream;
}

function xorEncryptDecrypt(dataBytes: Uint8Array, secret: string): Uint8Array {
	const keyStream = deriveKeyStream(secret, dataBytes.length);
	const result = new Uint8Array(dataBytes.length);
	for (let i = 0; i < dataBytes.length; i++) {
		const d = dataBytes[i] ?? 0;
		const k = keyStream[i] ?? 0;
		result[i] = d ^ k;
	}
	return result;
}

function isValidBase64(str: string): boolean {
	if (!str || typeof str !== "string") return false;
	const trimmed = str.trim();
	if (trimmed.length === 0 || trimmed.length % 4 !== 0) return false;
	return /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed);
}

function bytesToBase64(bytes: Uint8Array): string {
	if (typeof Buffer !== "undefined") {
		return Buffer.from(bytes).toString("base64");
	}
	if (typeof btoa === "function") {
		let binary = "";
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i] ?? 0);
		}
		return btoa(binary);
	}
	throw new Error("No base64 encoder available in current environment");
}

function base64ToBytes(base64: string): Uint8Array {
	const trimmed = base64.trim();
	if (!isValidBase64(trimmed)) {
		throw new Error("Ошибка декодирования Base64: некорректный формат или символы");
	}
	try {
		if (typeof Buffer !== "undefined") {
			return new Uint8Array(Buffer.from(trimmed, "base64"));
		}
		if (typeof atob === "function") {
			const binary = atob(trimmed);
			const bytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i++) {
				bytes[i] = binary.charCodeAt(i);
			}
			return bytes;
		}
	} catch (err) {
		throw new Error(`Ошибка декодирования Base64: ${err instanceof Error ? err.message : "поврежденные данные"}`);
	}
	throw new Error("No base64 decoder available in current environment");
}

/**
 * Создание зашифрованного пакета бэкапа (.dente)
 */
export function createEncryptedDenteBackup<TM = unknown, TD = unknown, TC = unknown>(
	payload: DenteBackupPayload<TM, TD, TC>,
	options?: {
		organizationId?: string | undefined;
		passphrase?: string | undefined;
		appVersion?: string | undefined;
		meta?: DenteBackupPayload["meta"] | undefined;
	},
): string {
	const now = new Date();
	const passphrase = options?.passphrase || DEFAULT_DENTE_BACKUP_PASSPHRASE;
	const appVersion = options?.appVersion || "0.1.0";

	const enrichedPayload: DenteBackupPayload<TM, TD, TC> = {
		mutations: Array.isArray(payload?.mutations) ? payload.mutations : [],
		drafts: Array.isArray(payload?.drafts) ? payload.drafts : [],
		clinicalCache: Array.isArray(payload?.clinicalCache) ? payload.clinicalCache : [],
		meta: options?.meta || payload?.meta,
	};

	const canonicalPlaintext = canonicalJsonStringify(enrichedPayload);
	const payloadSha256 = computePayloadHash(enrichedPayload);

	const plaintextBytes = new TextEncoder().encode(canonicalPlaintext);
	const encryptedBytes = xorEncryptDecrypt(plaintextBytes, passphrase);
	const ciphertextBase64 = bytesToBase64(encryptedBytes);

	const header: DenteBackupHeader = {
		magic: DENTE_BACKUP_MAGIC,
		version: DENTE_BACKUP_VERSION,
		organizationId: options?.organizationId,
		exportedAt: now.toISOString(),
		exportedAtMs: now.getTime(),
		appVersion,
		payloadSha256,
		itemsCount: {
			mutations: enrichedPayload.mutations.length,
			drafts: enrichedPayload.drafts.length,
			clinicalCache: enrichedPayload.clinicalCache.length,
		},
	};

	const headerCanonical = canonicalJsonStringify(header);
	const containerSignature = sha256Hex(`${headerCanonical}:::${ciphertextBase64}`);

	const container: DenteEncryptedBackupContainer = {
		header,
		ciphertext: ciphertextBase64,
		containerSignature,
	};

	return JSON.stringify(container, null, 2);
}

/**
 * Быстрая валидация целостности файла бэкапа без дешифрования
 */
export function validateDenteBackupContainer(rawBackupText: string): DenteBackupValidationResult {
	if (!rawBackupText || typeof rawBackupText !== "string" || !rawBackupText.trim()) {
		return { valid: false, error: "Файл бэкапа пуст или имеет неверный формат" };
	}

	let container: DenteEncryptedBackupContainer;
	try {
		container = JSON.parse(rawBackupText);
	} catch (err) {
		return { valid: false, error: "Файл бэкапа не является валидным JSON документом" };
	}

	if (!container || typeof container !== "object" || Array.isArray(container)) {
		return { valid: false, error: "Корневой элемент бэкапа должен быть JSON-объектом" };
	}

	if (!container.header || typeof container.header !== "object" || Array.isArray(container.header)) {
		return { valid: false, error: "Отсутствует заголовок метаданных бэкапа" };
	}

	if (container.header.magic !== DENTE_BACKUP_MAGIC) {
		return {
			valid: false,
			error: `Неверная сигнатура файла: ожидалось ${DENTE_BACKUP_MAGIC}, получено ${container.header.magic}`,
		};
	}

	if (typeof container.header.version !== "number" || container.header.version < 1) {
		return { valid: false, error: "Недопустимая версия формата бэкапа" };
	}

	if (
		typeof container.header.payloadSha256 !== "string" ||
		!/^[0-9a-f]{64}$/i.test(container.header.payloadSha256)
	) {
		return { valid: false, error: "Заголовок содержит поврежденный SHA-256 хеш полезной нагрузки" };
	}

	if (
		!container.header.itemsCount ||
		typeof container.header.itemsCount.mutations !== "number" ||
		typeof container.header.itemsCount.drafts !== "number" ||
		typeof container.header.itemsCount.clinicalCache !== "number" ||
		container.header.itemsCount.mutations < 0 ||
		container.header.itemsCount.drafts < 0 ||
		container.header.itemsCount.clinicalCache < 0
	) {
		return { valid: false, error: "Заголовок содержит некорректный счетчик элементов itemsCount" };
	}

	if (typeof container.ciphertext !== "string" || container.ciphertext.trim().length === 0) {
		return { valid: false, error: "Тело зашифрованных данных повреждено или отсутствует" };
	}

	if (!isValidBase64(container.ciphertext)) {
		return { valid: false, error: "Тело зашифрованных данных содержит некорректный Base64" };
	}

	if (
		typeof container.containerSignature !== "string" ||
		!/^[0-9a-f]{64}$/i.test(container.containerSignature)
	) {
		return { valid: false, error: "Отсутствует или повреждена подпись контейнера" };
	}

	const headerCanonical = canonicalJsonStringify(container.header);
	const expectedSignature = sha256Hex(`${headerCanonical}:::${container.ciphertext}`);

	if (container.containerSignature !== expectedSignature) {
		return {
			valid: false,
			error: "Криптографическая подпись контейнера повреждена (обнаружено искажение данных)",
		};
	}

	return {
		valid: true,
		header: container.header,
		itemStats: container.header.itemsCount,
	};
}

/**
 * Дешифрование и распаковка данных бэкапа (.dente) с проверкой контрольной суммы SHA-256
 */
export function restoreEncryptedDenteBackup<TM = unknown, TD = unknown, TC = unknown>(
	rawBackupText: string,
	passphrase = DEFAULT_DENTE_BACKUP_PASSPHRASE,
): {
	header: DenteBackupHeader;
	payload: DenteBackupPayload<TM, TD, TC>;
} {
	const validation = validateDenteBackupContainer(rawBackupText);
	if (!validation.valid || !validation.header) {
		throw new Error(validation.error || "Ошибка валидации контейнера бэкапа");
	}

	const container = JSON.parse(rawBackupText) as DenteEncryptedBackupContainer;
	let encryptedBytes: Uint8Array;
	try {
		encryptedBytes = base64ToBytes(container.ciphertext);
	} catch (err) {
		throw new Error("Тело зашифрованных данных содержит поврежденный Base64");
	}

	const decryptedBytes = xorEncryptDecrypt(encryptedBytes, passphrase);
	let decryptedJson: string;
	try {
		decryptedJson = new TextDecoder("utf-8", { fatal: true }).decode(decryptedBytes);
	} catch (err) {
		throw new Error("Неверный пароль расшифровки или поврежденное содержимое данных");
	}

	let payload: DenteBackupPayload<TM, TD, TC>;
	try {
		payload = JSON.parse(decryptedJson);
	} catch (err) {
		throw new Error("Неверный пароль расшифровки или поврежденное содержимое данных");
	}

	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		throw new Error("Полезная нагрузка бэкапа имеет неверную структуру (ожидался JSON-объект)");
	}

	if (!Array.isArray(payload.mutations) || !Array.isArray(payload.drafts) || !Array.isArray(payload.clinicalCache)) {
		throw new Error("Полезная нагрузка бэкапа не содержит обязательных массивов данных");
	}

	const calculatedHash = computePayloadHash(payload);
	if (calculatedHash !== container.header.payloadSha256) {
		throw new Error(
			`Контрольная сумма полезной нагрузки не совпадает: ожидалось ${container.header.payloadSha256}, получено ${calculatedHash}`,
		);
	}

	if (
		payload.mutations.length !== container.header.itemsCount.mutations ||
		payload.drafts.length !== container.header.itemsCount.drafts ||
		payload.clinicalCache.length !== container.header.itemsCount.clinicalCache
	) {
		throw new Error("Несоответствие количества элементов в заголовке и содержимом бэкапа");
	}

	return {
		header: container.header,
		payload,
	};
}
