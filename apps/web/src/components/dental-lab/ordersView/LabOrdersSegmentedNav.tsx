import React from "react";
import { Columns3, LayoutGrid, LayoutList } from "lucide-react";
import type { LabOrdersSegmentedNavProps } from "./types";

export function LabOrdersSegmentedNav({
	canonicalFilters,
	statusFilter,
	onStatusFilterChange,
	stageCounts,
	viewMode,
	onViewModeChange,
}: LabOrdersSegmentedNavProps): React.JSX.Element {
	return (
		<div className="flex items-center justify-between gap-2 overflow-x-auto py-0.5 w-full max-w-full">
			<nav
				className="dente-segmented-bar shrink-0 select-none"
				aria-label="Фильтры этапов нарядов ЗТЛ"
			>
				{canonicalFilters.map((f) => {
					const isActive = statusFilter === f.id;
					const count = stageCounts[f.id] ?? 0;
					return (
						<button
							key={f.id}
							type="button"
							onClick={() => onStatusFilterChange(f.id)}
							data-active={isActive ? "true" : "false"}
							className={`dente-segmented-item ${isActive ? "active" : ""}`}
							data-testid={`lab-status-filter-${f.id}`}
						>
							<span>{f.label}</span>
							<span
								className={`inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full transition-colors ${
									isActive
										? "bg-[var(--teal-soft)] text-[var(--teal)] dark:bg-[var(--line)] dark:text-[var(--ink)]"
										: "bg-[var(--line)] text-[var(--muted)]"
								}`}
							>
								{count}
							</span>
						</button>
					);
				})}
			</nav>

			<div className="dente-segmented-bar shrink-0 select-none">
				<button
					type="button"
					onClick={() => onViewModeChange("table")}
					data-active={viewMode === "table" ? "true" : "false"}
					className={`dente-segmented-item ${viewMode === "table" ? "active" : ""}`}
					data-testid="lab-orders-view-table-btn"
				>
					<LayoutList className="w-3.5 h-3.5" />
					<span>Таблица</span>
				</button>
				<button
					type="button"
					onClick={() => onViewModeChange("cards")}
					data-active={viewMode === "cards" ? "true" : "false"}
					className={`dente-segmented-item ${viewMode === "cards" ? "active" : ""}`}
					data-testid="lab-orders-view-cards-btn"
				>
					<LayoutGrid className="w-3.5 h-3.5" />
					<span>Карточки</span>
				</button>
				<button
					type="button"
					onClick={() => onViewModeChange("kanban")}
					data-active={viewMode === "kanban" ? "true" : "false"}
					className={`dente-segmented-item ${viewMode === "kanban" ? "active" : ""}`}
					data-testid="lab-orders-view-kanban-btn"
				>
					<Columns3 className="w-3.5 h-3.5" />
					<span>Канбан</span>
				</button>
			</div>
		</div>
	);
}
