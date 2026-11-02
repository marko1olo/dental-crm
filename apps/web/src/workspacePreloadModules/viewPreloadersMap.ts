import type { AppView } from "../workspaceShell";

/**
 * Словарь динамических импортов для разделов рабочего пространства.
 * Используется для прогрева и упреждающей загрузки бандлов разделов.
 */
export const workspaceViewPreloaders: Partial<
	Record<AppView, () => Promise<unknown>>
> = {
	schedule: () => import("../ScheduleView"),
	patients: () => import("../PatientsView"),
	documents: () => import("../DocumentsView"),
	finance: () => import("../FinanceView"),
	communications: () => import("../CommunicationsView"),
	settings: () => import("../SettingsView"),
	marketing: () => import("../MarketingView"),
	shift: () => import("../ShiftView"),
	imaging: () => import("../ImagingView"),
	visit: () => import("../VisitView"),
	inventory: () => import("../components/InventoryView"),
	scanner: () => import("../ScannerView"),
	leads: () => import("../components/leads/LeadsKanbanView"),
	lab: () => import("../pages/LabOrdersPage"),
	pipeline: () => import("../pages/coordinator/TreatmentPipeline"),
	/*
	 * «Аналитика» — самый тяжёлый экран приложения (recharts).
	 * Предзагружается при наличии ресурсов или explicit переходе.
	 */
	analytics: () => import("../pages/AnalyticsDashboardView"),
};

export type ClinicalHotModule =
	| "scheduleView"
	| "visitView"
	| "visitEmkTab"
	| "odontogramViewContainer"
	| "paymentCapture"
	| "documentsView";

/**
 * Канонический приоритет последовательного прогрева для HDD 5400 RPM и Celeron:
 * 1. Расписание (первый экран врача и регистратора)
 * 2. Визит (открытие приёма пациента)
 * 3. Вкладка ЭМК визита (дневники, протоколы)
 * 4. Одонтограмма (интерактивная зубная формула)
 * 5. Касса и фиксация оплаты (54-ФЗ)
 * 6. Печать документов и согласий (043/у)
 */
export const CLINICAL_WARMUP_PRIORITY_ORDER: readonly ClinicalHotModule[] = [
	"scheduleView",
	"visitView",
	"visitEmkTab",
	"odontogramViewContainer",
	"paymentCapture",
	"documentsView",
] as const;

export const clinicalHotModulePreloaders: Record<
	ClinicalHotModule,
	() => Promise<unknown>
> = {
	scheduleView: () => import("../ScheduleView"),
	visitView: () => import("../VisitView"),
	visitEmkTab: () => import("../components/visit/VisitEmkTab"),
	odontogramViewContainer: () =>
		import("../components/odontogram/OdontogramViewContainer"),
	paymentCapture: () => import("../PaymentCapture"),
	documentsView: () => import("../DocumentsView"),
};
