/**
 * DENTE CRM — 152-ФЗ Personal Data & Credentials Sanitizer
 *
 * Маскирует и санитизирует персональные данные, токены, пароли и реквизиты
 * платежей в строках, объектах и телах сетевых запросов.
 */

const SENSITIVE_KEY_PATTERNS: readonly RegExp[] = [
	/pass(word)?|pwd|passphrase/i,
	/pin(code)?|otp|mfa|verification[_\-]?code|sms[_\-]?code/i,
	/token|jwt|bearer/i,
	/secret|private[_\-]?key|api[_\-]?key|client[_\-]?secret|shared[_\-]?secret|encryption[_\-]?key|signing[_\-]?key/i,
	/auth(orization)?|cookie|session/i,
	/card(_?num(ber)?|_?pan)?|cvv|cvc|pan|bank_?account|iban|account_?num(ber)?/i,
	/passport|snils|oms|polis/i,
	/certificate|signature|sig[_\-]?value|ecp|eds|salt|argon2|bcrypt/i,
	/diagnosis|diagnoses|mkb10|icd10|clinical[_\-]?notes?|anamnesis|complaints/i,
	/tooth[_\-]?formula|odontogram|treatment[_\-]?plan|emr[_\-]?records?/i,
	/tooth(_?number)?|teeth|tooth_?states?|surface(s)?/i,
	/диагноз|мкб10|анамнез|жалобы|зубная[_\-]?формула|план[_\-]?лечения|одонтограмма/i,
	/номер_?зуба|зуб[ыа]?|поверхност(ь|и)/i,
	/пароль|пинкод|токен|секрет|паспорт|снилс|полис|номер_карты|код_подтверждения|эцп|подпись|ключ/i,
];

