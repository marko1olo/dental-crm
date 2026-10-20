import type { StaffRole } from "@dental/shared";
import type { LucideIcon } from "lucide-react";
import {
	BarChart3, CalendarClock, CalendarDays, ChevronsLeft,
	ClipboardCheck, ClipboardList, CreditCard, Database, FileCheck2, FileText,
	FlaskConical, Image as ImageIcon, Layers, LayoutDashboard, Megaphone,
	MessageSquare, Package, PackageSearch, PhoneCall, ScanLine, Stethoscope, TrendingUp,
	UserPlus, Users,
} from "lucide-react";
import React, { useMemo } from "react";
import { ClinicControlPill } from "../components/Header";
import { ThemeQuickAccessWidget } from "../components/workspace/ThemeQuickAccessWidget";
import { useWorkspaceProfile } from "../hooks/useWorkspaceProfile";
import { isDemoShowcaseMode } from "../lib/demoMode";
import { useInventoryStore } from "../store/inventoryStore";
import {
	type ClinicMode,
	describeHiddenCapabilities,
	hasCapability,
} from "../lib/clinicCapabilities";
import { useSettingsStore } from "../store/settingsStore";
import {
	type AppView,
	appViews,
	getFilteredAppViews,
	viewHints,
	viewLabels,
} from "../utils/routeUtils";
import { clinicModeLabels } from "../workspaceUiLabels";
import type { WorkspaceSidebarProps } from "./types";
import "../styles/modules/sidebar.css";
import "../styles/workspace.css";

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

function SidebarIcon({ section }: { section: AppView }) {
	const Glyph = sidebarIcons[section];
	return <Glyph aria-hidden="true" />;
}

export function ActionIcon({ section }: { section: AppView }) {
	const Glyph = actionIcons[section];
	return <Glyph aria-hidden="true" />;
}

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

export function getRailViewsHiddenByMode(
	role: StaffRole,
	mode: ClinicMode | null,
): AppView[] {
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
	schedule: "Запись",
	patients: "Пациенты",
	visit: "Приём",
	documents: "Документы",
	finance: "Касса",
	analytics: "Отчёты",
	communications: "Связь",
	inventory: "Склад",
	lab: "ЗТЛ",
	scanner: "Автоклав",
	leads: "Лиды",
	settings: "Опции",
	marketing: "Акции",
};

