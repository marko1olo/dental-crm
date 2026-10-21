/**
 * DENTE Dental CRM — Leads Kanban Toolbar Left Island
 * Title, Counter Badge, Funnel/All Segmented Bar
 * Mandate 8b (<= 120 lines)
 */

import type React from "react";

interface LeadsKanbanToolbarLeftProps {
	totalLeadsCount?: number | undefined;
	viewMode: "funnel" | "all";
	setViewMode: (mode: "funnel" | "all") => void;
	secondaryLeadsCount: number;
}

export const LeadsKanbanToolbarLeft: React.FC<LeadsKanbanToolbarLeftProps> = ({
	totalLeadsCount,
	viewMode,
	setViewMode,
	secondaryLeadsCount,
}) => {
	return (
		<div className="leads-toolbar-left flex items-center gap-2.5">
			<h2 className="m-0 text-base font-bold text-[var(--ink)] flex items-center gap-2 whitespace-nowrap">
				<span>Воронка обращений</span>
				{totalLeadsCount !== undefined && (
					<span
						className="leads-header-count-badge"
						title="Всего обращений в базе"
					>
						{totalLeadsCount}
					</span>
				)}
			</h2>

			<div
				className="leads-viewmode-segmented dente-segmented-bar h-8 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] p-0.5 inline-flex items-center gap-0.5 shrink-0"
				role="tablist"
				aria-label="Выбор отображения этапов воронки"
			>
				<button
					type="button"
					role="tab"
					aria-selected={viewMode === "funnel"}
					className={`leads-viewmode-segmented-btn dente-segmented-item h-[26px] px-2.5 rounded-md text-xs font-medium transition-all ${viewMode === "funnel" ? "is-active active bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}
					onClick={() => setViewMode("funnel")}
					data-testid="leads-viewmode-funnel-btn"
					title="Показать 4 ключевых этапа воронки пациентов"
				>
					<span>Воронка (4)</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={viewMode === "all"}
					className={`leads-viewmode-segmented-btn dente-segmented-item h-[26px] px-2.5 rounded-md text-xs font-medium transition-all ${viewMode === "all" ? "is-active active bg-[var(--paper)] text-[var(--ink)] font-semibold shadow-2xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}
					onClick={() => setViewMode("all")}
					data-testid="leads-viewmode-all-btn"
					title="Показать все 6 колонок включая недозвоны и отказы"
				>
					<span>Все этапы (6)</span>
					{secondaryLeadsCount > 0 && (
						<span className="leads-viewmode-badge">{secondaryLeadsCount}</span>
					)}
				</button>
			</div>
		</div>
	);
};
