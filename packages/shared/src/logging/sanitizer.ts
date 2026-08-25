/**
 * DENTE CRM — 152-ФЗ Personal Data & Credentials Sanitizer
 *
 * Маскирует и санитизирует персональные данные, токены, пароли и реквизиты
 * платежей в строках, объектах и телах сетевых запросов.
 */

const SENSITIVE_KEY_PATTERNS: readonly RegExp[] = [
	/pass(word)?/i,
	/pin/i,
	/token/i,
	/secret/i,
	/auth(orization)?/i,
	/cookie/i,
	/session/i,
	/card(_?num(ber)?|_?pan)?/i,
	/cvv/i,
	/cvc/i,
	/pan/i,
	/passport/i,
	/snils/i,
	/private_?key/i,
	/api_?key/i,
];

const JWT_PATTERN = /ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const BEARER_PATTERN = /Bearer\s+([A-Za-z0-9\-_.~+/]+=*)/gi;
const CARD_NUMBER_PATTERN = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
const SNILS_PATTERN = /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{2}\b/g;
const PASSPORT_PATTERN = /\b\d{2}\s*\d{2}\s*\d{6}\b/g;

/**
 * Проверяет, является ли имя свойства чувствительным ключом (пароль, токен, карта, и т.д.)
 */
export function isSensitiveKey(key: string): boolean {
	if (!key || typeof key !== "string") return false;
	const trimmed = key.trim();
	return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Маскирует строковые данные (JWT, Bearer-токены, номера карт, СНИЛС, паспорта).
 */
export function sanitizeString(value: string): string {
	if (!value || typeof value !== "string") return value;

	let result = value;

	// 1. Mask JWT tokens
	result = result.replace(JWT_PATTERN, "[JWT_ТОКЕН_СКРЫТ]");

	// 2. Mask Bearer authorization headers
	result = result.replace(BEARER_PATTERN, "Bearer [ТОКЕН_СКРЫТ]");

	// 3. Mask credit card numbers (keep first 4 and last 4 digits)
	result = result.replace(CARD_NUMBER_PATTERN, (match) => {
		const digits = match.replace(/\D/g, "");
		if (digits.length === 16) {
			return `${digits.slice(0, 4)} **** **** ${digits.slice(12)}`;
		}
		return "[НОМЕР_КАРТЫ_СКРЫТ]";
	});

	// 4. Mask SNILS (keep last 2 check digits)
	result = result.replace(SNILS_PATTERN, (match) => {
		const digits = match.replace(/\D/g, "");
		if (digits.length === 11) {
			return `***-***-*** ${digits.slice(9)}`;
		}
		return "[СНИЛС_СКРЫТ]";
	});

	// 5. Mask Russian Passports
	result = result.replace(PASSPORT_PATTERN, (match) => {
		const digits = match.replace(/\D/g, "");
		if (digits.length === 10) {
			return `** ** ******${digits.slice(8)}`;
		}
		return "[ПАСПОРТ_СКРЫТ]";
	});

	return result;
}

/**
 * Рекурсивно санитизирует любые структуры данных (объекты, массивы, примитивы).
 * Защищен от циклических ссылок и глубокой рекурсии.
 */
export function sanitizePayload<T>(
	payload: T,
	maxDepth = 6,
	seen: WeakSet<object> = new WeakSet(),
): T {
	if (payload === null || payload === undefined) {
		return payload;
	}

	if (typeof payload === "string") {
		return sanitizeString(payload) as unknown as T;
	}

	if (typeof payload !== "object") {
		return payload;
	}

	if (maxDepth <= 0) {
		return "[MAX_DEPTH_REACHED]" as unknown as T;
	}

	if (seen.has(payload as object)) {
		return "[CIRCULAR_REFERENCE]" as unknown as T;
	}

	seen.add(payload as object);

	if (Array.isArray(payload)) {
		return payload.map((item) =>
			sanitizePayload(item, maxDepth - 1, seen),
		) as unknown as T;
	}

	const result: Record<string, unknown> = {};
	const record = payload as Record<string, unknown>;

	for (const key of Object.keys(record)) {
		const value = record[key];

		// If the value is an object or array, recurse into it even if the key contains 'card' or 'token'
		// so structured containers (like cards: [...]) are preserved and their child fields are masked
		if (value !== null && typeof value === "object") {
			result[key] = sanitizePayload(value, maxDepth - 1, seen);
			continue;
		}

		if (isSensitiveKey(key)) {
			if (typeof value === "string") {
				result[key] = value.length > 0 ? "[СКРЫТО]" : "";
			} else {
				result[key] = "[СКРЫТО]";
			}
			continue;
		}

		result[key] = sanitizePayload(value, maxDepth - 1, seen);
	}

	return result as unknown as T;
}
