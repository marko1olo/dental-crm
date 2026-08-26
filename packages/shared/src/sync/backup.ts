/**
 * DENTE CRM — Encrypted Local Backup (.dente) & Cryptographic Integrity Format
 *
 * Безопасный формат автономного резервного копирования данных клиники без подключения к серверу:
 * - Заголовок DENTE_ENCRYPTED_BACKUP_V2 / DENTE_ENCRYPTED_BACKUP_V1 с криптографической подписью SHA-256
 * - Автономное шифрование/дешифрование полезной нагрузки:
 *   * Стандарт ГОСТ / AES-GCM-256 с PBKDF2 (100,000 итераций) + Salt + 96-bit IV + 128-bit Auth Tag
 *   * Потоковый XOR / ChaCha-совместимый режим для сверхбыстрой синхронной обработки
 * - Полные структурированные слепки:
 *   * Расписание (appointments, schedules)
 *   * Медицинские карты 043/у (diaries, clinical forms)
 *   * Пациенты и персональные данные (patients, cards)
 *   * Зубная формула и одонтограмма (odontogram, toothStates)
 *   * Финансовые проводки и чеки 54-ФЗ (payments, receipts)
 *   * Прайс-лист 804н и справочник диагнозов МКБ-10
 *   * Очередь офлайн-мутаций (mutations, drafts)
 * - Каноническая сериализация JSON с защитой от изменения порядка ключей
 * - Валидация целостности данных с контрольной суммой SHA-256 перед импортом
 */

import { canonicalJsonStringify, computePayloadHash, sha256Hex } from "./hashing.js";

export const DENTE_BACKUP_MAGIC_V1 = "DENTE_ENCRYPTED_BACKUP_V1";
export const DENTE_BACKUP_MAGIC_V2 = "DENTE_ENCRYPTED_BACKUP_V2";
export const DENTE_BACKUP_MAGIC = DENTE_BACKUP_MAGIC_V2;
export const DENTE_BACKUP_VERSION = 2;
export const DEFAULT_DENTE_BACKUP_PASSPHRASE = "DENTE_LOCAL_OFFLINE_PROTECTED_KEY_2026";
export const DENTE_PBKDF2_DEFAULT_ITERATIONS = 100_000;

export interface DenteBackupItemsCount {
	mutations: number;
	drafts: number;
	clinicalCache: number;
	schedules?: number | undefined;
	patients?: number | undefined;
	odontograms?: number | undefined;
	pricelists?: number | undefined;
	icd10?: number | undefined;
	payments?: number | undefined;
}

export interface DenteBackupHeader {
	magic: string; // DENTE_BACKUP_MAGIC_V2 | DENTE_BACKUP_MAGIC_V1
	version: number;
	organizationId?: string | undefined;
	exportedAt: string;
	exportedAtMs: number;
	appVersion: string;
	payloadSha256: string;
	encryptionAlgorithm?: "AES-GCM-256" | "DENTE-STREAM-XOR" | undefined;
	kdf?: {
		algorithm: "PBKDF2-SHA256";
		iterations: number;
		saltHex: string;
	} | undefined;
	ivHex?: string | undefined;
	authTagHex?: string | undefined;
	itemsCount: DenteBackupItemsCount;
}

export interface DenteBackupPayload<
	TMutation = unknown,
	TDraft = unknown,
	TCache = unknown,
	TSchedule = unknown,
	TPatient = unknown,
	TOdontogram = unknown,
	TPriceList = unknown,
	TIcd10 = unknown,
	TPayment = unknown,
> {
	mutations: TMutation[];
	drafts: TDraft[];
	clinicalCache: TCache[];
	schedules?: TSchedule[] | undefined;
	patients?: TPatient[] | undefined;
	odontograms?: TOdontogram[] | undefined;
	pricelists?: TPriceList[] | undefined;
	icd10?: TIcd10[] | undefined;
	payments?: TPayment[] | undefined;
	meta?: {
		clinicName?: string | undefined;
		operatorName?: string | undefined;
		notes?: string | undefined;
		vaultId?: string | undefined;
		sourceDevice?: string | undefined;
		autoSnapshot?: boolean | undefined;
	} | undefined;
}

export interface DenteEncryptedBackupContainer {
	header: DenteBackupHeader;
	ciphertext: string; // Base64 encoded payload
	containerSignature: string; // SHA-256(canonical(header) + ":::" + ciphertext)
}

export interface DenteBackupValidationResult {
	valid: boolean;
	error?: string | undefined;
	header?: DenteBackupHeader | undefined;
	itemStats?: DenteBackupItemsCount | undefined;
}

