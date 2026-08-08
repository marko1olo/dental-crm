import type { StaffRole } from "@dental/shared";

export const appViews = [
	"shift",
	"schedule",
	"patients",
	"imaging",
	"visit",
	"documents",
	"finance",
	"analytics",
	"communications",
	"inventory",
	"scanner",
	"leads",
	"settings",
	"marketing",
] as const;

export type AppView = (typeof appViews)[number];

export const viewLabels: Record<AppView, string> = {
	shift: "Смена",
	schedule: "Записи",
	patients: "Пациенты",
	imaging: "Снимки",
	visit: "Прием",
	documents: "Документы",
	finance: "Оплаты",
	analytics: "Аналитика",
	communications: "Связь",
	inventory: "Склад",
	scanner: "Стерилизация",
	leads: "Обращения",
	settings: "Настройки",
	marketing: "Маркетинг/SEO",
};

export const viewHints: Record<AppView, string> = {
	shift: "что делать сейчас",
	schedule: "очередь, врачи и кресла",
	patients: "карточки и контакты",
	imaging: "рентген, КЛКТ и КТ",
	visit: "прием и диктовка",
	documents: "договоры и справки",
	finance: "оплаты и долги",
	analytics: "отчеты и воронки",
	communications: "сообщения и задачи",
	inventory: "материалы, остатки и сроки",
	scanner: "лотки и журнал автоклава",
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
			"imaging",
			"visit",
			"documents",
			"analytics",
			"communications",
			"inventory",
			"scanner",
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
			"scanner",
		];
	}
	if (role === "administrator") {
		return [
			"schedule",
			"patients",
			"documents",
			"finance",
			"analytics",
			"communications",
			"inventory",
			"leads",
			"settings",
		];
	}
	if (role === "manager") {
		return [
			"schedule",
			"patients",
			"finance",
			"analytics",
			"communications",
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
	{ id: "clinic", title: "Клиника", group: "main" },
	{ id: "modules", title: "Модули", group: "main" },
	{ id: "staff", title: "Сотрудники", group: "main" },
	{ id: "access", title: "Доступы", group: "main" },
	{ id: "telegram", title: "Мессенджеры", group: "main" },
	{ id: "protocols", title: "Протоколы", group: "clinical" },
	{ id: "rules", title: "Правила", group: "clinical" },
	{ id: "prices", title: "Прайс", group: "clinical" },
	{ id: "ai", title: "ИИ", group: "clinical" },
	{ id: "insurance", title: "Страховые", group: "stock" },
	{ id: "marketing", title: "Отзывы и NPS", group: "marketing" },
	{ id: "bpmn", title: "Сценарии", group: "marketing" },
	{ id: "sources", title: "Источники", group: "system" },
	{ id: "reporting", title: "Отчёты", group: "system" },
	{ id: "imports", title: "Импорт", group: "system" },
	{ id: "audit", title: "Аудит", group: "system" },
] as const;

export type SettingsTab = (typeof settingsTabs)[number]["id"];

export function viewFromHash(): AppView {
	if (typeof window === "undefined") return "shift";
	const hash = window.location.hash.replace("#", "");
	const view = hash.split("/")[0] ?? "";
	return (appViews as readonly string[]).includes(view)
		? (view as AppView)
		: "shift";
}

export function settingsTabFromHash(): SettingsTab {
	if (typeof window === "undefined") return "clinic";
	const hashParts = window.location.hash.replace("#", "").split("/");
	const tab = hashParts[1];
	if (!tab) return "clinic";
	const candidate = tab;
	return settingsTabs.some((item) => item.id === candidate)
		? (candidate as SettingsTab)
		: "clinic";
}
