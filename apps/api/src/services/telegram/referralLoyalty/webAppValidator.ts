/**
 * webAppValidator.ts
 *
 * Layer 1: Cryptographic Telegram WebApp initData HMAC-SHA256 signature validation,
 * database connectivity error detection, and deep link generators.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type {
	TelegramWebAppUser,
	TelegramWebAppValidationResult,
} from "./types.js";

export function isDbConnectionError(err: unknown): boolean {
	if (!err || typeof err !== "object") return false;
	const e = err as { code?: string; message?: string; errno?: number };
	return (
		e.code === "ECONNREFUSED" ||
		e.code === "ENOTFOUND" ||
		e.errno === -4078 ||
		(typeof e.message === "string" && e.message.includes("ECONNREFUSED"))
	);
}

/**
 * Криптографическая валидация Telegram.WebApp.initData (HMAC-SHA-256).
 * Соответствует официальному протоколу Telegram Bot API:
 * 1. Распарсить key-value пары строки initData.
 * 2. Исключить параметр hash.
 * 3. Отсортировать ключи по алфавиту и соединить через '\n' как "key=value".
 * 4. secret_key = HMAC_SHA256("WebAppData", botToken).
 * 5. check_hash = HMAC_SHA256(secret_key, data_check_string).hex().
 */
export function validateTelegramWebAppData(
	initDataString: string,
	botToken: string,
	options: { maxAgeSeconds?: number; allowDevBypass?: boolean } = {},
): TelegramWebAppValidationResult {
	const trimmed = (initDataString || "").trim();
	if (!trimmed) {
		return {
			isValid: false,
			user: null,
			authDate: null,
			queryId: null,
			rawParams: {},
			error: "Пустая строка initData",
		};
	}

	try {
		const searchParams = new URLSearchParams(trimmed);
		const hash = searchParams.get("hash");
		if (!hash) {
			return {
				isValid: false,
				user: null,
				authDate: null,
				queryId: null,
				rawParams: {},
				error: "Отсутствует параметр hash",
			};
		}

		const rawParams: Record<string, string> = {};
		const dataCheckPairs: string[] = [];

		const sortedKeys = Array.from(searchParams.keys())
			.filter((k) => k !== "hash")
			.sort();

		for (const key of sortedKeys) {
			const val = searchParams.get(key) ?? "";
			rawParams[key] = val;
			dataCheckPairs.push(`${key}=${val}`);
		}

		const dataCheckString = dataCheckPairs.join("\n");

		// Telegram WebApp Secret Key: HMAC_SHA256("WebAppData", botToken)
		const secretKey = createHmac("sha256", "WebAppData")
			.update(botToken)
			.digest();

		const calculatedHash = createHmac("sha256", secretKey)
			.update(dataCheckString)
			.digest("hex");

		let hashesMatch = false;
		try {
			hashesMatch = timingSafeEqual(
				Buffer.from(calculatedHash, "hex"),
				Buffer.from(hash, "hex"),
			);
		} catch {
			hashesMatch = false;
		}

		// Разбор данных пользователя
		let user: TelegramWebAppUser | null = null;
		if (rawParams.user) {
			try {
				user = JSON.parse(rawParams.user) as TelegramWebAppUser;
			} catch {
				user = null;
			}
		}

		// Разбор даты авторизации
		let authDate: Date | null = null;
		if (rawParams.auth_date) {
			const seconds = Number.parseInt(rawParams.auth_date, 10);
			if (!Number.isNaN(seconds) && seconds > 0) {
				authDate = new Date(seconds * 1000);
			}
		}

		// Проверка устаревания (по умолчанию 86400с = 24 часа)
		const maxAge = options.maxAgeSeconds ?? 86400;
		if (authDate && maxAge > 0) {
			const ageSeconds = (Date.now() - authDate.getTime()) / 1000;
			if (ageSeconds > maxAge && !options.allowDevBypass) {
				return {
					isValid: false,
					user,
					authDate,
					queryId: rawParams.query_id || null,
					rawParams,
					error: `Срок действия сессии Telegram WebApp истек (${Math.round(ageSeconds / 60)} мин. назад)`,
				};
			}
		}

		if (!hashesMatch && !options.allowDevBypass) {
			return {
				isValid: false,
				user,
				authDate,
				queryId: rawParams.query_id || null,
				rawParams,
				error: "Недействительная криптографическая подпись Telegram WebApp",
			};
		}

		return {
			isValid: true,
			user,
			authDate,
			queryId: rawParams.query_id || null,
			rawParams,
		};
	} catch (err) {
		return {
			isValid: false,
			user: null,
			authDate: null,
			queryId: null,
			rawParams: {},
			error: err instanceof Error ? err.message : "Ошибка валидации initData",
		};
	}
}

/**
 * Генерация персональной реферальной ссылки для пациента:
 * https://t.me/ClinicBot?start=ref_PATIENT_ID
 */
export function generateReferralLink(
	botUsername: string,
	patientId: string,
	referralCode?: string,
): {
	deepLink: string;
	referralCode: string;
	shareText: string;
} {
	const sanitizedBot = botUsername.replace(/^@/, "").trim() || "DenteClinicBot";
	const code = referralCode?.trim() || `ref_${patientId}`;
	const deepLink = `https://t.me/${sanitizedBot}?start=${encodeURIComponent(code)}`;
	const shareText =
		`Привет! Дарю тебе 1 000 ₽ на визит к стоматологу в клинику DENTE. ` +
		`Комплексная гигиена или осмотр с КТ со скидкой. Запишись прямо в боте: ${deepLink}`;

	return {
		deepLink,
		referralCode: code,
		shareText,
	};
}
