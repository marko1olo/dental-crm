/**
 * DENTE Dental CRM — Leads Kanban Header Search & Filter Inputs
 * Mandate 8b (<= 120 lines)
 */

import { Filter, Search, X } from "lucide-react";
import React from "react";

interface LeadsKanbanHeaderSearchProps {
	searchQuery: string;
	setSearchQuery: (val: string) => void;
	sourceFilter: string;
	setSourceFilter: (val: string) => void;
	uniqueSources: string[];
}

export const LeadsKanbanHeaderSearch: React.FC<LeadsKanbanHeaderSearchProps> = ({
	searchQuery,
	setSearchQuery,
	sourceFilter,
	setSourceFilter,
	uniqueSources,
}) => {
	return (
		<div className="flex items-center gap-2 shrink-0">
			<div className="dente-search-wrap w-48 xl:w-56 h-9 min-h-[36px] rounded-xl">
				<Search size={14} className="dente-search-icon" />
				<input
					type="text"
					placeholder="Имя или телефон..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="dente-search-input h-9 min-h-[36px] !pl-[38px] rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs sm:text-sm text-[var(--ink)]"
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
						<option key={s} value={s}>
							{s}
						</option>
					))}
				</select>
			</div>
		</div>
	);
};
