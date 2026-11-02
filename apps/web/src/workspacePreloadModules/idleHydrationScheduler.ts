import { retryDynamicImport } from "../lib/lazyWithRetry";
import type { AppView } from "../workspaceShell";
import { workspaceViewPreloaders } from "./viewPreloadersMap";
import {
	idleWorkspacePreloadPlan,
	isHeavyWorkspaceView,
	isLowSpecDevice,
	shouldPreloadWorkspaceRoutes,
	type WorkspacePreloadIntent,
} from "./preloadGraphPlan";

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

/** Кэш успешно запрошенных или находящихся в процессе загрузки разделов */
const preloadedViewCache = new Set<AppView>();

const heavyPreloadTimers = new Map<AppView, number>();
const hoverPreloadTimers = new Map<AppView, number>();

/**
 * Отменяет запланированную предзагрузку раздела при отводе курсора (pointer leave / blur).
 */
export function cancelHeavyViewPreload(view?: AppView): void {
	if (typeof window === "undefined") return;
	if (view) {
		const timer = heavyPreloadTimers.get(view);
		if (timer !== undefined) {
			window.clearTimeout(timer);
			heavyPreloadTimers.delete(view);
		}
		const hoverTimer = hoverPreloadTimers.get(view);
		if (hoverTimer !== undefined) {
			window.clearTimeout(hoverTimer);
			hoverPreloadTimers.delete(view);
		}
	} else {
		for (const timer of heavyPreloadTimers.values()) {
			window.clearTimeout(timer);
		}
		heavyPreloadTimers.clear();
		for (const timer of hoverPreloadTimers.values()) {
			window.clearTimeout(timer);
		}
		hoverPreloadTimers.clear();
	}
}

export function preloadWorkspaceView(
	view: AppView,
	intent: WorkspacePreloadIntent = "explicit",
) {
	if (intent === "cancel") {
		cancelHeavyViewPreload(view);
		return;
	}

	if (!shouldPreloadWorkspaceRoutes(intent, view)) return;
	const preloader = workspaceViewPreloaders[view];
	if (!preloader) return;

	// Защита от дублирующих запросов и дисковой очереди на 5400 RPM HDD
	if (preloadedViewCache.has(view)) return;

	// Для тяжелых модулей (imaging, analytics) предотвращаем случайный запуск
	// при быстром движении мыши по меню. Загрузка откладывается на квант времени
	// (400 мс на десктопе, 800 мс на слабом ПК) и исполняется строго через
	// requestIdleCallback, чтобы исключить забивание диска параллельными операциями.
	if (isHeavyWorkspaceView(view)) {
		if (intent === "idle") {
			return; // В idle тяжелые модули никогда не грузятся автоматически
		}
		// На слабых машинах с 5400 RPM HDD тяжелые модули (3D КТ, Cornerstone, Recharts)
		// грузятся ИСКЛЮЧИТЕЛЬНО по прямому клику (explicit), предотвращая фриз очереди I/O
		if (isLowSpecDevice() && intent !== "explicit") {
			return;
		}
		cancelHeavyViewPreload(view);
		if (typeof window === "undefined") return;

		const delay = isLowSpecDevice() ? 800 : 400;
		const timerId = window.setTimeout(() => {
			heavyPreloadTimers.delete(view);
			if (preloadedViewCache.has(view)) return;
			preloadedViewCache.add(view);

			const idleWindow = window as IdlePreloadWindow;
			const executeLoad = () => {
				void retryDynamicImport(preloader, {
					maxRetries: 2,
					intervalMs: 800,
					backoffFactor: 2,
				}).catch((error) => {
					preloadedViewCache.delete(view);
					if (typeof console !== "undefined" && console.warn) {
						console.warn(
							`[preload] Не удалось предзагрузить тяжелый раздел ${view}:`,
							error,
						);
					}
				});
			};

			if (idleWindow.requestIdleCallback) {
				idleWindow.requestIdleCallback(executeLoad, {
					timeout: isLowSpecDevice() ? 6000 : 3000,
				});
			} else {
				executeLoad();
			}
		}, delay);

		heavyPreloadTimers.set(view, timerId);
		return;
	}

	// Для обычных разделов при hover:
	// На слабых машинах с 5400 RPM HDD и 4GB RAM не допускаем немедленной загрузки при случайном
	// скольжении мыши по боковому меню. Дебаунсим на 500 мс и исполняем через requestIdleCallback.
	if (intent === "hover") {
		if (typeof window === "undefined") return;
		const existingTimer = hoverPreloadTimers.get(view);
		if (existingTimer !== undefined) return;

		const delay = isLowSpecDevice() ? 500 : 80;
		const timerId = window.setTimeout(() => {
			hoverPreloadTimers.delete(view);
			if (preloadedViewCache.has(view)) return;
			preloadedViewCache.add(view);

			const idleWindow = window as IdlePreloadWindow;
			const executeLoad = () => {
				void retryDynamicImport(preloader, {
					maxRetries: 2,
					intervalMs: 800,
					backoffFactor: 2,
				}).catch((error) => {
					preloadedViewCache.delete(view);
					if (typeof console !== "undefined" && console.warn) {
						console.warn(
							`[preload] Не удалось предзагрузить раздел ${view}:`,
							error,
						);
					}
				});
			};

			if (idleWindow.requestIdleCallback) {
				idleWindow.requestIdleCallback(executeLoad, {
					timeout: isLowSpecDevice() ? 5000 : 2500,
				});
			} else {
				executeLoad();
			}
		}, delay);

		hoverPreloadTimers.set(view, timerId);
		return;
	}

	cancelHeavyViewPreload(view);
	preloadedViewCache.add(view);

	void retryDynamicImport(preloader, {
		maxRetries: intent === "explicit" ? 3 : 2,
		intervalMs: intent === "explicit" ? 400 : 800,
		backoffFactor: 2,
	}).catch((error) => {
		// При сбое сбрасываем кэш, чтобы последующий клик пользователя мог повторить запрос
		preloadedViewCache.delete(view);
		if (typeof console !== "undefined" && console.warn) {
			console.warn(`[preload] Не удалось предзагрузить раздел ${view}:`, error);
		}
	});
}

