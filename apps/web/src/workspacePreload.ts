import { retryDynamicImport } from "./lib/lazyWithRetry";
import type { AppView } from "./workspaceShell";

const workspaceViewPreloaders: Partial<
	Record<AppView, () => Promise<unknown>>
> = {
	schedule: () => import("./ScheduleView"),
	patients: () => import("./PatientsView"),
	documents: () => import("./DocumentsView"),
	finance: () => import("./FinanceView"),
	communications: () => import("./CommunicationsView"),
	settings: () => import("./SettingsView"),
	marketing: () => import("./MarketingView"),
	shift: () => import("./ShiftView"),
	imaging: () => import("./ImagingView"),
	visit: () => import("./VisitView"),
	inventory: () => import("./components/InventoryView"),
	scanner: () => import("./ScannerView"),
	leads: () => import("./components/leads/LeadsKanbanView"),
	/*
	 * «Аналитика» была единственным из одиннадцати старых разделов без строки
	 * здесь: раздел объявлен в реестре и отрисован в App.tsx, но его модуль не
	 * предзагружался никогда — и это самый тяжёлый экран приложения (recharts).
	 * Нашлось новым стражем в tests/panelsAreMounted.test.ts, а не глазами.
	 */
	analytics: () => import("./pages/AnalyticsDashboardView"),
};

const idleWorkspacePreloadPlan: Partial<Record<AppView, AppView[]>> = {
	shift: ["schedule", "patients"],
	schedule: ["patients"],
	patients: ["schedule", "documents"],
	imaging: ["settings"],
	visit: ["documents", "finance"],
	documents: ["finance"],
	finance: ["documents"],
	communications: ["patients"],
	settings: ["schedule", "marketing"],
	marketing: ["settings", "schedule"],
	/*
	 * Соседи по рабочему сценарию, а не по алфавиту: со склада идут за правилами
	 * списания в приём, из журнала стерилизации — к остаткам лотков на складе,
	 * из воронки обращений — сразу записывать пациента.
	 */
	inventory: ["scanner", "visit"],
	scanner: ["inventory"],
	leads: ["schedule", "patients"],
	analytics: ["finance"],
};

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

export type WorkspacePreloadIntent = "explicit" | "idle" | "hover" | "cancel";

type NetworkAwareNavigator = Navigator & {
	connection?: {
		effectiveType?: string;
		saveData?: boolean;
	};
	deviceMemory?: number;
};

/** Кэш успешно запрошенных или находящихся в процессе загрузки разделов */
const preloadedViewCache = new Set<AppView>();

/**
 * Набор особо тяжелых разделов (3D КТ визуализация, многомегабайтные графики).
 * Они никогда не должны предзагружаться в фоновом режиме (idle) и требуют
 * дебаунсированного подтверждения намерения пользователя при наведении.
 */
export const HEAVY_WORKSPACE_VIEWS: ReadonlySet<AppView> = new Set<AppView>([
	"imaging",
	"analytics",
]);

export function isHeavyWorkspaceView(view: AppView): boolean {
	return HEAVY_WORKSPACE_VIEWS.has(view);
}

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

/**
 * Определение слабых ПК (двухъядерные ноутбуки с 5400 RPM HDD и малым RAM <= 2-4 ГБ).
 */
export function isLowSpecDevice(): boolean {
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
	if (typeof navigator === "undefined") return false;
	const nav = navigator as NetworkAwareNavigator;
	// Двухъядерный процессор врача (<= 2 физических ядер или <= 4 виртуальных потоков)
	if (
		typeof nav.hardwareConcurrency === "number" &&
		nav.hardwareConcurrency <= 4
	) {
		if (nav.hardwareConcurrency <= 2) return true;
		if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) {
			return true;
		}
	}
	// Малый объем ОЗУ (<= 4 ГБ) — типичный 10-летний ноутбук с 5400 RPM HDD
	if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) {
		return true;
	}
	return false;
}

function shouldPreloadWorkspaceRoutes(
	intent: WorkspacePreloadIntent,
	view?: AppView,
): boolean {
	if (intent === "cancel") return false;
	if (typeof navigator === "undefined") return true;
	const nav = navigator as NetworkAwareNavigator;
	const connection = nav.connection;

	if (connection) {
		// Принудительный режим экономии трафика / батареи (Save-Data) — фоновый прелоад запрещен
		if (connection.saveData) return false;

		const effectiveType = connection.effectiveType?.toLowerCase() ?? "";
		if (effectiveType === "slow-2g" || effectiveType === "2g") {
			return false;
		}

		// На слабом процессоре/диске и среднем 3G соединении не нагружаем канал и диск
		if (intent === "idle" && effectiveType === "3g" && isLowSpecDevice()) {
			return false;
		}
	}

	// Тяжелые модули (imaging, analytics) НИКОГДА не предзагружаются в фоновом режиме (idle),
	// чтобы не создавать дисковую очередь (I/O saturation) на 5400 RPM HDD и не забивать RAM
	// многомегабайтными 3D/графическими движками (Cornerstone, VTK, Recharts)
	if (intent === "idle" && view && isHeavyWorkspaceView(view)) {
		return false;
	}

	// На слабых машинах с 5400 RPM HDD фоновый idle-прелоад и hover-прелоад тяжелых модулей
	// запрещены: загрузка разрешена СТРОГО по прямому переходу пользователя (explicit)
	if (
		isLowSpecDevice() &&
		view &&
		isHeavyWorkspaceView(view) &&
		intent !== "explicit"
	) {
		return false;
	}

	return true;
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
