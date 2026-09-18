import { type ComponentType, type LazyExoticComponent, lazy } from "react";
import {
	safeSessionStorageGetItem,
	safeSessionStorageSetItem,
} from "./safeLocalStorage";

export interface LazyRetryOptions {
	/** Максимальное количество попыток (по умолчанию 3) */
	maxRetries?: number;
	/** Начальная задержка перед повтором в мс (по умолчанию 500) */
	intervalMs?: number;
	/** Множитель экспоненциального отката (по умолчанию 2) */
	backoffFactor?: number;
	/** Ключ для предотвращения повторных перезагрузок страницы */
	chunkReloadKey?: string;
	/** Callback при возникновении повторной попытки */
	onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

/**
 * Определение слабых ПК с медленными HDD 5400 RPM и малым объемом RAM (<= 4GB).
 * На таких устройствах очередь дискового ввода-вывода (I/O) и подкачка страниц (swap)
 * вызывают периодические задержки чтения скриптов до 1-3 секунд.
 */
export function isLowSpecHardware(): boolean {
	if (typeof document !== "undefined") {
		const docEl = document.documentElement;
		if (
			docEl.getAttribute("data-low-spec") === "true" ||
			docEl.getAttribute("data-hardware-tier") === "low" ||
			docEl.classList.contains("low-spec-mode")
		) {
			return true;
		}
	}
	if (typeof navigator !== "undefined") {
		const nav = navigator as {
			hardwareConcurrency?: number;
			deviceMemory?: number;
		};
		if (
			typeof nav.hardwareConcurrency === "number" &&
			nav.hardwareConcurrency <= 4
		) {
			return true;
		}
		if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) {
			return true;
		}
	}
	return false;
}

/**
 * Проверяет, является ли ошибка следствием сбоя чтения или загрузки чанка:
 * на медленном 5400 RPM HDD диск может не успеть отдать файл, либо после деплоя
 * обновился хэш в имени чанка.
 */
export function isChunkLoadError(error: unknown): boolean {
	if (!error) return false;
	const message = String(
		(error as { message?: string })?.message ?? error ?? "",
	).toLowerCase();
	return (
		message.includes("loading chunk") ||
		message.includes("failed to fetch dynamically imported module") ||
		message.includes("error loading dynamically imported module") ||
		message.includes("importing a module script failed") ||
		message.includes("networkerror") ||
		message.includes("failed to load") ||
		message.includes("chunkloaderror") ||
		message.includes("load failed") ||
		message.includes("dynamically imported module") ||
		message.includes("unable to load") ||
		message.includes("error resolving module specifier") ||
		message.includes("timed out")
	);
}

/**
 * Обертка над динамическим импортом с автоматическим повтором при задержке I/O
 * на медленных накопителях (HDD) и кратковременных сбоях сети.
 */
export async function retryDynamicImport<T>(
	importer: () => Promise<T>,
	options: LazyRetryOptions = {},
): Promise<T> {
	const isLowSpec = isLowSpecHardware();
	const {
		maxRetries = isLowSpec ? 4 : 3,
		intervalMs = isLowSpec ? 600 : 500,
		backoffFactor = 2,
		chunkReloadKey,
		onRetry,
	} = options;

	let lastError: unknown;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await importer();
		} catch (error) {
			lastError = error;

			if (attempt < maxRetries - 1) {
				const delay = Math.round(intervalMs * backoffFactor ** attempt);
				if (onRetry) {
					onRetry(attempt + 1, error, delay);
				}
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	// Если все попытки исчерпаны и это ошибка устаревшего чанка в браузере:
	// выполняем мягкую разовую перезагрузку страницы для получения свежего index.html
	if (
		isChunkLoadError(lastError) &&
		typeof window !== "undefined" &&
		typeof window.sessionStorage !== "undefined"
	) {
		const storageKey =
			chunkReloadKey ?? `dente_chunk_reload_${window.location.pathname}`;
		const hasReloaded = safeSessionStorageGetItem(storageKey);
		if (!hasReloaded) {
			safeSessionStorageSetItem(storageKey, "1", true);
			window.location.reload();
			// Возвращаем вечный промис пока страница перезагружается, чтобы не взрывать Suspense / ErrorBoundary
			return new Promise<never>(() => {});
		}
	}

	throw lastError;
}

/**
 * Безопасная обертка над React.lazy с автоматическим повтором при задержках I/O.
 * Поддерживает как дефолтные экспорты, так и маппинг именованных:
 * lazyWithRetry(() => import("./ScheduleView").then(m => ({ default: m.ScheduleView })))
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
	importer: () => Promise<{ default: T }>,
	options?: LazyRetryOptions,
): LazyExoticComponent<T> {
	return lazy(() => retryDynamicImport(importer, options));
}

/**
 * Вспомогательный хелпер для именованных экспортов без ручного .then(m => ({ default: m.X }))
 */
export function lazyWithNamedRetry<
	TModule extends Record<string, unknown>,
	TKey extends keyof TModule,
>(
	importer: () => Promise<TModule>,
	exportName: TKey,
	options?: LazyRetryOptions,
): LazyExoticComponent<
	TModule[TKey] extends ComponentType<unknown>
		? TModule[TKey]
		: ComponentType<unknown>
> {
	return lazyWithRetry(async () => {
		const mod = await importer();
		return { default: mod[exportName] as unknown as ComponentType<unknown> };
	}, options) as LazyExoticComponent<
		TModule[TKey] extends ComponentType<unknown>
			? TModule[TKey]
			: ComponentType<unknown>
	>;
}

/**
 * Упреждающая фоновая предзагрузка чанка с защитой от сбоев I/O на медленных HDD 5400 RPM.
 * Позволяет заранее прогревать тяжелые модули в моменты простоя (idle).
 */
export function preloadWithRetry<T>(
	importer: () => Promise<T>,
	options?: LazyRetryOptions,
): Promise<T> {
	return retryDynamicImport(importer, options);
}

