import type { AppView } from "../workspaceShell";

/**
 * Граф сценариев переходов между разделами CRM.
 * Соседи по клиническому и рабочему сценарию, а не по алфавиту:
 * со склада идут за правилами списания в приём, из журнала стерилизации —
 * к остаткам лотков на складе, из воронки обращений — сразу записывать пациента.
 */
export const idleWorkspacePreloadPlan: Partial<Record<AppView, AppView[]>> = {
	shift: ["schedule", "patients"],
	schedule: ["visit", "patients", "documents"],
	patients: ["schedule", "documents"],
	imaging: ["settings"],
	visit: ["documents", "finance"],
	documents: ["finance"],
	finance: ["documents"],
	communications: ["patients"],
	settings: ["schedule", "marketing"],
	marketing: ["settings", "schedule"],
	inventory: ["scanner", "visit"],
	lab: ["inventory", "visit"],
	scanner: ["inventory"],
	leads: ["schedule", "patients"],
	pipeline: ["patients", "visit"],
	analytics: ["finance"],
};

export type WorkspacePreloadIntent = "explicit" | "idle" | "hover" | "cancel";

export type NetworkAwareNavigator = Navigator & {
	connection?: {
		effectiveType?: string;
		saveData?: boolean;
	};
	deviceMemory?: number;
};

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

/**
 * Определение слабых ПК (двухъядерные ноутбуки с 5400 RPM HDD и малым RAM <= 2-4 ГБ).
 */
export function isLowSpecDevice(): boolean {
	if (typeof document !== "undefined") {
		const docEl = document.documentElement;
		if (
			docEl.getAttribute("data-low-spec") === "true" ||
			docEl.getAttribute("data-hardware-tier") === "low" ||
			docEl.getAttribute("data-hardware-tier") === "potato" ||
			docEl.getAttribute("data-perf-tier") === "low" ||
			docEl.getAttribute("data-perf-tier") === "potato" ||
			docEl.getAttribute("data-perf-state") === "degraded" ||
			docEl.getAttribute("data-ct-active") === "true" ||
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

export function shouldPreloadWorkspaceRoutes(
	intent: WorkspacePreloadIntent,
	view?: AppView,
): boolean {
	if (intent === "cancel") return false;

	if (typeof document !== "undefined") {
		const docEl = document.documentElement;
		// When CT 3D rendering is active or performance is degraded, background idle preloading is suppressed
		if (
			(docEl.getAttribute("data-ct-active") === "true" ||
				docEl.getAttribute("data-perf-state") === "degraded") &&
			intent === "idle"
		) {
			return false;
		}
	}

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
