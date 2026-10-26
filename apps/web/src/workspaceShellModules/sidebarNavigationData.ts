import type { StaffRole } from "@dental/shared";
import type { LucideIcon } from "lucide-react";
import {
	BarChart3, CalendarClock, CalendarDays, ClipboardCheck, ClipboardList,
	CreditCard, Database, FileCheck2, FileText, FlaskConical,
	Image as ImageIcon, Layers, LayoutDashboard, Megaphone,
	MessageSquare, Package, PackageSearch, ScanLine, TrendingUp,
	UserPlus, Users,
} from "lucide-react";
import { type ClinicMode, hasCapability } from "../lib/clinicCapabilities";
import { type AppView, getFilteredAppViews } from "../utils/routeUtils";

export const sidebarIcons: Record<AppView, LucideIcon> = {
	shift: LayoutDashboard,
	schedule: CalendarDays,
	patients: Users,
	pipeline: Layers,
	imaging: ImageIcon,
	visit: ClipboardList,
	documents: FileText,
	finance: CreditCard,
	analytics: BarChart3,
	communications: MessageSquare,
	inventory: Package,
	lab: FlaskConical,
	scanner: ScanLine,
	leads: UserPlus,
	settings: Database,
	marketing: Megaphone,
};

export const actionIcons: Record<AppView, LucideIcon> = {
	shift: LayoutDashboard,
	schedule: CalendarClock,
	patients: Users,
	pipeline: Layers,
	imaging: ImageIcon,
	visit: ClipboardCheck,
	documents: FileCheck2,
	finance: CreditCard,
	analytics: TrendingUp,
	communications: MessageSquare,
	inventory: PackageSearch,
	lab: FlaskConical,
	scanner: ScanLine,
	leads: UserPlus,
	settings: Database,
	marketing: Megaphone,
};

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

export function getVisibleRailViews(role: StaffRole, mode: ClinicMode | null): AppView[] {
	const allowedByRole = getFilteredAppViews(role);
	if (hasCapability(mode, "marketingSection")) return allowedByRole;
	return allowedByRole.filter((view) => view !== "marketing" && view !== "leads");
}

export function getRailViewsHiddenByMode(role: StaffRole, mode: ClinicMode | null): AppView[] {
	const visible = getVisibleRailViews(role, mode);
	return getFilteredAppViews(role).filter((view) => !visible.includes(view));
}

export const sidebarHints: Record<AppView, string> = {
	shift: "Показатели дня",
	schedule: "График и визиты",
	patients: "Картотека и баланс",
	imaging: "Рентген и КТ",
	visit: "Карта и дневник",
	pipeline: "Этапы и сметы",
	documents: "Справки и акты",
	finance: "Касса и счета",
	analytics: "Отчёты и выручка",
	communications: "Звонки и чаты",
	inventory: "Склад и материалы",
	lab: "Наряды ЗТЛ и коронки",
	scanner: "Стерилизация и автоклавы",
	leads: "Воронка и лиды",
	settings: "Клиника и интеграции",
	marketing: "Акции и реклама",
};

export const collapsedNavLabels: Partial<Record<AppView, string>> = {
	shift: "Смена", schedule: "Запись", patients: "Пациенты", pipeline: "Планы",
	imaging: "Снимки", visit: "Приём", documents: "Документы", finance: "Касса",
	analytics: "Отчёты", communications: "Связь", inventory: "Склад", lab: "ЗТЛ",
	scanner: "Автоклав", leads: "Лиды", settings: "Опции", marketing: "Акции",
};
