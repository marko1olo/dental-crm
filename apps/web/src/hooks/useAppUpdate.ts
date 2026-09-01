/**
 * useAppUpdate.ts — Хук фонового Over-The-Air (OTA) обновления и динамической оболочки.
 *
 * ФУНКЦИОНАЛ:
 * 1. Периодический опрос манифеста версий (при старте и каждые 15 минут).
 * 2. Фоновая загрузка и криптографическая проверка SHA-256 хеша бандла.
 * 3. Ненавязчивое уведомление пользователя о доступном обновлении с возможностью мгновенного применения.
 * 4. Защита от окирпичивания (Rollback / Anti-Brick Protection) при сбоях рендеринга.
 */

import {
	type MobileOtaVersionResponse,
	evaluateOtaUpdatePolicy,
	mobileOtaVersionResponseSchema,
} from "@dental/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { showToast } from "../components/GlobalToast";
import { logger } from "../utils/logger";

export const DEFAULT_BASE_VERSION = "2.4.0";
export const OTA_POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 минут
export const OTA_STABILIZATION_TIME_MS = 10000; // 10 секунд до фиксации стабильной версии
export const MAX_CONSECUTIVE_CRASHES_BEFORE_ROLLBACK = 2;

// Ключи локального хранилища
export const STORAGE_KEYS = {
	ACTIVE_VERSION: "dente_ota_active_version",
	ACTIVE_HASH: "dente_ota_active_hash",
	LAST_KNOWN_GOOD_VERSION: "dente_ota_last_known_good_version",
	PENDING_VERSION: "dente_ota_pending_version",
	PENDING_HASH: "dente_ota_pending_hash",
	CRASH_COUNT: "dente_ota_consecutive_crashes",
	LAST_BOOT_TIME: "dente_ota_last_boot_time",
	DISMISSED_VERSION: "dente_ota_dismissed_version",
} as const;

/**
 * Безопасное чтение из localStorage.
 */
export function safeGetStorage(key: string): string | null {
	try {
		if (typeof window !== "undefined" && window.localStorage) {
			return window.localStorage.getItem(key);
		}
	} catch {
		// Ignore storage access issues
	}
	return null;
}

/**
 * Безопасная запись в localStorage.
 */
export function safeSetStorage(key: string, value: string): void {
	try {
		if (typeof window !== "undefined" && window.localStorage) {
			window.localStorage.setItem(key, value);
		}
	} catch {
		// Ignore storage write issues
	}
}

/**
 * Безопасное удаление из localStorage.
 */
export function safeRemoveStorage(key: string): void {
	try {
		if (typeof window !== "undefined" && window.localStorage) {
			window.localStorage.removeItem(key);
		}
	} catch {
		// Ignore storage removal issues
	}
}

/**
 * Получение текущей активной версии приложения.
 */
export function getInstalledOtaVersion(): string {
	return (
		safeGetStorage(STORAGE_KEYS.ACTIVE_VERSION) ??
		(typeof window !== "undefined" &&
		(window as Window & { DENTE_BUILD_VERSION?: string })
			.DENTE_BUILD_VERSION
			? (window as Window & { DENTE_BUILD_VERSION?: string })
					.DENTE_BUILD_VERSION!
			: DEFAULT_BASE_VERSION)
	);
}

/**
 * Вычисление SHA-256 хеша для ArrayBuffer в браузере через Web Crypto API
 * или fallback для тестового окружения Node.js.
 */
export async function computeSha256(
	buffer: ArrayBuffer | Uint8Array,
): Promise<string> {
	if (
		typeof window !== "undefined" &&
		window.crypto &&
		window.crypto.subtle
	) {
		const rawBuffer =
			buffer instanceof Uint8Array
				? buffer.buffer.slice(
						buffer.byteOffset,
						buffer.byteOffset + buffer.byteLength,
					)
				: buffer;
		const hashBuffer = await window.crypto.subtle.digest(
			"SHA-256",
			rawBuffer as ArrayBuffer,
		);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	}

	// Node.js fallback для юнит-тестов
	try {
		const nodeCrypto = await import("node:crypto");
		const uint8 =
			buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
		return nodeCrypto
			.createHash("sha256")
			.update(uint8)
			.digest("hex");
	} catch {
		throw new Error(
			"Криптографический модуль SHA-256 недоступен в данном окружении",
		);
	}
}

