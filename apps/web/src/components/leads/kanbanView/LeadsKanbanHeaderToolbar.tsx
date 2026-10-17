/**
 * DENTE Dental CRM — Leads Kanban Header Toolbar
 * Mandate 8s (Modular Architecture & Anti-Bloat), Mandate 8b (<= 120 lines)
 */

import React from "react";
import { Filter, Plus, Search, X } from "lucide-react";
import type { LeadsKanbanHeaderToolbarProps } from "./types";
import { LeadsKanbanToolbarLeft } from "./LeadsKanbanToolbarLeft";
import { LeadsKanbanMoreMenu } from "./LeadsKanbanMoreMenu";

export const LeadsKanbanHeaderToolbar: React.FC<LeadsKanbanHeaderToolbarProps> = ({
	searchQuery,
	setSearchQuery,
	sourceFilter,
	setSourceFilter,
	uniqueSources,
	viewMode,
	setViewMode,
	secondaryLeadsCount = 0,
	totalLeadsCount,
	onNewLead,
	onOpenAnalytics,
	onOpenLeakDetector,
}) => {
	return (
		<div className="leads-desktop-toolbar mb-4">
			<LeadsKanbanToolbarLeft
				totalLeadsCount={totalLeadsCount}
				viewMode={viewMode}
				setViewMode={setViewMode}
				secondaryLeadsCount={secondaryLeadsCount}
			/>

			<div className="leads-toolbar-right flex items-center gap-2">
				<div className="dente-search-wrap w-64 h-9 min-h-[36px] rounded-xl">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						placeholder="Имя или телефон..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="dente-search-input h-9 min-h-[36px] !pl-[38px] rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--ink)]"
						aria-label="Поиск по имени или телефону"
					/>
					{searchQuery && (
						<button
							type="button"
							className="dente-search-clear"
							onClick={() => setSearchQuery("")}
							aria-label="Очистить поиск"
						>
							<X size={13} />
						</button>
					)}
				</div>

				<div className="relative inline-flex items-center shrink-0">
					<Filter
						size={13}
						className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--ink-muted)]"
					/>
					<select
						value={sourceFilter}
						onChange={(e) => setSourceFilter(e.target.value)}
						className="h-9 min-h-[36px] min-w-[136px] text-xs sm:text-sm font-medium rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] pl-8 pr-3 outline-none cursor-pointer hover:border-[var(--line-strong,var(--line))] transition-colors"
						aria-label="Фильтр по каналу обращения"
					>
						<option value="">Все каналы</option>
						{uniqueSources.map((s) => (
							<option key={s} value={s}>{s}</option>
						))}
					</select>
				</div>

				<button
					className="primary-button h-9 min-h-[36px] rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white font-medium text-xs sm:text-sm shadow-xs px-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-all active:scale-[0.98] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
					onClick={onNewLead}
					type="button"
					data-testid="btn-new-lead"
					aria-label="Создать заявку"
					title="Быстрое создание заявки за 10 секунд"
				>
					<Plus size={15} />
					<span>+ Заявка</span>
				</button>

				<LeadsKanbanMoreMenu
					onOpenAnalytics={onOpenAnalytics}
					onOpenLeakDetector={onOpenLeakDetector}
				/>
			</div>
		</div>
	);
};
