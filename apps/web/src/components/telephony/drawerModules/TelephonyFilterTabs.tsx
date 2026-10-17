import React from "react";
import type { TelephonyCallLogFilter } from "./telephonyDrawerTypes";

export interface TelephonyFilterTabsProps {
	totalCount: number;
	missedCount: number;
	recordedCount: number;
	activeFilter: TelephonyCallLogFilter;
	onFilterChange: (filter: TelephonyCallLogFilter) => void;
}

export function TelephonyFilterTabs({
	totalCount,
	missedCount,
	recordedCount,
	activeFilter,
	onFilterChange,
}: TelephonyFilterTabsProps): React.JSX.Element {
	return (
		<div
			className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]"
			role="tablist"
			aria-label="Фильтр журнала звонков"
		>
			<button
				type="button"
				role="tab"
				aria-selected={activeFilter === "all"}
				onClick={() => onFilterChange("all")}
				className={`min-h-[34px] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
					activeFilter === "all"
						? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
						: "text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
				data-testid="call-log-filter-all"
			>
				<span>Все</span>
				<span className="font-mono text-[10px] opacity-80">({totalCount})</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={activeFilter === "missed_unhandled"}
				onClick={() => onFilterChange("missed_unhandled")}
				className={`min-h-[34px] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
					activeFilter === "missed_unhandled"
						? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
						: "text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
				data-testid="call-log-filter-missed"
			>
				<span>Пропущенные</span>
				<span className="font-mono text-[10px] opacity-80">({missedCount})</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={activeFilter === "recorded"}
				onClick={() => onFilterChange("recorded")}
				className={`min-h-[34px] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
					activeFilter === "recorded"
						? "bg-[var(--paper-strong)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
						: "text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
				data-testid="call-log-filter-recorded"
			>
				<span>Записи</span>
				<span className="font-mono text-[10px] opacity-80">({recordedCount})</span>
			</button>
		</div>
	);
}