/**
 * Регистрация успешного запуска приложения и фиксация стабильной версии.
 */
export function markAppBootStable(): void {
	const currentVersion = getInstalledOtaVersion();
	safeSetStorage(STORAGE_KEYS.LAST_KNOWN_GOOD_VERSION, currentVersion);
	safeSetStorage(STORAGE_KEYS.CRASH_COUNT, "0");
	safeSetStorage(STORAGE_KEYS.LAST_BOOT_TIME, new Date().toISOString());
	logger.info(
		`[OTA] Версия ${currentVersion} успешно стабилизирована и отмечена как Last Known Good.`,
	);
}

/**
 * Регистрация аварийного падения при старте и оценка необходимости отката.
 */
export function recordBootCrashAndCheckRollback(): {
	shouldRollback: boolean;
	rollbackVersion: string;
	crashCount: number;
} {
	const currentCrashes =
		Number.parseInt(safeGetStorage(STORAGE_KEYS.CRASH_COUNT) ?? "0", 10) +
		1;
	safeSetStorage(STORAGE_KEYS.CRASH_COUNT, String(currentCrashes));

	const lastKnownGood =
		safeGetStorage(STORAGE_KEYS.LAST_KNOWN_GOOD_VERSION) ??
		DEFAULT_BASE_VERSION;
	const shouldRollback =
		currentCrashes >= MAX_CONSECUTIVE_CRASHES_BEFORE_ROLLBACK;

	if (shouldRollback) {
		logger.error(
			`[OTA CRASH GUARD] Зафиксировано ${currentCrashes} сбоев подряд. Запускается аварийный откат на стабильную версию ${lastKnownGood}.`,
		);
		safeSetStorage(STORAGE_KEYS.ACTIVE_VERSION, lastKnownGood);
		safeSetStorage(STORAGE_KEYS.CRASH_COUNT, "0");
		safeRemoveStorage(STORAGE_KEYS.PENDING_VERSION);
		safeRemoveStorage(STORAGE_KEYS.PENDING_HASH);
	}

	return {
		shouldRollback,
		rollbackVersion: lastKnownGood,
		crashCount: currentCrashes,
	};
}

/**
 * Параметры хука обновления.
 */
export interface UseAppUpdateOptions {
	pollIntervalMs?: number;
	autoDownload?: boolean;
	notifyOnUpdate?: boolean;
	apiBaseUrl?: string;
	currentVersion?: string;
	fetchImpl?: typeof fetch;
}

/**
 * Возвращаемый интерфейс хука обновления.
 */
export interface UseAppUpdateResult {
	currentVersion: string;
	latestVersion: string | null;
	isChecking: boolean;
	isDownloading: boolean;
	updateAvailable: boolean;
	isMandatory: boolean;
	isDownloaded: boolean;
	isBlocked: boolean;
	releaseNotes: string | null;
	lastCheckedAt: Date | null;
	error: string | null;
	checkForUpdates: () => Promise<MobileOtaVersionResponse | null>;
	applyUpdate: () => void;
	dismissUpdate: () => void;
	rollbackToStable: () => void;
}

/**
 * Хук реактивного управления OTA обновлениями.
 */
