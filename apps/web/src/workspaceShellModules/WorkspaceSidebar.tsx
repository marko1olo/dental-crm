import type { StaffRole } from "@dental/shared";
import { ChevronsLeft, Stethoscope } from "lucide-react";
import React, { useMemo } from "react";
import { ClinicControlPill } from "../components/Header";
import { ThemeQuickAccessWidget } from "../components/workspace/ThemeQuickAccessWidget";
import { useWorkspaceProfile } from "../hooks/useWorkspaceProfile";
import { isDemoShowcaseMode } from "../lib/demoMode";
import { useInventoryStore } from "../store/inventoryStore";
import { useSettingsStore } from "../store/settingsStore";
import { type AppView, viewLabels } from "../utils/routeUtils";
import { clinicModeLabels } from "../workspaceUiLabels";
import { SidebarNavList } from "./SidebarNavList";
import { SidebarQuickTools } from "./SidebarQuickTools";
import {
	getRailViewsHiddenByMode,
	getVisibleRailViews,
	viewsHiddenByFeatureFlags,
} from "./sidebarNavigationData";
import type { WorkspaceSidebarProps } from "./types";
import "../styles/modules/sidebar.css";
import "../styles/workspace.css";

export {
	sidebarIcons,
	actionIcons,
	viewsHiddenByFeatureFlags,
	getVisibleRailViews,
	getRailViewsHiddenByMode,
	sidebarHints,
	collapsedNavLabels,
} from "./sidebarNavigationData";
export { SidebarIcon, ActionIcon } from "./SidebarNavList";

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
	const hiddenSectionNames = hiddenByMode.map((v) => viewLabels[v]).join(", ");
	const modeExplanation = modeTitle && hiddenByMode.length > 0
		? `Режим «${modeTitle}» — скрыты: ${hiddenSectionNames}.`
		: null;

	const storeItems = useInventoryStore((s) => s.items);
	const inventoryItems = storeItems?.length ? storeItems : useInventoryStore.getState().items;
	const reorderItemsCount = useMemo(() => {
		const deficit = inventoryItems.filter(
			(i) => (Number(i.stockQuantity) || 0) <= (Number(i.criticalThreshold) || 0) || (Number(i.stockQuantity) || 0) < 0,
		).length;
		return deficit > 0 ? deficit : (isDemoShowcaseMode() ? 3 : 0);
	}, [inventoryItems]);

	return (
		<aside
			className="sidebar bg-[var(--side-bg,var(--paper))] text-[var(--ink)] border-r border-[var(--line)]"
			data-collapsed={collapsed}
		>
			<div className="brand-mark">
				<Stethoscope aria-hidden="true" />
				<span>DENTE</span>
			</div>
			<SidebarNavList
				allowedViews={allowedViews}
				currentView={currentView}
				collapsed={collapsed}
				onViewIntent={onViewIntent}
				reorderItemsCount={reorderItemsCount}
			/>
			{modeExplanation && !collapsed && (
				<p className="mt-[0.5rem] px-2 text-[0.6875rem] leading-[1.35] text-[var(--ink-muted,var(--muted))] max-[1140px]:hidden font-medium">
					{modeExplanation}
				</p>
			)}
			<SidebarQuickTools collapsed={collapsed} />
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
