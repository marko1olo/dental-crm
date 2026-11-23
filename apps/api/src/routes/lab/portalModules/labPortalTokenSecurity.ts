import crypto from "node:crypto";
import { signToken, verifyToken } from "../../../utils/cryptoHelper.js";

const LAB_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 дней — полный ортопедический производственный цикл

let ephemeralLabPortalSecret: string | null = null;

/**
 * Возвращает криптографический секрет для гостевого портала техника ЗТЛ.
 * В production отсутствие секрета вызывает FatalConfigError.
 * В dev/test генерируется надежный динамический ключ на время жизни процесса.
 */
export function getLabPortalSecret(): string {
	const configured = process.env.LAB_PORTAL_SECRET || process.env.JWT_SECRET || process.env.AUTH_SECRET;
	if (configured) {
		return configured;
	}
	if (process.env.NODE_ENV === "production") {
		throw new Error(
			"FATAL_SECURITY_ERROR: LAB_PORTAL_SECRET, JWT_SECRET, or AUTH_SECRET must be explicitly configured in production environment!",
		);
	}
	if (!ephemeralLabPortalSecret) {
		ephemeralLabPortalSecret = crypto.randomBytes(32).toString("hex");
	}
	return ephemeralLabPortalSecret;
}

/**
 * Генерирует криптографический защищенный токен гостевого портала техника
 * с валидацией целостности HMAC-SHA256 и сроком жизни (TTL 90 дней).
 */
export function generateLabGuestPortalToken(orderId: string, orgId: string): string {
	const payload = {
		orderId,
		orgId,
		purpose: "ztl_technician_guest_access",
	};
	return signToken(payload, getLabPortalSecret(), LAB_TOKEN_TTL_SECONDS);
}

export interface LabTokenValidationResult {
	valid: boolean;
	expired?: boolean;
	reason?: string;
	payload?: Record<string, unknown>;
}

/**
 * Проверяет подлинность HMAC-SHA256 подписи и срок жизни токена (TTL).
 * Поддерживает обратную совместимость с ранее выданными UUID-токенами с проверкой по дате создания.
 */
export function validateLabGuestPortalToken(
	token: string,
	orderCreatedAt?: Date | string | null,
): LabTokenValidationResult {
	if (!token || typeof token !== "string") {
		return { valid: false, reason: "MissingToken" };
	}

	// Токены с HMAC-SHA256 подписью разделены точкой base64url(payload).base64url(sig)
	if (token.includes(".")) {
		const verified = verifyToken(token, getLabPortalSecret());
		if (!verified) {
			// Проверим, не истек ли TTL
			try {
				const parts = token.split(".");
				if (parts.length === 2 && parts[0]) {
					const decoded = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as { exp?: number };
					if (typeof decoded.exp === "number" && decoded.exp < Math.floor(Date.now() / 1000)) {
						return { valid: false, expired: true, reason: "TokenExpired" };
					}
				}
			} catch {
				// игнорируем ошибку парсинга
			}
			return { valid: false, reason: "InvalidSignature" };
		}
		return { valid: true, payload: verified };
	}

	// Legacy UUID токены: проверка срока жизни по дате создания заказа (максимум 90 дней)
	if (orderCreatedAt) {
		const createdTime = new Date(orderCreatedAt).getTime();
		if (!Number.isNaN(createdTime)) {
			const ageMs = Date.now() - createdTime;
			const maxAgeMs = LAB_TOKEN_TTL_SECONDS * 1000;
			if (ageMs > maxAgeMs) {
				return { valid: false, expired: true, reason: "OrderExpired" };
			}
		}
	}

	return { valid: true };
}

/**
 * Защита персданных 152-ФЗ: санирует clinicalNotes перед передачей во внешний
 * гостевой портал зубного техника.
 *
 * Исключает утечку телефонов, паспортных данных, адресов и соматического статуса.
 * Сохраняет клинические параметры протезирования (оттенок VITA, материал, тип культи, зазоры под цемент).
 */
export function sanitizeClinicalNotesForTechnician(notes?: string | null): string | null {
	if (!notes || typeof notes !== "string") {
		return null;
	}

	let sanitized = notes;

	// 1. Обезличивание телефонных номеров (+7..., 8-9..., мобильные)
	sanitized = sanitized.replace(
		/(?:\+?7|8)[\s\-(]?\d{3}[\s\-)]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b/g,
		"[ТЕЛЕФОН СКРЫТ 152-ФЗ]",
	);

	// 2. Обезличивание паспортных данных (серия, номер, даты выдачи)
	sanitized = sanitized.replace(
		/(?:паспорт(?:ные\s+данные)?|серия|номер\s+паспорта)[:\s]+[^\n,;]+/gi,
		"[ПАСПОРТНЫЕ ДАННЫЕ СКРЫТЫ 152-ФЗ]",
	);
	sanitized = sanitized.replace(/\b\d{4}\s+\d{6}\b/g, "[ПАСПОРТ СКРЫТ 152-ФЗ]");

	// 3. Обезличивание номеров СНИЛС (XXX-XXX-XXX YY)
	sanitized = sanitized.replace(
		/\b\d{3}[-\s]\d{3}[-\s]\d{3}[-\s]\d{2}\b/g,
		"[СНИЛС СКРЫТ 152-ФЗ]",
	);

	// 4. Обезличивание адресов проживания и регистрации
	sanitized = sanitized.replace(
		/(?:адрес|прописка|проживает|зарегистрирован)[:\s]+[^\n,;]+/gi,
		"[АДРЕС СКРЫТ 152-ФЗ]",
	);

	// 5. Обезличивание общесоматического статуса и нерелевантных диагнозов
	sanitized = sanitized.replace(
		/(?:диагноз|соматика|соматический\s+статус|вич|гепатит|сифилис|hcv|hbv|hiv|rw)[:\s]+[^\n,;]+/gi,
		"[СОМАТИЧЕСКИЙ СТАТУС СКРЫТ 152-ФЗ]",
	);

	const trimmed = sanitized.trim();
	return trimmed.length > 0 ? trimmed : null;
}
