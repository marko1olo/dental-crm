import React from "react";
import type { HistoryFilter } from "./filterRecentCalls";

export interface RecentCallsFilterTabsProps {
	filter: HistoryFilter;
	onFilterChange: (f: HistoryFilter) => void;
}

const TABS = [
	{ id: "all", label: "Все" },
	{ id: "answered", label: "Отвечен" },
	{ id: "missed", label: "Пропущен" },
	{ id: "recorded", label: "Записи" },
] as const;

export function RecentCallsFilterTabs({
	filter,
	onFilterChange,
}: RecentCallsFilterTabsProps): React.JSX.Element {
	return (
		<div
			className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)]"
			role="tablist"
			aria-label="Фильтр журнала звонков"
			data-testid="telephony-history-filters"
		>
			{TABS.map((tab) => {
				const active = filter === tab.id;
				return (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => onFilterChange(tab.id)}
						className={`flex-1 min-h-[34px] px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
							active
								? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--teal,#0d9488)] shadow-xs border border-[var(--line,#e2e8f0)]"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
						data-testid={`telephony-history-filter-${tab.id}`}
					>
						{tab.label}
					</button>
				);
			})}
		</div>
	);
}