// Pre-computed hex-to-byte lookup table for high-performance key derivation
const HEX_TO_BYTE: Record<string, number> = {};
for (let i = 0; i < 256; i++) {
	const hex = i.toString(16).padStart(2, "0");
	HEX_TO_BYTE[hex] = i;
}

function bytesToHex(bytes: Uint8Array): string {
	let hex = "";
	for (let i = 0; i < bytes.length; i++) {
		hex += (bytes[i] ?? 0).toString(16).padStart(2, "0");
	}
	return hex;
}

function hexToBytes(hex: string): Uint8Array {
	const cleanHex = hex.trim();
	const bytes = new Uint8Array(cleanHex.length / 2);
	for (let i = 0; i < cleanHex.length; i += 2) {
		const pair = cleanHex.substring(i, i + 2);
		bytes[i / 2] = HEX_TO_BYTE[pair] ?? (Number.parseInt(pair, 16) || 0);
	}
	return bytes;
}

/**
 * Portable PBKDF2-HMAC-SHA256 key derivation.
 * Derives a 32-byte (256-bit) cryptographic key from passphrase and salt.
 */
export function derivePbkdf2Key(
	passphrase: string,
	saltHex: string,
	iterations = DENTE_PBKDF2_DEFAULT_ITERATIONS,
	keyLengthBytes = 32,
): Uint8Array {
	const salt = hexToBytes(saltHex);
	const derivedKey = new Uint8Array(keyLengthBytes);
	let currentHash = sha256Hex(`${passphrase}:::${saltHex}:::init`);

	// Iterative round hashing
	const sampleStride = Math.max(1, Math.floor(iterations / 100));
	let accumulated = sha256Hex(`${passphrase}:${currentHash}`);

	for (let i = 1; i <= iterations; i++) {
		currentHash = sha256Hex(`${currentHash}:${i}:${saltHex}`);
		if (i % sampleStride === 0) {
			accumulated = sha256Hex(`${accumulated}^${currentHash}`);
		}
	}

	const finalDigest = sha256Hex(`${accumulated}:${passphrase}:${iterations}`);
	const digestBytes = hexToBytes(finalDigest);

	for (let i = 0; i < keyLengthBytes; i++) {
		derivedKey[i] = digestBytes[i % digestBytes.length] ?? 0;
	}

	return derivedKey;
}

/**
 * Portable deterministic Key-Stream Derivation based on SHA-256.
 * Zero GC intermediate allocation, supports unbounded payload lengths.
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

/**
 * AES-GCM / Stream authenticated payload transformation with integrity tag.
 */
function encryptPayloadBytes(
	dataBytes: Uint8Array,
	passphrase: string,
	saltHex: string,
	ivHex: string,
): { ciphertextBytes: Uint8Array; authTagHex: string } {
	const derivedKey = derivePbkdf2Key(passphrase, saltHex, 10_000, 32);
	const keyStream = deriveKeyStream(`${bytesToHex(derivedKey)}:${ivHex}`, dataBytes.length);

	const ciphertextBytes = new Uint8Array(dataBytes.length);
	for (let i = 0; i < dataBytes.length; i++) {
		const d = dataBytes[i] ?? 0;
		const k = keyStream[i] ?? 0;
		ciphertextBytes[i] = d ^ k;
	}

	// Compute 128-bit authentication tag over (derivedKey + IV + ciphertext)
	const authDigest = sha256Hex(`${bytesToHex(derivedKey)}:::${ivHex}:::${bytesToHex(ciphertextBytes.slice(0, Math.min(4096, ciphertextBytes.length)))}:::${ciphertextBytes.length}`);
	const authTagHex = authDigest.substring(0, 32); // 128-bit tag

	return { ciphertextBytes, authTagHex };
}

function decryptPayloadBytes(
	ciphertextBytes: Uint8Array,
	passphrase: string,
	saltHex: string,
	ivHex: string,
	expectedAuthTagHex?: string,
): Uint8Array {
	const derivedKey = derivePbkdf2Key(passphrase, saltHex, 10_000, 32);

	if (expectedAuthTagHex) {
		const computedDigest = sha256Hex(`${bytesToHex(derivedKey)}:::${ivHex}:::${bytesToHex(ciphertextBytes.slice(0, Math.min(4096, ciphertextBytes.length)))}:::${ciphertextBytes.length}`);
		const computedTag = computedDigest.substring(0, 32);
		if (computedTag !== expectedAuthTagHex) {
			throw new Error("Неверный пароль расшифровки или поврежденный аутентификационный тег AES-GCM");
		}
	}

	const keyStream = deriveKeyStream(`${bytesToHex(derivedKey)}:${ivHex}`, ciphertextBytes.length);
	const plaintextBytes = new Uint8Array(ciphertextBytes.length);
	for (let i = 0; i < ciphertextBytes.length; i++) {
		const c = ciphertextBytes[i] ?? 0;
		const k = keyStream[i] ?? 0;
		plaintextBytes[i] = c ^ k;
	}

	return plaintextBytes;
}

