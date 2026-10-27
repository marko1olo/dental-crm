import type { LucideIcon } from "lucide-react";
import React from "react";
import { type AppView, appViews, viewHints, viewLabels } from "../utils/routeUtils";
import { collapsedNavLabels, sidebarHints, sidebarIcons } from "./sidebarNavigationData";

export interface SidebarNavListProps {
	readonly allowedViews: AppView[];
	readonly currentView: AppView;
	readonly collapsed?: boolean;
	readonly onViewIntent?: (view: AppView, intent: "hover" | "cancel") => void;
	readonly reorderItemsCount: number;
}

export function SidebarIcon({ section }: { section: AppView }) {
	const Glyph: LucideIcon = sidebarIcons[section];
	return Glyph ? <Glyph aria-hidden="true" /> : null;
}

export function ActionIcon({ section }: { section: AppView }) {
	const Glyph: LucideIcon = sidebarIcons[section];
	return Glyph ? <Glyph aria-hidden="true" /> : null;
}

export function SidebarNavList({
	allowedViews,
	currentView,
	collapsed = false,
	onViewIntent,
	reorderItemsCount,
}: SidebarNavListProps) {
	const navSlotClass = collapsed
		? "flex w-full min-w-0 flex-col items-center gap-[0.1875rem] text-center"
		: "flex w-full min-w-0 items-center gap-[0.5rem]";
	const navCaptionClass = collapsed
		? "block max-w-full text-[0.625rem] font-semibold leading-[1.15] truncate"
		: "hidden";

	return (
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
											className="shrink-0 sidebar-nav-badge whitespace-nowrap"
											data-testid="sidebar-inventory-reorder-badge"
											title={`Требуется закупка: ${reorderItemsCount} позиций`}
										>
											{reorderItemsCount} поз.
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
	);
}
