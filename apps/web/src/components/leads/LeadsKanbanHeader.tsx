/**
 * DENTE Dental CRM — Leads Kanban Header & Filter Controls
 * Mandate 8s (Modular Architecture & Anti-Bloat), Mandate 8b (<= 120 lines)
 */

import { BarChart3, Plus, RotateCcw } from "lucide-react";
import React from "react";
import { LeadsKanbanHeaderSearch } from "./kanbanView/LeadsKanbanHeaderSearch";

export interface LeadsKanbanHeaderProps {
	searchQuery: string;
	setSearchQuery: (val: string) => void;
	sourceFilter: string;
	setSourceFilter: (val: string) => void;
	uniqueSources: string[];
	viewMode: "funnel" | "all";
	setViewMode: (val: "funnel" | "all") => void;
	secondaryLeadsCount?: number;
	onNewLead: () => void;
	onOpenAnalytics: () => void;
	onOpenLeakDetector: () => void;
	borderColor?: string;
	colBg?: string;
}

export const LeadsKanbanHeader: React.FC<LeadsKanbanHeaderProps> = ({
	searchQuery,
	setSearchQuery,
	sourceFilter,
	setSourceFilter,
	uniqueSources,
	viewMode,
	setViewMode,
	secondaryLeadsCount = 0,
	onNewLead,
	onOpenAnalytics,
	onOpenLeakDetector,
}) => {
	return (
		<div className="mb-4">
			<div className="flex items-center justify-between gap-2 flex-nowrap">
				<div className="flex items-center gap-2 min-w-0">
					<h2 className="m-0 text-base font-bold text-[var(--ink)] whitespace-nowrap shrink-0">
						Воронка обращений
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
								<span className="leads-viewmode-badge">
									{secondaryLeadsCount}
								</span>
							)}
						</button>
					</div>

					<button
						className="primary-button h-9 min-h-[36px] rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white font-medium text-xs sm:text-sm shadow-xs px-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-all active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
						onClick={onNewLead}
						type="button"
						aria-label="Создать новое обращение"
					>
						<Plus size={14} /> Новый лид
					</button>
					<button
						className="secondary-button h-9 min-h-[36px] text-xs sm:text-sm font-medium px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-all active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
						onClick={onOpenAnalytics}
						type="button"
						aria-label="Открыть сквозную аналитику воронки"
					>
						<BarChart3 size={14} className="text-[var(--primary)]" /> Аналитика
					</button>
					<button
						className="secondary-button h-9 min-h-[36px] text-xs sm:text-sm font-medium px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-all active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
						onClick={onOpenLeakDetector}
						type="button"
						aria-label="Открыть детектор оттока пациентов (210 дней)"
					>
						<RotateCcw size={14} className="text-[var(--primary)]" /> Отток
					</button>
				</div>

				<LeadsKanbanHeaderSearch
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
					sourceFilter={sourceFilter}
					setSourceFilter={setSourceFilter}
					uniqueSources={uniqueSources}
				/>
			</div>
		</div>
	);
};