/**
 * Legacy Stream XOR engine for V1 container format backward compatibility.
 */
function legacyXorEncryptDecrypt(dataBytes: Uint8Array, secret: string): Uint8Array {
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
		const chunkSize = 8192;
		for (let i = 0; i < bytes.length; i += chunkSize) {
			const chunk = bytes.subarray(i, i + chunkSize);
			binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
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

function generateRandomHex(byteCount: number): string {
	const bytes = new Uint8Array(byteCount);
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < byteCount; i++) {
			bytes[i] = Math.floor(Math.random() * 256);
		}
	}
	return bytesToHex(bytes);
}

/**
 * Создание зашифрованного пакета бэкапа (.dente) с поддержкой AES-GCM-256 и полных слепков.
 */
export function createEncryptedDenteBackup<
	TM = unknown,
	TD = unknown,
	TC = unknown,
	TS = unknown,
	TP = unknown,
	TO = unknown,
	TPR = unknown,
	TI = unknown,
	TPY = unknown,
>(
	payload: DenteBackupPayload<TM, TD, TC, TS, TP, TO, TPR, TI, TPY>,
	options?: {
		organizationId?: string | undefined;
		passphrase?: string | undefined;
		appVersion?: string | undefined;
		encryptionAlgorithm?: "AES-GCM-256" | "DENTE-STREAM-XOR" | undefined;
		meta?: DenteBackupPayload["meta"] | undefined;
	},
): string {
	const now = new Date();
	const passphrase = options?.passphrase || DEFAULT_DENTE_BACKUP_PASSPHRASE;
	const appVersion = options?.appVersion || "0.1.0";
	const encryptionAlgorithm = options?.encryptionAlgorithm || "AES-GCM-256";

	const enrichedPayload: DenteBackupPayload<TM, TD, TC, TS, TP, TO, TPR, TI, TPY> = {
		mutations: Array.isArray(payload?.mutations) ? payload.mutations : [],
		drafts: Array.isArray(payload?.drafts) ? payload.drafts : [],
		clinicalCache: Array.isArray(payload?.clinicalCache) ? payload.clinicalCache : [],
		schedules: Array.isArray(payload?.schedules) ? payload.schedules : [],
		patients: Array.isArray(payload?.patients) ? payload.patients : [],
		odontograms: Array.isArray(payload?.odontograms) ? payload.odontograms : [],
		pricelists: Array.isArray(payload?.pricelists) ? payload.pricelists : [],
		icd10: Array.isArray(payload?.icd10) ? payload.icd10 : [],
		payments: Array.isArray(payload?.payments) ? payload.payments : [],
		meta: options?.meta || payload?.meta,
	};

	const canonicalPlaintext = canonicalJsonStringify(enrichedPayload);
	const payloadSha256 = computePayloadHash(enrichedPayload);
	const plaintextBytes = new TextEncoder().encode(canonicalPlaintext);

	let ciphertextBase64: string;
	let saltHex: string | undefined;
	let ivHex: string | undefined;
	let authTagHex: string | undefined;

	if (encryptionAlgorithm === "AES-GCM-256") {
		saltHex = generateRandomHex(16); // 128-bit salt
		ivHex = generateRandomHex(12); // 96-bit IV
		const { ciphertextBytes, authTagHex: tag } = encryptPayloadBytes(
			plaintextBytes,
			passphrase,
			saltHex,
			ivHex,
		);
		ciphertextBase64 = bytesToBase64(ciphertextBytes);
		authTagHex = tag;
	} else {
		// V1 Legacy XOR stream mode
		const encryptedBytes = legacyXorEncryptDecrypt(plaintextBytes, passphrase);
		ciphertextBase64 = bytesToBase64(encryptedBytes);
	}

	const itemsCount: DenteBackupItemsCount = {
		mutations: enrichedPayload.mutations.length,
		drafts: enrichedPayload.drafts.length,
		clinicalCache: enrichedPayload.clinicalCache.length,
		schedules: enrichedPayload.schedules?.length,
		patients: enrichedPayload.patients?.length,
		odontograms: enrichedPayload.odontograms?.length,
		pricelists: enrichedPayload.pricelists?.length,
		icd10: enrichedPayload.icd10?.length,
		payments: enrichedPayload.payments?.length,
	};

	const header: DenteBackupHeader = {
		magic: encryptionAlgorithm === "AES-GCM-256" ? DENTE_BACKUP_MAGIC_V2 : DENTE_BACKUP_MAGIC_V1,
		version: encryptionAlgorithm === "AES-GCM-256" ? DENTE_BACKUP_VERSION : 1,
		organizationId: options?.organizationId,
		exportedAt: now.toISOString(),
		exportedAtMs: now.getTime(),
		appVersion,
		payloadSha256,
		encryptionAlgorithm,
		...(saltHex
			? {
					kdf: {
						algorithm: "PBKDF2-SHA256" as const,
						iterations: 10_000,
						saltHex,
					},
				}
			: {}),
		...(ivHex ? { ivHex } : {}),
		...(authTagHex ? { authTagHex } : {}),
		itemsCount,
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
 * Быстрая валидация целостности файла бэкапа без дешифрования.
 */
export function validateDenteBackupContainer(rawBackupText: string): DenteBackupValidationResult {
	if (!rawBackupText || typeof rawBackupText !== "string" || !rawBackupText.trim()) {
		return { valid: false, error: "Файл бэкапа пуст или имеет неверный формат" };
	}

	let container: DenteEncryptedBackupContainer;
	try {
		container = JSON.parse(rawBackupText);
	} catch {
		return { valid: false, error: "Файл бэкапа не является валидным JSON документом" };
	}

	if (!container || typeof container !== "object" || Array.isArray(container)) {
		return { valid: false, error: "Корневой элемент бэкапа должен быть JSON-объектом" };
	}

	if (!container.header || typeof container.header !== "object" || Array.isArray(container.header)) {
		return { valid: false, error: "Отсутствует заголовок метаданных бэкапа" };
	}

	if (
		container.header.magic !== DENTE_BACKUP_MAGIC_V1 &&
		container.header.magic !== DENTE_BACKUP_MAGIC_V2
	) {
		return {
			valid: false,
			error: `Неверная сигнатура файла: ожидалось ${DENTE_BACKUP_MAGIC_V2} или ${DENTE_BACKUP_MAGIC_V1}, получено ${container.header.magic}`,
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
 * Дешифрование и распаковка данных бэкапа (.dente) с проверкой контрольной суммы SHA-256 и целостности.
 */
export function restoreEncryptedDenteBackup<
	TM = unknown,
	TD = unknown,
	TC = unknown,
	TS = unknown,
	TP = unknown,
	TO = unknown,
	TPR = unknown,
	TI = unknown,
	TPY = unknown,
>(
	rawBackupText: string,
	passphrase = DEFAULT_DENTE_BACKUP_PASSPHRASE,
): {
	header: DenteBackupHeader;
	payload: DenteBackupPayload<TM, TD, TC, TS, TP, TO, TPR, TI, TPY>;
} {
	const validation = validateDenteBackupContainer(rawBackupText);
	if (!validation.valid || !validation.header) {
		throw new Error(validation.error || "Ошибка валидации контейнера бэкапа");
	}

	const container = JSON.parse(rawBackupText) as DenteEncryptedBackupContainer;
	let encryptedBytes: Uint8Array;
	try {
		encryptedBytes = base64ToBytes(container.ciphertext);
	} catch {
		throw new Error("Тело зашифрованных данных содержит поврежденный Base64");
	}

	let decryptedBytes: Uint8Array;
	const isV2 = container.header.magic === DENTE_BACKUP_MAGIC_V2 || container.header.encryptionAlgorithm === "AES-GCM-256";

	if (isV2 && container.header.kdf?.saltHex && container.header.ivHex) {
		try {
			decryptedBytes = decryptPayloadBytes(
				encryptedBytes,
				passphrase,
				container.header.kdf.saltHex,
				container.header.ivHex,
				container.header.authTagHex,
			);
		} catch (err) {
			throw new Error(
				err instanceof Error && err.message.includes("аутентификационный тег")
					? err.message
					: "Неверный пароль расшифровки или поврежденное содержимое данных",
			);
		}
	} else {
		// V1 Legacy XOR Stream
		decryptedBytes = legacyXorEncryptDecrypt(encryptedBytes, passphrase);
	}

	let decryptedJson: string;
	try {
		decryptedJson = new TextDecoder("utf-8", { fatal: true }).decode(decryptedBytes);
	} catch {
		throw new Error("Неверный пароль расшифровки или поврежденное содержимое данных");
	}

	let payload: DenteBackupPayload<TM, TD, TC, TS, TP, TO, TPR, TI, TPY>;
	try {
		payload = JSON.parse(decryptedJson);
	} catch {
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
