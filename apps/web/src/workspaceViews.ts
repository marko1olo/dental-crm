import type { StaffRole } from "@dental/shared";
import { type ClinicMode, hasCapability } from "./lib/clinicCapabilities";

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
export type WorkspacePreloadIntent = "explicit" | "idle";

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

/**
 * ПРАВО ОТКРЫТЬ раздел. Именно это, а не видимость в меню: результат работает
 * охранником маршрута в useAppLogic (`if (!allowedViews.includes(currentView))`
 * — принудительный возврат на «Смену»). Поэтому режим клиники здесь сознательно
 * НЕ участвует: спрятать раздел в меню и запретить его открыть — разные вещи, а
 * запрет означал бы, что раздела больше нет.
 */
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

/**
 * КУДА ВЕРНУТЬ ЧЕЛОВЕКА, КОГДА ЗАПРОШЕННЫЙ РАЗДЕЛ ЕМУ НЕ ОТКРЫТ.
 */
export function getFallbackAppView(role: StaffRole): AppView {
	const [firstAllowed] = getFilteredAppViews(role);
	return firstAllowed ?? "shift";
}

/**
 * Какие разделы убирает выключенный модуль.
 */
export function viewsHiddenByFeatureFlags(flags: {
	hasInventoryModule?: boolean;
	hasAnalyticsModule?: boolean;
	hasPayrollModule?: boolean;
	hasMarketingModule?: boolean;
}): AppView[] {
	const hidden: AppView[] = [];
	if (flags?.hasInventoryModule === false) hidden.push("inventory");
	if (flags?.hasAnalyticsModule === false) hidden.push("analytics");
	if (flags?.hasMarketingModule === false) hidden.push("marketing");
	return hidden;
}

export function getVisibleRailViews(
	role: StaffRole,
	mode: ClinicMode | null,
): AppView[] {
	const allowedByRole = getFilteredAppViews(role);
	if (hasCapability(mode, "marketingSection")) return allowedByRole;
	return allowedByRole.filter(
		(view) => view !== "marketing" && view !== "leads",
	);
}
