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

type IdlePreloadWindow = Window &
	typeof globalThis & {
		requestIdleCallback?: (
			callback: () => void,
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
};

function shouldPreloadWorkspaceRoutes(intent: WorkspacePreloadIntent): boolean {
	if (typeof navigator === "undefined") return true;
	const connection = (navigator as NetworkAwareNavigator).connection;
	if (!connection) return true;
	if (connection.saveData) return false;
	const effectiveType = connection.effectiveType?.toLowerCase() ?? "";
	if (
		intent === "idle" &&
		(effectiveType === "slow-2g" || effectiveType === "2g")
	)
		return false;
	return true;
}

export function preloadWorkspaceView(
	view: AppView,
	intent: WorkspacePreloadIntent = "explicit",
) {
	if (!shouldPreloadWorkspaceRoutes(intent)) return;
	void workspaceViewPreloaders[view]?.();
}

export function scheduleIdleWorkspacePreload(
	currentView: AppView,
): (() => void) | undefined {
	if (typeof window === "undefined") return undefined;
	if (!shouldPreloadWorkspaceRoutes("idle")) return undefined;
	const preloadViews = idleWorkspacePreloadPlan[currentView] ?? [];
	if (!preloadViews.length) return undefined;
	const idleWindow = window as IdlePreloadWindow;
	const preloadLikelyRoutes = () => {
		preloadViews.forEach((view) => preloadWorkspaceView(view, "idle"));
	};
	if (idleWindow.requestIdleCallback) {
		const idleHandle = idleWindow.requestIdleCallback(preloadLikelyRoutes, {
			timeout: 1600,
		});
		return () => idleWindow.cancelIdleCallback?.(idleHandle);
	}
	const preloadTimer = window.setTimeout(preloadLikelyRoutes, 1200);
	return () => window.clearTimeout(preloadTimer);
}