export function scheduleIdleWorkspacePreload(
	currentView: AppView,
): (() => void) | undefined {
	if (typeof window === "undefined") return undefined;
	if (typeof document !== "undefined") {
		const docEl = document.documentElement;
		if (
			docEl.getAttribute("data-ct-active") === "true" ||
			docEl.getAttribute("data-perf-tier") === "potato" ||
			docEl.getAttribute("data-hardware-tier") === "potato"
		) {
			return undefined;
		}
	}
	if (!shouldPreloadWorkspaceRoutes("idle")) return undefined;

	let preloadViews = (idleWorkspacePreloadPlan[currentView] ?? [])
		.filter((view) => !preloadedViewCache.has(view))
		.filter((view) => !isHeavyWorkspaceView(view)); // Тяжелые модули исключены из фонового плана

	if (!preloadViews.length) return undefined;

	// На слабых 2-ядерных ноутбуках врача ограничиваемся 1 наиболее вероятным разделом,
	// чтобы не создавать дисковую конкуренцию и не подвешивать медленный 5400 RPM HDD
	const lowSpec = isLowSpecDevice();
	if (lowSpec) {
		preloadViews = preloadViews.slice(0, 1);
	}

	const idleWindow = window as IdlePreloadWindow;
	let cancelled = false;
	let currentIdleHandle: number | null = null;
	let currentTimerHandle: number | null = null;

	const clearScheduled = () => {
		if (currentIdleHandle !== null && idleWindow.cancelIdleCallback) {
			idleWindow.cancelIdleCallback(currentIdleHandle);
			currentIdleHandle = null;
		}
		if (currentTimerHandle !== null) {
			window.clearTimeout(currentTimerHandle);
			currentTimerHandle = null;
		}
	};

	let queueIndex = 0;

	const processNextView = () => {
		if (cancelled || queueIndex >= preloadViews.length) return;
		const view = preloadViews[queueIndex];
		queueIndex++;
		if (!view) return;

		preloadWorkspaceView(view, "idle");

		if (queueIndex < preloadViews.length && !cancelled) {
			// Дозируем нагрузку на диск: даем HDD время на спокойное чтение первого раздела
			scheduleStep(lowSpec ? 4500 : 2000);
		}
	};

	const scheduleStep = (delayMs: number) => {
		clearScheduled();
		if (cancelled) return;

		// КРИТИЧЕСКИ ВАЖНО ДЛЯ 5400 RPM HDD:
		// Сначала выдерживаем гарантированную временную задержку (delayMs) через setTimeout,
		// чтобы диск и главный поток завершили фазу интерактивного старта и рендера.
		// И ТОЛЬКО ПОСЛЕ ЭТОГО запрашиваем свободный квант времени через requestIdleCallback.
		// Это исключает насыщение очереди диска (I/O queue saturation) на 5400 RPM HDD
		// в критические моменты рендеринга активного экрана.
		currentTimerHandle = window.setTimeout(() => {
			currentTimerHandle = null;
			if (cancelled) return;

			if (idleWindow.requestIdleCallback) {
				currentIdleHandle = idleWindow.requestIdleCallback(
					(deadline) => {
						currentIdleHandle = null;
						if (cancelled) return;
						// Предотвращаем фризы UI: выполняем только если есть время в текущем кадре
						// (> 10 мс на слабых двухъядерных ПК) или если браузер уведомил о таймауте
						if (deadline.timeRemaining() > 10 || deadline.didTimeout) {
							processNextView();
						} else {
							// CPU или рендер занят — переносим на следующий квант покоя
							scheduleStep(1500);
						}
					},
					{ timeout: lowSpec ? 6000 : 3000 },
				);
			} else {
				processNextView();
			}
		}, delayMs);
	};

	// Начальный старт: даем активному экрану врача полностью отрисоваться и диску 5400 RPM успокоиться (5 сек на lowSpec, 2 сек на обычном ПК)
	scheduleStep(lowSpec ? 5000 : 2000);

	return () => {
		cancelled = true;
		clearScheduled();
	};
}
