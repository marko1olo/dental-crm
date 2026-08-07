import type { AppView } from "../workspaceShell";

export const appViews: readonly AppView[] = [
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
