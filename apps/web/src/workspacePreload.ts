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

export type WorkspacePreloadIntent = "explicit" | "idle";

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
 * Определение слабых ПК (двухъядерные ноутбуки с 5400 RPM HDD и малым RAM <= 2-4 ГБ).
 */
export function isLowSpecDevice(): boolean {
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

function shouldPreloadWorkspaceRoutes(intent: WorkspacePreloadIntent): boolean {
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

	// На слабых машинах (<=4GB RAM, <=4 ядра, медленный 5400 RPM HDD) фоновый idle-прелоад отключается,
	// чтобы не занимать диск фоновым парсингом тяжелых бандлов во время приёма пациента
	if (intent === "idle" && isLowSpecDevice()) {
		return false;
	}

	return true;
}

export function preloadWorkspaceView(
	view: AppView,
	intent: WorkspacePreloadIntent = "explicit",
) {
	if (!shouldPreloadWorkspaceRoutes(intent)) return;
	const preloader = workspaceViewPreloaders[view];
	if (!preloader) return;

	// Защита от дублирующих запросов и дисковой очереди на 5400 RPM HDD
	if (preloadedViewCache.has(view)) return;
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

	let preloadViews = (idleWorkspacePreloadPlan[currentView] ?? []).filter(
		(view) => !preloadedViewCache.has(view),
	);
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
			scheduleStep(lowSpec ? 4000 : 1800);
		}
	};

	const scheduleStep = (delayMs: number) => {
		clearScheduled();
		if (cancelled) return;

		if (idleWindow.requestIdleCallback) {
			currentIdleHandle = idleWindow.requestIdleCallback(
				(deadline) => {
					// Предотвращаем фризы UI: выполняем только если есть время в текущем кадре
					// (> 10 мс на слабых двухъядерных ПК) или если браузер уведомил о таймауте
					if (deadline.timeRemaining() > 10 || deadline.didTimeout) {
						processNextView();
					} else {
						// CPU или рендер занят — переносим на следующий квант покоя
						scheduleStep(1200);
					}
				},
				{ timeout: lowSpec ? 5000 : 2500 },
			);
		} else {
			// Мягкий fallback для браузеров без requestIdleCallback
			currentTimerHandle = window.setTimeout(processNextView, delayMs);
		}
	};

	// Начальный старт: даем активному экрану врача полностью отрисоваться и диску 5400 RPM успокоиться (5 сек на lowSpec)
	scheduleStep(lowSpec ? 5000 : 1500);

	return () => {
		cancelled = true;
		clearScheduled();
	};
}
