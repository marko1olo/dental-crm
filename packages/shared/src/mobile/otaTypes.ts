/**
 * otaTypes.ts — Контракты, схемы валидации и утилиты Over-The-Air (OTA) обновлений DENTE CRM.
 *
 * ОПИСАНИЕ:
 * Предоставляет строгие типы Zod и вспомогательные функции для:
 * - Запроса и ответа манифеста версии (/api/mobile/version.json)
 * - Семантического версионирования (semver) и проверки минимально поддерживаемой версии
 * - Проверки целостности криптографического хеша SHA-256
 * - Защиты от окирпичивания (Rollback / Anti-Brick Protection)
 */

import { z } from "zod";

/**
 * Поддерживаемые платформы клиентских оболочек.
 */
export const mobileOtaPlatformSchema = z.enum([
	"web",
	"android",
	"ios",
	"desktop",
	"all",
]);
export type MobileOtaPlatform = z.infer<typeof mobileOtaPlatformSchema>;

/**
 * Входные параметры проверки версии клиентом.
 */
export const mobileOtaVersionQuerySchema = z.object({
	clientVersion: z.string().optional(),
	platform: mobileOtaPlatformSchema.optional().default("web"),
	appId: z.string().optional(),
	channel: z.enum(["stable", "beta", "nightly"]).optional().default("stable"),
});
export type MobileOtaVersionQuery = z.infer<typeof mobileOtaVersionQuerySchema>;

/**
 * Ответ сервера с манифестом доступной версии OTA обновления.
 */
export const mobileOtaVersionResponseSchema = z.object({
	version: z.string(),
	bundleSha256: z.string().length(64),
	minSupportedVersion: z.string(),
	downloadUrl: z.string(),
	releaseNotes: z.string(),
	mandatory: z.boolean(),
	updateAvailable: z.boolean().optional(),
	isDeprecated: z.boolean().optional(),
	publishedAt: z.string().optional(),
	bundleSizeBytes: z.number().int().nonnegative().optional(),
});
export type MobileOtaVersionResponse = z.infer<
	typeof mobileOtaVersionResponseSchema
>;

/**
 * Структура состояния защиты от сбоев (Rollback State).
 */
export const otaRollbackStateSchema = z.object({
	activeVersion: z.string(),
	bundleSha256: z.string(),
	lastKnownGoodVersion: z.string().nullable(),
	failureCount: z.number().int().nonnegative(),
	rolledBack: z.boolean(),
	lastErrorAt: z.string().nullable(),
});
export type OtaRollbackState = z.infer<typeof otaRollbackStateSchema>;

/**
 * Манифест установленного локально OTA бандла.
 */
export interface OtaBundleManifest {
	version: string;
	bundleSha256: string;
	installedAt: string;
	lastKnownGood: boolean;
	consecutiveCrashCount: number;
}

/**
 * Распарсенная семантическая версия.
 */
export interface SemverParsed {
	major: number;
	minor: number;
	patch: number;
	prerelease?: string | undefined;
}

/**
 * Парсер semver-строки вида "1.2.3", "v2.4.0", "1.0.0-beta.1".
 */
export function parseSemver(v: string | null | undefined): SemverParsed | null {
	if (!v || typeof v !== "string") {
		return null;
	}

	const clean = v.trim().replace(/^v/i, "");
	const match = clean.match(
		/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/,
	);

	if (!match || typeof match[1] !== "string" || typeof match[2] !== "string" || typeof match[3] !== "string") {
		// Поддержка неполного формата "1.2"
		const partialMatch = clean.match(/^(\d+)\.(\d+)$/);
		if (partialMatch && typeof partialMatch[1] === "string" && typeof partialMatch[2] === "string") {
			const major = Number.parseInt(partialMatch[1], 10);
			const minor = Number.parseInt(partialMatch[2], 10);
			if (Number.isNaN(major) || Number.isNaN(minor)) return null;
			return { major, minor, patch: 0 };
		}
		// Поддержка единичной цифры "1"
		const singleMatch = clean.match(/^(\d+)$/);
		if (singleMatch && typeof singleMatch[1] === "string") {
			const major = Number.parseInt(singleMatch[1], 10);
			if (Number.isNaN(major)) return null;
			return { major, minor: 0, patch: 0 };
		}
		return null;
	}

	const major = Number.parseInt(match[1], 10);
	const minor = Number.parseInt(match[2], 10);
	const patch = Number.parseInt(match[3], 10);
	const prerelease = match[4] || undefined;

	if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
		return null;
	}

	return {
		major,
		minor,
		patch,
		prerelease,
	};
}