export function useAppUpdate(
	options: UseAppUpdateOptions = {},
): UseAppUpdateResult {
	const {
		pollIntervalMs = OTA_POLL_INTERVAL_MS,
		autoDownload = true,
		notifyOnUpdate = true,
		apiBaseUrl = "/api/mobile",
		currentVersion: customCurrentVersion,
		fetchImpl = typeof window !== "undefined" ? window.fetch.bind(window) : fetch,
	} = options;

	const [currentVersion, setCurrentVersion] = useState<string>(() =>
		customCurrentVersion ?? getInstalledOtaVersion(),
	);
	const [latestVersion, setLatestVersion] = useState<string | null>(null);
	const [isChecking, setIsChecking] = useState<boolean>(false);
	const [isDownloading, setIsDownloading] = useState<boolean>(false);
	const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
	const [isMandatory, setIsMandatory] = useState<boolean>(false);
	const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
	const [isBlocked, setIsBlocked] = useState<boolean>(false);
	const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
	const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
	const [error, setError] = useState<string | null>(null);

	const downloadedBundleRef = useRef<{
		version: string;
		sha256: string;
		data: ArrayBuffer;
	} | null>(null);

	// Таймер стабилизации после старта
	useEffect(() => {
		const timer = setTimeout(() => {
			markAppBootStable();
		}, OTA_STABILIZATION_TIME_MS);

		return () => clearTimeout(timer);
	}, []);

	/**
	 * Проверка наличия новой версии на сервере.
	 */
	const checkForUpdates = useCallback(async (): Promise<MobileOtaVersionResponse | null> => {
		setIsChecking(true);
		setError(null);

		try {
			const url = `${apiBaseUrl}/version.json?clientVersion=${encodeURIComponent(
				currentVersion,
			)}&platform=web`;
			const response = await fetchImpl(url, {
				method: "GET",
				headers: {
					Accept: "application/json",
					"Cache-Control": "no-cache",
				},
			});

			if (!response.ok) {
				throw new Error(
					`Сервер OTA вернул ошибку: HTTP ${response.status} ${response.statusText}`,
				);
			}

			const data = (await response.json()) as unknown;
			const parseResult = mobileOtaVersionResponseSchema.safeParse(data);

			if (!parseResult.success) {
				throw new Error(
					`Некорректный формат манифеста OTA: ${parseResult.error.message}`,
				);
			}

			const manifest = parseResult.data;
			setLatestVersion(manifest.version);
			setReleaseNotes(manifest.releaseNotes);
			setLastCheckedAt(new Date());

			const policy = evaluateOtaUpdatePolicy(
				currentVersion,
				manifest.version,
				manifest.minSupportedVersion,
			);

			const hasUpdate = policy.updateAvailable;
			const isReq = manifest.mandatory || policy.mandatory;
			const isBlock = manifest.isDeprecated || policy.isBlocked;

			setUpdateAvailable(hasUpdate);
			setIsMandatory(isReq);
			setIsBlocked(isBlock);

			const dismissedVersion = safeGetStorage(
				STORAGE_KEYS.DISMISSED_VERSION,
			);

			// Автоматическая фоновая загрузка при обнаружении обновления
			if (hasUpdate && autoDownload && !isDownloaded) {
				void downloadBundle(manifest);
			} else if (
				hasUpdate &&
				notifyOnUpdate &&
				dismissedVersion !== manifest.version
			) {
				showToast(
					`Доступно обновление интерфейса DENTE v${manifest.version}`,
					"info",
					6000,
				);
			}

			return manifest;
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Неизвестная ошибка проверки OTA";
			logger.warn(`[OTA] Ошибка проверки обновлений: ${message}`);
			setError(message);
			return null;
		} finally {
			setIsChecking(false);
		}
	}, [
		apiBaseUrl,
		currentVersion,
		autoDownload,
		isDownloaded,
		notifyOnUpdate,
		fetchImpl,
	]);

	/**
	 * Фоновая загрузка и криптографическая валидация бандла.
	 */
	const downloadBundle = async (
		manifest: MobileOtaVersionResponse,
	): Promise<boolean> => {
		setIsDownloading(true);
		setError(null);

		try {
			const downloadUrl = manifest.downloadUrl.startsWith("http")
				? manifest.downloadUrl
				: `${apiBaseUrl.replace(/\/mobile$/, "")}${manifest.downloadUrl}`;

			logger.info(
				`[OTA] Начало фоновой загрузки бандла v${manifest.version}...`,
			);
			const res = await fetchImpl(downloadUrl, {
				method: "GET",
				headers: {
					Accept: "application/zip, application/octet-stream",
				},
			});

			if (!res.ok) {
				throw new Error(
					`Не удалось загрузить бандл: HTTP ${res.status}`,
				);
			}

			const arrayBuffer = await res.arrayBuffer();

			// Проверка целостности SHA-256
			const actualSha256 = await computeSha256(arrayBuffer);

			if (
				actualSha256.toLowerCase() !==
				manifest.bundleSha256.toLowerCase()
			) {
				throw new Error(
					`Нарушение целостности бандла: ожидался SHA-256 ${manifest.bundleSha256}, фактически получен ${actualSha256}`,
				);
			}

			downloadedBundleRef.current = {
				version: manifest.version,
				sha256: actualSha256,
				data: arrayBuffer,
			};

			safeSetStorage(STORAGE_KEYS.PENDING_VERSION, manifest.version);
			safeSetStorage(STORAGE_KEYS.PENDING_HASH, actualSha256);

			setIsDownloaded(true);
			logger.info(
				`[OTA] Бандл v${manifest.version} успешно загружен и верифицирован (SHA-256 OK).`,
			);

			if (notifyOnUpdate) {
				showToast(
					`Обновление DENTE v${manifest.version} готово к установке`,
					"success",
					7000,
				);
			}

			return true;
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Ошибка загрузки бандла обновления";
			logger.error(`[OTA] Сбой загрузки бандла: ${message}`);
			setError(message);
			setIsDownloaded(false);
			return false;
		} finally {
			setIsDownloading(false);
		}
	};

	/**
	 * Применение загруженного обновления и перезагрузка оболочки.
	 */
	const applyUpdate = useCallback(() => {
		const pendingVer =
			latestVersion ?? safeGetStorage(STORAGE_KEYS.PENDING_VERSION);
		const pendingHash = safeGetStorage(STORAGE_KEYS.PENDING_HASH);

		if (!pendingVer) {
			logger.warn(
				"[OTA] Нет готовой версии для применения обновления.",
			);
			return;
		}

		logger.info(
			`[OTA] Применение обновления: переключение на v${pendingVer}...`,
		);
		safeSetStorage(STORAGE_KEYS.ACTIVE_VERSION, pendingVer);
		if (pendingHash) {
			safeSetStorage(STORAGE_KEYS.ACTIVE_HASH, pendingHash);
		}
		safeRemoveStorage(STORAGE_KEYS.PENDING_VERSION);
		safeRemoveStorage(STORAGE_KEYS.PENDING_HASH);
		safeRemoveStorage(STORAGE_KEYS.DISMISSED_VERSION);

		// Сброс сервисного воркера / кэша оболочки при наличии
		if (typeof window !== "undefined") {
			try {
				navigator.serviceWorker?.controller?.postMessage({
					type: "DENTE_CLEAR_SHELL_CACHE",
				});
			} catch {
				// Ignore SW messaging issues
			}
			window.location.reload();
		}
	}, [latestVersion]);

	/**
	 * Отклонение уведомления об обновлении для текущей сессии.
	 */
	const dismissUpdate = useCallback(() => {
		if (latestVersion) {
			safeSetStorage(STORAGE_KEYS.DISMISSED_VERSION, latestVersion);
		}
		setUpdateAvailable(false);
	}, [latestVersion]);

	/**
	 * Принудительный откат на стабильную версию (Rollback).
	 */
	const rollbackToStable = useCallback(() => {
		const lastStable =
			safeGetStorage(STORAGE_KEYS.LAST_KNOWN_GOOD_VERSION) ??
			DEFAULT_BASE_VERSION;
		logger.warn(
			`[OTA] Ручной запуск отката на стабильную версию ${lastStable}`,
		);
		safeSetStorage(STORAGE_KEYS.ACTIVE_VERSION, lastStable);
		safeSetStorage(STORAGE_KEYS.CRASH_COUNT, "0");
		safeRemoveStorage(STORAGE_KEYS.PENDING_VERSION);
		safeRemoveStorage(STORAGE_KEYS.PENDING_HASH);

		if (typeof window !== "undefined") {
			window.location.reload();
		}
	}, []);

	// Периодический опрос и опрос при фокусе / восстановлении сети
	useEffect(() => {
		void checkForUpdates();

		const intervalTimer = setInterval(() => {
			void checkForUpdates();
		}, pollIntervalMs);

		const handleOnline = () => {
			logger.info("[OTA] Сеть восстановлена, внеочередная проверка OTA...");
			void checkForUpdates();
		};

		const handleVisibility = () => {
			if (
				typeof document !== "undefined" &&
				document.visibilityState === "visible"
			) {
				void checkForUpdates();
			}
		};

		if (typeof window !== "undefined") {
			window.addEventListener("online", handleOnline);
			document.addEventListener("visibilitychange", handleVisibility);
		}

		return () => {
			clearInterval(intervalTimer);
			if (typeof window !== "undefined") {
				window.removeEventListener("online", handleOnline);
				document.removeEventListener(
					"visibilitychange",
					handleVisibility,
				);
			}
		};
	}, [checkForUpdates, pollIntervalMs]);

	return {
		currentVersion,
		latestVersion,
		isChecking,
		isDownloading,
		updateAvailable,
		isMandatory,
		isDownloaded,
		isBlocked,
		releaseNotes,
		lastCheckedAt,
		error,
		checkForUpdates,
		applyUpdate,
		dismissUpdate,
		rollbackToStable,
	};
}
