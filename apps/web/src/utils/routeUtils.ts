import type { StaffRole } from "@dental/shared";

export const appViews = [
	"shift",
	"schedule",
	"patients",
	"pipeline",
	"imaging",
	"visit",
	"documents",
	"finance",
	"analytics",
	"communications",
	"inventory",
	"lab",
	"scanner",
	"leads",
	"settings",
	"marketing",
] as const;

export type AppView = (typeof appViews)[number];

export function isAppView(view: unknown): view is AppView {
	return typeof view === "string" && (appViews as readonly string[]).includes(view);
}

export const viewLabels: Record<AppView, string> = {
	shift: "Смена",
	schedule: "Записи",
	patients: "Пациенты",
	pipeline: "Планы лечения",
	imaging: "Снимки",
	visit: "Прием",
	documents: "Документы",
	finance: "Оплаты",
	analytics: "Аналитика",
	communications: "Связь",
	inventory: "Склад",
	lab: "Лаборатория",
	scanner: "Стерилизация",
	leads: "Обращения",
	settings: "Настройки",
	marketing: "Маркетинг",
};

export const viewHints: Record<AppView, string> = {
	shift: "что делать сейчас",
	schedule: "очередь, врачи и кресла",
	patients: "карточки и контакты",
	pipeline: "воронка планов лечения координатора",
	imaging: "рентген, КЛКТ и КТ",
	visit: "прием и диктовка",
	documents: "договоры и справки",
	finance: "оплаты и долги",
	analytics: "отчеты и воронки",
	communications: "сообщения и задачи",
	inventory: "материалы, остатки и сроки",
	lab: "наряды в лабораторию, коронки и слепки",
	scanner: "журналы очистки, автоклава, отходов",
	leads: "звонки и заявки до записи",
	settings: "клиника, импорт и доступы",
	marketing: "продвижение и отзывы",
};

export function getFilteredAppViews(role: StaffRole): AppView[] {
	if (role === "doctor") {
		return [
			"shift",
			"schedule",
			"patients",
			"pipeline",
			"imaging",
			"visit",
			"documents",
			"analytics",
			"communications",
			"inventory",
			"lab",
			"scanner",
			"settings",
		];
	}
	if (role === "assistant") {
		return [
			"shift",
			"schedule",
			"patients",
			"imaging",
			"documents",
			"communications",
			"inventory",
			"lab",
			"scanner",
		];
	}
	if (role === "administrator") {
		return [
			"schedule",
			"patients",
			"pipeline",
			"documents",
			"finance",
			"analytics",
			"communications",
			"inventory",
			"lab",
			"leads",
			"settings",
		];
	}
	if (role === "manager") {
		return [
			"schedule",
			"patients",
			"pipeline",
			"finance",
			"analytics",
			"communications",
			"inventory",
			"lab",
			"leads",
			"settings",
		];
	}
	if (role === "owner") {
		return Array.from(appViews);
	}
	return Array.from(appViews);
}

export function getFallbackAppView(role: StaffRole): AppView {
	const [firstAllowed] = getFilteredAppViews(role);
	return firstAllowed ?? "shift";
}

export const settingsTabs = [
	{ id: "profile", title: "Мой профиль", group: "account" },
	{ id: "preferences", title: "Клинические пресеты", group: "clinical" },
	{ id: "clinic", title: "Клиника", group: "main" },
	{ id: "modules", title: "Модули", group: "main" },
	{ id: "staff", title: "Сотрудники", group: "main" },
	{ id: "commissions", title: "Комиссии и ЗП", group: "main" },
	{ id: "access", title: "Доступы", group: "main" },
	{ id: "telegram", title: "Мессенджеры", group: "main" },
	{ id: "hardware", title: "Оборудование", group: "main" },
	{ id: "protocols", title: "Протоколы", group: "clinical" },
	{ id: "rules", title: "Правила", group: "clinical" },
	{ id: "procedure-boms", title: "Технологические карты", group: "clinical" },
	{ id: "prices", title: "Прайс", group: "clinical" },
	{ id: "ai", title: "ИИ", group: "clinical" },
	{ id: "insurance", title: "Страховые", group: "stock" },
	{ id: "marketing", title: "Отзывы и NPS", group: "marketing" },
	{ id: "bpmn", title: "Сценарии", group: "marketing" },
	{ id: "sources", title: "Источники", group: "system" },
	{ id: "reporting", title: "Отчёты", group: "system" },
	{ id: "imports", title: "Импорт", group: "system" },
	{ id: "backup", title: "Резервная копия", group: "system" },
	{ id: "audit", title: "Аудит", group: "system" },
	{ id: "deep-clinical", title: "Автономия и ЭМК", group: "clinical" },
] as const;

export type SettingsTab = (typeof settingsTabs)[number]["id"];

export function viewFromHash(customHash?: string): AppView {
	const raw = customHash !== undefined ? customHash : (typeof window !== "undefined" ? window.location.hash : "");
	const hash = (raw.replace(/^#\/?/, "").split("?")[0] ?? "");
	const parts = hash.split("/").filter(Boolean);
	const view = parts[0]?.toLowerCase() ?? "";
	if (view === "visits") return "visit";
	if (view === "sanpin" || view === "sterilization") return "scanner";
	if (view === "cmo" || view === "payout" || view === "payouts" || view === "payroll") return "analytics";
	if (view === "telephony") return "communications";
	if (view === "lab-orders" || view === "lab_orders") return "lab";
	if (view === "invoices" || view === "billing" || view === "cashbox" || view === "payments") return "finance";
	if (view === "warehouse" || view === "stock") return "inventory";
	if (view === "radiology" || view === "ct" || view === "cbct") return "imaging";
	if (
		view === "recalls" ||
		view === "recall" ||
		view === "recall-candidates" ||
		view === "prevention"
	) {
		return "patients";
	}
	if (view === "queue") return "shift";
	return (appViews as readonly string[]).includes(view)
		? (view as AppView)
		: "shift";
}

export function settingsTabFromHash(): SettingsTab {
	if (typeof window === "undefined") return "clinic";
	const cleanHash = window.location.hash.replace("#", "").split("?")[0] ?? "";
	const hashParts = cleanHash
		.split("/")
		.filter(Boolean);
	const tab = hashParts[1];
	if (!tab) return "clinic";
	if (tab === "messengers") return "telegram";
	if (tab === "cashbox" || tab === "fiscal" || tab === "requisites") return "clinic";
	const candidate = tab;
	return settingsTabs.some((item) => item.id === candidate)
		? (candidate as SettingsTab)
		: "clinic";
}