const JWT_PATTERN = /ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const BEARER_PATTERN = /Bearer\s+([A-Za-z0-9\-_.~+/]+=*)/gi;
const BASIC_AUTH_PATTERN = /Basic\s+([A-Za-z0-9+/=]+)/gi;
const CARD_NUMBER_PATTERN = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
const SNILS_PATTERN = /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{2}\b/g;
const PASSPORT_PATTERN = /\b\d{2}\s*\d{2}\s*\d{6}\b/g;
const SENSITIVE_URL_PARAM_PATTERN = /([?&](?:token|password|pass|secret|api[_\-]?key|auth[_\-]?token|session|sessionId|bearer|pin|snils|passport|dente_session_secret|diagnosis|diagnoses|mkb10|icd10|tooth|teeth|toothNumber|tooth_number|anamnesis|complaints|treatment_?plan)=)[^&#\s]+/gi;

/**
 * Проверяет, является ли имя свойства чувствительным ключом (пароль, токен, карта, и т.д.)
 */
export function isSensitiveKey(key: string): boolean {
	if (!key || typeof key !== "string") return false;
	const trimmed = key.trim();
	return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Маскирует строковые данные (JWT, Bearer-токены, номера карт, СНИЛС, паспорта, URL-параметры).
 */
export function sanitizeString(value: string): string {
	if (!value || typeof value !== "string") return value;

	let result = value;

	// 1. Mask JWT tokens
	result = result.replace(JWT_PATTERN, "[JWT_ТОКЕН_СКРЫТ]");

	// 2. Mask Bearer authorization headers
	result = result.replace(BEARER_PATTERN, "Bearer [ТОКЕН_СКРЫТ]");

	// 3. Mask Basic authorization headers
	result = result.replace(BASIC_AUTH_PATTERN, "Basic [ТОКЕН_СКРЫТ]");

	// 4. Mask credit card numbers (keep first 4 and last 4 digits)
	result = result.replace(CARD_NUMBER_PATTERN, (match) => {
		const digits = match.replace(/\D/g, "");
		if (digits.length === 16) {
			return `${digits.slice(0, 4)} **** **** ${digits.slice(12)}`;
		}
		return "[НОМЕР_КАРТЫ_СКРЫТ]";
	});

	// 5. Mask SNILS (keep last 2 check digits)
	result = result.replace(SNILS_PATTERN, (match) => {
		const digits = match.replace(/\D/g, "");
		if (digits.length === 11) {
			return `***-***-*** ${digits.slice(9)}`;
		}
		return "[СНИЛС_СКРЫТ]";
	});

	// 6. Mask Russian Passports
	result = result.replace(PASSPORT_PATTERN, (match) => {
		const digits = match.replace(/\D/g, "");
		if (digits.length === 10) {
			return `** ** ******${digits.slice(8)}`;
		}
		return "[ПАСПОРТ_СКРЫТ]";
	});

	// 7. Mask Sensitive URL query parameters
	result = result.replace(SENSITIVE_URL_PARAM_PATTERN, "$1[СКРЫТО]");

	// 8. Mask ICD-10 / MKB-10 medical diagnoses in freeform strings and error messages
	result = result.replace(/\b[A-Z]\d{2}(?:\.\d{1,2})?\b/g, (match) => {
		if (/^[A-TV-Z]\d{2}(?:\.\d{1,2})?$/.test(match)) {
			return "[МКБ_СКРЫТ]";
		}
		return match;
	});

	// 9. Mask Tooth references in clinical text (e.g. "зуб 46", "зуба 36", "tooth 46", "tooth #11")
	result = result.replace(/(?:зуб[а-я]*|tooth)\s*#?\s*([1-4][1-8]|[5-8][1-5]|\d{1,2})/gi, "[ЗУБ_СКРЫТ]");

	return result;
}

/**
 * Рекурсивно санитизирует любые структуры данных (объекты, массивы, примитивы, ошибки, Map, Set).
 * Защищен от циклических ссылок, глубокой рекурсии, выбрасывающих геттеров и несериализуемых типов (BigInt).
 */
export function sanitizePayload<T>(
	payload: T,
	maxDepth = 6,
	seen: WeakSet<object> = new WeakSet(),
	isParentSensitive = false,
): T {
	return sanitizePayloadInternal(payload, maxDepth, seen, isParentSensitive) as T;
}

function sanitizePayloadInternal(
	payload: unknown,
	maxDepth = 6,
	seen: WeakSet<object> = new WeakSet(),
	isParentSensitive = false,
): unknown {
	if (payload === null || payload === undefined) {
		return payload;
	}

	if (typeof payload === "string") {
		if (isParentSensitive) {
			return payload.length > 0 ? "[СКРЫТО]" : "";
		}
		return sanitizeString(payload);
	}

	if (typeof payload === "number" || typeof payload === "boolean") {
		if (isParentSensitive) {
			return "[СКРЫТО]";
		}
		return payload;
	}

	if (typeof payload === "bigint") {
		if (isParentSensitive) {
			return "[СКРЫТО]";
		}
		return `${payload.toString()}n`;
	}

	if (typeof payload === "symbol") {
		return payload.toString();
	}

	if (typeof payload === "function") {
		return `[Function: ${(payload as Function).name || "anonymous"}]`;
	}

	if (typeof payload !== "object") {
		return payload;
	}

	// DoS prevention: Handle Binary Buffers and TypedArrays without iterating millions of index keys
	if (typeof ArrayBuffer !== "undefined") {
		if (payload instanceof ArrayBuffer) {
			return `[Binary Data: ${payload.byteLength} bytes]`;
		}
		if (ArrayBuffer.isView(payload)) {
			return `[Binary Data: ${(payload as ArrayBufferView).byteLength} bytes]`;
		}
	}

	// Handle Date objects
	if (payload instanceof Date) {
		if (isParentSensitive) {
			return "[СКРЫТО]";
		}
		return isNaN(payload.getTime()) ? "[Invalid Date]" : payload.toISOString();
	}

	// Handle RegExp objects
	if (payload instanceof RegExp) {
		return payload.toString();
	}

	// Check recursion depth limit
	if (maxDepth <= 0) {
		return "[MAX_DEPTH_REACHED]";
	}

	// Check circular reference
	if (seen.has(payload as object)) {
		return "[CIRCULAR_REFERENCE]";
	}

	seen.add(payload as object);

	// Handle Error instances
	if (payload instanceof Error) {
		const errRecord: Record<string, unknown> = {
			name: payload.name,
			message: sanitizeString(payload.message),
		};
		if (payload.stack) {
			errRecord.stack = sanitizeString(payload.stack);
		}
		// Capture custom enumerable properties attached to Error
		for (const key of Object.keys(payload)) {
			try {
				const val: unknown = Reflect.get(payload, key);
				errRecord[key] = sanitizePayloadInternal(val, maxDepth - 1, seen, isSensitiveKey(key));
			} catch {
				errRecord[key] = "[UNREADABLE_PROPERTY]";
			}
		}
		return errRecord;
	}

	// Handle Map instances
	if (payload instanceof Map) {
		const mapObj: Record<string, unknown> = {};
		for (const [k, v] of payload.entries()) {
			const strKey = String(k);
			const childSensitive = isSensitiveKey(strKey) || isParentSensitive;
			mapObj[strKey] = sanitizePayloadInternal(v, maxDepth - 1, seen, childSensitive);
		}
		return mapObj;
	}

	// Handle Set instances
	if (payload instanceof Set) {
		return Array.from(payload).map((item) =>
			sanitizePayloadInternal(item, maxDepth - 1, seen, isParentSensitive),
		);
	}

	// Handle Arrays
	if (Array.isArray(payload)) {
		return payload.map((item) =>
			sanitizePayloadInternal(item, maxDepth - 1, seen, isParentSensitive),
		);
	}

	// Handle Standard Objects
	const result: Record<string, unknown> = {};
	const record = payload as Record<string, unknown>;

	for (const key of Object.keys(record)) {
		let value: unknown;
		try {
			value = record[key];
		} catch {
			result[key] = "[UNREADABLE_PROPERTY]";
			continue;
		}

		const keyIsSensitive = isSensitiveKey(key) || isParentSensitive;

		if (keyIsSensitive) {
			if (value === null || value === undefined) {
				result[key] = value;
				continue;
			}
			if (typeof value === "object") {
				result[key] = sanitizePayloadInternal(value, maxDepth - 1, seen, true);
				continue;
			}
			if (typeof value === "string") {
				result[key] = value.length > 0 ? "[СКРЫТО]" : "";
				continue;
			}
			result[key] = "[СКРЫТО]";
			continue;
		}

		result[key] = sanitizePayloadInternal(value, maxDepth - 1, seen, false);
	}

	return result;
}