/**
 * Проверка валидности semver строки.
 */
export function isSemverValid(v: string): boolean {
	return parseSemver(v) !== null;
}

/**
 * Сравнение двух версий semver:
 * - возвращает -1 если v1 < v2
 * - возвращает 0 если v1 == v2
 * - возвращает 1 если v1 > v2
 */
export function compareSemver(
	v1: string | null | undefined,
	v2: string | null | undefined,
): -1 | 0 | 1 {
	const p1 = parseSemver(v1);
	const p2 = parseSemver(v2);

	if (!p1 && !p2) return 0;
	if (!p1) return -1;
	if (!p2) return 1;

	if (p1.major !== p2.major) {
		return p1.major > p2.major ? 1 : -1;
	}
	if (p1.minor !== p2.minor) {
		return p1.minor > p2.minor ? 1 : -1;
	}
	if (p1.patch !== p2.patch) {
		return p1.patch > p2.patch ? 1 : -1;
	}

	// Версия без пререлиза старше версии с пререлизом (1.0.0 > 1.0.0-beta)
	if (!p1.prerelease && p2.prerelease) return 1;
	if (p1.prerelease && !p2.prerelease) return -1;
	if (p1.prerelease && p2.prerelease) {
		if (p1.prerelease === p2.prerelease) return 0;
		return p1.prerelease > p2.prerelease ? 1 : -1;
	}

	return 0;
}

/**
 * Проверка, удовлетворяет ли версия клиента минимальным требованиям.
 * Возвращает true если clientVersion >= minSupportedVersion.
 */
export function isSemverSatisfied(
	clientVersion: string | null | undefined,
	minSupportedVersion: string,
): boolean {
	if (!clientVersion) return true;
	return compareSemver(clientVersion, minSupportedVersion) >= 0;
}

/**
 * Проверка, доступно ли обновление (latestVersion > clientVersion).
 */
export function isUpdateAvailable(
	clientVersion: string | null | undefined,
	latestVersion: string,
): boolean {
	if (!clientVersion) return true;
	return compareSemver(clientVersion, latestVersion) < 0;
}

/**
 * Комплексная оценка политики обновления для заданного клиента.
 */
export function evaluateOtaUpdatePolicy(
	clientVersion: string | undefined,
	latestVersion: string,
	minSupportedVersion: string,
): {
	updateAvailable: boolean;
	mandatory: boolean;
	isBlocked: boolean;
	reason?: string;
} {
	if (!clientVersion) {
		return {
			updateAvailable: true,
			mandatory: false,
			isBlocked: false,
		};
	}

	const satisfiesMin = isSemverSatisfied(clientVersion, minSupportedVersion);
	const hasNewer = isUpdateAvailable(clientVersion, latestVersion);

	if (!satisfiesMin) {
		return {
			updateAvailable: true,
			mandatory: true,
			isBlocked: true,
			reason: `Версия клиента ${clientVersion} ниже минимально поддерживаемой ${minSupportedVersion}. Требуется обязательное обновление.`,
		};
	}

	return {
		updateAvailable: hasNewer,
		mandatory: false,
		isBlocked: false,
		reason: hasNewer
			? `Доступна новая версия ${latestVersion}`
			: "Клиент использует актуальную версию",
	};
}