export function WorkspaceSidebar({
	currentView,
	onViewIntent,
	role,
	collapsed,
	onToggleCollapsed,
	onLockSession,
}: WorkspaceSidebarProps) {
	const clinicMode = useSettingsStore((s) => s.clinicMode);
	const featureFlags = useWorkspaceProfile();
	const hiddenByModules = viewsHiddenByFeatureFlags(featureFlags);
	const allowedViews = getVisibleRailViews(role, clinicMode).filter(
		(view) => !hiddenByModules.includes(view),
	);

	const hiddenByMode = getRailViewsHiddenByMode(role, clinicMode);
	const modeTitle = clinicMode ? clinicModeLabels[clinicMode].title : null;
	const hiddenSectionNames = hiddenByMode
		.map((view) => viewLabels[view])
		.join(", ");
	const hiddenCapabilityNames =
		describeHiddenCapabilities(clinicMode).join(", ");
	const modeExplanation =
		modeTitle && hiddenByMode.length > 0
			? `Режим «${modeTitle}» не показывает разделы: ${hiddenSectionNames}.${
					hiddenCapabilityNames
						? ` Также упрощены: ${hiddenCapabilityNames}.`
						: ""
				} Разделы не удалены — они вернутся, если сменить режим в настройках клиники.`
			: null;

	const storeItems = useInventoryStore((s) => s.items);
	const inventoryItems = storeItems && storeItems.length > 0 ? storeItems : useInventoryStore.getState().items;
	const reorderItemsCount = useMemo(() => {
		const deficit = inventoryItems.filter(
			(i) => (Number(i.stockQuantity) || 0) <= (Number(i.criticalThreshold) || 0) || (Number(i.stockQuantity) || 0) < 0,
		).length;
		if (deficit > 0) return deficit;
		if (isDemoShowcaseMode()) return 3;
		return 0;
	}, [inventoryItems]);

	const navSlotClass = collapsed
		? "flex w-full min-w-0 flex-col items-center gap-[0.1875rem] text-center"
		: "flex w-full min-w-0 items-center gap-[0.5rem]";
	const navCaptionClass = collapsed
		? "block max-w-full text-[0.625rem] font-semibold leading-[1.15] truncate"
		: "hidden";

	return (
		<aside
			className="sidebar bg-[var(--side-bg,var(--paper))] text-[var(--ink)] border-r border-[var(--line)]"
			data-collapsed={collapsed}
		>
			<div className="brand-mark">
				<Stethoscope aria-hidden="true" />
				<span>DENTE</span>
			</div>
			<nav aria-label="Навигация">
				{appViews.map((view) =>
					allowedViews.includes(view) ? (
						<a
							className={`nav-item ${currentView === view ? "active" : ""}`}
							href={`#${view}`}
							data-tour={
								view === "visit"
									? "visit-diary"
									: view === "finance"
										? "fast-cashier"
										: view === "schedule"
											? "schedule-nav"
											: view === "imaging"
												? "imaging-nav"
												: view === "documents"
													? "documents-nav"
													: undefined
							}
							key={view}
							aria-current={currentView === view ? "page" : undefined}
							aria-label={`${viewLabels[view]}: ${sidebarHints[view] || viewHints[view]}`}
							title={`${viewLabels[view]}: ${sidebarHints[view] || viewHints[view]}`}
							onPointerEnter={() => onViewIntent?.(view, "hover")}
							onPointerLeave={() => onViewIntent?.(view, "cancel")}
							onFocus={() => onViewIntent?.(view, "hover")}
							onBlur={() => onViewIntent?.(view, "cancel")}
							onTouchStart={() => onViewIntent?.(view, "hover")}
						>
							<span className={navSlotClass}>
								<SidebarIcon section={view} />
								<span className="nav-copy min-w-0 overflow-hidden flex-1">
									<span className="nav-label truncate min-w-0 flex items-center justify-between gap-1">
										<span>{viewLabels[view]}</span>
										{view === "inventory" && reorderItemsCount > 0 && (
											<span
												className="shrink-0 px-1 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30 whitespace-nowrap"
												data-testid="sidebar-inventory-reorder-badge"
												title={`Требуется закупка: ${reorderItemsCount} позиций`}
											>
												⚠️ {reorderItemsCount} поз.
											</span>
										)}
									</span>
									<small className="nav-hint truncate min-w-0 block">{sidebarHints[view] || viewHints[view]}</small>
								</span>
								<span className={navCaptionClass}>
									{view === "inventory" && reorderItemsCount > 0 ? `⚠️ ${reorderItemsCount}` : (collapsedNavLabels[view] || viewLabels[view])}
								</span>
							</span>
						</a>
					) : null,
				)}
			</nav>
			{modeExplanation && !collapsed ? (
				<p
					className="mt-[0.75rem] text-[0.6875rem] leading-[1.4] text-[var(--ink-muted,var(--muted))] max-[1140px]:hidden font-medium"
					title={modeExplanation}
				>
					Режим «{modeTitle}» — скрыты разделы: {hiddenSectionNames}.{" "}
					<span className="sr-only">
						{hiddenCapabilityNames
							? `Также упрощены: ${hiddenCapabilityNames}. `
							: ""}
						Разделы не удалены, они вернутся при смене режима.
					</span>
					<a
						href="#settings"
						onPointerEnter={() => onViewIntent?.("settings", "hover")}
						onPointerLeave={() => onViewIntent?.("settings", "cancel")}
						onFocus={() => onViewIntent?.("settings", "hover")}
						onBlur={() => onViewIntent?.("settings", "cancel")}
					>
						Изменить режим
					</a>
				</p>
			) : null}
			<div className="sidebar-quick-tools max-w-full shrink-0 flex flex-col gap-1 px-2 py-1.5 border-t border-[var(--line-subtle,var(--line))]">
				<button
					type="button"
					data-testid="sidebar-quick-tasks-btn"
					onClick={() => window.dispatchEvent(new CustomEvent("dente:open-clinical-tasks"))}
					className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
					title="Клинические задачи передачи этапов"
				>
					<ClipboardCheck size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
					{!collapsed && <span>Клинические задачи</span>}
				</button>
				<button
					type="button"
					data-testid="sidebar-quick-recalls-btn"
					onClick={() => window.dispatchEvent(new CustomEvent("dente:open-recalls-hub"))}
					className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
					title="Профосмотры и повторные вызовы"
				>
					<PhoneCall size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
					{!collapsed && <span>Профосмотры</span>}
				</button>
			</div>
			<div className="sidebar-footer max-w-full shrink-0 mt-auto flex flex-col gap-1.5 pt-2 pb-1 border-t border-[var(--line)]">
				<div className="sidebar-footer-tier sidebar-footer-tier--top flex items-center justify-between gap-1 w-full">
					<ThemeQuickAccessWidget variant="footer" collapsed={collapsed} />
					<button
						className="icon-button sidebar-collapse-button"
						type="button"
						aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
						title={collapsed ? "Развернуть меню" : "Свернуть меню"}
						aria-pressed={collapsed}
						onClick={onToggleCollapsed}
					>
						<ChevronsLeft aria-hidden="true" />
					</button>
				</div>
				<div className="sidebar-footer-tier sidebar-footer-tier--bottom flex items-center justify-center w-full">
					<ClinicControlPill onLockSession={onLockSession} />
				</div>
			</div>
		</aside>
	);
}
