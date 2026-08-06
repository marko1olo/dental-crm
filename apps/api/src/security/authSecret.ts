/**
 * authSecret.ts — единственный источник секрета подписи токенов.
 *
 * ПОЧЕМУ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ
 * Раньше секрет подписи вычислялся в трёх местах (routes/auth.ts, routes/dashboard.ts,
 * accessGuard.requireAuthTokenSecret) и в каждом был публичный литерал-фолбэк
 * ("dente_jwt_secret_demo", "dente-fallback-secret-2026"). Любой, кто видел исходники,
 * мог подписать токен с чужим organizationId и получить полный доступ к данным
 * другой клиники. Теперь секрет один и никогда не является публичной константой.
 *
 * ПОВЕДЕНИЕ
 *  - production: AUTH_TOKEN_SECRET обязателен и должен быть длиной >= 32 символов.
 *    Если его нет — процесс падает на старте (fail closed), а не работает "как-нибудь".
 *  - development/test: если AUTH_TOKEN_SECRET не задан, секрет генерируется случайно
 *    один раз и кэшируется в .data/dev-auth-secret, чтобы сессии переживали
 *    перезапуск dev-сервера. Файл в .gitignore (.data/ игнорируется целиком).
 */

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const MIN_PRODUCTION_SECRET_LENGTH = 32;

/** Публичные значения, которые исторически попали в репозиторий. Запрещены везде. */
const BANNED_SECRETS = new Set([
	"dente_jwt_secret_demo",
	"dente-fallback-secret-2026",
	"dente_admin_setup_key",
	"my_super_secret_key_change_me_in_production",
	"changeme",
	"secret",
]);

let cachedSecret: string | null = null;

function isProduction(): boolean {
	return process.env.NODE_ENV === "production";
}

function devSecretFilePath(): string {
	const stateDir =
		process.env.DENTAL_STATE_DIR?.trim() ||
		path.resolve(process.cwd(), ".data");
	return path.join(stateDir, "dev-auth-secret");
}

function loadOrCreateDevSecret(): string {
	const filePath = devSecretFilePath();
	try {
		if (existsSync(filePath)) {
			const existing = readFileSync(filePath, "utf8").trim();
			if (existing.length >= MIN_PRODUCTION_SECRET_LENGTH) return existing;
		}
		const generated = randomBytes(48).toString("base64url");
		mkdirSync(path.dirname(filePath), { recursive: true });
		writeFileSync(filePath, generated, { encoding: "utf8", mode: 0o600 });
		console.warn(
			`[security] AUTH_TOKEN_SECRET не задан. Сгенерирован локальный dev-секрет: ${filePath}. ` +
				"Для production обязательно задайте AUTH_TOKEN_SECRET в окружении.",
		);
		return generated;
	} catch {
		// Диск недоступен (только чтение / контейнер). Эфемерный секрет: сессии не
		// переживут перезапуск, но публичной константы всё равно не будет.
		const ephemeral = randomBytes(48).toString("base64url");
		console.warn(
			"[security] AUTH_TOKEN_SECRET не задан и dev-секрет не сохраняется на диск. " +
				"Используется эфемерный секрет: все сессии сбросятся при перезапуске.",
		);
		return ephemeral;
	}
}

/**
 * Секрет подписи всех токенов (кабинет клиники, сотрудник, портал пациента).
 * Бросает исключение в production, если секрет не настроен или слабый.
 */
export function authTokenSecret(): string {
	if (cachedSecret) return cachedSecret;

	const configured = process.env.AUTH_TOKEN_SECRET?.trim();

	if (configured) {
		if (BANNED_SECRETS.has(configured)) {
			throw new Error(
				"AUTH_TOKEN_SECRET равен публичному демо-значению из репозитория. Задайте уникальный секрет.",
			);
		}
		if (isProduction() && configured.length < MIN_PRODUCTION_SECRET_LENGTH) {
			throw new Error(
				`AUTH_TOKEN_SECRET слишком короткий для production (нужно >= ${MIN_PRODUCTION_SECRET_LENGTH} символов).`,
			);
		}
		cachedSecret = configured;
		return cachedSecret;
	}

	if (isProduction()) {
		throw new Error(
			"AUTH_TOKEN_SECRET обязателен в production. Сервер остановлен, чтобы не подписывать токены известным секретом.",
		);
	}

	cachedSecret = loadOrCreateDevSecret();
	return cachedSecret;
}

/**
 * Секрет администратора клиники (заголовок x-dente-admin-secret).
 * Возвращает null, если не настроен — вызывающий код решает, падать или пускать.
 */
export function clinicalAdminSecret(): string | null {
	const value = process.env.DENTE_CLINICAL_ADMIN_SECRET?.trim();
	if (!value) return null;
	if (BANNED_SECRETS.has(value)) {
		throw new Error(
			"DENTE_CLINICAL_ADMIN_SECRET равен публичному демо-значению. Задайте уникальный секрет.",
		);
	}
	return value;
}

/** Только для тестов: сбросить кэш после подмены переменных окружения. */
export function resetAuthSecretCacheForTests(): void {
	cachedSecret = null;
}
