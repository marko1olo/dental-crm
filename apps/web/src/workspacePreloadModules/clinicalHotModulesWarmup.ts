import {
	hydrateCatalogsFromPersistentStorage,
	warmupStatutoryCatalogs,
} from "../lib/apiCacheEngine";
import { retryDynamicImport } from "../lib/lazyWithRetry";
import { prewarmOfflineCachesToRam } from "../services/offline/offlineStorage";
import {
	clinicalHotModulePreloaders,
	CLINICAL_WARMUP_PRIORITY_ORDER,
	type ClinicalHotModule,
} from "./viewPreloadersMap";
import { isLowSpecDevice } from "./preloadGraphPlan";

export { hydrateCatalogsFromPersistentStorage, warmupStatutoryCatalogs };

type IdleDeadline = {
	didTimeout: boolean;
	timeRemaining: () => number;
};

type IdlePreloadWindow = Window &
	typeof globalThis & {
		requestIdleCallback?: (
			callback: (deadline: IdleDeadline) => void,
			options?: { timeout: number },
		) => number;
		cancelIdleCallback?: (handle: number) => void;
	};

const preloadedClinicalHotModules = new Set<ClinicalHotModule>();

/**
 * Прогрев клинических модулей горячего пути врача (расписание -> приём/ЭМК -> зубная формула -> касса/оплата -> документы/043/у)
 * и прогрев регламентных справочников (804н, МКБ-10, шаблоны 043/у) в IndexedDB и L1 RAM.
 * Выполняется строго во время покоя (requestIdleCallback / setTimeout с минимальным приоритетом),
 * исключая параллельную конкуренцию за медленный 5400 RPM HDD и фризы 2-ядерных CPU Celeron/Pentium.
 */
export function scheduleClinicalHotModulesWarmup(): (() => void) | undefined {
	if (typeof window === "undefined") return undefined;
	if (typeof document !== "undefined") {
		const docEl = document.documentElement;
		if (docEl.getAttribute("data-ct-active") === "true") {
			return undefined;
		}
	}

	// Запускаем фоновый прогрев и гидратацию кэша справочников (804н, МКБ-10, шаблоны 043/у) и офлайн-кэшей из IndexedDB в RAM во время idle (0 мс доступ)
	const idleWindow = window as IdlePreloadWindow;
	if (idleWindow.requestIdleCallback) {
		idleWindow.requestIdleCallback(
			() => {
				void warmupStatutoryCatalogs().catch(() => {});
				void prewarmOfflineCachesToRam().catch(() => {});
			},
			{ timeout: 5000 },
		);
	} else {
		window.setTimeout(() => {
			void warmupStatutoryCatalogs().catch(() => {});
			void prewarmOfflineCachesToRam().catch(() => {});
		}, 1000);
	}

	const modulesToWarm = CLINICAL_WARMUP_PRIORITY_ORDER.filter(
		(key) => !preloadedClinicalHotModules.has(key),
	);

	if (!modulesToWarm.length) return undefined;

	const lowSpec = isLowSpecDevice();
	let cancelled = false;
	let timerId: number | null = null;
	let idleId: number | null = null;
	let stepIndex = 0;

	const clearHandles = () => {
		if (timerId !== null) {
			window.clearTimeout(timerId);
			timerId = null;
		}
		if (idleId !== null && idleWindow.cancelIdleCallback) {
			idleWindow.cancelIdleCallback(idleId);
			idleId = null;
		}
	};

	const executeNext = () => {
		if (cancelled || stepIndex >= modulesToWarm.length) return;
		const modKey = modulesToWarm[stepIndex];
		stepIndex++;
		if (!modKey) return;

		if (!preloadedClinicalHotModules.has(modKey)) {
			preloadedClinicalHotModules.add(modKey);
			const preloader = clinicalHotModulePreloaders[modKey];
			if (preloader) {
				void retryDynamicImport(preloader, {
					maxRetries: 2,
					intervalMs: lowSpec ? 1500 : 1000,
					backoffFactor: 2,
				}).catch((error) => {
					preloadedClinicalHotModules.delete(modKey);
					if (typeof console !== "undefined" && console.warn) {
						console.warn(
							`[preload:warmup] Ошибка фонового прогрева модуля ${modKey}:`,
							error,
						);
					}
				});
			}
		}

		if (stepIndex < modulesToWarm.length && !cancelled) {
			// Дозируем нагрузку на диск: даем механическому 5400 RPM HDD время на спокойное чтение без конкуренции (3000 мс на lowSpec, 1200 мс на обычном ПК)
			scheduleNext(lowSpec ? 3000 : 1200);
		}
	};

	const scheduleNext = (delayMs: number) => {
		clearHandles();
		if (cancelled) return;

		timerId = window.setTimeout(() => {
			timerId = null;
			if (cancelled) return;

			if (idleWindow.requestIdleCallback) {
				idleId = idleWindow.requestIdleCallback(
					(deadline) => {
						idleId = null;
						if (cancelled) return;
						if (deadline.timeRemaining() > 10 || deadline.didTimeout) {
							executeNext();
						} else {
							// Главный поток занят — не забиваем Celeron CPU, пробуем через паузу
							scheduleNext(lowSpec ? 2500 : 1200);
						}
					},
					{ timeout: lowSpec ? 7000 : 3500 },
				);
			} else {
				executeNext();
			}
		}, delayMs);
	};

	// Начальный старт: 4000 мс на lowSpec / 1800 мс на обычном ПК, чтобы первый экран отрисовался без помех I/O
	scheduleNext(lowSpec ? 4000 : 1800);

	return () => {
		cancelled = true;
		clearHandles();
	};
}
